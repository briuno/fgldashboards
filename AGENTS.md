<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FGL Dashboards — contexto do projeto

App web de BI que substitui o Power BI da **FGL Global** (freight forwarding).
Puxa dados do ERP **Tier2 Cargo** (API REST/Swagger), guarda no **Supabase**
(Postgres) e mostra dashboards com login para gestores. Atualização diária.

## Stack
- Next.js 16 (App Router, RSC) + TypeScript + Tailwind v4
- UI: componentes shadcn/ui escritos à mão em `components/ui/` (o CLI do shadcn é
  bloqueado pela rede — ver abaixo). Gráficos com **Recharts** (`components/charts`).
- Auth/DB: Supabase (`@supabase/ssr`) — clients em `lib/supabase/`.
- Ingestão: Supabase **Edge Functions** (Deno) em `supabase/functions/`, agendadas
  por pg_cron. Migrations em `supabase/migrations/`.
- Deploy do app: **Hostinger** (plano Business → app Node.js, auto-deploy via GitHub).
  Por isso `next.config.ts` usa `output: "standalone"`. Guia: `docs/DEPLOY-HOSTINGER.md`.

## Arquitetura de dados (camadas / schemas Postgres)
`raw` (JSON bruto do Tier2) → `core` (star schema: dims + facts) →
`mart` (views/matviews de KPI que o app lê). `etl` = estado/fila/log da sincronização.
`app` = profiles/roles.

## Estrutura
- `app/(dashboard)/*` — telas protegidas: Visão Executiva (`/`), Comercial, Desempenho,
  Financeiro, Processos. `app/login`, `app/auth/*` — autenticação.
- `proxy.ts` — guarda de sessão (Next 16 renomeou "middleware" → "proxy").
- `lib/queries/*` — (M1+) acesso tipado às views do `mart`.

## Restrições do ambiente (importante)
- A **política de rede** deste ambiente só libera registries de pacote (npm). Bloqueia
  (403): `t2app-api.tier2systems.com` (API Tier2) e `ui.shadcn.com`. Por isso: componentes
  shadcn são escritos à mão, e a API do Tier2 só é acessível **de dentro do Supabase**
  (Edge Functions têm saída própria) — não deste sandbox.
- O **Supabase MCP** exige aprovação a cada chamada (aplicar migrations, pegar chaves,
  deploy de função) — precisa ser destravado pelo usuário para operações "ao vivo".

- `.env.local` (git-ignored) — lido pelo **app** Next.js: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valores públicos, protegidos por RLS).
- `.env` (git-ignored) — lido só por **scripts de operação locais** (não pelo app):
  `SUPABASE_ACCESS_TOKEN` (PAT p/ Management API) e `SUPABASE_PROJECT_REF`.
- `.env.example` (versionado) — modelo dos dois acima, sem valores.
- `.mcp.json` (git-ignored) — servers MCP locais (Supabase + Hostinger, com token da API
  Hostinger embutido). Modelo versionado: `.mcp.json.example`.
- Projeto Supabase: `ifjpzyqjdagnxygbkwpm`. URL: `https://ifjpzyqjdagnxygbkwpm.supabase.co`.
- Segredos do Tier2 (NÃO commitar): `TIER2_BASE_URL`, `TIER2_USERNAME`, `TIER2_PASSWORD`
  vão como **Supabase secrets** (`supabase secrets set`) para as Edge Functions.

## Comandos
- `npm run dev` / `npm run build` / `npm run lint`
- `npm run build` NÃO checa `supabase/` (Deno) — excluído no `tsconfig.json`.
