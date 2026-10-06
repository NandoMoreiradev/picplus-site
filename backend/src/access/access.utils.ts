import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { missingPermissions } from './permissions';

/** Quem não é proprietário só pode conceder permissões que ele próprio possui. */
export function assertCanGrant(actor: AuthUser, permissions: string[]) {
  if (actor.isOwner) return;
  const missing = missingPermissions(actor.permissions, permissions);
  if (missing.length) {
    throw new ForbiddenException(
      `Você não pode conceder permissões que não possui: ${missing.join(', ')}.`,
    );
  }
}

/**
 * Quem não é proprietário só pode gerenciar cargos/usuários cujas permissões
 * estejam contidas nas suas. Impede, por exemplo, que um "gerente" redefina a
 * senha de um administrador e assuma a conta dele.
 */
export function assertCanManage(
  actor: AuthUser,
  targetPermissions: string[],
  what: string,
) {
  if (actor.isOwner) return;
  if (missingPermissions(actor.permissions, targetPermissions).length) {
    throw new ForbiddenException(
      `Você não pode gerenciar ${what} com mais permissões do que as suas.`,
    );
  }
}
