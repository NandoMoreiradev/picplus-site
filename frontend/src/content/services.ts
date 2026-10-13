/**
 * Detalhamento dos serviços de cada pilar, usado na página "Serviços".
 * A Home continua mostrando só os três pilares (ver `positioning.ts`).
 *
 * Cada serviço traz: o que é, o que entregamos, o objetivo estratégico por trás dele
 * e, quando existe, como ele se conecta aos outros pilares do hub.
 */
import type { PillarKey } from './positioning';

export type ProcessStep = { title: string; text: string };

export type ServiceDetail = {
  id: string;
  /** Nome de um ícone de `SERVICE_ICONS`. */
  icon: string;
  /** O que o serviço representa para o negócio (ex.: "A percepção de valor"). */
  tag: string;
  title: string;
  /** Uma frase curta, usada nos cards da página inicial. */
  summary: string;
  lead: string;
  deliverables: { title: string; text?: string }[];
  /** Estratégia: para que o serviço existe. */
  goal: string;
  /** Como o serviço conversa com os outros pilares. */
  synergy?: string;
  /** "Como fazemos": passo a passo do serviço. Sem isso, o serviço não aparece no bloco. */
  process?: ProcessStep[];
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
        summary: 'Identidade visual que eleva a percepção de valor e sustenta um preço maior.',
        lead: 'Não vendemos "um logotipo". Criamos identidade visual orientada à conversão, com a mesma sofisticação que a produtora coloca nos vídeos aplicada à marca gráfica do cliente.',
        deliverables: [
          { title: 'Identidade visual orientada à conversão' },
          { title: 'Marca gráfica no mesmo padrão da produção audiovisual' },
          { title: 'Elevação da percepção de valor do que você vende' },
        ],
        goal: 'Fazer a empresa cobrar mais caro pelo que vende, porque a percepção de valor aumentou.',
        process: [
          { title: 'Diagnóstico', text: 'Entendemos o negócio, o público, os concorrentes e como a marca é percebida hoje.' },
          { title: 'Posicionamento', text: 'Definimos o conceito e o território da marca para sustentar um preço maior.' },
          { title: 'Criação', text: 'Desenhamos logotipo, paleta, tipografia e a linguagem visual da marca.' },
          { title: 'Aplicações', text: 'Testamos a identidade nos pontos de contato e reunimos tudo no manual de marca.' },
          { title: 'Entrega e ajustes', text: 'Entregamos os arquivos finais e acompanhamos a adoção da nova identidade.' },
        ],
        synergy: 'O padrão estético da produtora também vale para a marca.',
      },
      {
        id: 'tecnologia',
        icon: 'rocket',
        tag: 'Sites, LPs e sistemas',
        title: 'Tecnologia e Engenharia de Conversão',
        summary: 'Sites, landing pages e sistemas feitos para o tráfego pousar e comprar.',
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
        process: [
          { title: 'Briefing e objetivo', text: 'Definimos a meta de conversão e o que precisa existir para atingi-la.' },
          { title: 'Estrutura e copy', text: 'Mapeamos a jornada da página e escrevemos o texto que quebra objeções.' },
          { title: 'Design e desenvolvimento', text: 'Construímos o ambiente veloz, responsivo e otimizado para conversão.' },
          { title: 'Integrações e testes', text: 'Conectamos analytics, CRM e automações e validamos tudo antes de publicar.' },
          { title: 'Lançamento e evolução', text: 'Colocamos no ar e melhoramos com base nos dados de uso e conversão.' },
        ],
      },
      {
        id: 'aquisicao',
        icon: 'target',
        tag: 'O combustível do motor',
        title: 'Aquisição de Clientes: Tráfego Pago e SEO',
        summary: 'Demanda qualificada com mídia paga e um ativo orgânico para o longo prazo.',
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
        process: [
          { title: 'Metas e CAC alvo', text: 'Alinhamos o custo de aquisição aceitável e o volume de leads esperado.' },
          { title: 'Estrutura das campanhas', text: 'Montamos contas, públicos, rastreamento e a base de SEO do site.' },
          { title: 'Criativos e testes', text: 'Rodamos variações de anúncio e mensagem para achar o que performa.' },
          { title: 'Otimização contínua', text: 'Ajustamos lances, públicos e conteúdo toda semana com base nos números.' },
          { title: 'Relatório e escala', text: 'Mostramos resultado em leads e vendas e aumentamos o investimento no que funciona.' },
        ],
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
        summary: 'Produções com qualidade de cinema para criar autoridade imediata.',
        lead: 'Produções high-end, com qualidade de cinema, para criar autoridade imediata, mostrar o tamanho da empresa e gerar o efeito "Uau".',
        deliverables: [
          { title: 'Vídeos manifesto' },
          { title: 'Campanhas de aniversário e de marca' },
          { title: 'Comerciais de TV' },
          { title: 'Vídeos institucionais robustos' },
        ],
        goal: 'Criar autoridade imediata e provar o tamanho da empresa do cliente.',
        process: [
          { title: 'Conceito e roteiro', text: 'Desenvolvemos a ideia central e o roteiro com base na história da marca.' },
          { title: 'Pré-produção', text: 'Planejamos locações, elenco, equipamentos, cronograma e storyboard.' },
          { title: 'Gravação', text: 'Filmamos com equipe e equipamento de cinema, com direção em set.' },
          { title: 'Pós-produção', text: 'Edição, color grading, trilha e finalização de áudio.' },
          { title: 'Aprovação e entrega', text: 'Alinhamos os ajustes com você e entregamos nos formatos de cada canal.' },
        ],
      },
      {
        id: 'criativos',
        icon: 'play',
        tag: 'Máquina de conversão',
        title: 'Criativos para Performance e Social',
        summary: 'Vídeos curtos com roteiro estratégico para reter atenção e gerar clique.',
        lead: 'Vídeos curtos e dinâmicos, desenhados milimetricamente para rodar no tráfego pago e reter a atenção nas redes. Não é só um vídeo bonito: é um vídeo com roteiro estratégico.',
        deliverables: [
          { title: 'Reels, Shorts e TikTok' },
          { title: 'Criativos para anúncios' },
          { title: 'Roteiros que batem na dor do cliente e quebram objeções' },
        ],
        goal: 'Reter a atenção e gerar o clique (CTR alto).',
        process: [
          { title: 'Funil e dores do público', text: 'Partimos do funil do cliente para mapear dores, desejos e objeções.' },
          { title: 'Roteiros estratégicos', text: 'Escrevemos ganchos e roteiros curtos pensados para reter e converter.' },
          { title: 'Gravação e edição', text: 'Produzimos em formato vertical, com ritmo e legendas feitos para as redes.' },
          { title: 'Teste em mídia', text: 'Colocamos as variações no ar e medimos retenção, CTR e custo por resultado.' },
          { title: 'Iteração', text: 'Repetimos o que funciona e substituímos o que cansou, em ciclos rápidos.' },
        ],
        synergy: 'Roteirizado pela Assessoria de Marketing a partir do funil do cliente.',
      },
      {
        id: 'fotografia',
        icon: 'camera',
        tag: 'Estética de vendas',
        title: 'Fotografia Comercial e de Produto',
        summary: 'Imagens que fazem o visual do produto justificar o preço que ele cobra.',
        lead: 'Imagens de alta resolução para e-commerce, catálogos, cardápios e landing pages. Uma foto ruim destrói uma página de vendas excelente.',
        deliverables: [
          { title: 'E-commerce' },
          { title: 'Catálogos e cardápios' },
          { title: 'Landing pages e páginas de venda' },
        ],
        goal: 'Fazer o visual do produto justificar o preço que ele cobra.',
        process: [
          { title: 'Briefing visual', text: 'Entendemos o produto, o público e onde as imagens serão usadas.' },
          { title: 'Direção de arte', text: 'Definimos cenário, iluminação, estilo e a lista de fotos (shot list).' },
          { title: 'Sessão de fotos', text: 'Fotografamos em estúdio ou no local, com equipe e equipamento profissionais.' },
          { title: 'Tratamento', text: 'Seleção, retoque e padronização de cor para manter a linha visual.' },
          { title: 'Entrega', text: 'Arquivos prontos para e-commerce, catálogo, cardápio e páginas de venda.' },
        ],
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
        summary: 'As vozes que realmente têm o público que compra da sua marca.',
        lead: 'Não é sobre quem tem mais números, é sobre quem tem o público que compra. Desenhamos a campanha para parecer orgânica, e não um anúncio forçado.',
        deliverables: [
          { title: 'Análise de demografia do público' },
          { title: 'Engajamento real, não apenas seguidores' },
          { title: 'Alinhamento de valores entre influenciador e marca' },
        ],
        goal: 'Escolher as vozes que de fato possuem o público que compra e gerar uma campanha orgânica.',
        process: [
          { title: 'Perfil do público', text: 'Definimos quem compra da marca: demografia, interesses e onde ele consome conteúdo.' },
          { title: 'Mapeamento', text: 'Buscamos perfis com audiência aderente, e não só com muitos seguidores.' },
          { title: 'Análise de engajamento', text: 'Avaliamos engajamento real, histórico de parcerias e alinhamento de valores.' },
          { title: 'Shortlist', text: 'Apresentamos os nomes recomendados, com a justificativa de cada escolha.' },
          { title: 'Desenho da campanha', text: 'Planejamos a abordagem para que a mensagem pareça orgânica, não um anúncio forçado.' },
        ],
      },
      {
        id: 'gestao',
        icon: 'handshake',
        tag: 'Campanha end-to-end',
        title: 'Gestão de Ponta a Ponta',
        summary: 'Do briefing à medição de vendas, sem burocracia nas suas mãos.',
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
        process: [
          { title: 'Briefing estratégico', text: 'Alinhamos objetivo, mensagem, orçamento e o que a campanha precisa entregar.' },
          { title: 'Contratos e roteiro', text: 'Cuidamos da negociação e dos contratos e alinhamos o roteiro com cada influenciador.' },
          { title: 'Produção do conteúdo', text: 'Acompanhamos a criação, cobramos prazos e, quando faz sentido, gravamos na nossa produtora.' },
          { title: 'Aprovação e publicação', text: 'Você aprova o material antes de ir ao ar e acompanhamos a publicação.' },
          { title: 'Medição de vendas', text: 'Rastreamos alcance, cliques e vendas geradas e fechamos o relatório da campanha.' },
        ],
        synergy: 'O roteiro, muitas vezes, é gravado pela nossa própria produtora.',
      },
      {
        id: 'ativacao',
        icon: 'megaphone',
        tag: 'Experiências',
        title: 'Ativação de Marca e PR Digital',
        summary: 'Ações presenciais, press kits e eventos que geram burburinho para a marca.',
        lead: 'Ações presenciais, press kits e eventos de lançamento integrando os influenciadores agenciados.',
        deliverables: [
          { title: 'Ações presenciais' },
          { title: 'Press kits' },
          { title: 'Eventos de lançamento' },
        ],
        goal: 'Tirar a influência do digital e criar movimentos reais que gerem burburinho (hype) para a marca.',
        process: [
          { title: 'Conceito da ação', text: 'Criamos a ideia e o objetivo do evento, do kit ou da experiência.' },
          { title: 'Planejamento', text: 'Definimos formato, local, convidados, fornecedores e cronograma.' },
          { title: 'Convites e press kits', text: 'Produzimos e enviamos os kits e convidamos os influenciadores certos.' },
          { title: 'Execução', text: 'Coordenamos a ação no dia, com cobertura de conteúdo para multiplicar o alcance.' },
          { title: 'Repercussão e balanço', text: 'Medimos menções, alcance e resultado e reaproveitamos o conteúdo nas redes.' },
        ],
      },
    ],
  },
];
