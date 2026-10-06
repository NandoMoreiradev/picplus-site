import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cria o primeiro administrador na inicialização, a partir de ADMIN_EMAIL /
 * ADMIN_PASSWORD, somente quando ainda não existe nenhum usuário.
 * Útil em hospedagens (ex.: Railway) onde não há terminal para rodar o seed.
 * Depois do primeiro acesso, troque a senha em "Minha conta" e remova ADMIN_PASSWORD.
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
      if ((await this.prisma.user.count()) > 0) return;
      if (password.length < 8) {
        this.logger.warn(
          'ADMIN_PASSWORD tem menos de 8 caracteres: administrador não criado.',
        );
        return;
      }
      await this.prisma.user.create({
        data: {
          email,
          name: process.env.ADMIN_NAME ?? 'Administrador',
          password: await bcrypt.hash(password, 12),
        },
      });
      this.logger.log(`Administrador inicial criado: ${email}`);
    } catch (error) {
      this.logger.error(
        `Falha ao criar o administrador inicial: ${(error as Error).message}`,
      );
    }
  }
}
