import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ID = 'dQw4w9WgXcQ';
const valid = {
  clientName: 'Marina Souza',
  role: 'Diretora de Marketing',
  company: 'Aurora Cosméticos',
  quote:
    'Pela primeira vez estratégia, vídeo e influência falaram a mesma língua.',
  videoUrl: `https://www.youtube.com/shorts/${ID}`,
};

describe('Depoimentos (e2e, Prisma mockado)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let users: Record<string, unknown>;

  const prisma = {
    user: { findUnique: jest.fn(), count: jest.fn().mockResolvedValue(1) },
    role: { count: jest.fn().mockResolvedValue(1) },
    testimonial: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const as = (id: string) => ({
    Authorization: `Bearer ${jwt.sign({ sub: id })}`,
  });
  const server = () => app.getHttpServer();
  const person = (id: string, permissions: string[], isOwner = false) => ({
    id,
    email: `${id}@x.com`,
    name: id,
    isOwner,
    active: true,
    role: isOwner ? null : { id: 'r', name: 'Cargo', permissions },
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    jwt = app.get(JwtService);
  });
  afterAll(() => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    users = {};
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(users[where.id] ?? null),
    );
    prisma.testimonial.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: 't1', ...data }),
    );
  });

  it('a listagem pública é aberta e só traz depoimentos ativos', async () => {
    prisma.testimonial.findMany.mockResolvedValue([
      { id: 't1', youtubeId: ID },
    ]);
    const res = await request(server()).get('/api/testimonials').expect(200);
    expect(res.body).toHaveLength(1);
    const [args] = prisma.testimonial.findMany.mock.calls[0] as [
      { where: { active: boolean } },
    ];
    expect(args.where).toEqual({ active: true });
  });

  it('o painel exige permissão específica de depoimentos', async () => {
    users.u1 = person('u1', ['articles.view', 'articles.create']);
    await request(server())
      .get('/api/admin/testimonials')
      .set(as('u1'))
      .expect(403);
    await request(server())
      .post('/api/admin/testimonials')
      .set(as('u1'))
      .send(valid)
      .expect(403);
  });

  it('quem tem testimonials.create cadastra, e guarda só o ID do vídeo', async () => {
    users.u1 = person('u1', ['testimonials.create']);
    await request(server())
      .post('/api/admin/testimonials')
      .set(as('u1'))
      .send(valid)
      .expect(201);

    const [args] = prisma.testimonial.create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(args.data.youtubeId).toBe(ID);
    expect(args.data.videoUrl).toBeUndefined(); // o link original nunca é persistido
    expect(args.data.clientName).toBe('Marina Souza');
  });

  it('só "ver" não permite cadastrar', async () => {
    users.u1 = person('u1', ['testimonials.view']);
    await request(server())
      .post('/api/admin/testimonials')
      .set(as('u1'))
      .send(valid)
      .expect(403);
  });

  describe('vídeo enviado como arquivo (alternativa ao YouTube)', () => {
    beforeEach(() => {
      users.o1 = person('o1', [], true);
    });
    const { videoUrl: _omit, ...withoutLink } = valid;
    void _omit;
    const post = (body: object) =>
      request(server())
        .post('/api/admin/testimonials')
        .set(as('o1'))
        .send(body);

    it('cadastra com arquivo enviado e não grava ID do YouTube', async () => {
      await post({ ...withoutLink, videoFile: '/uploads/abc.mp4' }).expect(201);
      const [args] = prisma.testimonial.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(args.data.videoFile).toBe('/uploads/abc.mp4');
      expect(args.data.youtubeId).toBeNull();
    });

    it('recusa quando não há nenhuma fonte de vídeo', async () => {
      await post(withoutLink).expect(400);
      expect(prisma.testimonial.create).not.toHaveBeenCalled();
    });

    it('recusa as duas fontes ao mesmo tempo', async () => {
      await post({ ...valid, videoFile: '/uploads/abc.mp4' }).expect(400);
      expect(prisma.testimonial.create).not.toHaveBeenCalled();
    });

    it.each([
      ['link externo de arquivo', 'https://outro-site.com/video.mp4'],
      ['caminho fora das pastas de upload', '/etc/passwd'],
      ['URL sem protocolo', '//evil.com/uploads/x.mp4'],
    ])('recusa %s', async (_label, videoFile) => {
      await post({ ...withoutLink, videoFile }).expect(400);
      expect(prisma.testimonial.create).not.toHaveBeenCalled();
    });

    it('ao trocar o arquivo por um link do YouTube, limpa o arquivo antigo', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({
        id: 't1',
        photo: null,
        youtubeId: null,
        videoFile: '/uploads/antigo.mp4',
      });
      prisma.testimonial.update.mockImplementation(
        ({ data }: { data: object }) => Promise.resolve({ id: 't1', ...data }),
      );
      await request(server())
        .patch('/api/admin/testimonials/t1')
        .set(as('o1'))
        .send({ videoUrl: `https://youtu.be/${ID}` })
        .expect(200);

      const [args] = prisma.testimonial.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(args.data.youtubeId).toBe(ID);
      expect(args.data.videoFile).toBeNull();
    });

    it('não deixa o depoimento sem nenhuma fonte ao editar', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({
        id: 't1',
        photo: null,
        youtubeId: ID,
        videoFile: null,
      });
      await request(server())
        .patch('/api/admin/testimonials/t1')
        .set(as('o1'))
        .send({ videoUrl: null })
        .expect(400);
      expect(prisma.testimonial.update).not.toHaveBeenCalled();
    });

    it('editar só o texto mantém a fonte atual', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({
        id: 't1',
        photo: null,
        youtubeId: ID,
        videoFile: null,
      });
      prisma.testimonial.update.mockResolvedValue({ id: 't1' });
      await request(server())
        .patch('/api/admin/testimonials/t1')
        .set(as('o1'))
        .send({ company: 'Nova Empresa' })
        .expect(200);
      const [args] = prisma.testimonial.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(args.data.youtubeId).toBeUndefined();
      expect(args.data.videoFile).toBeUndefined();
    });
  });

  describe('validação do cadastro', () => {
    beforeEach(() => {
      users.o1 = person('o1', [], true);
    });
    const post = (patch: object) =>
      request(server())
        .post('/api/admin/testimonials')
        .set(as('o1'))
        .send({ ...valid, ...patch });

    it.each([
      ['link de outro site', { videoUrl: 'https://vimeo.com/123456789' }],
      [
        'domínio falso do YouTube',
        { videoUrl: `https://youtube.com.golpe.com/watch?v=${ID}` },
      ],
      [
        'link de canal (sem vídeo)',
        { videoUrl: 'https://www.youtube.com/@picplus' },
      ],
      ['frase curta demais', { quote: 'bom' }],
      ['frase longa demais', { quote: 'x'.repeat(281) }],
      ['nome sem letras', { clientName: '123' }],
      ['empresa vazia', { company: '' }],
      ['orientação inválida', { orientation: 'quadrado' }],
    ])('recusa: %s', async (_label, patch) => {
      await post(patch).expect(400);
      expect(prisma.testimonial.create).not.toHaveBeenCalled();
    });

    it('aceita vários formatos de link e os reduz ao mesmo ID', async () => {
      for (const videoUrl of [
        `https://youtu.be/${ID}`,
        `https://www.youtube.com/watch?v=${ID}`,
        ID,
      ]) {
        await post({ videoUrl }).expect(201);
      }
      const ids = (
        prisma.testimonial.create.mock.calls as [
          { data: { youtubeId: string } },
        ][]
      ).map(([args]) => args.data.youtubeId);
      expect(ids).toEqual([ID, ID, ID]);
    });
  });
});
