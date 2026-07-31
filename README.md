# 🎓 LMS Platform

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
- **Notificações** — Alertas em tempo real via SSE sobre conquistas e cursos

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
npm run lint             # ESLint
npm run test             # Vitest (testes unitários)
npm run test:e2e         # Playwright (testes E2E)
npm run db:generate      # Gerar Prisma Client
npm run db:push          # Sincronizar schema com banco
npm run db:seed          # Semear dados iniciais
npm run generate-assets  # Gerar ícones PWA + favicon + OG image
npm run preflight        # Verificar pré-requisitos antes do deploy
```

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
```

> 💡 **Gere um NEXTAUTH_SECRET forte:** `npx -y generate-secret` ou `openssl rand -base64 32`

### 2.2 Produção (Vercel)

No dashboard da Vercel, vá em **Settings → Environment Variables** e adicione:

| Variável | Obrigatório? | Valor |
|----------|-------------|-------|
| `DATABASE_URL` | ✅ Sim | `postgresql://...` (da Neon) |
| `NEXTAUTH_SECRET` | ✅ Sim | Secreto forte |
| `NEXTAUTH_URL` | ✅ Sim | `https://seu-site.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | ✅ Sim | `https://seu-site.vercel.app` |
| `AUTH_GOOGLE_ID` | ⚠️ Se tiver Google login | Client ID |
| `AUTH_GOOGLE_SECRET` | ⚠️ Se tiver Google login | Client Secret |
| `RESEND_API_KEY` | ⚠️ Se quiser emails | `re_...` |
| `STRIPE_SECRET_KEY` | ⚠️ Se tiver cursos pagos | `sk_...` |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Se tiver cursos pagos | `whsec_...` |
| `UPLOADTHING_SECRET` | ⚠️ Se tiver uploads | |
| `UPLOADTHING_APP_ID` | ⚠️ Se tiver uploads | |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ Opcional | `https://...` |

---

## Passo 3: Configurar PostgreSQL

### 3.1 Ativar PostgreSQL no Prisma Schema

Edite `prisma/schema.prisma`:

```prisma
// ✅ PRODUÇÃO: descomente este bloco
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ❌ DESENVOLVIMENTO: comente este bloco
// datasource db {
//   provider = "sqlite"
//   url      = "file:./dev.db"
// }
```

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

Sempre rode o preflight antes de publicar:

```bash
npm run preflight
```

Isso verifica:
- ✅ Todas as variáveis de ambiente obrigatórias
- ✅ Prisma Client gerado
- ✅ Conexão com PostgreSQL
- ✅ TypeScript sem erros
- ✅ Schema configurado para PostgreSQL
- ✅ Assets públicos (ícones, favicon, OG image)
- ⚠️ Serviços opcionais (email, Stripe, Sentry)

### 4.2 Deploy na Vercel

```bash
# Opção 1: Via GitHub (recomendado)
git push origin main
# A Vercel detecta automaticamente e faz o deploy

# Opção 2: Via CLI
npm i -g vercel
vercel --prod
```

A Vercel executa automaticamente:
1. `npm install`
2. `npx prisma generate`
3. `npm run build` (que roda `next build`)

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

## ✅ Checklist de Verificação Pré-Deploy

Use este checklist antes de publicar:

- [ ] **Variáveis de ambiente configuradas** no Vercel
- [ ] **PostgreSQL ativo** no schema (não SQLite)
- [ ] **Migrations rodadas** no banco de produção
- [ ] **Build passa localmente** (`npm run build`)
- [ ] **Preflight passa** (`npm run preflight`)
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
# Testes unitários
npm run test

# Testes E2E (requer Playwright instalado)
npx playwright install
npm run test:e2e
```

---

## 🤝 Contribuição

Contribuições são bem-vindas! Siga os passos:

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Adiciona nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request

Veja os templates em `.github/ISSUE_TEMPLATE/` e `.github/PULL_REQUEST_TEMPLATE.md`.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">Feito com ❤️ para educação gratuita e acessível</p>
