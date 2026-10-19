import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ALL_PERMISSIONS } from '../../access/permissions';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthenticatedRequest,
  AuthStudent,
  AuthUser,
} from '../decorators/current-user.decorator';
import {
  ANY_PERMISSION_KEY,
  AUTHENTICATED_KEY,
  PERMISSIONS_KEY,
  RESOURCE_KEY,
  STUDENT_AUTHENTICATED_KEY,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const VERB_TO_ACTION: Record<string, string> = {
  GET: 'view',
  HEAD: 'view',
  POST: 'create',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete',
};

/**
 * Guard global de autenticação e autorização.
 *
 * 1. Rotas @Public() passam direto.
 * 2. Rotas @StudentAuthenticated() exigem um JWT de aluno (kind: 'student') e carregam Student do banco.
 * 3. As demais exigem um JWT de usuário administrativo (sem kind: 'student'). O usuário é carregado do
 *    BANCO a cada requisição: assim, trocar o cargo ou desativar alguém vale imediatamente.
 * 4. Autorização NEGADA POR PADRÃO: toda rota protegida precisa declarar
 *    @Authenticated(), @StudentAuthenticated(), @RequirePermissions(), @RequireAnyPermission() ou @Resource().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = (request.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Autenticação necessária.');
    }

    let payload: { sub: string; kind?: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; kind?: string }>(
        token,
      );
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    const isStudentRoute = this.reflector.getAllAndOverride<boolean>(
      STUDENT_AUTHENTICATED_KEY,
      targets,
    );

    if (isStudentRoute) {
      if (payload.kind !== 'student') {
        throw new UnauthorizedException('Acesso exclusivo para alunos.');
      }
      request.student = await this.loadStudent(payload.sub);
      return true;
    }

    if (payload.kind === 'student') {
      throw new UnauthorizedException('Sessão inválida para o painel.');
    }

    request.user = await this.loadUser(payload.sub);
    this.authorize(context, request);
    return true;
  }

  private async loadStudent(studentId: string): Promise<AuthStudent> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        email: true,
        name: true,
        cpf: true,
        phone: true,
        avatarUrl: true,
        active: true,
      },
    });
    if (!student || !student.active) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    return {
      sub: student.id,
      email: student.email,
      name: student.name,
      cpf: student.cpf,
      phone: student.phone,
      avatarUrl: student.avatarUrl,
    };
  }

  private async loadUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { id: true, name: true, permissions: true } },
      },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      isOwner: user.isOwner,
      roleId: user.role?.id ?? null,
      roleName: user.role?.name ?? null,
      permissions: new Set(
        user.isOwner ? ALL_PERMISSIONS : (user.role?.permissions ?? []),
      ),
    };
  }

  private authorize(context: ExecutionContext, request: AuthenticatedRequest) {
    const targets = [context.getHandler(), context.getClass()];
    const { user } = request;

    if (this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_KEY, targets)) {
      return;
    }
    if (user.isOwner) return;

    const all = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      targets,
    );
    const any = this.reflector.getAllAndOverride<string[]>(
      ANY_PERMISSION_KEY,
      targets,
    );
    const resource = this.reflector.getAllAndOverride<string>(
      RESOURCE_KEY,
      targets,
    );

    let allowed: boolean;
    if (all) {
      allowed = all.every((permission) => user.permissions.has(permission));
    } else if (any) {
      allowed = any.some((permission) => user.permissions.has(permission));
    } else if (resource) {
      const action = VERB_TO_ACTION[request.method.toUpperCase()];
      allowed = !!action && user.permissions.has(`${resource}.${action}`);
    } else {
      this.logger.error(
        `Rota sem regra de permissão (${request.method} ${request.url}): negada por padrão.`,
      );
      allowed = false;
    }

    if (!allowed) {
      throw new ForbiddenException('Você não tem permissão para esta ação.');
    }
  }
}
