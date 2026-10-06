import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  ANY_PERMISSION_KEY,
  AUTHENTICATED_KEY,
  PERMISSIONS_KEY,
  RESOURCE_KEY,
} from '../src/common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../src/common/decorators/public.decorator';
import { PrismaService } from '../src/prisma/prisma.service';

interface FakeRole {
  id: string;
  name: string;
  permissions: string[];
}
interface FakeUser {
  id: string;
  email: string;
  name: string;
  isOwner: boolean;
  active: boolean;
  createdAt: Date;
  role: FakeRole | null;
}

const role = (id: string, permissions: string[]): FakeRole => ({
  id,
  name: `Cargo ${id}`,
  permissions,
});
const user = (id: string, over: Partial<FakeUser> = {}): FakeUser => ({
  id,
  email: `${id}@picplus.com`,
  name: `Usuário ${id}`,
  isOwner: false,
  active: true,
  createdAt: new Date(),
  role: null,
  ...over,
});

describe('Controle de acesso (e2e, Prisma mockado)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let users: Record<string, FakeUser>;
  let roles: Record<string, FakeRole & { _count: { users: number } }>;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    article: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    influencer: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const tokenFor = (id: string) => jwt.sign({ sub: id });
  const as = (id: string) => ({ Authorization: `Bearer ${tokenFor(id)}` });
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DiscoveryModule],
    })
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
    roles = {};
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { id?: string } }) =>
        Promise.resolve(where.id ? (users[where.id] ?? null) : null),
    );
    prisma.role.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(roles[where.id] ?? null),
    );
    prisma.user.count.mockResolvedValue(1);
    prisma.user.update.mockImplementation(
      ({ where, data }: { where: { id: string }; data: Partial<FakeUser> }) =>
        Promise.resolve({ ...users[where.id], ...data }),
    );
    prisma.user.create.mockImplementation(
      ({ data }: { data: Partial<FakeUser> }) =>
        Promise.resolve(user('novo', { ...data, role: null })),
    );
    prisma.article.findUnique.mockResolvedValue({
      id: 'a1',
      title: 'T',
      published: false,
      publishedAt: null,
      coverImage: null,
    });
    prisma.article.update.mockResolvedValue({ id: 'a1' });
    prisma.role.delete.mockResolvedValue({});
  });

  const addRole = (r: FakeRole, userCount = 0) =>
    (roles[r.id] = { ...r, _count: { users: userCount } });

  describe('autenticação e sessão', () => {
    it('sem token → 401', async () => {
      await request(server()).get('/api/admin/users').expect(401);
    });

    it('usuário desativado perde o acesso mesmo com token válido', async () => {
      users.u1 = user('u1', { isOwner: true, active: false });
      await request(server()).get('/api/admin/users').set(as('u1')).expect(401);
    });

    it('usuário excluído → 401', async () => {
      await request(server())
        .get('/api/admin/users')
        .set(as('fantasma'))
        .expect(401);
    });
  });

  describe('permissões por cargo', () => {
    it('só "ver" não dá permissão de criar ou excluir', async () => {
      users.u1 = user('u1', { role: role('r1', ['articles.view']) });
      await request(server())
        .get('/api/admin/articles')
        .set(as('u1'))
        .expect(200);
      await request(server())
        .post('/api/admin/articles')
        .set(as('u1'))
        .send({
          title: 'Novo artigo',
          content: 'conteúdo com mais de vinte caracteres',
        })
        .expect(403);
      await request(server())
        .delete('/api/admin/articles/a1')
        .set(as('u1'))
        .expect(403);
    });

    it('mudança de cargo vale na hora, com o mesmo token', async () => {
      users.u1 = user('u1', { role: role('r1', ['articles.view']) });
      await request(server())
        .get('/api/admin/articles')
        .set(as('u1'))
        .expect(200);

      users.u1 = user('u1', { role: role('r1', []) }); // cargo perdeu a permissão
      await request(server())
        .get('/api/admin/articles')
        .set(as('u1'))
        .expect(403);
    });

    it('usuário sem cargo não acessa nada administrativo', async () => {
      users.u1 = user('u1');
      await request(server())
        .get('/api/admin/articles')
        .set(as('u1'))
        .expect(403);
    });

    it('aprovar exige influencers.review (editar não basta)', async () => {
      users.u1 = user('u1', { role: role('r1', ['influencers.edit']) });
      await request(server())
        .post('/api/admin/influencers/i1/approve')
        .set(as('u1'))
        .send({})
        .expect(403);
    });

    it('proprietário acessa tudo', async () => {
      users.o1 = user('o1', { isOwner: true });
      prisma.user.findMany.mockResolvedValue([]);
      await request(server()).get('/api/admin/users').set(as('o1')).expect(200);
    });

    it('/auth/me devolve cargo e permissões efetivas', async () => {
      users.u1 = user('u1', { role: role('r1', ['cases.view']) });
      const res = await request(server())
        .get('/api/auth/me')
        .set(as('u1'))
        .expect(200);
      expect(res.body.permissions).toEqual(['cases.view']);
      expect(res.body.role.name).toBe('Cargo r1');
    });
  });

  describe('publicar artigos é permissão à parte', () => {
    it('quem só edita não consegue publicar', async () => {
      users.u1 = user('u1', { role: role('r1', ['articles.edit']) });
      await request(server())
        .patch('/api/admin/articles/a1')
        .set(as('u1'))
        .send({ published: true })
        .expect(403);
    });

    it('quem só edita pode salvar sem mudar o status de publicação', async () => {
      users.u1 = user('u1', { role: role('r1', ['articles.edit']) });
      await request(server())
        .patch('/api/admin/articles/a1')
        .set(as('u1'))
        .send({ title: 'Título novo', published: false })
        .expect(200);
    });

    it('com articles.publish, publica', async () => {
      users.u1 = user('u1', {
        role: role('r1', ['articles.edit', 'articles.publish']),
      });
      await request(server())
        .patch('/api/admin/articles/a1')
        .set(as('u1'))
        .send({ published: true })
        .expect(200);
    });
  });

  describe('anti-escalada de privilégios', () => {
    const gerente = () =>
      user('g1', {
        role: role('rg', [
          'users.view',
          'users.create',
          'users.edit',
          'users.delete',
          'roles.view',
          'articles.view',
        ]),
      });

    it('não atribui um cargo com permissões que o próprio usuário não tem', async () => {
      users.g1 = gerente();
      users.u2 = user('u2', { role: role('rg', ['articles.view']) });
      addRole(role('adm', ['articles.view', 'users.view', 'cases.delete']));

      await request(server())
        .patch('/api/admin/users/u2')
        .set(as('g1'))
        .send({ roleId: 'adm' })
        .expect(403);
    });

    it('não cria usuário com cargo mais forte que o seu', async () => {
      users.g1 = gerente();
      addRole(role('adm', ['cases.delete']));
      await request(server())
        .post('/api/admin/users')
        .set(as('g1'))
        .send({
          name: 'Novo',
          email: 'novo@x.com',
          password: 'SenhaForte123',
          roleId: 'adm',
        })
        .expect(403);
    });

    it('não redefine a senha de quem tem mais permissões (tomada de conta)', async () => {
      users.g1 = gerente();
      users.chefe = user('chefe', {
        role: role('rc', ['articles.view', 'cases.delete']),
      });
      await request(server())
        .patch('/api/admin/users/chefe')
        .set(as('g1'))
        .send({ password: 'NovaSenha1234' })
        .expect(403);
    });

    it('não mexe em proprietário nem cria proprietário', async () => {
      users.g1 = gerente();
      users.o1 = user('o1', { isOwner: true });
      await request(server())
        .patch('/api/admin/users/o1')
        .set(as('g1'))
        .send({ name: 'Hackeado' })
        .expect(403);
      await request(server())
        .post('/api/admin/users')
        .set(as('g1'))
        .send({
          name: 'Novo',
          email: 'n@x.com',
          password: 'SenhaForte123',
          isOwner: true,
        })
        .expect(403);
    });

    it('não edita um cargo acrescentando permissões que não possui', async () => {
      users.g1 = user('g1', {
        role: role('rg', ['roles.view', 'roles.edit', 'articles.view']),
      });
      addRole(role('rx', ['articles.view']));
      await request(server())
        .patch('/api/admin/roles/rx')
        .set(as('g1'))
        .send({ permissions: ['articles.view', 'users.delete'] })
        .expect(403);
    });

    it('não edita cargo que contém permissões acima das suas', async () => {
      users.g1 = user('g1', { role: role('rg', ['roles.view', 'roles.edit']) });
      addRole(role('adm', ['users.delete', 'cases.delete']));
      await request(server())
        .patch('/api/admin/roles/adm')
        .set(as('g1'))
        .send({ name: 'Renomeado' })
        .expect(403);
    });
  });

  describe('integridade da equipe', () => {
    it('ninguém exclui ou desativa o próprio usuário', async () => {
      users.o1 = user('o1', { isOwner: true });
      await request(server())
        .delete('/api/admin/users/o1')
        .set(as('o1'))
        .expect(400);
      await request(server())
        .patch('/api/admin/users/o1')
        .set(as('o1'))
        .send({ active: false })
        .expect(400);
    });

    it('o último proprietário não pode deixar de ser proprietário', async () => {
      users.o1 = user('o1', { isOwner: true });
      prisma.user.count.mockResolvedValue(0); // nenhum outro proprietário ativo
      await request(server())
        .patch('/api/admin/users/o1')
        .set(as('o1'))
        .send({ isOwner: false })
        .expect(409);
    });

    it('proprietário pode desativar outro usuário', async () => {
      users.o1 = user('o1', { isOwner: true });
      users.u2 = user('u2', { role: role('r1', ['articles.view']) });
      await request(server())
        .patch('/api/admin/users/u2')
        .set(as('o1'))
        .send({ active: false })
        .expect(200);
    });

    it('cargo em uso não pode ser excluído', async () => {
      users.o1 = user('o1', { isOwner: true });
      addRole(role('r1', ['articles.view']), 3);
      const res = await request(server())
        .delete('/api/admin/roles/r1')
        .set(as('o1'))
        .expect(409);
      expect(res.body.message).toContain('3 usuário');
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('rejeita permissão fora do catálogo', async () => {
      users.o1 = user('o1', { isOwner: true });
      await request(server())
        .post('/api/admin/roles')
        .set(as('o1'))
        .send({ name: 'Cargo X', permissions: ['inventada.tudo'] })
        .expect(400);
    });

    it('a listagem de usuários nunca pede o hash da senha ao banco', async () => {
      users.o1 = user('o1', { isOwner: true });
      prisma.user.findMany.mockResolvedValue([users.o1]);
      await request(server()).get('/api/admin/users').set(as('o1')).expect(200);
      const [args] = prisma.user.findMany.mock.calls[0] as [
        { select: Record<string, unknown> },
      ];
      expect(args.select.password).toBeUndefined();
      expect(args.select.email).toBe(true);
    });
  });

  describe('cobertura: nenhuma rota protegida sem regra de permissão', () => {
    it('toda rota é pública ou declara a permissão exigida', () => {
      const reflector = app.get(Reflector);
      const discovery = app.get(DiscoveryService);
      const unprotected: string[] = [];

      for (const wrapper of discovery.getControllers()) {
        const { instance, metatype } = wrapper;
        if (!instance || !metatype) continue;
        const proto = Object.getPrototypeOf(instance) as Record<
          string,
          unknown
        >;

        for (const name of Object.getOwnPropertyNames(proto)) {
          const handler = proto[name];
          if (name === 'constructor' || typeof handler !== 'function') continue;
          // só métodos que são rotas HTTP
          if (Reflect.getMetadata('path', handler) === undefined) continue;

          const targets = [handler, metatype];
          const covered = [
            IS_PUBLIC_KEY,
            AUTHENTICATED_KEY,
            PERMISSIONS_KEY,
            ANY_PERMISSION_KEY,
            RESOURCE_KEY,
          ].some(
            (key) => reflector.getAllAndOverride(key, targets) !== undefined,
          );
          if (!covered) unprotected.push(`${metatype.name}.${name}`);
        }
      }
      expect(unprotected).toEqual([]);
    });
  });
});
