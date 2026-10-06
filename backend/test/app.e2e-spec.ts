import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { readdirSync } from 'node:fs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { config } from '../src/config/configuration';
import { PrismaService } from '../src/prisma/prisma.service';

// PNG 1x1 válido (assinatura real, aceita pela validação por magic bytes).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('API (e2e, Prisma mockado)', () => {
  let app: INestApplication;
  let adminHash: string;

  const prisma: any = {
    user: { findUnique: jest.fn(), count: jest.fn().mockResolvedValue(1) },
    role: { count: jest.fn().mockResolvedValue(1) },
    contactRequest: { create: jest.fn() },
    service: { findMany: jest.fn() },
    influencer: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    adminHash = await bcrypt.hash('SenhaForte123', 4);
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
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  const server = () => app.getHttpServer();

  it('GET /api/health é público', async () => {
    const res = await request(server()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  describe('autenticação', () => {
    it('bloqueia rotas administrativas sem token', async () => {
      await request(server()).get('/api/admin/services').expect(401);
      await request(server()).get('/api/admin/influencers').expect(401);
      await request(server()).post('/api/admin/uploads').expect(401);
    });

    it('rejeita token inválido', async () => {
      await request(server())
        .get('/api/admin/services')
        .set('Authorization', 'Bearer abc.def.ghi')
        .expect(401);
    });

    it('rejeita credenciais erradas com mensagem genérica', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: 'x@x.com', password: 'qualquer' })
        .expect(401);
      expect(res.body.message).toBe('E-mail ou senha incorretos.');
    });

    it('autentica e libera o acesso administrativo', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'admin@picplus.com.br',
        name: 'Admin',
        password: adminHash,
        active: true,
        isOwner: true,
        role: null,
      });
      const login = await request(server())
        .post('/api/auth/login')
        .send({ email: 'ADMIN@picplus.com.br', password: 'SenhaForte123' })
        .expect(200);
      expect(login.body.accessToken).toBeDefined();

      prisma.service.findMany.mockResolvedValue([
        { id: 's1', name: 'Serviço' },
      ]);
      const res = await request(server())
        .get('/api/admin/services')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('contato', () => {
    it('valida o corpo', async () => {
      const res = await request(server())
        .post('/api/contacts')
        .send({ name: 'A', email: 'invalido', message: 'curta' })
        .expect(400);
      expect(res.body.message.length).toBeGreaterThanOrEqual(3);
    });

    it('registra um pedido de orçamento', async () => {
      prisma.contactRequest.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'c1', ...data }),
      );
      await request(server())
        .post('/api/contacts')
        .send({
          name: 'Maria Souza',
          email: 'Maria@Empresa.com',
          message: 'Gostaria de um orçamento para campanha.',
          type: 'BUDGET',
          budgetRange: 'R$ 10 mil – R$ 25 mil',
        })
        .expect(201);
      const saved = prisma.contactRequest.create.mock.calls[0][0].data;
      expect(saved.type).toBe('BUDGET');
      expect(saved.email).toBe('maria@empresa.com'); // normalizado
    });

    it('descarta silenciosamente envios de bots (honeypot)', async () => {
      await request(server())
        .post('/api/contacts')
        .send({
          name: 'Bot',
          email: 'bot@spam.com',
          message: 'mensagem spam longa',
          website: 'http://spam',
        })
        .expect(201);
      expect(prisma.contactRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('cadastro de influenciador', () => {
    const fill = (req: request.Test) =>
      req
        .field('name', 'Ana Lima')
        .field('email', 'ana@exemplo.com')
        .field('whatsapp', '(11) 98888-7777')
        .field('niche', 'Moda')
        .field('instagram', '@analima')
        .field('acceptTerms', 'true');

    it('cria o cadastro como PENDING, salva a imagem e normaliza redes', async () => {
      prisma.influencer.findUnique.mockResolvedValue(null);
      prisma.influencer.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'i1', status: 'PENDING', ...data }),
      );

      await fill(request(server()).post('/api/influencers/register'))
        .attach('profileImage', PNG, {
          filename: 'foto.png',
          contentType: 'image/png',
        })
        .expect(201);

      const data = prisma.influencer.create.mock.calls[0][0].data;
      expect(data.socialNetworks).toEqual({
        instagram: 'https://instagram.com/analima',
      });
      expect(data.profileImage).toMatch(/^\/uploads\/.+\.png$/);
      expect(readdirSync(config.uploads.dir).length).toBeGreaterThan(0);
    });

    it('rejeita arquivo que não é imagem mesmo com extensão .png', async () => {
      prisma.influencer.findUnique.mockResolvedValue(null);
      await fill(request(server()).post('/api/influencers/register'))
        .attach(
          'profileImage',
          Buffer.from('isto não é uma imagem de verdade'),
          {
            filename: 'falso.png',
            contentType: 'image/png',
          },
        )
        .expect(400);
      expect(prisma.influencer.create).not.toHaveBeenCalled();
    });

    it('exige aceite dos termos e ao menos uma rede social', async () => {
      await request(server())
        .post('/api/influencers/register')
        .field('name', 'Ana Lima')
        .field('email', 'ana@exemplo.com')
        .field('whatsapp', '11988887777')
        .field('niche', 'Moda')
        .expect(400);
    });

    it('impede e-mail duplicado', async () => {
      prisma.influencer.findUnique.mockResolvedValue({ id: 'existente' });
      await fill(request(server()).post('/api/influencers/register'))
        .attach('profileImage', PNG, {
          filename: 'foto.png',
          contentType: 'image/png',
        })
        .expect(409);
    });

    it('vitrine pública não expõe e-mail nem WhatsApp', async () => {
      prisma.influencer.findMany.mockResolvedValue([]);
      prisma.influencer.count.mockResolvedValue(0);
      await request(server()).get('/api/influencers/showcase').expect(200);
      const select = prisma.influencer.findMany.mock.calls[0][0].select;
      expect(select.email).toBeUndefined();
      expect(select.whatsapp).toBeUndefined();
      expect(prisma.influencer.findMany.mock.calls[0][0].where).toMatchObject({
        status: 'APPROVED',
        showOnShowcase: true,
      });
    });
  });
});
