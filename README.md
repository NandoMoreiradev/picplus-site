# PicPlus — Website + CMS

Site institucional da agência PicPlus com painel administrativo (CMS).

| Pasta | Stack |
|---|---|
| `frontend/` | React 19 + Vite + TypeScript + styled-components |
| `backend/` | NestJS 11 + Prisma 7 + PostgreSQL |

## Rodando localmente

### 1. Backend
```bash
cd backend
cp .env.example .env        # preencha DATABASE_URL, JWT_SECRET, ADMIN_EMAIL e ADMIN_PASSWORD
npm install
npx prisma migrate dev      # cria as tabelas (primeira vez: informe um nome, ex.: init)
npm run seed                # cria o administrador e os serviços iniciais
npm run start:dev           # http://localhost:3000/api
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env        # VITE_API_URL e dados de contato do site
npm install
npm run dev                 # http://localhost:5173
```

O painel fica em **http://localhost:5173/admin** (login com o `ADMIN_EMAIL`/`ADMIN_PASSWORD` do seed).

## Funcionalidades

**Site público:** Home · Sobre (história, valores, marcas, equipe) · Serviços · Cases (+ detalhe) ·
Vitrine de influenciadores (busca, filtro por nicho, perfil completo) · Cadastro de influenciador ·
Blog (+ artigo, Markdown) · Contato · Orçamento.

**CMS (`/admin`):** Visão geral · Influenciadores (aprovar, recusar com motivo por e-mail e/ou WhatsApp,
exibir/ocultar da vitrine, editar perfil, PDF) · Contatos e orçamentos (status de atendimento) ·
Blog (editor Markdown com pré-visualização) · Cases · Serviços · Marcas · Equipe · Alterar senha.

## Pontos de atenção

- **E-mail:** sem `RESEND_API_KEY` os e-mails apenas aparecem no log do backend. Em produção configure
  também `MAIL_FROM` com um domínio verificado no Resend e `ADMIN_NOTIFY_EMAIL`.
- **WhatsApp:** a recusa por WhatsApp abre uma conversa `wa.me` com a mensagem pronta; o envio é
  confirmado pela pessoa no próprio WhatsApp (não há API oficial integrada).
- **Uploads:** com as variáveis `R2_*` preenchidas, imagens e PDFs vão para o **Cloudflare R2** e o banco
  guarda a URL pública completa. Sem elas (desenvolvimento) são gravados em disco, em `backend/uploads`.
  Preencher só parte das variáveis `R2_*` faz o backend recusar a inicialização, para não gravar em disco por engano.
- **Texto institucional:** `frontend/src/content/about.ts` é um texto-base genérico (sem datas, números ou
  clientes). Substitua pela história real da agência.
- **Dados de contato/redes** do site vêm das variáveis `VITE_*` (campos vazios são ocultados).

## Testes e qualidade

```bash
cd backend  && npm test && npm run test:e2e && npm run lint && npm run build
cd frontend && npm run lint && npm run build
```

## Deploy no Railway

Projeto com **3 serviços**: `Postgres`, `backend` (root dir `backend`) e `frontend` (root dir `frontend`).
O Railway descontinuou o Config as Code (`railway.json`) para serviços novos, então os comandos são
definidos no painel de cada serviço (Settings):

| Serviço | Custom Build Command | Custom Start Command | Healthcheck Path |
|---|---|---|---|
| backend | `npm run build` | `npm run start:railway` | `/api/health` |
| frontend | `npm run build` | `npm run start` | `/` |

1. **Postgres:** `+ New` → Database → PostgreSQL.
2. **backend:** `+ New` → GitHub Repo → Root Directory `backend`. Variáveis:
   `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `NODE_ENV=production`, `JWT_SECRET` (≥ 32 caracteres),
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` e as
   variáveis do R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`).
   Não é preciso Volume. Gere o domínio público (Settings → Networking).
3. **frontend:** `+ New` → GitHub Repo → Root Directory `frontend`. Variáveis (lidas no *build*):
   `VITE_API_URL=https://<domínio-do-backend>` e os `VITE_*` de contato/redes. Gere o domínio público.
4. Volte ao backend e defina `FRONTEND_URL=https://<domínio-do-frontend>` (libera o CORS e gera os links dos e-mails).
5. Ao subir, o backend roda `prisma migrate deploy` e cria o administrador com `ADMIN_EMAIL`/`ADMIN_PASSWORD`
   (apenas se ainda não existir nenhum usuário). Acesse `/admin`, troque a senha em "Minha conta" e remova `ADMIN_PASSWORD`.

## Usuários, cargos e permissões

O painel tem controle de acesso por **cargo**. Um cargo é um conjunto de permissões no formato `recurso.acao`
(ex.: `articles.publish`); cada usuário recebe um cargo. Em `/admin/cargos` o administrador cria e edita cargos
numa matriz de permissões, e em `/admin/usuarios` cadastra a equipe e atribui os cargos.

- **Proprietário:** acesso total, independente de cargo. O administrador criado no primeiro boot (e os usuários que
  já existiam antes deste recurso) são proprietários. Nunca pode faltar um proprietário ativo.
- **Cargos padrão** (Administrador, Comercial, Conteúdo, Somente leitura) são criados na primeira inicialização
  e podem ser editados ou excluídos.
- **O servidor decide.** O backend carrega o usuário do banco a cada requisição: mudar o cargo ou desativar alguém
  vale na hora, sem esperar o login expirar. O painel apenas esconde o que a pessoa não pode usar.
- **Negado por padrão:** toda rota protegida precisa declarar a permissão exigida; um teste falha se alguma ficar sem regra.
- **Anti-escalada:** ninguém concede permissões que não possui, nem gerencia usuários ou cargos acima do seu.
- **Novas permissões** (ex.: uma integração com Asaas ou Gemini): acrescente a chave em `backend/src/access/permissions.ts`
  e proteja o endpoint com `@RequirePermissions('integrations.manage')`. Ela aparece sozinha na matriz de cargos.

## Depoimentos em vídeo

Seção da página inicial, gerenciada em `/admin/depoimentos`. Cada depoimento tem foto, nome, cargo, empresa,
frase de destaque e **uma fonte de vídeo**, à escolha:

- **Link do YouTube** (qualquer formato: normal, `youtu.be` ou Shorts; pode estar como "Não listado"). Só o ID é
  guardado e o player é montado em `youtube-nocookie.com`, carregado apenas no clique (sem cookies e sem peso na página).
- **Arquivo enviado pelo painel** (MP4 com H.264, WebM ou MOV, até **50 MB**), guardado no R2. O painel mostra o progresso,
  detecta sozinho se o vídeo é vertical ou horizontal e, sem foto, usa um quadro do vídeo como capa. Se o navegador não
  conseguir ler o arquivo (ex.: HEVC/H.265), avisa antes de publicar.

Comportamento na página: até 3 depoimentos ficam lado a lado; acima disso (e no celular) vira carrossel, com setas só
quando há rolagem. Sem nenhum depoimento ativo, a seção **não aparece**.

Observações:

- **Vídeo próprio não é convertido pelo servidor.** Exporte em MP4/H.264, de 30 a 60 s, e comprima antes de enviar;
  arquivos pesados demoram a abrir em conexão fraca. O YouTube cuida disso sozinho, então prefira-o para vídeos longos.
- Um depoimento aceita **só uma fonte**. Trocar de fonte apaga o arquivo antigo do armazenamento; excluir o depoimento
  apaga o vídeo enviado.
- O envio de vídeo exige o **R2** configurado em produção (sem ele, o arquivo ficaria no disco temporário do servidor).
- Antes de publicar, tenha **autorização por escrito** de imagem e voz de cada pessoa que aparece.
- Cargos já existentes não ganham a permissão sozinhos: dê `testimonials.*` ao cargo desejado em `/admin/cargos`.
