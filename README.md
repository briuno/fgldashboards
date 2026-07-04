# FGL Dashboards

App de BI da **FGL Global** (freight forwarding) que substitui o Power BI:
puxa dados do ERP **Tier2 Cargo** (API REST), armazena no **Supabase** e
apresenta dashboards com login para os gestores. Atualização diária.

## Stack

- **Next.js 16** (App Router, RSC) + TypeScript + Tailwind CSS v4
- **Supabase** — Postgres, Auth, Edge Functions (ingestão), RLS
- **Recharts** + componentes shadcn/ui escritos à mão (em `components/ui/`)
- Deploy do app na **Hostinger** (app Node.js) — veja [`docs/DEPLOY-HOSTINGER.md`](docs/DEPLOY-HOSTINGER.md)

## Como rodar (local)

```bash
npm install
cp .env.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:8084 (ver .claude/launch.json)
```

> `.env.local` guarda as variáveis **públicas** que o app lê. Se você também roda
> scripts de operação (Management API do Supabase), crie um `.env` separado com o
> `SUPABASE_ACCESS_TOKEN` — o app **não** lê esse arquivo. Ambos são git-ignored;
> `.env.example` documenta os dois.

## Estrutura

```
app/(dashboard)/       Telas: Visão Executiva, Comercial, Desempenho, Financeiro, Processos
app/login, app/auth/   Autenticação (Supabase)
lib/supabase/          Clients @supabase/ssr (server, client, session)
lib/queries/           Acesso tipado às views do mart (comercial, desempenho, financeiro, kpi)
components/            UI, gráficos (Recharts), layout (sidebar/topbar), cards de KPI
supabase/migrations/   Schemas raw / core / mart / etl / app
supabase/functions/    Edge Functions (ingestão Tier2): tier2-sync, tier2-introspect
proxy.ts               Guarda de sessão / rotas protegidas
```

## Camadas de dados

`raw` (JSON bruto do Tier2) → `core` (star schema: dims + facts) →
`mart` (views de KPI que o app lê). `etl` guarda estado/fila/log da sincronização;
`app` guarda perfis e papéis.

## Estado atual (M1 — dados reais)

- ✅ App, login e shell do dashboard (sidebar/topbar)
- ✅ Ingestão do Tier2 (`tier2-sync`) landando em `raw`, com backfill mês-a-mês
- ✅ Camadas `core`/`mart` e queries tipadas em `lib/queries/`
- ✅ Telas **Visão Executiva, Comercial, Desempenho e Financeiro** com dados reais,
  batendo com os números do Power BI
- ⏳ Tela **Processos** ainda é placeholder (lista detalhada — próximo passo)

Contexto completo e restrições do ambiente: [`AGENTS.md`](AGENTS.md).
