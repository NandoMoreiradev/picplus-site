import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Usuário autenticado, carregado do banco a cada requisição pelo guard global. */
export interface AuthUser {
  /** ID do usuário. */
  sub: string;
  email: string;
  name: string;
  isOwner: boolean;
  roleId: string | null;
  roleName: string | null;
  /** Permissões efetivas (proprietário: todas). */
  permissions: ReadonlySet<string>;
}

export interface AuthStudent {
  sub: string;
  email: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

export type AuthenticatedRequest = Request & {
  user: AuthUser;
  student: AuthStudent;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);

export const CurrentStudent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthStudent => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().student;
  },
);

export const can = (user: AuthUser, permission: string): boolean =>
  user.permissions.has(permission);
