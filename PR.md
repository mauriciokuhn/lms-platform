# 🚀 Guia: Criar o Repositório, Push e Abrir a PR

Guia passo a passo para publicar este projeto no GitHub e abrir a Pull Request
com o CI validando tudo. Comandos exatos para **Windows (Git Bash)**.

---

## 📌 Situação atual do projeto

| Item | Valor |
|---|---|
| Branch atual | `freebuff/new-thread-thmrmkr3hi6nhg` (**15 commits** prontos) |
| Remote (`origin`) | ❌ nenhum — precisa ser criado |
| GitHub CLI (`gh`) | ❌ não instalado — o guia cobre os dois caminhos |
| CI | 5 jobs no `ci.yml` + `sanity.yml` + deploy Vercel (ver [O que o CI valida](#-o-que-o-ci-valida-na-pr)) |

> 🔒 **Segredos**: `.env`, `.env.local` e `prisma/dev.db` estão no `.gitignore`
> e **não** serão enviados ao GitHub.

---

## 0. Pré-requisitos

1. Uma conta no GitHub ([github.com](https://github.com)).
2. Identidade do git configurada — confira:

   ```bash
   git config user.name
   git config user.email
   ```

   Se estiver vazio, defina:

   ```bash
   git config user.name "Seu Nome"
   git config user.email "seu@email.com"
   ```

3. **(Opcional)** GitHub CLI — para criar o repo e a PR sem sair do terminal:

   ```bash
   winget install GitHub.cli
   gh auth login
   ```

4. **(Opcional)** Node.js + npm — para rodar o gate completo local antes do push.

---

## Passo 1 — Criar o repositório no GitHub

### Opção A: com `gh` CLI (recomendado)

```bash
cd "C:/Users/MAURICIO/Documents/FREEBUFF/.freebuff/worktrees/thmrmkr3hi6nhg"
gh repo create lms-platform --public --add-readme --remote=origin
```

> `--add-readme` cria a branch `main` com um README inicial. Isso é necessário:
> os workflows (`ci.yml`, `deploy.yml`) só disparam em push/PR para **`main`**,
> então a branch base precisa existir no repositório.

### Opção B: pelo navegador

1. Acesse <https://github.com/new>
2. Nome do repositório: `lms-platform` (público ou privado)
3. Marque **Add a README file** (cria a branch `main`)
4. **Não** adicione `.gitignore` nem `license` — o projeto já tem os seus
5. Clique em **Create repository**
6. Copie a URL do repositório: `https://github.com/SEU-USUARIO/lms-platform.git`

---

## Passo 2 — Configurar o remote e dar push

```bash
cd "C:/Users/MAURICIO/Documents/FREEBUFF/.freebuff/worktrees/thmrmkr3hi6nhg"

# Opção A (criou com gh): o remote 'origin' já existe — confira:
git remote -v

# Opção B (criou no navegador):
git remote add origin https://github.com/SEU-USUARIO/lms-platform.git

# Push da branch de trabalho (com os 15 commits)
git push -u origin freebuff/new-thread-thmrmkr3hi6nhg
```

> ⚠️ **Não** tente `git push origin ...:main` com força: a branch `main` do
> GitHub tem o commit do README e o histórico divergiria. O fluxo correto é
> publicar a branch de trabalho e abrir a PR (Passo 3), que faz o merge limpo.

---

## Passo 3 — Abrir a Pull Request

### Opção A: com `gh` CLI

```bash
gh pr create --base main --head freebuff/new-thread-thmrmkr3hi6nhg \
  --title "feat: sistema de roles, logger seguro, testes e preparação de deploy" \
  --body "PR gerada com o guia PR.md. CI valida lint, types, build, 408 testes unitários, 18 e2e e as migrações Postgres."
```

### Opção B: pelo navegador

Abra a página de comparação e clique em **Create pull request**
(o template `.github/PULL_REQUEST_TEMPLATE.md` preenche o corpo automaticamente):

```
https://github.com/SEU-USUARIO/lms-platform/compare/main...freebuff/new-thread-thmrmkr3hi6nhg
```

---

## 🤖 O que o CI valida na PR

| Workflow / job | Quando roda | O que executa |
|---|---|---|
| `sanity.yml` | todo push em branch (exceto `main`) | `env:check` + `preflight` — gate rápido de feedback |
| `ci.yml` — **lint** | PR e push em `main` | `npm ci` → `env:check` → `npm run lint` (eslint **falha com qualquer warning**) |
| `ci.yml` — **postgres** | PR e push em `main` | `switch-provider postgresql` → **drift-check** (`migrate diff --exit-code`) → `prisma generate` → **`migrate deploy`** → `db seed` → `tsc`, contra um **Postgres 16 real** (service container) |
| `ci.yml` — **typecheck** | PR e push em `main` | `prisma generate` → `db push` → `tsc --noEmit` → `npm run build` |
| `ci.yml` — **test** | PR e push em `main` | `npm test` — **408 testes vitest** (relatório vira artefato) |
| `ci.yml` — **e2e** | PR e push em `main` | build de produção + **18 testes Playwright** no Chromium |
| `deploy-preview.yml` | PR aberta/atualizada | deploy **preview** na Vercel + comentário com a URL (exige secrets) |
| `deploy.yml` | push em `main` (após o merge) | deploy de **produção** na Vercel |

**Secrets necessários:** o CI **passa sem nenhum secret** — `NEXTAUTH_SECRET`
tem fallback de teste (`test-secret-for-ci`) e o Google OAuth é exercitado
apenas no runtime (o e2e usa login por credentials). Somente os deploys da
Vercel exigem, em **Settings → Secrets and variables → Actions**:

- `VERCEL_TOKEN` — access token da Vercel
- `VERCEL_ORG_ID` — ID do time/usuário Vercel
- `VERCEL_PROJECT_ID` — ID do projeto Vercel

---

## 🔧 Como corrigir se o CI falhar

| Job | Mensagem típica | Correção |
|---|---|---|
| **lint** | `warning ... no warnings allowed` | Rodar `npm run lint` local; aplicar `npx eslint . --fix`; corrigir o que sobrar e commitar |
| **env:check** | `missing required variable ...` | Conferir `.env` vs `.env.example`; se a variável é nova, adicioná-la nos dois arquivos (e no bloco `env` do workflow, se o CI precisar) |
| **typecheck** | `TS2322 ...` / `TS2307 ...` | Rodar `npx tsc --noEmit` local, corrigir os tipos e commitar |
| **test** | `1 failed` no vitest | Rodar `npm test` local; isolar com `npx vitest run src/tests/<arquivo> -t "<nome do teste>"`; corrigir e commitar |
| **e2e** | `failed` no Playwright | Rodar `npm run test:e2e` local; se faltar browser, `npx playwright install --with-deps chromium`; inspecionar `playwright-report/` |
| **postgres (drift)** | `Drift detected: ... not in sync` | O `schema.prisma` foi editado **sem** gerar migração. Criar: `node scripts/switch-provider.js postgresql` → `npx prisma migrate dev --name <nome>` → commitar a pasta `prisma/migrations/` → voltar com `node scripts/switch-provider.js sqlite` |
| **postgres (deploy)** | `migration ... failed` | Validar localmente contra um Postgres real (DEPLOY.md §6.1) e gerar uma migração de correção |
| **build** | `Failed to compile` | Rodar `npm run build` local, corrigir e commitar |
| **deploy-preview** | job skipped / falhou | Secrets Vercel não configurados → adicionar `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` no repositório |

> 💡 **Dica**: rode o gate completo local **antes** do push — `npm run pre-deploy`
> (env:check → preflight → tsc → lint → 408 testes → build). Se passar aqui,
> o CI só falhará por problemas de ambiente/segredo.

---

## ✅ Checklist final antes de clicar em "Create pull request"

- [ ] `git remote -v` mostra o `origin` apontando para o seu repositório
- [ ] `git push -u origin freebuff/new-thread-thmrmkr3hi6nhg` concluído sem erros
- [ ] `npm run pre-deploy` verde localmente
- [ ] Nenhum `.env*` ou `prisma/dev.db` aparece em `git status` / `git ls-files`
- [ ] (Opcional) Secrets `VERCEL_*` configurados no repositório para o preview deploy
- [ ] PR criada com base `main` e os checks do CI rodando

---

**Depois do merge (produção):** o `deploy.yml` publica na Vercel. Antes disso,
configure o Postgres na nuvem (Neon/Supabase), as variáveis de ambiente no
projeto Vercel e rode `migrate deploy` + seed contra o banco remoto — veja o
[guia de deploy completo](DEPLOY.md).
