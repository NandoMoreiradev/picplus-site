import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AdminBootstrapService } from './admin-bootstrap.service';

interface UpsertArgs {
  where: { email: string };
  create: { password: string };
  update: { password: string };
}

describe('AdminBootstrapService', () => {
  const original = { ...process.env };
  const user = {
    count: jest.fn<Promise<number>, []>(),
    upsert: jest.fn<Promise<unknown>, [UpsertArgs]>(),
  };
  const role = {
    count: jest.fn<Promise<number>, []>().mockResolvedValue(1),
    createMany: jest.fn<Promise<unknown>, [unknown]>(),
    findUnique: jest
      .fn<Promise<unknown>, [unknown]>()
      .mockResolvedValue({ id: 'r-adm' }),
  };
  const service = () => new AdminBootstrapService({ user, role } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    process.env.ADMIN_EMAIL = '  Admin@Picplus.com ';
    process.env.ADMIN_PASSWORD = 'SenhaForte123';
    delete process.env.ADMIN_FORCE_RESET;
  });
  afterAll(() => {
    process.env = original;
  });

  it('cria o admin (e-mail normalizado) quando não há usuários', async () => {
    user.count.mockResolvedValue(0);
    await service().onApplicationBootstrap();

    const call = user.upsert.mock.calls[0][0];
    expect(call.where.email).toBe('admin@picplus.com');
    expect(await bcrypt.compare('SenhaForte123', call.create.password)).toBe(
      true,
    );
  });

  it('não altera nada quando já existem usuários', async () => {
    user.count.mockResolvedValue(1);
    await service().onApplicationBootstrap();
    expect(user.upsert).not.toHaveBeenCalled();
  });

  it('com ADMIN_FORCE_RESET=true redefine a senha mesmo havendo usuários', async () => {
    process.env.ADMIN_FORCE_RESET = 'true';
    user.count.mockResolvedValue(1);
    await service().onApplicationBootstrap();

    const call = user.upsert.mock.calls[0][0];
    expect(await bcrypt.compare('SenhaForte123', call.update.password)).toBe(
      true,
    );
  });

  it('cria o admin como proprietário, com o cargo Administrador', async () => {
    user.count.mockResolvedValue(0);
    await service().onApplicationBootstrap();
    const call = user.upsert.mock.calls[0][0] as unknown as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(call.create.isOwner).toBe(true);
    expect(call.create.roleId).toBe('r-adm');
    expect(call.update.isOwner).toBe(true);
    expect(call.update.active).toBe(true);
  });

  it('cria os cargos padrão quando não existe nenhum', async () => {
    role.count.mockResolvedValueOnce(0);
    user.count.mockResolvedValue(1);
    await service().onApplicationBootstrap();
    expect(role.createMany).toHaveBeenCalledTimes(1);
  });

  it('não recria cargos que já existem', async () => {
    user.count.mockResolvedValue(1);
    await service().onApplicationBootstrap();
    expect(role.createMany).not.toHaveBeenCalled();
  });

  it('recusa senha curta', async () => {
    process.env.ADMIN_PASSWORD = 'curta';
    user.count.mockResolvedValue(0);
    await service().onApplicationBootstrap();
    expect(user.upsert).not.toHaveBeenCalled();
  });
});
