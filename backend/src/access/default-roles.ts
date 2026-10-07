import { ALL_PERMISSIONS } from './permissions';

/**
 * Cargos criados na primeira inicialização (quando não existe nenhum cargo).
 * São apenas pontos de partida: o administrador pode editá-los ou excluí-los.
 */
export const DEFAULT_ROLES: {
  name: string;
  description: string;
  permissions: string[];
}[] = [
  {
    name: 'Administrador',
    description: 'Acesso completo a todos os módulos.',
    permissions: ALL_PERMISSIONS,
  },
  {
    name: 'Comercial',
    description:
      'Atende contatos e orçamentos e acompanha os cadastros de influenciadores.',
    permissions: [
      'contacts.view',
      'contacts.edit',
      'influencers.view',
      'influencers.review',
      'cases.view',
      'services.view',
    ],
  },
  {
    name: 'Conteúdo',
    description: 'Cria e edita blog, cases, serviços, marcas e equipe do site.',
    permissions: [
      'articles.view',
      'articles.create',
      'articles.edit',
      'articles.publish',
      'cases.view',
      'cases.create',
      'cases.edit',
      'services.view',
      'services.create',
      'services.edit',
      'brands.view',
      'brands.create',
      'brands.edit',
      'team.view',
      'team.create',
      'team.edit',
      'testimonials.view',
      'testimonials.create',
      'testimonials.edit',
    ],
  },
  {
    name: 'Somente leitura',
    description: 'Consulta os módulos, sem criar, editar ou excluir nada.',
    permissions: ALL_PERMISSIONS.filter(
      (key) =>
        key.endsWith('.view') &&
        !key.startsWith('users.') &&
        !key.startsWith('roles.'),
    ),
  },
];
