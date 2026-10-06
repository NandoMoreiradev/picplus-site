import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Garante o acesso ao painel em hospedagens sem terminal (ex.: Railway), a partir de
 * ADMIN_EMAIL / ADMIN_PASSWORD:
 *
 * - Sem usuários no banco: cria o administrador inicial.
 * - Com usuários: não mexe em nada (a senha trocada em "Minha conta" é preservada).
 * - Com ADMIN_FORCE_RESET=true: cria ou REDEFINE a senha do administrador informado.
 *   Serve para recuperar o acesso. Remova a variável logo depois, senão a senha volta
 *   ao valor de ADMIN_PASSWORD a cada reinício.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
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
      await this.prisma.user.upsert({
        where: { email },
        update: { name, password: hash },
        create: { email, name, password: hash },
      });

      if (forceReset) {
        this.logger.warn(
          `Acesso do administrador REDEFINIDO: ${email}. ` +
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
