# Deploy Guide — LMS Platform (Vercel + GitHub Actions)

Este guia cobre a publicação do projeto na Vercel usando os workflows de
GitHub Actions já incluídos no repositório. O fluxo completo é:

**PR → CI + Preview deploy → merge → CI + produção**

---

## 1. Visão geral dos workflows

| Workflow | Quando roda | O que faz |
| --- | --- | --- |
| `.github/workflows/sanity.yml` | todo push em branch (exceto `main`) | gate rápido pré-PR: `env:check` + `preflight` (sem a bateria completa do CI) |
| `.github/workflows/ci.yml` | push no `main` e em toda PR | lint, typecheck + build, validação do schema contra Postgres real, 408 testes unitários (vitest) e 18 testes e2e em bundle de produção |
| `.github/workflows/deploy-preview.yml` | toda PR (aberta/sync/reaberta) | deploy de preview na Vercel + comentário automático no PR com a URL |
| `.github/workflows/deploy.yml` | push no `main` | deploy de produção na Vercel |

> **Alternativa:** a integração nativa "Vercel for GitHub" (painel da Vercel)
> também gera previews sem workflow. O `vercel.json` define `github.silent:
> true` para silenciar os comentários dela. Se preferir a integração nativa,
> remova os dois workflows de deploy para não fazer deploy duplicado.

---

## 2. Pré-requisitos

- Conta na [Vercel](https://vercel.com) e no GitHub
- O projeto importado/criado na Vercel (ou criado via CLI abaixo)

---

## 3. Criar o projeto na Vercel (CLI)

```bash
# No clone local (uma vez)
npx vercel login
npx vercel link --yes

# O link cria .vercel/project.json com orgId e projectId (gitignored)
cat .vercel/project.json
```

Anote o `orgId` e o `projectId` — eles entram como secrets do GitHub.

---

## 4. Secrets do GitHub

Em **Settings → Secrets and variables → Actions**, crie:

| Secret | De onde vem |
| --- | --- |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create Token (escopo de deploy) |
| `VERCEL_ORG_ID` | `orgId` do `.vercel/project.json` (ou equipe da Vercel) |
| `VERCEL_PROJECT_ID` | `projectId` do `.vercel/project.json` |

Esses três secrets são usados tanto pelo `deploy.yml` (produção) quanto pelo
`deploy-preview.yml` (preview + comentário no PR).

---

## 5. Variáveis de ambiente na Vercel

No painel: **Project → Settings → Environment Variables**. Configure para os
três ambientes (Production, Preview, Development) — o `vercel.json` já
injeta `NEXT_PUBLIC_APP_URL` em produção.

### Obrigatórias (login/banco funcionando)
```
DATABASE_URL=postgresql://…        # ver seção 6 (SQLite não persiste em serverless)
AUTH_SECRET=<string aleatória forte>
AUTH_URL=https://SEU-DOMINIO.vercel.app
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO.vercel.app
```

### Recomendadas
```
# Rate limiting e cache persistentes (Upstash Redis)
UPSTASH_REDIS_REST_URL=…
UPSTASH_REDIS_REST_TOKEN=…

# Google OAuth (redirect: {AUTH_URL}/api/auth/callback/google)
AUTH_GOOGLE_ID=…
AUTH_GOOGLE_SECRET=…
```

### Opcionais (ativam a integração correspondente)
```
RESEND_API_KEY + EMAIL_FROM        # e-mails transacionais
S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY  # uploads
STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # pagamentos
NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_EMAIL          # push
YOUTUBE_API_KEY                    # metadados de vídeo
NEXT_PUBLIC_SENTRY_DSN             # monitoramento de erros
```

> O `vercel.json` já roda `node scripts/switch-provider.js postgresql && npx prisma generate && npm run build` no build, então o Prisma Client é gerado para Postgres automaticamente no deploy.

---

## 6. Banco de dados

> ⚠️ **IMPORTANTE:** o build da Vercel **não aplica o schema ao banco** —
> ele só troca o provider e gera o Prisma Client. Um Postgres novo fica com
> **zero tabelas** no primeiro deploy e a aplicação falha até você rodar
> `prisma db push` (ou `migrate deploy`) contra o banco remoto. Faça isso
> **antes** do primeiro deploy (passo 3 abaixo).

O schema padrão usa **SQLite** (`file:./dev.db`) — serve para dev local e
para a suíte vitest (que cria bancos `test-*.db` isolados), mas **não
persiste em serverless** (o filesystem é efêmero). Para produção:

1. Crie um Postgres gerenciado (Neon, Supabase, Railway…).
2. Aponte `DATABASE_URL` para a connection string do Postgres no ambiente
   **Production** da Vercel (o build troca o provider automaticamente).

> **Como o switch funciona:** o provider fica commitado como SQLite para dev;
> o build da Vercel roda `node scripts/switch-provider.js postgresql` antes do
> `prisma generate`. Localmente, use o mesmo script para alternar:
>
> ```bash
> node scripts/switch-provider.js postgresql   # → Postgres (precisa do DATABASE_URL)
> node scripts/switch-provider.js sqlite       # → voltar para SQLite (dev)
> node scripts/switch-provider.js --check      # mostra o provider atual
> ```

3. Aplique o schema no banco remoto (com o provider em `postgresql`):
   ```bash
   node scripts/switch-provider.js postgresql
   npx prisma db push          # ou: npx prisma migrate deploy
   ```
4. Semear os dados iniciais (admin/cursos) contra o banco remoto:
   ```bash
   npm run db:seed
   ```
5. O CI valida o schema Postgres em toda PR (job `postgres` do `ci.yml`, com
   service container) — se o schema quebrar para Postgres, a PR falha antes
   de chegar à produção.

### Validar localmente contra um Postgres real (Windows)

Se tiver o PostgreSQL instalado localmente (ex.: via winget), é possível
reproduzir o fluxo do CI na sua máquina — sem depender de cloud:

```bash
# 1. Crie um banco de teste
"C:/Program Files/PostgreSQL/16/bin/psql.exe" -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE lms_pg_validate"

# 2. Troque o provider e aponte para o banco local
node scripts/switch-provider.js postgresql
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/lms_pg_validate" npx prisma db push --skip-generate

# 3. Semeie e consulte via Prisma (prova que o client conecta no Postgres)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/lms_pg_validate" npx prisma db seed
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/lms_pg_validate" npx tsx <script-que-conta-usuarios-e-cursos>

# 4. Volte para SQLite (dev) e remova o banco de teste
node scripts/switch-provider.js sqlite && npx prisma generate
"C:/Program Files/PostgreSQL/16/bin/psql.exe" -U postgres -h 127.0.0.1 -p 5432 -c "DROP DATABASE IF EXISTS lms_pg_validate"
```

> ⚠️ O `psql` pede senha — use `-w` para falhar rápido em vez de travar o
> terminal. A senha do usuário `postgres` local é a que você definiu na
> instalação (padrão comum: `postgres`). Nunca commite a senha.

> **Validação executada em 05/08/2026:** `switch-provider postgresql` →
> `db push` (28 tabelas criadas) → `db seed` → consulta via Prisma
> (8 usuários, 6 cursos, 6 matrículas, admin confirmado) → voltou para
> SQLite. Fluxo 100% funcional.

> **Nota:** o `switch-provider` reescreve o bloco de comentário do
> `datasource` com um banner próprio — o `schema.prisma` fica com diff de
> formatação após o switch (mesmo voltando ao mesmo provider). Para dev,
> é inofensivo; para não poluir o commit, rode `git checkout prisma/schema.prisma`
> depois do ciclo (o conteúdo funcional é idêntico).

---

## 7. Fluxo de trabalho do dia a dia

1. **Abra uma PR** → o `ci.yml` roda (lint, typecheck, testes, e2e) e o
   `deploy-preview.yml` cria o **preview** e comenta a URL no PR.
2. Teste o preview: login (`admin@lms.com`/`admin123` após seed), catálogo,
   player, quiz, certificado.
3. **Merge na `main`** → `ci.yml` (push) + `deploy.yml` (produção) rodam.
4. Verifique o deploy em produção e confirme que `AUTH_URL`/`NEXT_PUBLIC_APP_URL`
   apontam para o domínio de produção (redirects de auth dependem disso).

---

## 8. Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| `/admin` redireciona para `localhost` morto | `AUTH_URL` ≠ domínio real do deploy |
| Rate limit reseta a cada deploy | `UPSTASH_REDIS_REST_*` ausentes (limiter volta a in-memory) |
| Login Google falha | `AUTH_GOOGLE_ID/SECRET` ausentes ou redirect não cadastrado |
| Dados somem após redeploy | SQLite em serverless — migrar para Postgres (seção 6) |
| E2E falha com 429 | Rate limit ativo — aguarde 1 minuto e rode de novo |

---

## 9. Rollback

- **Vercel:** Project → Deployments → ⋯ → Promote/Rollback para um deploy
  anterior.
- **GitHub:** reverter o commit na `main` (o `deploy.yml` reimplanta).

---

## 10. Checklist final antes da publicação

- [ ] Secrets `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` criados
- [ ] Env vars obrigatórias configuradas nos 3 ambientes da Vercel
- [ ] Banco Postgres criado e semeado (build já troca o provider para `postgresql`)
- [ ] `AUTH_URL` apontando para o domínio de produção
- [ ] Preview de uma PR testado (login dos 3 papéis, curso, quiz, certificado)
- [ ] Certificado: QR de verificação + página pública `/validar-certificado` testados
- [ ] PDF do certificado baixado e conferido (borda dourada, QR, URL selecionável)
- [ ] `npm run env:check`, `npm run preflight` e `npm run pre-deploy` passando
- [ ] Produção com `NEXT_PUBLIC_APP_URL` correto e domínio customizado

---

## 11. Contas de acesso (seed)

| Papel | Email | Senha | Home após login |
| --- | --- | --- | --- |
| 👑 Admin | `admin@lms.com` | `admin123` | `/admin` |
| 👨‍🏫 Instrutor | `lucas@lms.com` | `instrutor123` | `/instrutor` |
| 🎓 Aluno | `maria@email.com` | `123456` | `/dashboard` |

O redirecionamento pós-login é por papel (`src/lib/role-home.ts` + middleware
em `src/lib/auth.config.ts`), coberto pelos testes e2e em
`src/tests/e2e/roles.spec.ts`.

---

## 12. Testes (estado atual)

| Camada | Quantidade | Cobre |
| --- | --- | --- |
| **Unit (vitest)** | 408 testes / 56 arquivos | lib (email, auth, youtube, upload, db, logger, rate-limit, contexts, event-bus SSE, offline/IndexedDB, push, uploadthing, i18n, certificate-pdf) e rotas de API (courses, modules/lessons, quizzes, certificates, enrollments, admin, instructor, gamification, reviews, notifications, settings, social, SSE, checkout Stripe, webhook, upload, auth/rate-limit) + páginas de UI (gamification widget, validação de certificado) |
| **E2E (Playwright)** | 18 testes | login por papel (admin/instrutor/aluno → redirect), catálogo, certificado, segurança/rate-limit — rodados também contra o bundle de produção no CI |
| **Cobertura geral** | ~24% statements · ~80% branches · ~76% functions | páginas de UI cobertas pelos e2e; módulos de lib/infra cobertos por unit |

Cobertura detalhada: `npx vitest run --coverage`.
