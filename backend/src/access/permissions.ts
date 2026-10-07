/**
 * Catálogo de permissões do sistema — fonte única da verdade.
 *
 * Formato: "<recurso>.<ação>". Para criar uma permissão nova (ex.: de uma integração
 * como Asaas ou Gemini) basta acrescentá-la a um grupo abaixo e protegê-la no
 * controller com @RequirePermissions('integrations.manage'). O painel de cargos
 * lê este catálogo pela API, então a nova permissão aparece sozinha na matriz.
 */
export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

const crud = (resource: string, noun: string): PermissionDef[] => [
  { key: `${resource}.view`, label: `Ver ${noun}` },
  { key: `${resource}.create`, label: `Criar ${noun}` },
  { key: `${resource}.edit`, label: `Editar ${noun}` },
  { key: `${resource}.delete`, label: `Excluir ${noun}` },
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'influencers',
    label: 'Influenciadores',
    permissions: [
      { key: 'influencers.view', label: 'Ver cadastros' },
      { key: 'influencers.review', label: 'Aprovar e recusar cadastros' },
      { key: 'influencers.edit', label: 'Editar perfis e controlar a vitrine' },
      { key: 'influencers.delete', label: 'Excluir cadastros' },
    ],
  },
  {
    key: 'contacts',
    label: 'Contatos e orçamentos',
    permissions: [
      { key: 'contacts.view', label: 'Ver contatos e orçamentos' },
      { key: 'contacts.edit', label: 'Atender (alterar status)' },
      { key: 'contacts.delete', label: 'Excluir contatos' },
    ],
  },
  {
    key: 'articles',
    label: 'Blog',
    permissions: [
      { key: 'articles.view', label: 'Ver artigos (inclusive rascunhos)' },
      { key: 'articles.create', label: 'Criar artigos' },
      { key: 'articles.edit', label: 'Editar artigos' },
      {
        key: 'articles.publish',
        label: 'Publicar e despublicar artigos',
      },
      { key: 'articles.delete', label: 'Excluir artigos' },
    ],
  },
  {
    key: 'cases',
    label: 'Cases de sucesso',
    permissions: crud('cases', 'cases'),
  },
  {
    key: 'services',
    label: 'Serviços',
    permissions: crud('services', 'serviços'),
  },
  {
    key: 'brands',
    label: 'Marcas parceiras',
    permissions: crud('brands', 'marcas'),
  },
  {
    key: 'team',
    label: 'Equipe (site)',
    permissions: crud('team', 'integrantes'),
  },
  {
    key: 'testimonials',
    label: 'Depoimentos em vídeo',
    permissions: crud('testimonials', 'depoimentos'),
  },
  {
    key: 'users',
    label: 'Usuários',
    permissions: crud('users', 'usuários'),
  },
  {
    key: 'roles',
    label: 'Cargos e permissões',
    permissions: crud('roles', 'cargos'),
  },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
);

const PERMISSION_SET = new Set(ALL_PERMISSIONS);

export const isValidPermission = (key: string): boolean =>
  PERMISSION_SET.has(key);

/** Mantém só permissões do catálogo, sem repetição e em ordem estável. */
export const normalizePermissions = (keys: string[]): string[] =>
  ALL_PERMISSIONS.filter((key) => keys.includes(key));

/** Permissões em `wanted` que `held` não possui. */
export const missingPermissions = (
  held: ReadonlySet<string>,
  wanted: string[],
): string[] => wanted.filter((key) => !held.has(key));
