# Deploy na Hostinger (plano Business — app Node.js)

O app roda **no ar** em **https://data.octopushub.tech** (SSR Next.js no recurso
"Node.js web app" da Hostinger, plano Business). O deploy é **automático a cada push
na `main`** via GitHub Actions.

```
git push (main) → GitHub Actions (lint + build) → API Hostinger (upload + build Node) → site novo no ar
```

## Deploy automático (GitHub Actions) — o caminho oficial

Fica tudo no repo, versionado e controlável:

- **[.github/workflows/deploy.yml](../.github/workflows/deploy.yml)** — dispara em push na
  `main` (e manualmente via *Run workflow*). Valida `npm run lint` + `npm run build` e só
  então publica.
- **[scripts/hostinger-deploy.mjs](../scripts/hostinger-deploy.mjs)** — faz o deploy pela
  API: resolve a conta pelo domínio → sobe o código-fonte (TUS) → dispara o build Node no
  servidor → acompanha até concluir. Também roda local (veja abaixo).

### Secrets necessários no GitHub
Em **Settings → Secrets and variables → Actions** (repo `briuno/fgldashboards`):

| Secret | O que é |
|---|---|
| `HOSTINGER_API_TOKEN` | Token da API Hostinger (hPanel → **API**). Se regenerar, atualize aqui. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon/publishable do Supabase (pública, protegida por RLS). |

> `NEXT_PUBLIC_SUPABASE_URL` já está fixa no workflow (é pública). Segredos de servidor
> (`sb_secret_...`, credenciais do Tier2) **nunca** vão aqui — ficam só nos Supabase secrets.

### Deploy manual (quando precisar)
- **Pelo GitHub:** aba **Actions** → *Deploy → Hostinger* → **Run workflow**.
- **Local:** empacote o código e rode o script:
  ```bash
  zip -r app.zip . -x ".git/*" "node_modules/*" ".next/*" "app.zip"
  HOSTINGER_API_TOKEN=xxxx node scripts/hostinger-deploy.mjs app.zip
  ```

## Setup inicial do site (feito uma vez, no hPanel)

O website em si foi criado uma vez pela UI — não precisa repetir:
1. **hPanel → Websites → "Deploy your Node.js web app"** → criar o site para o subdomínio
   `data.octopushub.tech` (o assistente cria o subdomínio, o DNS e emite o **SSL**).
2. **Node.js 22**, build `npm run build`, framework Next.js (detectado).

> Não é preciso conectar o GitHub no hPanel — a automação é o GitHub Actions acima.
> **Não ligue as duas coisas juntas**, senão cada push publica duas vezes (deploy dobrado).

## O que funciona no app
- **Login** e navegação completa (sidebar com sub-abas por seção).
- **Visão Executiva, Comercial (Proposta/Semanal/Vendedor/Customer), Desempenho (5
  modalidades), Financeiro** com **dados reais** do Tier2 (views do `mart`). **Processos**
  ainda é placeholder.
- **Auditoria** da sincronização (frescor, execuções, reconciliação).
- Para dar acesso a um gestor: Supabase → **Authentication → Users → Add user**.

## Pipeline de dados (já ativo)
- **Migrations** aplicadas no Supabase (`supabase/migrations/`).
- **Sincronização diária** do Tier2 pela Edge Function `tier2-sync` (backfill mês-a-mês +
  delta), agendada por pg_cron; auditada em `etl.sync_log` (tela **Auditoria**).
  `tier2-introspect` serve para inspecionar o schema da API.

## Dicas / troubleshooting
- **Action falhou em "Publicar" com "Unauthenticated":** o `HOSTINGER_API_TOKEN` do secret
  está velho/errado — gere um novo no hPanel → API e atualize o secret.
- **Mudou uma `NEXT_PUBLIC_*`:** ela é embutida no build → um novo push republica com o valor
  novo.
- **Node:** o build usa **Node 22**; o `next.config.ts` usa `output: "standalone"`.
