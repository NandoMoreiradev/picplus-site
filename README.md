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
- **Uploads:** gravados em disco (`backend/uploads` ou `UPLOADS_DIR`). Em hospedagens com disco efêmero
  use um volume persistente ou troque `StorageService` por S3/Cloudinary (mesma interface: `save`/`remove`).
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
Cada pasta tem um `railway.json` (build, start e healthcheck). Em Settings de cada serviço defina o
**Config-as-code path** como `/backend/railway.json` e `/frontend/railway.json` (o caminho é a partir da raiz do repositório).

1. **Postgres:** `+ New` → Database → PostgreSQL.
2. **backend:** `+ New` → GitHub Repo → Root Directory `backend`. Variáveis:
   `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `NODE_ENV=production`, `JWT_SECRET` (≥ 32 caracteres),
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `UPLOADS_DIR=/data/uploads`,
   `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL`. Adicione um **Volume** montado em `/data`
   e gere o domínio público (Settings → Networking).
3. **frontend:** `+ New` → GitHub Repo → Root Directory `frontend`. Variáveis (lidas no *build*):
   `VITE_API_URL=https://<domínio-do-backend>` e os `VITE_*` de contato/redes. Gere o domínio público.
4. Volte ao backend e defina `FRONTEND_URL=https://<domínio-do-frontend>` (libera o CORS e gera os links dos e-mails).
5. Ao subir, o backend roda `prisma migrate deploy` e cria o administrador com `ADMIN_EMAIL`/`ADMIN_PASSWORD`
   (apenas se ainda não existir nenhum usuário). Acesse `/admin`, troque a senha em "Minha conta" e remova `ADMIN_PASSWORD`.
