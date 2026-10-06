/**
 * Seed inicial: cria o usuário administrador e, se a tabela estiver vazia,
 * os serviços padrão (editáveis depois pelo CMS).
 *
 * Uso: npm run seed   (requer ADMIN_EMAIL e ADMIN_PASSWORD no .env)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEFAULT_SERVICES = [
  // Pilar 1: Assessoria de Marketing (A Bússola)
  {
    pillar: 'assessoria',
    name: 'Posicionamento e estratégia comercial',
    slug: 'posicionamento-e-estrategia-comercial',
    icon: 'compass',
    shortDescription:
      'A rota do seu faturamento, definida antes de qualquer peça.',
    description:
      'Definimos o posicionamento da marca, o público prioritário e a estratégia de entrada no mercado, com metas ligadas a custo de aquisição e conversão.',
    features: [
      'Diagnóstico de mercado e concorrência',
      'Posicionamento e proposta de valor',
      'Metas de CAC e conversão',
    ],
  },
  {
    pillar: 'assessoria',
    name: 'Estruturação do funil de vendas',
    slug: 'estruturacao-do-funil-de-vendas',
    icon: 'target',
    shortDescription: 'Do primeiro contato à recompra, com cada etapa mapeada.',
    description:
      'Desenhamos o caminho do cliente da descoberta à compra e à retenção, definindo qual mensagem, qual formato e qual canal atuam em cada etapa.',
    features: [
      'Mapa da jornada do cliente',
      'Estratégia de aquisição e retenção',
      'Indicadores por etapa do funil',
    ],
  },
  {
    pillar: 'assessoria',
    name: 'Performance e análise de dados',
    slug: 'performance-e-analise-de-dados',
    icon: 'chart',
    shortDescription:
      'Decisões de investimento baseadas em número, não em achismo.',
    description:
      'Acompanhamos custo de aquisição, conversão, retenção e retorno por canal e por peça, e transformamos os dados em recomendações para o próximo investimento.',
    features: [
      'Dashboards de resultado',
      'Análise de CAC e LTV',
      'Recomendações de otimização',
    ],
  },
  // Pilar 2: Produtora Audiovisual (O Motor)
  {
    pillar: 'producao',
    name: 'Filmes e peças publicitárias',
    slug: 'filmes-e-pecas-publicitarias',
    icon: 'clapperboard',
    shortDescription: 'Produção de alto padrão que eleva a percepção de valor.',
    description:
      'Roteiro, direção, captação e finalização de filmes e peças pensados para reter atenção e sustentar o posicionamento definido na estratégia.',
    features: [
      'Roteiro e direção criativa',
      'Captação e finalização',
      'Versões por canal e formato',
    ],
  },
  {
    pillar: 'producao',
    name: 'Conteúdo para redes e anúncios',
    slug: 'conteudo-para-redes-e-anuncios',
    icon: 'camera',
    shortDescription: 'Material criado para converter no feed e na mídia paga.',
    description:
      'Produzimos vídeos e fotos com linguagem nativa de cada plataforma, já com os testes e variações que a mídia paga exige.',
    features: [
      'Vídeos e fotos para social',
      'Criativos para anúncios',
      'Conteúdo UGC',
    ],
  },
  {
    pillar: 'producao',
    name: 'Direção criativa e pós-produção',
    slug: 'direcao-criativa-e-pos-producao',
    icon: 'layers',
    shortDescription: 'Consistência visual em todas as peças da marca.',
    description:
      'Mantemos identidade, ritmo e acabamento coerentes em todo o material, com edição, motion, cor e áudio no padrão de produtora.',
    features: [
      'Edição e motion',
      'Correção de cor e áudio',
      'Padronização visual',
    ],
  },
  // Pilar 3: Agenciamento de Influenciadores (O Megafone)
  {
    pillar: 'influencia',
    name: 'Curadoria e seleção de influenciadores',
    slug: 'curadoria-e-selecao-de-influenciadores',
    icon: 'users',
    shortDescription:
      'Os criadores certos para transferir autoridade à sua marca.',
    description:
      'Selecionamos criadores pelo encaixe com o público, os valores e o objetivo comercial da campanha, e não apenas pelo tamanho da audiência.',
    features: [
      'Análise de perfil e audiência',
      'Shortlist alinhada ao objetivo',
      'Vitrine de parceiros PicPlus',
    ],
  },
  {
    pillar: 'influencia',
    name: 'Negociação e gestão de campanhas',
    slug: 'negociacao-e-gestao-de-campanhas',
    icon: 'handshake',
    shortDescription: 'Toda a operação com os criadores, de ponta a ponta.',
    description:
      'Cuidamos de contato, negociação, contratos, briefing, aprovações e prazos, para que a sua equipe não precise gerenciar cada influenciador.',
    features: [
      'Negociação e contratos',
      'Briefing e aprovação de entregas',
      'Acompanhamento de prazos',
    ],
  },
  {
    pillar: 'influencia',
    name: 'Mensuração de resultado por criador',
    slug: 'mensuracao-de-resultado-por-criador',
    icon: 'trending',
    shortDescription: 'Saber quem gerou demanda e quem apenas gerou curtida.',
    description:
      'Medimos o resultado de cada criador e de cada entrega, para reinvestir em quem converte e ajustar o que não performa.',
    features: [
      'Métricas por criador',
      'Relatório de campanha',
      'Aprendizados para a próxima ação',
    ],
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  if (!email || !password) {
    throw new Error(
      'Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed.',
    );
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD deve ter ao menos 8 caracteres.');
  }

  await prisma.user.upsert({
    where: { email },
    update: { name, password: await bcrypt.hash(password, 12) },
    create: { email, name, password: await bcrypt.hash(password, 12) },
  });
  console.log(`✔ Administrador pronto: ${email}`);

  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({
      data: DEFAULT_SERVICES.map((service, index) => ({
        ...service,
        order: index,
      })),
    });
    console.log(`✔ ${DEFAULT_SERVICES.length} serviços iniciais criados`);
  } else {
    console.log('• Serviços já existem — nada a criar');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
