import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_ROLES } from '../access/default-roles';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prepara o acesso ao painel em hospedagens sem terminal (ex.: Railway):
 *
 * 1. Sem nenhum cargo no banco: cria os cargos padrão (editáveis depois no painel).
 * 2. A partir de ADMIN_EMAIL / ADMIN_PASSWORD:
 *    - sem usuários: cria o administrador inicial, como PROPRIETÁRIO;
 *    - com usuários: não mexe em nada (senha trocada no painel é preservada);
 *    - com ADMIN_FORCE_RESET=true: cria ou REDEFINE o proprietário informado
 *      (também o reativa). Serve para recuperar o acesso. Remova a variável logo
 *      depois, senão a senha volta ao valor de ADMIN_PASSWORD a cada reinício.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.ensureDefaultRoles();
    await this.ensureOwner();
  }

  private async ensureDefaultRoles() {
    try {
      if ((await this.prisma.role.count()) > 0) return;
      await this.prisma.role.createMany({ data: DEFAULT_ROLES });
      this.logger.log(
        `Cargos padrão criados: ${DEFAULT_ROLES.map((role) => role.name).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao criar os cargos padrão: ${(error as Error).message}`,
      );
    }
  }

  private async ensureOwner() {
    const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    try {
      const forceReset = process.env.ADMIN_FORCE_RESET === 'true';
      const hasUsers = (await this.prisma.user.count()) > 0;

      if (hasUsers && !forceReset) {
        this.logger.log(
          'Já existem usuários: ADMIN_EMAIL/ADMIN_PASSWORD ignorados. ' +
            'Para redefinir o acesso, defina ADMIN_FORCE_RESET=true e reinicie.',
        );
        return;
      }
      if (password.length < 8) {
        this.logger.warn(
          'ADMIN_PASSWORD tem menos de 8 caracteres: administrador não criado.',
        );
        return;
      }

      const name = process.env.ADMIN_NAME ?? 'Administrador';
      const hash = await bcrypt.hash(password, 12);
      const adminRole = await this.prisma.role.findUnique({
        where: { name: 'Administrador' },
        select: { id: true },
      });
      await this.prisma.user.upsert({
        where: { email },
        update: { name, password: hash, isOwner: true, active: true },
        create: {
          email,
          name,
          password: hash,
          isOwner: true,
          roleId: adminRole?.id ?? null,
        },
      });

      if (forceReset) {
        this.logger.warn(
          `Acesso do proprietário REDEFINIDO: ${email}. ` +
            'Remova ADMIN_FORCE_RESET agora, ou a senha será sobrescrita a cada reinício.',
        );
      } else {
        this.logger.log(`Administrador inicial criado: ${email}`);
      }
    } catch (error) {
      this.logger.error(
        `Falha ao criar o administrador inicial: ${(error as Error).message}`,
      );
    }
  }
}
