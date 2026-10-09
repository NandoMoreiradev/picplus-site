// Pós-build: gera dist/sitemap.xml e uma cópia do index.html por rota pública com
// title, description, canonical, Open Graph e JSON-LD já no HTML (previews de WhatsApp/LinkedIn/Google).
// O corpo continua renderizado no navegador. Se a API estiver fora do ar, usa só as rotas fixas.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SITE = (process.env.VITE_SITE_URL || 'https://picpluscompany.com.br').replace(/\/+$/, '');
const API = (process.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const DIST = new URL('../dist/', import.meta.url);
const DEFAULT_DESC =
  'PicPlus: hub de performance 360º. Assessoria de marketing, produtora audiovisual e agenciamento de influenciadores integrados para escalar a sua marca.';

const staticRoutes = [
  { path: '/' },
  { path: '/sobre', title: 'Sobre a Agência', description: 'Conheça a história, a missão e os valores da PicPlus: estratégia, produção e influência sob o mesmo teto.' },
  { path: '/servicos', title: 'Serviços', description: 'Assessoria de marketing, produtora audiovisual e agenciamento de influenciadores: conheça cada serviço e a estratégia por trás dele.' },
  { path: '/planos', title: 'Planos e Pacotes', description: 'Uma equipe de marketing completa pelo custo total de um funcionário. Conheça os pacotes da PicPlus: estratégia, produção audiovisual e influência em um único hub.' },
  { path: '/cases', title: 'Cases de Sucesso', description: 'Conheça projetos desenvolvidos pela PicPlus, unindo estratégia, produção e influência, e os seus resultados.' },
  { path: '/influenciadores', title: 'Nossos Parceiros', description: 'Conheça os influenciadores parceiros da PicPlus, selecionados para transferir autoridade e gerar demanda.' },
  { path: '/cadastro-influenciador', title: 'Cadastro de Influenciadores', description: 'Cadastre o seu perfil na vitrine de parceiros da PicPlus e seja apresentado às marcas que atendemos.' },
  { path: '/blog', title: 'Blog', description: 'Artigos sobre posicionamento, funil de vendas, produção audiovisual e influência, direto da equipe PicPlus.' },
  { path: '/piccast', title: 'PicCast', description: 'PicCast, o podcast da Picplus Company: histórias, lições e ideias de empreendedores para você seguir firme na sua jornada.' },
  { path: '/contato', title: 'Fale Conosco', description: 'Entre em contato com a PicPlus. Responderemos o mais breve possível.' },
  { path: '/orcamento', title: 'Solicitar Orçamento', description: 'Peça um orçamento para integrar estratégia, produção audiovisual e influenciadores com a PicPlus.' },
];

async function getJson(path) {
  const res = await fetch(`${API}/api${path}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function fetchAllArticles() {
  const all = [];
  for (let page = 1; page < 50; page++) {
    const data = await getJson(`/articles?page=${page}&limit=100`);
    all.push(...data.items);
    if (page >= data.meta.totalPages) break;
  }
  return all;
}

const abs = (url) => (!url ? '' : /^https?:/.test(url) ? url : `${API}${url.startsWith('/') ? '' : '/'}${url}`);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let settings = { ogImage: null, blogOgImage: null };
try {
  settings = await getJson('/settings');
} catch {
  /* sem imagem padrão */
}
const defaultImage = abs(settings.ogImage);

const routes = staticRoutes.map((r) => ({
  ...r,
  image: r.path === '/blog' ? abs(settings.blogOgImage) || defaultImage : defaultImage,
}));
try {
  const articles = await fetchAllArticles();
  for (const a of articles) {
    routes.push({
      path: `/blog/${a.slug}`,
      title: a.title,
      description: a.excerpt || undefined,
      image: abs(a.coverImage) || defaultImage,
      lastmod: a.updatedAt || a.publishedAt,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        description: a.excerpt || undefined,
        image: abs(a.coverImage) || undefined,
        datePublished: a.publishedAt || undefined,
        publisher: { '@type': 'Organization', name: 'PicPlus' },
      },
    });
  }
  const cases = await getJson('/cases');
  for (const c of Array.isArray(cases) ? cases : cases.items ?? []) {
    routes.push({
      path: `/cases/${c.slug}`,
      title: c.title,
      description: c.summary || undefined,
      image: abs(c.coverImage || c.images?.[0]) || defaultImage,
      lastmod: c.updatedAt,
    });
  }
} catch (err) {
  console.warn(`[prerender-meta] API indisponível (${err.message}); gerando só as rotas fixas.`);
}

const template = await readFile(new URL('index.html', DIST), 'utf8');

function render(route) {
  const title = route.title ? `${route.title} | PicPlus` : 'PicPlus | Hub de Performance 360º';
  const desc = route.description || DEFAULT_DESC;
  const url = `${SITE}${route.path === '/' ? '/' : route.path}`;
  const tags = [
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="PicPlus" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="${route.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
  ];
  if (route.image) {
    tags.push(`<meta property="og:image" content="${esc(route.image)}" />`, `<meta name="twitter:image" content="${esc(route.image)}" />`);
  }
  if (route.jsonLd) {
    tags.push(`<script id="page-jsonld" type="application/ld+json">${JSON.stringify(route.jsonLd).replace(/</g, '\u003c')}</script>`);
  }
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[\s\S]*?("\s*\/?>)/, `$1${esc(desc)}$2`)
    .replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
}

for (const route of routes) {
  const html = render(route);
  if (route.path === '/') {
    await writeFile(new URL('index.html', DIST), html);
  } else {
    const dir = join(new URL(DIST).pathname.replace(/^\/([A-Za-z]:)/, '$1'), route.path);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html);
  }
}

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((r) => `  <url><loc>${SITE}${r.path === '/' ? '/' : r.path}</loc><lastmod>${(r.lastmod ? new Date(r.lastmod).toISOString() : today).slice(0, 10)}</lastmod></url>`)
  .join('\n')}
</urlset>
`;
await writeFile(new URL('sitemap.xml', DIST), sitemap);
console.log(`[prerender-meta] ${routes.length} rotas geradas.`);
