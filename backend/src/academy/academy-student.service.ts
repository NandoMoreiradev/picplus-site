import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CouponDiscountType,
  CourseOrderStatus,
  EmailTriggerType,
  EnrollmentSource,
  EnrollmentStatus,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { config } from '../config/configuration';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCheckoutDto,
  CreateLessonCommentDto,
  UpdateLessonProgressDto,
  ValidateCouponDto,
} from './dto/academy.dto';
import { MercadoPagoService } from './mercado-pago.service';

@Injectable()
export class AcademyStudentService {
  private readonly logger = new Logger(AcademyStudentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mp: MercadoPagoService,
    private readonly emailTemplates: EmailTemplatesService,
  ) {}

  private getFirstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
  }

  private formatCentsBRL(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Vitrine Pública de Cursos
  // ─────────────────────────────────────────────────────────────

  async listPublishedCourses() {
    const courses = await this.prisma.course.findMany({
      where: { published: true },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { published: true },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                durationSeconds: true,
                isFreePreview: true,
              },
            },
          },
        },
      },
    });

    return courses.map((course) => {
      const totalLessons = course.modules.reduce(
        (sum, m) => sum + m.lessons.length,
        0,
      );
      const totalDurationSeconds = course.modules.reduce(
        (sum, m) =>
          sum + m.lessons.reduce((lSum, l) => lSum + l.durationSeconds, 0),
        0,
      );
      return {
        ...course,
        modules: undefined,
        modulesCount: course.modules.length,
        lessonsCount: totalLessons,
        totalDurationSeconds,
      };
    });
  }

  async getPublicCourseBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, published: true },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { published: true },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                videoProvider: true,
                videoUrl: true,
                durationSeconds: true,
                isFreePreview: true,
                order: true,
                _count: { select: { materials: true } },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Curso não encontrado.');
    }

    // Oculta videoUrl das aulas que NÃO são demonstrativas gratuitas
    return {
      ...course,
      modules: course.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.isFreePreview ? lesson.description : null,
          videoProvider: lesson.videoProvider,
          videoUrl: lesson.isFreePreview ? lesson.videoUrl : null,
          durationSeconds: lesson.durationSeconds,
          isFreePreview: lesson.isFreePreview,
          order: lesson.order,
          materialsCount: lesson._count.materials,
        })),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Cupons e Checkout (Mercado Pago Checkout Pro)
  // ─────────────────────────────────────────────────────────────

  async validateCoupon(dto: ValidateCouponDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, published: true },
    });
    if (!course) throw new NotFoundException('Curso não encontrado.');

    const code = dto.code.toUpperCase().replace(/\s+/g, '');
    const coupon = await this.prisma.academyCoupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.active) {
      throw new BadRequestException('Cupom inválido ou desativado.');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Este cupom já expirou.');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException(
        'Este cupom já atingiu o limite máximo de utilizações.',
      );
    }
    if (coupon.courseId && coupon.courseId !== course.id) {
      throw new BadRequestException(
        'Este cupom não é válido para o curso selecionado.',
      );
    }

    const discountCents =
      coupon.discountType === CouponDiscountType.PERCENTAGE
        ? Math.round((course.priceCents * coupon.discountValue) / 100)
        : Math.min(course.priceCents, coupon.discountValue);

    const finalPriceCents = Math.max(0, course.priceCents - discountCents);

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      originalPriceCents: course.priceCents,
      discountCents,
      finalPriceCents,
    };
  }

  async createCheckout(studentId: string, dto: CreateCheckoutDto) {
    const [initialStudent, course] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: studentId } }),
      this.prisma.course.findFirst({
        where: { id: dto.courseId, published: true },
      }),
    ]);

    let student = initialStudent;

    if (!student || !student.active) {
      throw new ForbiddenException('Conta de aluno inválida.');
    }
    if (!course) {
      throw new NotFoundException('Curso não encontrado.');
    }

    if ((dto.cpf && !student.cpf) || (dto.phone && !student.phone)) {
      student = await this.prisma.student.update({
        where: { id: student.id },
        data: {
          cpf: dto.cpf?.trim() || student.cpf,
          phone: dto.phone?.trim() || student.phone,
        },
      });
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: course.id,
        },
      },
    });
    if (
      existingEnrollment &&
      existingEnrollment.status === EnrollmentStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Você já possui acesso ativo a este curso!',
      );
    }

    let couponId: string | null = null;
    let discountCents = 0;
    let finalPriceCents = course.priceCents;

    if (dto.couponCode?.trim()) {
      const validated = await this.validateCoupon({
        code: dto.couponCode,
        courseId: course.id,
      });
      couponId = validated.couponId;
      discountCents = validated.discountCents;
      finalPriceCents = validated.finalPriceCents;
    }

    const order = await this.prisma.courseOrder.create({
      data: {
        studentId: student.id,
        courseId: course.id,
        couponId,
        originalPriceCents: course.priceCents,
        discountCents,
        finalPriceCents,
        status: CourseOrderStatus.PENDING,
      },
    });

    // Curso gratuito ou cupom de 100% de desconto: aprova e matricula na hora!
    if (finalPriceCents === 0) {
      await this.approveOrderAndEnroll(order.id, {
        mpPaymentId: `free_${order.id}`,
        mpStatus: 'approved',
        paymentMethod: couponId ? 'coupon_100' : 'free',
        source: couponId
          ? EnrollmentSource.PURCHASE
          : EnrollmentSource.FREE_COURSE,
      });

      return {
        orderId: order.id,
        freeEnrollment: true,
        courseSlug: course.slug,
        checkoutUrl: `${config.frontendUrl}/academy/checkout/retorno?orderId=${order.id}&status=approved`,
      };
    }

    const preference = await this.mp.createPreference({
      orderId: order.id,
      courseId: course.id,
      courseTitle: course.title,
      courseSubtitle: course.subtitle,
      coverImage: course.coverImage,
      priceCents: finalPriceCents,
      student: {
        name: student.name,
        email: student.email,
        cpf: student.cpf,
      },
    });

    await this.prisma.courseOrder.update({
      where: { id: order.id },
      data: {
        mpPreferenceId: preference.preferenceId,
        mpCheckoutUrl: preference.checkoutUrl,
      },
    });

    if (preference.checkoutUrl) {
      void this.emailTemplates.sendByTrigger(
        EmailTriggerType.ACADEMY_PAYMENT_PENDING,
        student.email,
        {
          ...this.orderMailContext(
            { name: student.name, email: student.email },
            course,
            order.id,
            finalPriceCents,
          ),
          action_url: preference.checkoutUrl,
        },
      );
    }

    return {
      orderId: order.id,
      freeEnrollment: false,
      courseSlug: course.slug,
      preferenceId: preference.preferenceId,
      checkoutUrl: preference.checkoutUrl,
      simulated: preference.simulated,
    };
  }

  /**
   * Aprova o pedido de forma idempotente, incrementa o uso do cupom,
   * ativa a matrícula e envia o e-mail de confirmação.
   */
  private async approveOrderAndEnroll(
    orderId: string,
    paymentMeta: {
      mpPaymentId?: string | null;
      mpStatus?: string | null;
      paymentMethod?: string | null;
      source?: EnrollmentSource;
    },
  ) {
    const order = await this.prisma.courseOrder.findUnique({
      where: { id: orderId },
      include: {
        student: true,
        course: true,
      },
    });
    if (!order) return null;

    // Transição atômica: webhook e retorno do checkout podem chegar juntos, e só
    // quem de fato aprovou o pedido conta o cupom e envia o e-mail.
    const transition = await this.prisma.courseOrder.updateMany({
      where: { id: order.id, status: { not: CourseOrderStatus.APPROVED } },
      data: {
        status: CourseOrderStatus.APPROVED,
        mpPaymentId: paymentMeta.mpPaymentId ?? order.mpPaymentId,
        mpStatus: paymentMeta.mpStatus ?? 'approved',
        paymentMethod: paymentMeta.paymentMethod ?? order.paymentMethod,
        paidAt: order.paidAt ?? new Date(),
      },
    });
    const alreadyApproved = transition.count === 0;

    const updatedOrder = await this.prisma.courseOrder.findUniqueOrThrow({
      where: { id: order.id },
    });

    if (!alreadyApproved && order.couponId) {
      await this.prisma.academyCoupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    await this.prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: order.studentId,
          courseId: order.courseId,
        },
      },
      update: {
        status: EnrollmentStatus.ACTIVE,
        orderId: order.id,
      },
      create: {
        studentId: order.studentId,
        courseId: order.courseId,
        orderId: order.id,
        source: paymentMeta.source ?? EnrollmentSource.PURCHASE,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (!alreadyApproved) {
      void this.emailTemplates.sendByTrigger(
        EmailTriggerType.ACADEMY_PURCHASE_APPROVED,
        order.student.email,
        {
          student: {
            name: order.student.name,
            first_name: this.getFirstName(order.student.name),
            email: order.student.email,
          },
          course: {
            title: order.course.title,
            instructor: order.course.instructorName,
            workload_hours: String(order.course.workloadHours),
            url: `${config.frontendUrl}/academy/aula/${order.course.slug}`,
          },
          order: {
            id: order.id.slice(0, 8).toUpperCase(),
            amount: this.formatCentsBRL(order.finalPriceCents),
          },
        },
      );
    }

    return updatedOrder;
  }

  private orderMailContext(
    student: { name: string; email: string },
    course: { title: string; slug: string; instructorName?: string | null },
    orderId: string,
    amountCents: number,
  ) {
    return {
      student: {
        name: student.name,
        first_name: this.getFirstName(student.name),
        email: student.email,
      },
      course: {
        title: course.title,
        instructor: course.instructorName ?? '',
        url: `${config.frontendUrl}/academy/aula/${course.slug}`,
      },
      order: {
        id: orderId.slice(0, 8).toUpperCase(),
        amount: this.formatCentsBRL(amountCents),
      },
    };
  }

  /** Avisa o aluno sobre uma mudança de status do pedido (nunca interrompe o webhook). */
  private async notifyOrder(orderId: string, trigger: EmailTriggerType) {
    try {
      const order = await this.prisma.courseOrder.findUnique({
        where: { id: orderId },
        include: { student: true, course: true },
      });
      if (!order) return;
      void this.emailTemplates.sendByTrigger(
        trigger,
        order.student.email,
        this.orderMailContext(
          order.student,
          order.course,
          order.id,
          order.finalPriceCents,
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Aviso de pedido ${orderId} não enviado: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Processa notificações de webhook do Mercado Pago.
   */
  async handleMercadoPagoWebhook(params: {
    body: Record<string, unknown>;
    query: Record<string, string | undefined>;
    headers: Record<string, string | undefined>;
  }) {
    const { body, query, headers } = params;
    const type =
      (body?.type as string | undefined) ||
      (body?.topic as string | undefined) ||
      query.type ||
      query.topic;

    const dataObj = body?.data as { id?: string | number } | undefined;
    const paymentId = String(
      dataObj?.id ?? query['data.id'] ?? query.id ?? '',
    ).trim();

    if (!paymentId || (type && type !== 'payment')) {
      return { received: true };
    }

    const hasSignature = Boolean(headers['x-signature']);
    const validSig = this.mp.verifyWebhookSignature({
      xSignature: headers['x-signature'],
      xRequestId: headers['x-request-id'],
      dataId: paymentId,
    });
    if (!validSig) {
      if (!hasSignature) {
        this.logger.log(
          `Webhook do Mercado Pago recebido sem x-signature (evento "Pagamentos (legacy)"). ` +
            `Validando autenticidade ativamente na API oficial do Mercado Pago...`,
        );
      } else {
        this.logger.warn(
          `Assinatura de webhook do Mercado Pago não coincidiu para payment ${paymentId}. ` +
            `Verificando autenticidade ativamente na API do Mercado Pago via token seguro...`,
        );
      }
    }

    const payment = await this.mp.getPayment(paymentId);
    if (!payment || !payment.externalReference) {
      if (!validSig) {
        this.logger.warn(
          `Pagamento ${paymentId} não encontrado na conta do Mercado Pago ou sem externalReference. Notificação descartada.`,
        );
      }
      return { received: true };
    }

    const orderId = payment.externalReference;
    if (payment.status === 'approved') {
      await this.approveOrderAndEnroll(orderId, {
        mpPaymentId: payment.id,
        mpStatus: payment.status,
        paymentMethod: payment.paymentTypeId,
      });
    } else if (
      payment.status === 'rejected' ||
      payment.status === 'cancelled'
    ) {
      const changed = await this.prisma.courseOrder.updateMany({
        where: { id: orderId, status: CourseOrderStatus.PENDING },
        data: {
          status:
            payment.status === 'rejected'
              ? CourseOrderStatus.REJECTED
              : CourseOrderStatus.CANCELED,
          mpPaymentId: payment.id,
          mpStatus: payment.status,
        },
      });
      if (changed.count > 0) {
        await this.notifyOrder(
          orderId,
          EmailTriggerType.ACADEMY_PAYMENT_REJECTED,
        );
      }
    } else if (
      payment.status === 'refunded' ||
      payment.status === 'charged_back'
    ) {
      const changed = await this.prisma.courseOrder.updateMany({
        where: { id: orderId, status: { not: CourseOrderStatus.REFUNDED } },
        data: {
          status: CourseOrderStatus.REFUNDED,
          mpPaymentId: payment.id,
          mpStatus: payment.status,
        },
      });
      await this.prisma.enrollment.updateMany({
        where: { orderId },
        data: { status: EnrollmentStatus.REVOKED },
      });
      if (changed.count > 0) {
        await this.notifyOrder(orderId, EmailTriggerType.ACADEMY_REFUNDED);
      }
    }

    return { received: true };
  }

  /**
   * Chamado na tela de retorno do checkout para sincronizar ativamente o pedido
   * caso o aluno volte ao site antes do webhook chegar.
   */
  async verifyAndSyncOrder(
    studentId: string,
    orderId: string,
    query: { paymentId?: string; simulated?: string; status?: string },
  ) {
    const order = await this.prisma.courseOrder.findUnique({
      where: { id: orderId },
      include: {
        course: {
          select: { id: true, title: true, slug: true, coverImage: true },
        },
      },
    });
    if (!order || order.studentId !== studentId) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    if (order.status !== CourseOrderStatus.APPROVED) {
      // Em ambiente local sem MP_ACCESS_TOKEN, aceita o retorno simulado
      if (this.mp.simulationAllowed && query.simulated === '1') {
        await this.approveOrderAndEnroll(order.id, {
          mpPaymentId: query.paymentId || `sim_${order.id}`,
          mpStatus: 'approved',
          paymentMethod: 'simulated',
        });
      } else if (this.mp.isConfigured) {
        const payment = query.paymentId
          ? await this.mp.getPayment(query.paymentId)
          : await this.mp.findLatestPaymentByOrder(order.id);

        if (
          payment &&
          payment.externalReference === order.id &&
          payment.status === 'approved'
        ) {
          await this.approveOrderAndEnroll(order.id, {
            mpPaymentId: payment.id,
            mpStatus: payment.status,
            paymentMethod: payment.paymentTypeId,
          });
        }
      }
    }

    const refreshed = await this.prisma.courseOrder.findUnique({
      where: { id: order.id },
      include: {
        course: {
          select: { id: true, title: true, slug: true, coverImage: true },
        },
        enrollment: { select: { id: true, status: true } },
      },
    });

    return refreshed;
  }

  // ─────────────────────────────────────────────────────────────
  // Área do Aluno: Meus Cursos, Sala de Aula, Progresso e Certificado
  // ─────────────────────────────────────────────────────────────

  async listMyCourses(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { order: 'asc' },
              include: {
                lessons: {
                  where: { published: true },
                  orderBy: { order: 'asc' },
                  select: { id: true, title: true, durationSeconds: true },
                },
              },
            },
          },
        },
        progress: true,
      },
    });

    return enrollments.map((enrollment) => {
      const allLessons = enrollment.course.modules.flatMap((m) => m.lessons);
      const completedSet = new Set(
        enrollment.progress.filter((p) => p.completed).map((p) => p.lessonId),
      );
      const completedCount = allLessons.filter((l) =>
        completedSet.has(l.id),
      ).length;
      const totalLessons = allLessons.length;
      const progressPercent =
        totalLessons > 0
          ? Math.min(100, Math.round((completedCount / totalLessons) * 100))
          : 0;

      const nextLesson =
        allLessons.find((l) => !completedSet.has(l.id)) ??
        allLessons[0] ??
        null;

      return {
        enrollmentId: enrollment.id,
        source: enrollment.source,
        enrolledAt: enrollment.createdAt,
        completedAt: enrollment.completedAt,
        certificateCode: enrollment.certificateCode,
        totalLessons,
        completedLessons: completedCount,
        progressPercent,
        nextLessonId: nextLesson?.id ?? null,
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          slug: enrollment.course.slug,
          subtitle: enrollment.course.subtitle,
          coverImage: enrollment.course.coverImage,
          instructorName: enrollment.course.instructorName,
          instructorAvatar: enrollment.course.instructorAvatar,
          workloadHours: enrollment.course.workloadHours,
          level: enrollment.course.level,
          category: enrollment.course.category,
        },
      };
    });
  }

  async listMyOrders(studentId: string) {
    return this.prisma.courseOrder.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: { id: true, title: true, slug: true, coverImage: true },
        },
        coupon: { select: { code: true } },
      },
    });
  }

  async getClassroomCourse(studentId: string, courseSlug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { published: true },
              orderBy: { order: 'asc' },
              include: {
                materials: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Curso não encontrado.');

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: course.id,
        },
      },
      include: {
        progress: true,
      },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException(
        'Você ainda não possui matrícula ativa neste curso.',
      );
    }

    const progressMap = new Map(
      enrollment.progress.map((p) => [p.lessonId, p]),
    );
    const allLessons = course.modules.flatMap((m) => m.lessons);
    const completedLessons = allLessons.filter(
      (l) => progressMap.get(l.id)?.completed,
    ).length;
    const progressPercent =
      allLessons.length > 0
        ? Math.min(
            100,
            Math.round((completedLessons / allLessons.length) * 100),
          )
        : 0;

    return {
      enrollment: {
        id: enrollment.id,
        completedAt: enrollment.completedAt,
        certificateCode: enrollment.certificateCode,
        totalLessons: allLessons.length,
        completedLessons,
        progressPercent,
      },
      course: {
        ...course,
        modules: course.modules.map((mod) => ({
          ...mod,
          lessons: mod.lessons.map((lesson) => {
            const prog = progressMap.get(lesson.id);
            return {
              ...lesson,
              completed: prog?.completed ?? false,
              lastPositionSeconds: prog?.lastPositionSeconds ?? 0,
            };
          }),
        })),
      },
    };
  }

  async updateLessonProgress(
    studentId: string,
    lessonId: string,
    dto: UpdateLessonProgressDto,
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                modules: {
                  include: {
                    lessons: {
                      where: { published: true },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada.');

    const course = lesson.module.course;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: course.id,
        },
      },
      include: {
        student: true,
      },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('Matrícula não encontrada para este curso.');
    }

    const updatedProgress = await this.prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
        },
      },
      update: {
        ...(dto.completed !== undefined
          ? {
              completed: dto.completed,
              completedAt: dto.completed ? new Date() : null,
            }
          : {}),
        ...(dto.lastPositionSeconds !== undefined
          ? { lastPositionSeconds: dto.lastPositionSeconds }
          : {}),
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        completed: dto.completed ?? false,
        completedAt: dto.completed ? new Date() : null,
        lastPositionSeconds: dto.lastPositionSeconds ?? 0,
      },
    });

    // Recalcula progresso geral e emite certificado ao atingir 100%
    const allLessonIds = course.modules.flatMap((m) =>
      m.lessons.map((l) => l.id),
    );
    const completedRecords = await this.prisma.lessonProgress.findMany({
      where: {
        enrollmentId: enrollment.id,
        lessonId: { in: allLessonIds },
        completed: true,
      },
      select: { lessonId: true },
    });

    const totalLessons = allLessonIds.length;
    const completedLessons = completedRecords.length;
    const progressPercent =
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : 0;

    let certificateCode = enrollment.certificateCode;
    let completedAt = enrollment.completedAt;

    if (
      totalLessons > 0 &&
      completedLessons >= totalLessons &&
      !certificateCode
    ) {
      certificateCode = await this.generateUniqueCertificateCode();
      completedAt = new Date();

      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          certificateCode,
          completedAt,
        },
      });

      void this.emailTemplates.sendByTrigger(
        EmailTriggerType.ACADEMY_CERTIFICATE_ISSUED,
        enrollment.student.email,
        {
          student: {
            name: enrollment.student.name,
            first_name: this.getFirstName(enrollment.student.name),
            email: enrollment.student.email,
          },
          course: {
            title: course.title,
            instructor: course.instructorName,
            workload_hours: String(course.workloadHours),
            url: `${config.frontendUrl}/academy/aula/${course.slug}`,
          },
          certificate: {
            code: certificateCode,
            url: `${config.frontendUrl}/academy/certificado/${certificateCode}`,
          },
        },
      );
    }

    return {
      progress: updatedProgress,
      totalLessons,
      completedLessons,
      progressPercent,
      certificateCode,
      completedAt,
    };
  }

  private async generateUniqueCertificateCode(): Promise<string> {
    const year = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      const code = `PIC-${year}-${randomBytes(3).toString('hex').toUpperCase()}`;
      const exists = await this.prisma.enrollment.findUnique({
        where: { certificateCode: code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    return `PIC-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Validação Pública de Certificado
  // ─────────────────────────────────────────────────────────────

  async getCertificateByCode(code: string) {
    const clean = code.trim().toUpperCase();
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { certificateCode: clean },
      include: {
        student: { select: { name: true, cpf: true } },
        course: {
          select: {
            title: true,
            slug: true,
            instructorName: true,
            workloadHours: true,
          },
        },
      },
    });

    if (!enrollment || !enrollment.certificateCode) {
      throw new NotFoundException(
        'Certificado não encontrado. Verifique o código informado.',
      );
    }

    return {
      certificateCode: enrollment.certificateCode,
      issuedAt: enrollment.completedAt ?? enrollment.updatedAt,
      studentName: enrollment.student.name,
      studentCpfMasked: this.maskCpf(enrollment.student.cpf),
      courseTitle: enrollment.course.title,
      courseSlug: enrollment.course.slug,
      instructorName: enrollment.course.instructorName,
      workloadHours: enrollment.course.workloadHours,
    };
  }

  private maskCpf(cpf?: string | null): string | null {
    if (!cpf) return null;
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return null;
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  // ─────────────────────────────────────────────────────────────
  // Comentários / Dúvidas do Aluno na Aula
  // ─────────────────────────────────────────────────────────────

  private async assertStudentEnrolledInLesson(
    studentId: string,
    lessonId: string,
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada.');

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: lesson.module.courseId,
        },
      },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException(
        'Apenas alunos matriculados podem acessar os comentários desta aula.',
      );
    }
    return lesson;
  }

  async listLessonComments(studentId: string, lessonId: string) {
    await this.assertStudentEnrolledInLesson(studentId, lessonId);

    return this.prisma.lessonComment.findMany({
      where: { lessonId, parentCommentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true } },
        adminUser: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            student: { select: { id: true, name: true, avatarUrl: true } },
            adminUser: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async createLessonComment(
    studentId: string,
    lessonId: string,
    dto: CreateLessonCommentDto,
  ) {
    await this.assertStudentEnrolledInLesson(studentId, lessonId);

    if (dto.parentCommentId) {
      const parent = await this.prisma.lessonComment.findUnique({
        where: { id: dto.parentCommentId },
      });
      if (!parent || parent.lessonId !== lessonId) {
        throw new BadRequestException('Comentário principal inválido.');
      }
    }

    return this.prisma.lessonComment.create({
      data: {
        content: dto.content.trim(),
        lessonId,
        studentId,
        parentCommentId: dto.parentCommentId || null,
      },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true } },
        adminUser: { select: { id: true, name: true, avatarUrl: true } },
        replies: true,
      },
    });
  }

  async deleteOwnComment(studentId: string, commentId: string) {
    const comment = await this.prisma.lessonComment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.studentId !== studentId) {
      throw new ForbiddenException(
        'Você só pode excluir seus próprios comentários.',
      );
    }
    await this.prisma.lessonComment.delete({ where: { id: commentId } });
    return { ok: true };
  }
}
