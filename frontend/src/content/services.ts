/**
 * Detalhamento dos serviços de cada pilar, usado na página "Serviços".
 * A Home continua mostrando só os três pilares (ver `positioning.ts`).
 *
 * Cada serviço traz: o que é, o que entregamos, o objetivo estratégico por trás dele
 * e, quando existe, como ele se conecta aos outros pilares do hub.
 */
import type { PillarKey } from './positioning';

export type ServiceDetail = {
  id: string;
  /** Nome de um ícone de `SERVICE_ICONS`. */
  icon: string;
  /** O que o serviço representa para o negócio (ex.: "A percepção de valor"). */
  tag: string;
  title: string;
  lead: string;
  deliverables: { title: string; text?: string }[];
  /** Estratégia: para que o serviço existe. */
  goal: string;
  /** Como o serviço conversa com os outros pilares. */
  synergy?: string;
};

export type PillarDetail = {
  key: PillarKey;
  /** Frase de contraste que abre o pilar. */
  statement: string;
  intro: string;
  services: ServiceDetail[];
};

export const pillarDetails: PillarDetail[] = [
  {
    key: 'assessoria',
    statement: 'Não terceirizamos a execução.',
    intro:
      'Nossa equipe constrói a sua marca, ergue a sua estrutura de vendas e injeta demanda qualificada. Estratégia e execução andam juntas, do posicionamento ao anúncio.',
    services: [
      {
        id: 'branding',
        icon: 'sparkles',
        tag: 'A percepção de valor',
        title: 'Branding e Identidade Visual',
        lead: 'Não vendemos "um logotipo". Criamos identidade visual orientada à conversão, com a mesma sofisticação que a produtora coloca nos vídeos aplicada à marca gráfica do cliente.',
        deliverables: [
          { title: 'Identidade visual orientada à conversão' },
          { title: 'Marca gráfica no mesmo padrão da produção audiovisual' },
          { title: 'Elevação da percepção de valor do que você vende' },
        ],
        goal: 'Fazer a empresa cobrar mais caro pelo que vende, porque a percepção de valor aumentou.',
        synergy: 'O padrão estético da produtora também vale para a marca.',
      },
      {
        id: 'tecnologia',
        icon: 'rocket',
        tag: 'Sites, LPs e sistemas',
        title: 'Tecnologia e Engenharia de Conversão',
        lead: 'Desenvolvimento não é só fazer uma página bonita: é engenharia de tráfego. Construímos o ambiente onde o lead pousa e compra, e a tecnologia para a operação escalar.',
        deliverables: [
          {
            title: 'Sites e Landing Pages',
            text: 'Ambientes de alta conversão: velozes, otimizados e com copy persuasiva.',
          },
          {
            title: 'Sistemas personalizados',
            text: 'Soluções de software, dashboards e automações para quem precisa escalar a operação tecnológica.',
          },
        ],
        goal: 'Garantir que cada clique do tráfego caia em um destino pronto para converter e que a operação do cliente consiga crescer.',
      },
      {
        id: 'aquisicao',
        icon: 'target',
        tag: 'O combustível do motor',
        title: 'Aquisição de Clientes: Tráfego Pago e SEO',
        lead: 'Demanda qualificada no curto prazo com mídia paga e um ativo orgânico para o longo prazo, para a venda não depender 100% de verba de anúncio.',
        deliverables: [
          {
            title: 'Tráfego pago',
            text: 'Meta Ads, Google Ads e LinkedIn Ads, guiados por metas de CAC (custo de aquisição).',
          },
          {
            title: 'SEO',
            text: 'Posicionamento orgânico como ativo de longo prazo.',
          },
        ],
        goal: 'Injetar demanda qualificada dentro da meta de CAC e construir presença orgânica que reduza a dependência de anúncios.',
      },
    ],
  },
  {
    key: 'producao',
    statement: 'Não vendemos "diária de gravação" nem "edição de vídeo".',
    intro:
      'Construímos ativos audiovisuais de retenção e conversão: peças que prendem a atenção, aceleram a jornada de compra e elevam o status da marca.',
    services: [
      {
        id: 'filmes',
        icon: 'clapperboard',
        tag: 'Elevação de status',
        title: 'Filmes Publicitários e Institucionais',
        lead: 'Produções high-end, com qualidade de cinema, para criar autoridade imediata, mostrar o tamanho da empresa e gerar o efeito "Uau".',
        deliverables: [
          { title: 'Vídeos manifesto' },
          { title: 'Campanhas de aniversário e de marca' },
          { title: 'Comerciais de TV' },
          { title: 'Vídeos institucionais robustos' },
        ],
        goal: 'Criar autoridade imediata e provar o tamanho da empresa do cliente.',
      },
      {
        id: 'criativos',
        icon: 'play',
        tag: 'Máquina de conversão',
        title: 'Criativos para Performance e Social',
        lead: 'Vídeos curtos e dinâmicos, desenhados milimetricamente para rodar no tráfego pago e reter a atenção nas redes. Não é só um vídeo bonito: é um vídeo com roteiro estratégico.',
        deliverables: [
          { title: 'Reels, Shorts e TikTok' },
          { title: 'Criativos para anúncios' },
          { title: 'Roteiros que batem na dor do cliente e quebram objeções' },
        ],
        goal: 'Reter a atenção e gerar o clique (CTR alto).',
        synergy: 'Roteirizado pela Assessoria de Marketing a partir do funil do cliente.',
      },
      {
        id: 'fotografia',
        icon: 'camera',
        tag: 'Estética de vendas',
        title: 'Fotografia Comercial e de Produto',
        lead: 'Imagens de alta resolução para e-commerce, catálogos, cardápios e landing pages. Uma foto ruim destrói uma página de vendas excelente.',
        deliverables: [
          { title: 'E-commerce' },
          { title: 'Catálogos e cardápios' },
          { title: 'Landing pages e páginas de venda' },
        ],
        goal: 'Fazer o visual do produto justificar o preço que ele cobra.',
      },
    ],
  },
  {
    key: 'influencia',
    statement: 'Não vendemos "publi" por número de seguidores.',
    intro:
      'Vendemos transferência de autoridade e distribuição qualificada: a mensagem certa, na boca de quem o seu público já confia.',
    services: [
      {
        id: 'curadoria',
        icon: 'users',
        tag: 'O filtro',
        title: 'Curadoria e Estratégia de Matchmaking',
        lead: 'Não é sobre quem tem mais números, é sobre quem tem o público que compra. Desenhamos a campanha para parecer orgânica, e não um anúncio forçado.',
        deliverables: [
          { title: 'Análise de demografia do público' },
          { title: 'Engajamento real, não apenas seguidores' },
          { title: 'Alinhamento de valores entre influenciador e marca' },
        ],
        goal: 'Escolher as vozes que de fato possuem o público que compra e gerar uma campanha orgânica.',
      },
      {
        id: 'gestao',
        icon: 'handshake',
        tag: 'Campanha end-to-end',
        title: 'Gestão de Ponta a Ponta',
        lead: 'O empresário nunca precisa lidar com a burocracia. Cuidamos de toda a campanha, do briefing à medição das vendas geradas.',
        deliverables: [
          { title: 'Briefing estratégico' },
          { title: 'Alinhamento de roteiro' },
          { title: 'Gestão de contratos' },
          { title: 'Cobrança de prazos' },
          { title: 'Aprovação do material' },
          { title: 'Medição das vendas geradas' },
        ],
        goal: 'Tirar a burocracia das mãos do cliente e fechar o ciclo medindo o resultado em vendas.',
        synergy: 'O roteiro, muitas vezes, é gravado pela nossa própria produtora.',
      },
      {
        id: 'ativacao',
        icon: 'megaphone',
        tag: 'Experiências',
        title: 'Ativação de Marca e PR Digital',
        lead: 'Ações presenciais, press kits e eventos de lançamento integrando os influenciadores agenciados.',
        deliverables: [
          { title: 'Ações presenciais' },
          { title: 'Press kits' },
          { title: 'Eventos de lançamento' },
        ],
        goal: 'Tirar a influência do digital e criar movimentos reais que gerem burburinho (hype) para a marca.',
      },
    ],
  },
];
