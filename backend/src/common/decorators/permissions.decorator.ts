import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';
export const ANY_PERMISSION_KEY = 'requiredAnyPermission';
export const RESOURCE_KEY = 'permissionResource';
export const AUTHENTICATED_KEY = 'authenticatedOnly';

/** Exige TODAS as permissões listadas. Sobrepõe o que for derivado de @Resource. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Exige PELO MENOS UMA das permissões listadas. */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSION_KEY, permissions);

/**
 * Deriva a permissão pelo verbo HTTP: GET → view, POST → create,
 * PATCH/PUT → edit, DELETE → delete (ex.: @Resource('services') + GET = services.view).
 * Ações fora do padrão usam @RequirePermissions no método.
 */
export const Resource = (resource: string) =>
  SetMetadata(RESOURCE_KEY, resource);

/** Basta estar autenticado (ex.: ver o próprio perfil, trocar a própria senha). */
export const Authenticated = () => SetMetadata(AUTHENTICATED_KEY, true);
