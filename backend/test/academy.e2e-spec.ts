import { PGlite } from '@electric-sql/pglite';
import { JwtService } from '@nestjs/jwt';
import {
  CouponDiscountType,
  CourseLevel,
  EmailTriggerType,
  LessonVideoProvider,
  PrismaClient,
} from '@prisma/client';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AcademyAdminService } from '../src/academy/academy-admin.service';
import { AcademyAuthService } from '../src/academy/academy-auth.service';
import { AcademyStudentService } from '../src/academy/academy-student.service';
import { MercadoPagoService } from '../src/academy/mercado-pago.service';
import { EmailRendererService } from '../src/email-templates/email-renderer.service';
import { EmailTemplatesService } from '../src/email-templates/email-templates.service';
import type { MailService } from '../src/mail/mail.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import type { StorageService } from '../src/storage/storage.service';

describe('PicPlus Academy & Templates de E-mail (integração, PGlite)', () => {
  let db: PGlite;
  let prisma: PrismaClient;
  let emailRenderer: EmailRendererService;
  let emailTemplates: EmailTemplatesService;
  let academyAuth: AcademyAuthService;
  let academyAdmin: AcademyAdminService;
  let academyStudent: AcademyStudentService;

  const sentEmails: Array<{
    to: string | string[];
    subject: string;
    html: string;
  }> = [];

  const mailMock: Partial<MailService> = {
    send: (params: {
      to: string | string[];
      subject: string;
      html: string;
    }) => {
      sentEmails.push(params);
      return Promise.resolve(true);
    },
  };

  const storageMock: Partial<StorageService> = {
    saveAny: (file: { originalname: string }) =>
      Promise.resolve({
        url: `/uploads/${file.originalname}`,
        mime: 'application/pdf',
      }),
    remove: () => Promise.resolve(),
  };

  let adminUser: { id: string; name: string };

  beforeAll(async () => {
    db = new PGlite();
    const dir = join(__dirname, '../prisma/migrations');
    for (const name of readdirSync(dir).sort()) {
      const file = join(dir, name, 'migration.sql');
      try {
        await db.exec(readFileSync(file, 'utf8'));
      } catch {
        /* ignore non-migration folders */
      }
    }

    const adapter = new PrismaPGlite(db);
    prisma = new PrismaClient({ adapter });

    const prismaSvc = prisma as unknown as PrismaService;
    emailRenderer = new EmailRendererService();
    emailTemplates = new EmailTemplatesService(
      prismaSvc,
      emailRenderer,
      mailMock as MailService,
    );
    await emailTemplates.onApplicationBootstrap();

    const jwt = new JwtService({ secret: 'test-secret' });
    academyAuth = new AcademyAuthService(
      prismaSvc,
      jwt,
      storageMock as StorageService,
      emailTemplates,
    );
    const mp = new MercadoPagoService();
    academyAdmin = new AcademyAdminService(
      prismaSvc,
      storageMock as StorageService,
      emailTemplates,
    );
    academyStudent = new AcademyStudentService(prismaSvc, mp, emailTemplates);

    adminUser = await prisma.user.create({
      data: {
        name: 'Admin PicPlus',
        email: 'admin@picplus.com.br',
        password: 'hash',
        isOwner: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await db.close();
  });

  it('semeia os 6 templates padrão de e-mail e renderiza merge tags estilo Maskot Edu', async () => {
    const list = await emailTemplates.findAll();
    expect(list.length).toBeGreaterThanOrEqual(6);

    const welcomeTpl = list.find(
      (t) => t.trigger === EmailTriggerType.ACADEMY_WELCOME,
    );
    expect(welcomeTpl).toBeDefined();

    const preview = emailTemplates.renderTemplateContent(
      {
        subject: 'Bem-vindo, {{student.first_name}} ao {{course.title}}!',
        body: '<p>Olá {{student.name}}</p>',
      },
      {
        student: { name: 'Lucas Silva', first_name: 'Lucas' },
        course: { title: 'Dominando Reels' },
      },
    );
    expect(preview.subject).toBe('Bem-vindo, Lucas ao Dominando Reels!');
    expect(preview.html).toContain('Lucas Silva');

    const tplPreview = await emailTemplates.previewTemplate(welcomeTpl!.id);
    expect(tplPreview.subject).toContain('Camila');
  });

  it('cria curso, módulos, aulas, cupom, realiza matrícula, progresso 100% e emite certificado', async () => {
    const course = await academyAdmin.createCourse({
      title: 'Formação Audiovisual PicPlus',
      subtitle: 'Do roteiro à edição profissional',
      description: 'Curso prático completo.',
      instructorName: 'Equipe PicPlus',
      priceCents: 20000,
      compareAtPriceCents: 29700,
      workloadHours: 12,
      level: CourseLevel.INTERMEDIATE,
      category: 'Audiovisual',
      published: true,
      featured: true,
    });

    const mod = await academyAdmin.createModule(course.id, {
      title: 'Módulo 1 — Fundamentos',
      description: 'Introdução prática',
    });

    const lesson1 = await academyAdmin.createLesson(mod.id, {
      title: 'Aula 1 — Boas-vindas (Prévia Grátis)',
      videoProvider: LessonVideoProvider.YOUTUBE,
      videoUrl: 'dQw4w9WgXcQ',
      durationSeconds: 300,
      isFreePreview: true,
      published: true,
    });

    const lesson2 = await academyAdmin.createLesson(mod.id, {
      title: 'Aula 2 — Iluminação de Estúdio',
      videoProvider: LessonVideoProvider.VIMEO,
      videoUrl: '123456789',
      durationSeconds: 600,
      isFreePreview: false,
      published: true,
    });

    // Verifica que a vitrine pública oculta o videoUrl da aula paga, mas exibe a prévia
    const publicDetail = await academyStudent.getPublicCourseBySlug(
      course.slug,
    );
    const pubLessons = publicDetail.modules[0].lessons;
    expect(pubLessons.find((l) => l.id === lesson1.id)?.videoUrl).toBe(
      'dQw4w9WgXcQ',
    );
    expect(pubLessons.find((l) => l.id === lesson2.id)?.videoUrl).toBeNull();

    // Cria cupom de 25% de desconto
    await academyAdmin.createCoupon({
      code: 'PIC25',
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 25,
      courseId: course.id,
      active: true,
    });

    const couponCheck = await academyStudent.validateCoupon({
      code: 'pic25',
      courseId: course.id,
    });
    expect(couponCheck.discountCents).toBe(5000);
    expect(couponCheck.finalPriceCents).toBe(15000);

    // Registra aluno
    const reg = await academyAuth.register({
      name: 'Mariana Costa',
      email: 'mariana@aluno.com',
      password: 'password123',
      cpf: '123.456.789-01',
    });
    expect(reg.accessToken).toBeTruthy();

    // Inicia checkout com cupom e aprova via verificação de retorno simulado
    const checkout = await academyStudent.createCheckout(reg.student.id, {
      courseId: course.id,
      couponCode: 'PIC25',
    });
    expect(checkout.freeEnrollment).toBe(false);

    const verifiedOrder = await academyStudent.verifyAndSyncOrder(
      reg.student.id,
      checkout.orderId,
      { simulated: '1', status: 'approved' },
    );
    expect(verifiedOrder?.status).toBe('APPROVED');
    expect(verifiedOrder?.finalPriceCents).toBe(15000);

    // Aluno acessa sala de aula
    const classroom = await academyStudent.getClassroomCourse(
      reg.student.id,
      course.slug,
    );
    expect(classroom.enrollment.progressPercent).toBe(0);
    expect(classroom.course.modules[0].lessons[1].videoUrl).toBe('123456789');

    // Conclui Aula 1 (50%)
    const prog1 = await academyStudent.updateLessonProgress(
      reg.student.id,
      lesson1.id,
      { completed: true },
    );
    expect(prog1.progressPercent).toBe(50);
    expect(prog1.certificateCode).toBeNull();

    // Conclui Aula 2 (100% -> emite certificado automaticamente!)
    const prog2 = await academyStudent.updateLessonProgress(
      reg.student.id,
      lesson2.id,
      { completed: true },
    );
    expect(prog2.progressPercent).toBe(100);
    expect(prog2.certificateCode).toMatch(/^PIC-\d{4}-[A-Z0-9]+$/);

    // Verifica certificado publicamente
    const certData = await academyStudent.getCertificateByCode(
      prog2.certificateCode!,
    );
    expect(certData.studentName).toBe('Mariana Costa');
    expect(certData.studentCpfMasked).toBe('***.456.789-**');
    expect(certData.courseTitle).toBe('Formação Audiovisual PicPlus');

    // Aluno envia dúvida na aula e Admin responde
    const comment = await academyStudent.createLessonComment(
      reg.student.id,
      lesson2.id,
      { content: 'Qual softbox vocês recomendam?' },
    );
    const reply = await academyAdmin.replyComment(comment.id, adminUser.id, {
      content: 'Recomendamos octabox de 90cm com grid!',
    });
    expect(reply.parentCommentId).toBe(comment.id);

    const thread = await academyStudent.listLessonComments(
      reg.student.id,
      lesson2.id,
    );
    expect(thread[0].replies).toHaveLength(1);
    expect(thread[0].replies[0].content).toContain('octabox de 90cm');
  });
});
