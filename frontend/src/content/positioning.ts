/**
 * Posicionamento da PicPlus: Hub de Performance 360º.
 * Fonte única da copy institucional — o que está aqui alimenta Home, Serviços, Sobre,
 * meta tags e rodapé. Tom de voz: autoridade pragmática, sem jargão publicitário vazio,
 * fala de CAC, LTV, retenção, percepção de valor e conversão.
 *
 * Regra editorial: não inserir números, prazos ou clientes que a agência não possa comprovar.
 */

export type PillarKey = 'assessoria' | 'producao' | 'influencia';

/** Opções de UVP do documento de posicionamento. Troque `uvp` para mudar o hero. */
export const UVP_OPTIONS = {
  resultado: {
    headline: 'Estratégia que converte. Produção que impressiona. Influência que vende.',
    support: 'O ecossistema completo de marketing para escalar a sua marca.',
  },
  fragmentacao: {
    headline: 'Deixe de gerenciar fornecedores e comece a gerenciar resultados.',
    support:
      'Assessoria de marketing, produtora audiovisual e agenciamento de influenciadores em um único hub de performance.',
  },
  impacto: {
    headline: 'A ponte definitiva entre o posicionamento da sua marca e o faturamento.',
    support: 'Estratégia, Produção e Influência sob o mesmo teto.',
  },
} as const;

export const uvp = UVP_OPTIONS.fragmentacao;

export const positioning = {
  category: 'Hub de Performance 360º',
  /** Frase curta usada em rodapé, meta description e e-mails. */
  tagline:
    'Assessoria de marketing, produtora audiovisual e agenciamento de influenciadores em um único hub de performance.',
  metaDescription:
    'PicPlus: hub de performance 360º. Assessoria de marketing, produtora audiovisual e agenciamento de influenciadores integrados para escalar a sua marca.',

  /** O inimigo em comum: desperdício causado pela comunicação desconectada. */
  problem: {
    eyebrow: 'O custo da fragmentação',
    title: 'Quanto do seu orçamento está sendo queimado porque a sua agência não conversa com a sua produtora?',
    description:
      'Quando estratégia, produção e distribuição são contratadas separadas, cada fornecedor otimiza o próprio pedaço. Quem paga a diferença é o seu caixa.',
    fragmented: {
      title: 'Operação fragmentada',
      items: [
        'A agência faz o tráfego, sem saber o que o cliente precisa ver para comprar.',
        'A produtora entrega um vídeo bonito, mas sem foco em conversão.',
        'O influenciador faz uma publi genérica, que não vende.',
        'Você vira o gerente de projetos de três fornecedores que não se falam.',
      ],
    },
    integrated: {
      title: 'Hub PicPlus',
      items: [
        'A estratégia define posicionamento, funil e meta antes de qualquer peça.',
        'A produção transforma a estratégia em material de alto padrão, desenhado para converter.',
        'A influência distribui a mensagem com as vozes certas, já com o material certo.',
        'Você gerencia resultado, com um único parceiro responsável pela cadeia inteira.',
      ],
    },
  },

  pillars: [
    {
      key: 'assessoria' as PillarKey,
      nickname: 'A Bússola',
      name: 'Assessoria de Marketing',
      icon: 'compass',
      pitch:
        'Não começamos apertando botões de anúncios ou gravando vídeos. Começamos desenhando a rota do seu faturamento: definimos o seu posicionamento, estruturamos o funil de vendas e criamos a estratégia de ataque ao mercado.',
      bullets: ['Posicionamento de marca', 'Estruturação do funil de vendas', 'Estratégia de entrada e crescimento', 'Metas ligadas a CAC e conversão'],
    },
    {
      key: 'producao' as PillarKey,
      nickname: 'O Motor',
      name: 'Produtora Audiovisual',
      icon: 'clapperboard',
      pitch:
        'A atenção do seu cliente está cara, e um vídeo amador destrói a percepção de valor do seu produto. A nossa produtora transforma a estratégia em peças audiovisuais de alto padrão, que retêm a atenção e elevam o status da marca.',
      bullets: ['Filmes e peças publicitárias', 'Conteúdo para redes e anúncios', 'Direção criativa alinhada ao funil', 'Pós-produção e versões por canal'],
    },
    {
      key: 'influencia' as PillarKey,
      nickname: 'O Megafone',
      name: 'Agenciamento de Influenciadores',
      icon: 'megaphone',
      pitch:
        'Influenciador sem estratégia é apenas curtida cara. Com a inteligência do negócio e o material certo em mãos, selecionamos os influenciadores exatos para transferir autoridade e gerar demanda real, e gerenciamos toda a negociação.',
      bullets: ['Curadoria e seleção de criadores', 'Negociação e gestão de contratos', 'Briefing e aprovação de entregas', 'Mensuração de resultado por criador'],
    },
  ],

  process: [
    {
      title: 'Diagnóstico e estratégia',
      text: 'Mapeamos posicionamento, público e funil, e definimos a meta de negócio que guia todas as decisões.',
    },
    {
      title: 'Produção',
      text: 'Transformamos a estratégia em peças de alto padrão, pensadas para reter atenção e converter.',
    },
    {
      title: 'Distribuição',
      text: 'Colocamos o material nas vozes e nos canais certos, com negociação e gestão de ponta a ponta.',
    },
    {
      title: 'Mensuração',
      text: 'Medimos custo de aquisição, conversão e retorno, e usamos os dados para decidir o próximo investimento.',
    },
  ],

  audience: {
    eyebrow: 'Para quem é',
    title: 'Feito para marcas que precisam de tração e profissionalização',
    items: [
      { title: 'Médias empresas', text: 'Que já faturam e precisam de método para crescer com previsibilidade.' },
      { title: 'Marcas em expansão', text: 'Que estão entrando em novos mercados e precisam de posicionamento claro.' },
      { title: 'Franquias', text: 'Que precisam de comunicação padronizada e eficiente em toda a rede.' },
      { title: 'E-commerces', text: 'Que dependem de criativo e distribuição para baixar o custo de aquisição.' },
    ],
  },

  cta: {
    title: 'Pare de pagar três fornecedores que não se falam',
    description:
      'Conte o seu momento e o seu objetivo de faturamento. Voltamos com um plano que conecta estratégia, produção e influência.',
  },
};

/** Opções do campo "pilar" no CMS de serviços. */
export const PILLAR_OPTIONS = [
  { value: '', label: 'Sem pilar' },
  ...positioning.pillars.map((pillar) => ({ value: pillar.key, label: `${pillar.name} (${pillar.nickname})` })),
];

export const pillarName = (key?: string | null) => positioning.pillars.find((pillar) => pillar.key === key)?.name;
