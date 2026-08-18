# 🎓 Ponto do Saber

Plataforma de cursos online (LMS - Learning Management System) completa, moderna e gratuita.

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ Funcionalidades

### 👨‍🎓 Para Alunos
- **Catálogo de Cursos** — Navegue por categorias, busque por nome, filtre por avaliação e preço
- **Player de Vídeo** — Assistente de aulas com seek bar, controle de velocidade (0.5x–2x)
- **Progresso Automático** — O sistema salva onde você parou e marca aulas como concluídas
- **Questionários** — Avaliações com correção automática e nota mínima configurável
- **Certificado Digital** — Emitido automaticamente ao concluir 100% das aulas + nota mínima de 70%
- **Gamificação** — XP, badges, streaks, rankings semanais e desafios
- **Notificações** — Alertas em tempo real via SSE sobre conquistas, resumos semanais/mensais e streak em risco (email + push do navegador)

### 👨‍🏫 Para Instrutores
- **Criação de Cursos** — Dashboard completo para criar módulos, aulas e questionários
- **Upload de Materiais** — Thumbnails, PDFs, links e videoaulas
- **Workflow de Aprovação** — Envie cursos para revisão do admin antes da publicação

### 🛠️ Para Admins
- **Painel de Controle** — Métricas, gráficos e analytics da plataforma
- **Gestão de Cursos** — Aprovar/rejeitar cursos, gerenciar destaque (featured)
- **Gestão de Usuários** — Visualizar alunos e instrutores cadastrados
- **Relatórios** — Dados de vendas, matrículas e desempenho

---

## 🚀 Stack Tecnológica

| Categoria | Tecnologia | Versão |
|-----------|-----------|--------|
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | 16.2 |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) | 5.x |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) | 4.x |
| **Autenticação** | [NextAuth.js](https://next-auth.js.org/) (v5 Beta) | 5.0.0-beta.31 |
| **ORM** | [Prisma](https://www.prisma.io/) | 6.x |
| **Banco de Dados** | SQLite (dev) / PostgreSQL (prod) | — |
| **Cache** | [Upstash Redis](https://upstash.com/) (opcional) | — |
| **Upload** | AWS S3 / Cloudflare R2 / UploadThing | — |
| **Pagamentos** | [Stripe](https://stripe.com/) | — |
| **Email** | [Resend](https://resend.com/) | — |
| **Monitoramento** | [Sentry](https://sentry.io/) | — |
| **Animações** | Framer Motion | 12.x |
| **Gráficos** | Recharts | 3.x |
| **Testes** | Vitest + Playwright | — |

---

## 📦 Estrutura do Projeto

```
src/
├── app/
│   ├── admin/           # Painel administrativo
│   ├── api/             # Rotas de API (54 endpoints)
│   │   ├── auth/        # Autenticação (NextAuth + forgot/reset password)
│   │   ├── courses/     # CRUD de cursos, módulos, aulas
│   │   ├── enrollments/ # Matrículas
│   │   ├── quizzes/     # Questionários e tentativas
│   │   ├── certificates/# Certificados
│   │   ├── gamification/# XP, badges, streaks, rankings
│   │   └── ...
│   ├── categorias/      # Página de categorias
│   ├── certificados/    # Verificação de certificados
│   ├── cursos/          # Catálogo + player de aulas
│   ├── dashboard/       # Dashboard do aluno
│   ├── esqueci-senha/   # Recuperação de senha
│   ├── instrutor/       # Painel do instrutor
│   ├── login/           # Login (credentials + Google)
│   ├── redefinir-senha/ # Redefinição de senha
│   ├── register/        # Cadastro
│   ├── error.tsx        # Error Boundary global
│   ├── not-found.tsx    # Página 404
│   ├── layout.tsx       # Layout raiz com Providers
│   └── page.tsx         # Landing page
├── components/          # Componentes React reutilizáveis
│   └── ui/              # Componentes de UI (skeleton, toast, etc.)
├── lib/                 # Utilitários e configurações
│   ├── auth.config.ts   # Config NextAuth (edge-compatible)
│   ├── auth.ts          # Config NextAuth completa
│   ├── db.ts            # Cliente Prisma singleton
│   ├── email.ts         # Serviço de email (Resend) com templates
│   ├── rate-limit.ts    # Rate limiter in-memory
│   ├── cache.ts         # Redis + memória cache
│   ├── upload.ts        # Upload S3/R2/local
│   └── youtube.ts       # Integração YouTube API
├── proxy.ts             # Edge middleware (proteção de rotas)
└── types/               # Type augmentations
    └── next-auth.d.ts   # Tipos customizados do NextAuth
```

---

## 🔧 Setup do Projeto (Desenvolvimento)

### Pré-requisitos

- **Node.js** 18+ (recomendado 20+)
- **npm** ou **yarn**
- **Git**

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/lms-platform.git
cd lms-platform

# Instale as dependências
npm install

# Copie as variáveis de ambiente
cp .env.example .env.local

# Configure as variáveis no .env.local:
# DATABASE_URL="file:./dev.db"  (SQLite - dev)
# NEXTAUTH_SECRET="seu-secret-aqui"
# NEXTAUTH_URL="http://localhost:3000"

# Gere o Prisma Client
npx prisma generate

# Sincronize o banco e semeie dados iniciais
npx prisma db push
npx prisma db seed

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) 🎉

### Credenciais de Teste

| Tipo | Email | Senha |
|------|-------|-------|
| 👑 **Admin** | admin@lms.com | admin123 |
| 🧑‍🏫 **Instrutor** | lucas@lms.com | instrutor123 |
| 🧑‍🎓 **Aluno** | maria@email.com | 123456 |
| 🧑‍🎓 **Aluno** | joao@email.com | 123456 |
| 🧑‍🎓 **Aluno** | ana@email.com | 123456 |
| 🎯 **Demo** | demo@lms.com | demo123 |

---

## 📜 Scripts Disponíveis

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run start            # Iniciar servidor de produção
npm run lint             # ESLint (falha com qualquer warning)
npm run test             # Vitest (testes unitários)
npm run test:e2e         # Playwright (testes E2E)
npm run db:generate      # Gerar Prisma Client
npm run db:push          # Sincronizar schema com banco
npm run db:seed          # Semear dados iniciais
npm run db:switch        # Alternar provider Prisma (sqlite ↔ postgresql)
npm run generate-assets  # Gerar ícones PWA + favicon + OG image
npm run vapid:generate  # Gerar par de chaves VAPID para notificações push
npm run env:check        # Validar .env contra o .env.example
npm run preflight        # Verificar pré-requisitos antes do deploy
npm run pre-deploy       # Gate completo: env:check + preflight + tsc + lint + test + build
node scripts/e2e-production.mjs   # E2E contra a produção (rodar com E2E_BASE para outra URL)
```

---

## 🤖 CI/CD e Testes Automatizados

Todo push na `main` dispara uma cadeia automatizada de qualidade:

| Workflow | Quando roda | O que faz |
|----------|------------|-----------|
| `ci.yml` | Todo push/PR | Lint (env:check + ESLint zero warnings) + Postgres real (service container): `switch-provider` → `prisma generate` → `migrate deploy` → seed + drift check + `tsc` + vitest + build + **e2e Playwright (68 testes) contra o bundle de produção** (`E2E_PRODUCTION=1 E2E_BUILT=1`, serial) |
| `deploy.yml` | Push na `main` | **Migra o banco de produção primeiro** (`vercel env pull` → `switch-provider postgresql` → `prisma migrate deploy`) e só então `vercel build` + `vercel deploy --prod` — se a migração falhar, o deploy não acontece e o site antigo continua no ar |
| `e2e-production.yml` | **Após cada deploy**, manual (`workflow_dispatch`) e **a cada 6h** (healthcheck) | Roda `scripts/e2e-production.mjs` contra a produção e reporta o resultado como **commit status** `e2e-production` no SHA deployado |
| `deploy-preview.yml` | Cada PR | Deploy de preview + **e2e no preview** (commit status `e2e-preview`) + comentário com a URL no PR |
| `sanity.yml` | (conforme configurado) | Verificações extras do repo |

**Fluxo de um push na main:** `push → ci.yml (valida) → deploy.yml (migra o banco de produção + deploy) → e2e-production.yml (e2e automático) → commit status verde/vermelho`.

> ⚠️ **Migração e pooler do Postgres:** o passo de migração do `deploy.yml` usa o `DATABASE_URL` de produção. Se o banco for Supabase/Neon com **transaction pooler**, troque para o **session pooler** (conexão direta, porta `5432` no Supabase) apenas para o `prisma migrate deploy` — migrações exigem uma conexão de sessão (DDL em transação não funciona no transaction pooler).

### Variáveis e segredos do CI

- **Secrets** (Settings → Secrets and variables → Actions): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (deploy), `E2E_ALERT_WEBHOOK` (opcional — URL de webhook no formato Slack `{"text": "..."}` para alertar quando o e2e pós-deploy falhar).
- **Variables**: `E2E_BASE_URL` (opcional — sobrescreve a URL de produção padrão usada pelo e2e).

### Teste e2e de produção (`scripts/e2e-production.mjs`)

Cobre, de ponta a ponta contra a URL real:

1. **Login dos 3 papéis** (admin / instrutor / aluno) + rejeição de senha errada
2. **Redirects por role** (admin→`/admin`, aluno→`/dashboard`, proteção de `/admin`)
3. **Matrícula** (idempotente: aceita 201 novo ou 409 já matriculado)
4. **Progresso de aula** (salvar, persistir e refletir no painel)

O script é idempotente (não acumula dados em execuções repetidas) e usa retry
contra cold-start. Rode localmente com: `node scripts/e2e-production.mjs` (use
`E2E_BASE` para apontar para outra URL).

> ⚠️ **Importante (Supabase):** use o **transaction pooler** na `DATABASE_URL` de
> produção (`aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`).
> O session pooler (porta `5432`) esgota rápido com serverless (erro
> `EMAXCONNSESSION max clients reached`), derrubando toda a API.

---

# 🚀 GUIA DE DEPLOY COMPLETO

## Passo 1: Contas Necessárias

Crie contas nos serviços abaixo. Todos têm plano gratuito generoso.

### 1.1 Vercel (Hospedagem)
1. Acesse [vercel.com](https://vercel.com/) e crie uma conta (GitHub, GitLab ou email)
2. Conecte seu repositório GitHub
3. **(Não faça o deploy ainda — configure as variáveis primeiro)**

### 1.2 Neon (PostgreSQL — Banco de Dados)
1. Acesse [neon.tech](https://neon.tech/) e crie uma conta
2. Crie um projeto com nome `lms-platform`
3. Copie a **connection string** (começa com `postgresql://...`)
4. Recomendado: use a branch `main` para produção

**Alternativas gratuitas:** [Railway](https://railway.app/), [Supabase](https://supabase.com/)

### 1.3 Resend (Email)
1. Acesse [resend.com](https://resend.com/) e crie uma conta
2. No dashboard, vá em **API Keys** e crie uma chave
3. **Para produção:** adicione e verifique seu domínio em **Domains**
4. Copie a **API Key** (começa com `re_...`)

**Alternativa gratuita:** [SendGrid](https://sendgrid.com/) (100 emails/dia grátis)

### 1.4 Google Cloud (Login com Google)
1. Acesse [console.cloud.google.com](https://console.cloud.google.com/)
2. Crie um projeto ou selecione existente
3. Vá em **APIs & Services → Credentials**
4. Clique em **Create Credentials → OAuth Client ID**
5. Application Type: **Web Application**
6. Em **Authorized redirect URIs**, adicione:
   - `https://seu-site.vercel.app/api/auth/callback/google` (produção)
   - `http://localhost:3000/api/auth/callback/google` (desenvolvimento)
7. Copie o **Client ID** e **Client Secret**

### 1.5 Stripe (Pagamentos — opcional)
1. Acesse [stripe.com](https://stripe.com/) e crie uma conta
2. No dashboard, ative o **modo de teste** para desenvolvimento
3. Vá em **Developers → API Keys** e copie a **Secret Key** (sk_test_...)
4. Vá em **Developers → Webhooks** e adicione endpoint:
   - URL: `https://seu-site.vercel.app/api/checkout/webhook`
   - Events: `checkout.session.completed`
   - Copie o **Signing Secret** (whsec_...)

### 1.6 Sentry (Monitoramento — opcional)
1. Acesse [sentry.io](https://sentry.io/) e crie uma conta
2. Crie um novo projeto → **Next.js**
3. Copie o **DSN** (começa com `https://...@...ingest.sentry.io`)

### 1.7 UploadThing (Uploads — opcional)
1. Acesse [uploadthing.com](https://uploadthing.com/) e crie uma conta
2. Crie uma aplicação e copie as chaves

---

## Passo 2: Variáveis de Ambiente

### 2.1 Local (desenvolvimento)

Crie um arquivo `.env.local`:

```bash
# ===== OBRIGATÓRIO =====
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="gerado-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ===== GOOGLE OAUTH (opcional para dev) =====
AUTH_GOOGLE_ID="seu-google-client-id"
AUTH_GOOGLE_SECRET="seu-google-client-secret"

# ===== EMAIL (opcional para dev) =====
RESEND_API_KEY="re_sua-chave-resend"

# ===== NOTIFICAÇÕES PUSH (opcional para dev) =====
# Gere as chaves com: npm run vapid:generate
NEXT_PUBLIC_VAPID_PUBLIC_KEY="sua-chave-publica"
VAPID_PRIVATE_KEY="sua-chave-privada"
VAPID_EMAIL="mailto:admin@pontodosaber.com.br"
```

> 💡 **Gere um NEXTAUTH_SECRET forte:** `npx -y generate-secret` ou `openssl rand -base64 32`

### 2.2 Produção (Vercel)

No dashboard da Vercel, vá em **Settings → Environment Variables** e adicione:

| Variável | Obrigatório? | Valor |
|----------|-------------|-------|
| `DATABASE_URL` | ✅ Sim | `postgresql://...` — **transaction pooler** (Supabase: porta `6543` + `?pgbouncer=true&connection_limit=1`; Neon: endpoint pooling) |
| `NEXTAUTH_SECRET` | ✅ Sim | Secreto forte |
| `NEXTAUTH_URL` | ✅ Sim | `https://seu-site.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | ✅ Sim | `https://seu-site.vercel.app` |
| `AUTH_GOOGLE_ID` | ⚠️ Se tiver Google login | Client ID |
| `AUTH_GOOGLE_SECRET` | ⚠️ Se tiver Google login | Client Secret |
| `RESEND_API_KEY` | ⚠️ Se quiser emails | `re_...` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ⚠️ Se quiser push | Gerada com `npm run vapid:generate` |
| `VAPID_PRIVATE_KEY` | ⚠️ Se quiser push | Gerada com `npm run vapid:generate` (secreta) |
| `VAPID_EMAIL` | ⚠️ Se quiser push | `mailto:admin@pontodosaber.com.br` |
| `STRIPE_SECRET_KEY` | ⚠️ Se tiver cursos pagos | `sk_...` |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Se tiver cursos pagos | `whsec_...` |
| `UPLOADTHING_SECRET` | ⚠️ Se tiver uploads | |
| `UPLOADTHING_APP_ID` | ⚠️ Se tiver uploads | |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ Opcional | `https://...` |

---

## Passo 3: Configurar PostgreSQL

### 3.1 Alternar o Provider do Prisma

O schema fica commitado em **SQLite** para dev/testes (a suíte vitest cria
bancos `test-*.db` isolados). Para Postgres, use o script `switch-provider.js`
— ele reescreve o bloco `datasource` do schema automaticamente:

```bash
# Para produção (PostgreSQL)
node scripts/switch-provider.js postgresql

# Voltar para desenvolvimento (SQLite)
node scripts/switch-provider.js sqlite

# Ver o provider ativo
node scripts/switch-provider.js --check
```

> O build da Vercel já roda o switch para `postgresql` automaticamente
> (`vercel.json`), então não é preciso editar o schema manualmente.

### 3.2 Rodar Migrations

```bash
# Gere a migration inicial
npx prisma migrate dev --name init

# OU (se já existem migrations)
npx prisma migrate deploy

# Semeie os dados iniciais
npx prisma db seed
```

---

## Passo 4: Deploy

### 4.1 Verificação Pré-Deploy

Rode o gate completo antes de publicar (env:check → preflight → tsc → lint →
testes → build; falha se algo estiver quebrado):

```bash
npm run pre-deploy
```

Também é possível rodar as etapas individualmente:
- `npm run env:check` — valida o `.env` contra o `.env.example`
- `npm run preflight` — verifica env, Prisma Client, tsc, assets

### 4.2 Deploy na Vercel

```bash
# Opção 1: Via GitHub (recomendado)
git push origin main
# A Vercel detecta automaticamente e faz o deploy

# Opção 2: Via CLI
npm i -g vercel
vercel --prod
```

A Vercel executa automaticamente (conforme `vercel.json`):
1. `npm install`
2. `node scripts/switch-provider.js postgresql` — troca o provider para Postgres
3. `npx prisma generate`
4. `npm run build` (que roda `next build`)

### 4.3 Verificação Pós-Deploy

Após o deploy, verifique:

- [ ] https://seu-site.vercel.app ✅ (landing page)
- [ ] https://seu-site.vercel.app/cursos ✅ (catálogo)
- [ ] https://seu-site.vercel.app/login ✅ (login)
- [ ] Testar login com Google
- [ ] Testar "Esqueci a senha" (verificar se email chega)
- [ ] https://seu-site.vercel.app/api/sitemap ✅ (sitemap)
- [ ] Stripe webhook: `curl -X POST https://seu-site.vercel.app/api/checkout/webhook`

---

## Passo 5: Pós-Deploy

### 5.1 Domínio Personalizado (opcional)

1. No dashboard da Vercel, vá em **Settings → Domains**
2. Adicione seu domínio (ex: `lmsplatform.com.br`)
3. Configure os DNS (Vercel mostra as instruções)
4. Atualize o SSL/TLS

### 5.2 Google Search Console

1. Acesse [search.google.com/search-console](https://search.google.com/search-console)
2. Adicione seu domínio como propriedade
3. Verifique a propriedade (DNS TXT record)
4. Submeta o sitemap: `https://seu-site.vercel.app/sitemap.xml` (se disponível) ou submeta as URLs principais

### 5.3 Google OAuth — Atualizar Redirect URIs

Se usou domínio personalizado, atualize no Google Cloud Console:
- `https://seu-dominio.com/api/auth/callback/google`
- `https://www.seu-dominio.com/api/auth/callback/google`

### 5.4 Resend — Verificar Domínio

Para emails com seu domínio:
1. Em **Resend → Domains**, adicione seu domínio
2. Configure os registros DNS (SPF, DKIM, DMARC)
3. Aguarde a verificação (pode levar alguns minutos)

### 5.5 Stripe Webhook — Atualizar URL

Se usou domínio personalizado, atualize o webhook no Stripe:
- URL: `https://seu-dominio.com/api/checkout/webhook`

### 5.6 Configurar Sentry (Monitoramento)

Para ativar o monitoramento de erros:

```bash
# A instrumentação já está configurada em src/instrumentation.ts
# Basta adicionar a variável de ambiente:
NEXT_PUBLIC_SENTRY_DSN="https://sua-key@sua-org.ingest.sentry.io/project-id"
```

O Sentry capturará automaticamente:
- Erros não tratados no servidor e cliente
- Erros de API (400, 500)
- Exceções no Error Boundary global
- Performance (10% das requisições amostradas)

### 5.7 Verificação Final

```bash
# Rode novamente o preflight para confirmar que tudo está OK
npm run preflight
```

---

## 🔐 Serviço de Email

A plataforma usa [Resend](https://resend.com) para enviar emails transacionais.

### Templates Disponíveis

| Tipo | Gatilho | Descrição |
|------|---------|-----------|
| 🔑 **Redefinir Senha** | Solicitação de "Esqueci a senha" | Link de redefinição (expira em 1h) |
| 👋 **Boas-vindas** | Novo cadastro | Links para dashboard e funcionalidades |
| 🎓 **Certificado** | Curso concluído | Link para visualizar/baixar certificado |
| ✅ **Curso Publicado** | Admin aprova curso | Notificação ao instrutor |
| ❌ **Curso Rejeitado** | Admin rejeita curso | Motivo da rejeição |

### Como Ativar

1. Configure `RESEND_API_KEY` no ambiente
2. Para produção: adicione e verifique seu domínio no Resend
3. Pronto! Os emails são enviados automaticamente

Sem a chave, o sistema funciona normalmente mas os emails são logados no console.

---

## 📲 Notificações Push (Web Push)

A plataforma usa [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
para enviar alertas para o navegador **mesmo com o site fechado**: streak em
risco 🔥, resumo da semana e resumo mensal.

### Como Ativar

```bash
# 1. Gere o par de chaves VAPID (rode uma única vez)
npm run vapid:generate

# 2. Copie as chaves geradas para o .env.local (dev) e para o Vercel (prod):
NEXT_PUBLIC_VAPID_PUBLIC_KEY="chave-publica"
VAPID_PRIVATE_KEY="chave-privada"
VAPID_EMAIL="mailto:admin@pontodosaber.com.br"
```

> 🔐 A `VAPID_PRIVATE_KEY` é **secreta** — nunca a exponha no cliente nem a
> commite. A `NEXT_PUBLIC_VAPID_PUBLIC_KEY` é pública (o navegador a usa para
> assinar a inscrição).

### Como Funciona

1. **Inscrição** — O usuário ativa push em **Configurações → Notificações
   Push**; o navegador cria a inscrição com o Service Worker e ela é salva em
   `POST /api/push/subscribe` (modelo `PushSubscription`).
2. **Envio** — `notifyUserPush()` (em `src/lib/push-notifications.ts`) entrega
   a notificação a **todos os dispositivos inscritos** do usuário; inscrições
   expiradas (HTTP 410) são removidas automaticamente.
3. **Exibição** — `public/sw.js` recebe o evento `push`, exibe a notificação
   com ações (Abrir/Fechar) e abre a URL correta no clique.
4. **Gatilhos** — `POST /api/progress/streak-alert` (streak em risco, máximo
   1x/24h), `POST /api/notifications/weekly-summary` (1x/7d) e
   `POST /api/notifications/monthly-summary` (1x/mês). Todos são chamados pelo
   dashboard e são **idempotentes** — sem cron necessário.

Sem as chaves VAPID configuradas, o envio é **simulado** (logado, sem entrega)
para não quebrar o fluxo em desenvolvimento.

---

## ✅ Checklist de Verificação Pré-Deploy

Use este checklist antes de publicar:

- [ ] **Variáveis de ambiente configuradas** no Vercel (incl. `DATABASE_URL` Postgres)
- [ ] **Migrations rodadas** no banco de produção (`prisma db push`/`migrate deploy`)
- [ ] **Build passa localmente** (`npm run build`)
- [ ] **Gate completo passa** (`npm run pre-deploy`)
- [ ] **Google OAuth** configurado com redirect URIs de produção
- [ ] **Resend** configurado (ou aceitar que emails não serão enviados)
- [ ] **Stripe** configurado (se for cobrar)
- [ ] **Sentry** configurado (opcional, mas recomendado)
- [ ] **Sitemap** gerado (deploy já gera automaticamente)
- [ ] **robots.txt** indexando produção (não bloqueando)
- [ ] **Domínio** configurado (se aplicável)
- [ ] **Google Search Console** configurado (se aplicável)

---

## 🧪 Testes

```bash
# Testes unitários (Vitest)
npm run test

# Testes E2E (Playwright — requer instalação do browser)
npx playwright install
npm run test:e2e

# E2E contra o bundle de produção (como no CI):
# PORT=3000 E2E_PRODUCTION=1 npx playwright test --config src/tests/e2e/playwright.config.ts
#   (fixe a porta — o ambiente define PORT=0 — e a 1ª execução roda `next build`;
#    para reaproveitar um build já feito, adicione E2E_BUILT=1, como no CI)
```

| Camada | Quantidade |
| --- | --- |
| Unit (Vitest) | **505 testes / 73 arquivos** — libs (email, auth, youtube, upload, db, logger, rate-limit, login-challenge, two-factor, recovery-codes, login-audit, session-token, contexts, SSE event bus, offline/IndexedDB, push, uploadthing, i18n) e rotas de API (checkout Stripe, webhook, upload, quizzes, certificados, gamificação, reviews, social, SSE, push/subscribe, resumos semanais/mensais, streak-alert, auth/rate-limit, 2FA, códigos de recuperação, admin — incluindo revogação de sessões, limpeza do histórico e resumo diário de segurança…)
| E2E (Playwright) | **55 testes** — login por papel (incluindo desafio anti-bot, fluxo 2FA com código por e-mail e **happy path completo com código de recuperação**), histórico de sessões e revogação remota, catálogo, certificado, segurança, checkout (matrícula em curso gratuito + assinatura de plano), visitante (páginas públicas + exigência de login), painel do admin (métricas do dashboard, card do resumo diário de segurança, gestão de cursos, alunos + encerrar sessões de alunos, analytics, ciclo criar+excluir curso, drawer mobile), painel do instrutor (métricas, lista de cursos, criação de curso), dashboard do aluno (estatísticas, meta diária, XP semanal, gamificação, sino de notificações) e configurações (som/tom, vibração, inscrição push real no navegador, não perturbe, 2FA + códigos de recuperação) — rodados também contra o bundle de produção (`E2E_PRODUCTION=1`) no CI |
| Cobertura | `npx vitest run --coverage` para o relatório completo |

---

## 🤝 Contribuição

Contribuições são bem-vindas! Siga os passos:

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Adiciona nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request

> 🚀 **Primeira publicação?** Veja o [PR.md](PR.md) — guia passo a passo com os
> comandos exatos para criar o repositório no GitHub, dar push, abrir a PR, o
> que o CI vai validar e como corrigir se algo falhar.

Veja os templates em `.github/ISSUE_TEMPLATE/` e `.github/PULL_REQUEST_TEMPLATE.md`.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">Feito com ❤️ para educação gratuita e acessível</p>
