import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseOrderStatus,
  EmailTriggerType,
  EnrollmentSource,
  EnrollmentStatus,
  LessonVideoProvider,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { uniqueSlug } from '../common/utils/slug';
import { extractYoutubeId } from '../common/utils/youtube';
import { config } from '../config/configuration';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateCouponDto,
  CreateCourseDto,
  CreateCourseLessonDto,
  CreateCourseModuleDto,
  CreateLessonCommentDto,
  ManualEnrollmentDto,
  UpdateCouponDto,
  UpdateCourseDto,
  UpdateCourseLessonDto,
  UpdateCourseModuleDto,
} from './dto/academy.dto';

@Injectable()
export class AcademyAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly emailTemplates: EmailTemplatesService,
  ) {}

  private getFirstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
  }

  private normalizeLessonVideo(
    provider: LessonVideoProvider,
    rawUrl?: string | null,
  ): string | null {
    if (!rawUrl || !rawUrl.trim()) return null;
    const value = rawUrl.trim();
    if (provider === LessonVideoProvider.YOUTUBE) {
      const id = extractYoutubeId(value);
      if (!id) {
        throw new BadRequestException(
          'Link do YouTube inválido. Informe um link válido do YouTube ou o ID de 11 caracteres.',
        );
      }
      return id;
    }
    return value;
  }

  // ─────────────────────────────────────────────────────────────
  // Dashboard / Métricas da Academy
  // ─────────────────────────────────────────────────────────────

  async getOverview() {
    const [
      totalCourses,
      publishedCourses,
      totalStudents,
      activeEnrollments,
      approvedOrders,
      totalComments,
    ] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.course.count({ where: { published: true } }),
      this.prisma.student.count({ where: { active: true } }),
      this.prisma.enrollment.count({
        where: { status: EnrollmentStatus.ACTIVE },
      }),
      this.prisma.courseOrder.findMany({
        where: { status: CourseOrderStatus.APPROVED },
        select: { finalPriceCents: true },
      }),
      this.prisma.lessonComment.count(),
    ]);

    const totalRevenueCents = approvedOrders.reduce(
      (sum, order) => sum + order.finalPriceCents,
      0,
    );

    return {
      totalCourses,
      publishedCourses,
      totalStudents,
      activeEnrollments,
      approvedSalesCount: approvedOrders.length,
      totalRevenueCents,
      totalComments,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Cursos
  // ─────────────────────────────────────────────────────────────

  async listCourses() {
    return this.prisma.course.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            modules: true,
            enrollments: true,
            orders: true,
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                materials: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });
  }

  async getCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                materials: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
        _count: {
          select: { enrollments: true, orders: true },
        },
      },
    });
    if (!course) throw new NotFoundException('Curso não encontrado.');
    return course;
  }

  async createCourse(dto: CreateCourseDto) {
    const slug = await uniqueSlug(dto.slug || dto.title, async (candidate) => {
      const found = await this.prisma.course.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return Boolean(found);
    });

    return this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        slug,
        subtitle: dto.subtitle?.trim() || null,
        description: dto.description,
        coverImage: dto.coverImage || null,
        promoVideoUrl: dto.promoVideoUrl?.trim() || null,
        instructorName: dto.instructorName.trim(),
        instructorBio: dto.instructorBio?.trim() || null,
        instructorAvatar: dto.instructorAvatar || null,
        priceCents: dto.priceCents,
        compareAtPriceCents: dto.compareAtPriceCents ?? null,
        workloadHours: dto.workloadHours ?? 1,
        level: dto.level,
        category: dto.category?.trim() || null,
        features: dto.features ?? [],
        published: dto.published ?? false,
        featured: dto.featured ?? false,
        order: dto.order ?? 0,
      },
    });
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    const existing = await this.getCourse(id);

    let slug: string | undefined;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = await uniqueSlug(dto.slug, async (candidate) => {
        const found = await this.prisma.course.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        return Boolean(found && found.id !== id);
      });
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(slug ? { slug } : {}),
        ...(dto.subtitle !== undefined
          ? { subtitle: dto.subtitle?.trim() || null }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage } : {}),
        ...(dto.promoVideoUrl !== undefined
          ? { promoVideoUrl: dto.promoVideoUrl?.trim() || null }
          : {}),
        ...(dto.instructorName !== undefined
          ? { instructorName: dto.instructorName.trim() }
          : {}),
        ...(dto.instructorBio !== undefined
          ? { instructorBio: dto.instructorBio?.trim() || null }
          : {}),
        ...(dto.instructorAvatar !== undefined
          ? { instructorAvatar: dto.instructorAvatar }
          : {}),
        ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
        ...(dto.compareAtPriceCents !== undefined
          ? { compareAtPriceCents: dto.compareAtPriceCents }
          : {}),
        ...(dto.workloadHours !== undefined
          ? { workloadHours: dto.workloadHours }
          : {}),
        ...(dto.level !== undefined ? { level: dto.level } : {}),
        ...(dto.category !== undefined
          ? { category: dto.category?.trim() || null }
          : {}),
        ...(dto.features !== undefined ? { features: dto.features } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
        ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });

    if (
      dto.coverImage !== undefined &&
      existing.coverImage &&
      existing.coverImage !== dto.coverImage
    ) {
      await this.storage.remove(existing.coverImage);
    }
    if (
      dto.instructorAvatar !== undefined &&
      existing.instructorAvatar &&
      existing.instructorAvatar !== dto.instructorAvatar
    ) {
      await this.storage.remove(existing.instructorAvatar);
    }

    return updated;
  }

  async deleteCourse(id: string) {
    const course = await this.getCourse(id);
    await this.prisma.course.delete({ where: { id } });

    await this.storage.remove(course.coverImage);
    await this.storage.remove(course.instructorAvatar);
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (lesson.videoProvider === LessonVideoProvider.UPLOAD) {
          await this.storage.remove(lesson.videoUrl);
        }
        for (const mat of lesson.materials) {
          await this.storage.remove(mat.fileUrl);
        }
      }
    }
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Módulos e Aulas
  // ─────────────────────────────────────────────────────────────

  async createModule(courseId: string, dto: CreateCourseModuleDto) {
    await this.getCourse(courseId);
    const count = await this.prisma.courseModule.count({ where: { courseId } });
    return this.prisma.courseModule.create({
      data: {
        courseId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        order: dto.order ?? count,
      },
      include: { lessons: true },
    });
  }

  async updateModule(moduleId: string, dto: UpdateCourseModuleDto) {
    const mod = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
    });
    if (!mod) throw new NotFoundException('Módulo não encontrado.');

    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });
  }

  async deleteModule(moduleId: string) {
    const mod = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: { include: { materials: true } },
      },
    });
    if (!mod) throw new NotFoundException('Módulo não encontrado.');

    await this.prisma.courseModule.delete({ where: { id: moduleId } });

    for (const lesson of mod.lessons) {
      if (lesson.videoProvider === LessonVideoProvider.UPLOAD) {
        await this.storage.remove(lesson.videoUrl);
      }
      for (const mat of lesson.materials) {
        await this.storage.remove(mat.fileUrl);
      }
    }
    return { ok: true };
  }

  async reorderModules(courseId: string, ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.courseModule.updateMany({
          where: { id, courseId },
          data: { order: index },
        }),
      ),
    );
    return { ok: true };
  }

  async createLesson(moduleId: string, dto: CreateCourseLessonDto) {
    const mod = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
    });
    if (!mod) throw new NotFoundException('Módulo não encontrado.');

    const provider = dto.videoProvider ?? LessonVideoProvider.YOUTUBE;
    const videoUrl = this.normalizeLessonVideo(provider, dto.videoUrl);
    const count = await this.prisma.courseLesson.count({ where: { moduleId } });

    return this.prisma.courseLesson.create({
      data: {
        moduleId,
        title: dto.title.trim(),
        description: dto.description ?? null,
        videoProvider: provider,
        videoUrl,
        durationSeconds: dto.durationSeconds ?? 0,
        isFreePreview: dto.isFreePreview ?? false,
        published: dto.published ?? true,
        order: dto.order ?? count,
      },
      include: { materials: true },
    });
  }

  async updateLesson(lessonId: string, dto: UpdateCourseLessonDto) {
    const existing = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });
    if (!existing) throw new NotFoundException('Aula não encontrada.');

    const provider = dto.videoProvider ?? existing.videoProvider;
    const rawVideo =
      dto.videoUrl !== undefined ? dto.videoUrl : existing.videoUrl;
    const videoUrl = this.normalizeLessonVideo(provider, rawVideo);

    const updated = await this.prisma.courseLesson.update({
      where: { id: lessonId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        videoProvider: provider,
        videoUrl,
        ...(dto.durationSeconds !== undefined
          ? { durationSeconds: dto.durationSeconds }
          : {}),
        ...(dto.isFreePreview !== undefined
          ? { isFreePreview: dto.isFreePreview }
          : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
      include: { materials: { orderBy: { order: 'asc' } } },
    });

    if (
      existing.videoProvider === LessonVideoProvider.UPLOAD &&
      existing.videoUrl &&
      existing.videoUrl !== videoUrl
    ) {
      await this.storage.remove(existing.videoUrl);
    }

    return updated;
  }

  async deleteLesson(lessonId: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { materials: true },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada.');

    await this.prisma.courseLesson.delete({ where: { id: lessonId } });

    if (lesson.videoProvider === LessonVideoProvider.UPLOAD) {
      await this.storage.remove(lesson.videoUrl);
    }
    for (const mat of lesson.materials) {
      await this.storage.remove(mat.fileUrl);
    }
    return { ok: true };
  }

  async reorderLessons(moduleId: string, ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.courseLesson.updateMany({
          where: { id, moduleId },
          data: { order: index },
        }),
      ),
    );
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Materiais de Aula (Uploads)
  // ─────────────────────────────────────────────────────────────

  async addLessonMaterial(
    lessonId: string,
    file: Express.Multer.File | undefined,
    title?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada.');

    const saved = await this.storage.saveAny(file, ['pdf', 'image', 'video']);
    const count = await this.prisma.lessonMaterial.count({
      where: { lessonId },
    });

    return this.prisma.lessonMaterial.create({
      data: {
        lessonId,
        title: title?.trim() || file.originalname,
        fileUrl: saved.url,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: saved.mime,
        order: count,
      },
    });
  }

  async deleteLessonMaterial(materialId: string) {
    const mat = await this.prisma.lessonMaterial.findUnique({
      where: { id: materialId },
    });
    if (!mat) throw new NotFoundException('Material não encontrado.');

    await this.prisma.lessonMaterial.delete({ where: { id: materialId } });
    await this.storage.remove(mat.fileUrl);
    return { ok: true };
  }

  async uploadAcademyMedia(file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.storage.saveAny(file, ['image', 'video', 'pdf']);
  }

  // ─────────────────────────────────────────────────────────────
  // Cupons de Desconto
  // ─────────────────────────────────────────────────────────────

  async listCoupons() {
    return this.prisma.academyCoupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  }

  async createCoupon(dto: CreateCouponDto) {
    const code = dto.code.toUpperCase().replace(/\s+/g, '');
    if (dto.discountType === 'PERCENTAGE' && dto.discountValue > 100) {
      throw new BadRequestException(
        'O desconto percentual não pode ser maior que 100%.',
      );
    }

    try {
      return await this.prisma.academyCoupon.create({
        data: {
          code,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          maxUses: dto.maxUses ?? null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          courseId: dto.courseId || null,
          active: dto.active ?? true,
        },
        include: {
          course: { select: { id: true, title: true } },
        },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('Já existe um cupom com este código.');
      }
      throw error;
    }
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const existing = await this.prisma.academyCoupon.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Cupom não encontrado.');

    const discountType = dto.discountType ?? existing.discountType;
    const discountValue = dto.discountValue ?? existing.discountValue;
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      throw new BadRequestException(
        'O desconto percentual não pode ser maior que 100%.',
      );
    }

    return this.prisma.academyCoupon.update({
      where: { id },
      data: {
        ...(dto.code !== undefined
          ? { code: dto.code.toUpperCase().replace(/\s+/g, '') }
          : {}),
        ...(dto.discountType !== undefined
          ? { discountType: dto.discountType }
          : {}),
        ...(dto.discountValue !== undefined
          ? { discountValue: dto.discountValue }
          : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.courseId !== undefined
          ? { courseId: dto.courseId || null }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  }

  async deleteCoupon(id: string) {
    await this.prisma.academyCoupon.delete({ where: { id } });
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Alunos, Matrículas (inclusive Cortesia) e Pedidos
  // ─────────────────────────────────────────────────────────────

  async listStudents() {
    const students = await this.prisma.student.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        avatarUrl: true,
        active: true,
        createdAt: true,
        enrollments: {
          orderBy: { createdAt: 'desc' },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                modules: {
                  select: {
                    lessons: {
                      where: { published: true },
                      select: { id: true },
                    },
                  },
                },
              },
            },
            progress: {
              where: { completed: true },
              select: { lessonId: true },
            },
          },
        },
      },
    });

    return students.map((student) => ({
      ...student,
      enrollments: student.enrollments.map((enrollment) => {
        const totalLessons = enrollment.course.modules.reduce(
          (sum, m) => sum + m.lessons.length,
          0,
        );
        const completedLessons = enrollment.progress.length;
        const progressPercent =
          totalLessons > 0
            ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
            : 0;
        return {
          id: enrollment.id,
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          courseSlug: enrollment.course.slug,
          source: enrollment.source,
          status: enrollment.status,
          completedAt: enrollment.completedAt,
          certificateCode: enrollment.certificateCode,
          progressPercent,
          createdAt: enrollment.createdAt,
        };
      }),
    }));
  }

  /**
   * Libera manualmente o acesso a um curso para um aluno (existente ou criado na hora).
   */
  async grantManualEnrollment(dto: ManualEnrollmentDto, adminUserId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) throw new NotFoundException('Curso não encontrado.');

    let studentId = dto.studentId;
    let studentRecord: { id: string; name: string; email: string } | null =
      null;

    if (studentId) {
      studentRecord = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, email: true },
      });
      if (!studentRecord) throw new NotFoundException('Aluno não encontrado.');
    } else if (dto.studentEmail) {
      const email = dto.studentEmail.toLowerCase().trim();
      studentRecord = await this.prisma.student.findUnique({
        where: { email },
        select: { id: true, name: true, email: true },
      });

      if (!studentRecord) {
        if (!dto.studentName?.trim()) {
          throw new BadRequestException(
            'Informe o nome do novo aluno para criar a conta e matricular.',
          );
        }
        const rawPassword =
          dto.studentPassword?.trim() || randomBytes(6).toString('hex');
        const passwordHash = await bcrypt.hash(rawPassword, 12);
        studentRecord = await this.prisma.student.create({
          data: {
            name: dto.studentName.trim(),
            email,
            password: passwordHash,
            active: true,
          },
          select: { id: true, name: true, email: true },
        });
      }
      studentId = studentRecord.id;
    } else {
      throw new BadRequestException(
        'Selecione um aluno existente ou informe o e-mail do aluno.',
      );
    }

    const enrollment = await this.prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: studentRecord.id,
          courseId: course.id,
        },
      },
      update: {
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.ADMIN_GRANT,
        grantedById: adminUserId,
      },
      create: {
        studentId: studentRecord.id,
        courseId: course.id,
        source: EnrollmentSource.ADMIN_GRANT,
        grantedById: adminUserId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    void this.emailTemplates.sendByTrigger(
      EmailTriggerType.ACADEMY_ADMIN_GRANT,
      studentRecord.email,
      {
        student: {
          name: studentRecord.name,
          first_name: this.getFirstName(studentRecord.name),
          email: studentRecord.email,
        },
        course: {
          title: course.title,
          instructor: course.instructorName,
          workload_hours: String(course.workloadHours),
          url: `${config.frontendUrl}/academy/aula/${course.slug}`,
        },
      },
    );

    return enrollment;
  }

  async updateEnrollmentStatus(enrollmentId: string, status: EnrollmentStatus) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!existing) throw new NotFoundException('Matrícula não encontrada.');

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status },
    });
  }

  async listOrders() {
    return this.prisma.courseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true, cpf: true } },
        course: { select: { id: true, title: true, slug: true } },
        coupon: { select: { id: true, code: true } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Comentários / Dúvidas nas Aulas (Moderação e Resposta)
  // ─────────────────────────────────────────────────────────────

  async listComments() {
    return this.prisma.lessonComment.findMany({
      where: { parentCommentId: null },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        adminUser: {
          select: { id: true, name: true, avatarUrl: true },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                id: true,
                title: true,
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
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

  async replyComment(
    commentId: string,
    adminUserId: string,
    dto: CreateLessonCommentDto,
  ) {
    const parent = await this.prisma.lessonComment.findUnique({
      where: { id: commentId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        lesson: {
          include: {
            module: {
              include: {
                course: { select: { id: true, title: true, slug: true } },
              },
            },
          },
        },
      },
    });
    if (!parent) throw new NotFoundException('Comentário não encontrado.');

    const reply = await this.prisma.lessonComment.create({
      data: {
        content: dto.content.trim(),
        lessonId: parent.lessonId,
        adminUserId,
        parentCommentId: parent.id,
      },
      include: {
        adminUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (parent.student?.email) {
      const course = parent.lesson.module.course;
      void this.emailTemplates.sendByTrigger(
        EmailTriggerType.ACADEMY_COMMENT_REPLY,
        parent.student.email,
        {
          student: {
            name: parent.student.name,
            first_name: this.getFirstName(parent.student.name),
            email: parent.student.email,
          },
          course: {
            title: course.title,
            url: `${config.frontendUrl}/academy/aula/${course.slug}?lesson=${parent.lessonId}`,
          },
          lesson: {
            title: parent.lesson.title,
          },
          reply_content: reply.content,
        },
      );
    }

    return reply;
  }

  async deleteComment(commentId: string) {
    await this.prisma.lessonComment.delete({ where: { id: commentId } });
    return { ok: true };
  }
}
