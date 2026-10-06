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
