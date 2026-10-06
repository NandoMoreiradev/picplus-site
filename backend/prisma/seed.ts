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
  {
    name: 'Marketing de Influência',
    slug: 'marketing-de-influencia',
    icon: 'megaphone',
    shortDescription: 'Campanhas com os criadores certos para o seu público.',
    description:
      'Planejamos e executamos campanhas de ponta a ponta: da curadoria de criadores ao relatório final de resultados, sempre alinhadas aos objetivos da sua marca.',
    features: ['Curadoria de criadores', 'Briefing e roteirização', 'Gestão da campanha', 'Relatório de resultados'],
  },
  {
    name: 'Gestão de Influenciadores',
    slug: 'gestao-de-influenciadores',
    icon: 'users',
    shortDescription: 'Relacionamento e negociação com a nossa rede de parceiros.',
    description:
      'Cuidamos da relação com os criadores: contato, negociação, contratos, prazos e entregas, para que a sua marca foque no que importa.',
    features: ['Prospecção e contato', 'Negociação e contratos', 'Acompanhamento de entregas'],
  },
  {
    name: 'Produção de Conteúdo',
    slug: 'producao-de-conteudo',
    icon: 'camera',
    shortDescription: 'Conteúdo autêntico, criado para performar nas redes.',
    description:
      'Produzimos conteúdo em vídeo e foto com linguagem nativa de cada plataforma, equilibrando criatividade e estratégia.',
    features: ['Vídeos e fotos', 'Conteúdo UGC', 'Edição e finalização'],
  },
  {
    name: 'Estratégia de Social Media',
    slug: 'estrategia-de-social-media',
    icon: 'target',
    shortDescription: 'Planejamento e posicionamento para as suas redes sociais.',
    description:
      'Construímos a estratégia de presença digital da sua marca, definindo posicionamento, linhas editoriais e calendário de publicações.',
    features: ['Planejamento editorial', 'Posicionamento de marca', 'Calendário de conteúdo'],
  },
  {
    name: 'Performance e Análise',
    slug: 'performance-e-analise',
    icon: 'chart',
    shortDescription: 'Dados para medir, aprender e otimizar cada campanha.',
    description:
      'Acompanhamos métricas de alcance, engajamento e conversão para entender o que funciona e otimizar o investimento das próximas ações.',
    features: ['Dashboards de resultados', 'Análise de engajamento', 'Recomendações de otimização'],
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  if (!email || !password) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed.');
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
      data: DEFAULT_SERVICES.map((service, index) => ({ ...service, order: index })),
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
