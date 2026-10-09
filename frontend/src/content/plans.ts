/**
 * Copy da página "Planos" (/planos): pacotes de serviços e o argumento de custo.
 *
 * Tese da página: montar uma equipe de marketing sozinho, ou contratar especialistas avulsos,
 * custa mais do que pagar a PicPlus. A comparação é sempre com o CUSTO TOTAL de um funcionário
 * (salário + encargos), nunca só com o salário.
 *
 * Regra editorial (ver `positioning.ts`): não inserir números, prazos ou clientes que a agência
 * não possa comprovar. Por isso a comparação é qualitativa e o preço é "sob consulta".
 *
 * PLACEHOLDERS: tudo que aparece entre colchetes, como "[Nome do pacote 1]", ainda precisa ser
 * definido pela PicPlus antes de publicar (nomes, entregas, perfil de cada pacote, fidelidade).
 * Para achar o que falta: busque por "[" neste arquivo.
 */

export const plansMeta = {
  title: 'Planos e Pacotes',
  description:
    'Uma equipe de marketing completa pelo custo total de um funcionário. Conheça os pacotes da PicPlus: estratégia, produção audiovisual e influência em um único hub.',
};

export const plansHero = {
  eyebrow: 'Planos e pacotes',
  /** O destaque em verde é aplicado a `highlight` no componente. */
  titleStart: 'Uma equipe de marketing completa pelo custo de',
  highlight: 'um funcionário',
  description:
    'Montar um time sozinho, ou contratar cada especialista separado, sai caro, dá trabalho e desconecta a operação. Na PicPlus, você investe o equivalente ao custo total de um funcionário (salário mais encargos) e coloca estratégia, produção e influência para trabalhar juntas.',
};

/* ── A conta que ninguém faz ─────────────────────────── */

export const plansMath = {
  eyebrow: 'A conta que ninguém faz',
  title: 'Antes de montar um time de marketing, faça a conta completa',
  description:
    'Para ter dentro de casa tudo o que a PicPlus entrega, você precisaria contratar nove perfis diferentes. Cada um com salário, encargos, ferramentas e um gestor para coordenar.',
  roles: [
    { title: 'Estrategista de marketing', text: 'Posicionamento, funil de vendas e metas.' },
    { title: 'Gestor de tráfego', text: 'Meta Ads, Google Ads e LinkedIn Ads.' },
    { title: 'Especialista em SEO', text: 'Presença orgânica como ativo de longo prazo.' },
    { title: 'Designer', text: 'Identidade visual e peças gráficas.' },
    { title: 'Desenvolvedor', text: 'Sites, landing pages e sistemas.' },
    { title: 'Videomaker e diretor', text: 'Filmes, criativos e conteúdo para redes.' },
    { title: 'Editor de vídeo', text: 'Pós-produção e versões por canal.' },
    { title: 'Fotógrafo', text: 'Fotografia comercial e de produto.' },
    { title: 'Gestor de influenciadores', text: 'Curadoria, contratos e medição.' },
  ],
  hidden: {
    title: 'E a conta não para nos salários',
    items: [
      'Encargos e benefícios: férias, 13º, FGTS e tudo o que vem junto com cada contratação.',
      'Equipamento: câmeras, lentes, iluminação, áudio e computadores potentes o bastante para edição.',
      'Licenças e ferramentas: edição, design, anúncios, SEO e automação.',
      'Ociosidade: você paga o mês inteiro mesmo quando a demanda daquele perfil é pontual.',
      'Dependência: uma saída, férias ou afastamento e aquela função para.',
    ],
  },
  closing: 'E, depois de pagar tudo isso, quem coordena todos eles é você.',
};

/* ── Três caminhos ───────────────────────────────────── */

export type PlanPath = {
  key: 'interna' | 'avulso' | 'picplus';
  tag: string;
  title: string;
  items: string[];
  verdict: string;
  highlight?: boolean;
};

export const plansPaths = {
  eyebrow: 'Compare os caminhos',
  title: 'Três jeitos de ter marketing de verdade. Só um não cobra caro por isso.',
  description: 'O que cada caminho coloca no seu caixa e na sua rotina.',
  paths: [
    {
      key: 'interna',
      tag: 'O caminho mais pesado',
      title: 'Montar uma equipe interna',
      items: [
        'Nove perfis para contratar, treinar e reter.',
        'Salários, encargos, equipamento e ferramentas no seu caixa.',
        'Você coordena o time e responde pelo resultado.',
        'Uma saída, uma férias ou um afastamento e a operação desacelera.',
      ],
      verdict: 'Custo fixo alto, inclusive nos meses em que a demanda é menor.',
    },
    {
      key: 'avulso',
      tag: 'O caminho mais confuso',
      title: 'Contratar especialistas avulsos',
      items: [
        'Cada fornecedor cobra a própria margem e otimiza o próprio pedaço.',
        'O vídeo não conversa com o anúncio, e o anúncio não conversa com o site.',
        'Você vira gerente de projetos de vários fornecedores que não se falam.',
        'Ninguém responde pelo resultado final.',
      ],
      verdict: 'O preço de cada peça parece pequeno. A soma e o retrabalho, não.',
    },
    {
      key: 'picplus',
      tag: 'O caminho integrado',
      title: 'Ter a PicPlus como seu time',
      items: [
        'Estratégia, produção e influência desenhadas juntas desde o primeiro dia.',
        'Todos os especialistas pelo custo total de um funcionário (salário mais encargos).',
        'Um único parceiro responsável pela cadeia inteira.',
        'Relatórios claros do que funcionou e do que não funcionou.',
      ],
      verdict: 'Você gerencia resultado, não fornecedores.',
      highlight: true,
    },
  ] as PlanPath[],
};

/* ── Pacotes ─────────────────────────────────────────── */

export type PlanPackage = {
  id: string;
  name: string;
  /** Para quem é o pacote. */
  forWho: string;
  features: string[];
  /** Destaca visualmente o pacote recomendado. */
  featured?: boolean;
};

export const plansPackages = {
  eyebrow: 'Os pacotes',
  title: 'Escolha o tamanho do time que a sua marca precisa',
  description:
    'Todos os pacotes partem de um diagnóstico e levam estratégia, produção e influência para dentro da sua operação. O valor é definido sob consulta, de acordo com o seu momento e a sua meta de faturamento.',
  priceLabel: 'Sob consulta',
  priceNote: 'Referência de comparação: o custo total de um funcionário (salário mais encargos).',
  cta: 'Solicitar proposta',
  featuredBadge: 'Recomendado',
  // PLACEHOLDER: definir nome, perfil e entregas de cada pacote.
  packages: [
    {
      id: 'pacote-1',
      name: '[Nome do pacote 1]',
      forWho: '[Para quem é este pacote]',
      features: ['[Entrega 1 a definir]', '[Entrega 2 a definir]', '[Entrega 3 a definir]', '[Entrega 4 a definir]'],
    },
    {
      id: 'pacote-2',
      name: '[Nome do pacote 2]',
      forWho: '[Para quem é este pacote]',
      features: [
        '[Tudo do pacote 1]',
        '[Entrega 5 a definir]',
        '[Entrega 6 a definir]',
        '[Entrega 7 a definir]',
      ],
      featured: true,
    },
    {
      id: 'pacote-3',
      name: '[Nome do pacote 3]',
      forWho: '[Para quem é este pacote]',
      features: [
        '[Tudo do pacote 2]',
        '[Entrega 8 a definir]',
        '[Entrega 9 a definir]',
        '[Entrega 10 a definir]',
      ],
    },
    {
      id: 'pacote-4',
      name: '[Nome do pacote 4]',
      forWho: '[Para quem é este pacote]',
      features: [
        '[Tudo do pacote 3]',
        '[Entrega 11 a definir]',
        '[Entrega 12 a definir]',
        '[Entrega 13 a definir]',
      ],
    },
  ] as PlanPackage[],
  included: {
    title: 'Em todos os pacotes',
    items: [
      'Diagnóstico e estratégia antes de qualquer peça.',
      'Time integrado, com um único responsável pela cadeia inteira.',
      'Metas ligadas a CAC e conversão.',
      'Relatórios que mostram o que funcionou e o que não funcionou.',
    ],
  },
};

/* ── FAQ ─────────────────────────────────────────────── */

export const plansFaq = {
  eyebrow: 'Perguntas frequentes',
  title: 'O que os empresários perguntam antes de fechar',
  items: [
    {
      question: 'Por que comparar com o custo de um funcionário?',
      answer:
        'Porque contratar alguém é a decisão que a maioria das empresas considera primeiro. Mas salário não é custo: somam-se encargos, benefícios, equipamento e ferramentas. Comparamos com o custo total e, ainda assim, você recebe uma equipe de especialistas, não uma pessoa só.',
    },
    {
      question: 'Como o valor do meu pacote é definido?',
      answer:
        'Os pacotes são sob consulta porque cada empresa está em um momento diferente. Fazemos um diagnóstico do seu posicionamento, do seu funil e da sua meta de faturamento, e voltamos com uma proposta que conecta estratégia, produção e influência.',
    },
    {
      question: 'Já tenho alguém de marketing na empresa. Ainda faz sentido?',
      answer:
        'Faz. Quem já está na sua equipe continua cuidando do dia a dia da marca, e a PicPlus entra com o que um perfil só não alcança: produção audiovisual, tráfego, influência e estratégia trabalhando juntas.',
    },
    {
      question: 'Existe fidelidade ou contrato mínimo?',
      answer: '[Definir: prazo mínimo de contrato, condições de cancelamento e período de teste, se houver.]',
    },
    {
      question: 'Posso contratar só um serviço, e não um pacote?',
      answer: '[Definir: política para serviços avulsos e como migrar para um pacote depois.]',
    },
    {
      question: 'Em quanto tempo vou ver resultado?',
      answer:
        'Depende do seu ponto de partida, do seu mercado e da sua meta. O que combinamos desde o início é o método: definimos metas ligadas a CAC e conversão antes da primeira peça e medimos tudo, para você decidir o próximo investimento com dados.',
    },
  ],
};

export const plansCta = {
  title: 'Pare de somar salários e fornecedores',
  description:
    'Conte o seu momento e o seu objetivo de faturamento. Voltamos com uma proposta que coloca uma equipe inteira para trabalhar pelo custo de um funcionário.',
};
