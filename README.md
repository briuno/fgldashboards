# FGL Dashboards

App de BI da **FGL Global** (freight forwarding) que substitui o Power BI:
puxa dados do ERP **Tier2 Cargo** (API REST), armazena no **Supabase** e
apresenta dashboards com login para os gestores. Atualização diária.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** — Postgres, Auth, Edge Functions (ingestão), RLS
- **Recharts** + componentes shadcn/ui (em `components/ui/`)
- Deploy do app na **Vercel**

## Como rodar (local)

```bash
npm install
cp .env.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:3000
```

## Estrutura

```
app/(dashboard)/   Telas: Visão Executiva, Comercial, Desempenho, Financeiro, Processos
app/login, app/auth/   Autenticação (Supabase)
lib/supabase/      Clients @supabase/ssr (server, client, session)
components/        UI, gráficos, layout (sidebar/topbar), cards de KPI
supabase/migrations/   Schemas raw / core / mart / etl / app
supabase/functions/    Edge Functions (ingestão Tier2). Ex.: tier2-introspect
proxy.ts           Guarda de sessão / rotas protegidas
```

## Camadas de dados

`raw` (JSON bruto do Tier2) → `core` (star schema) → `mart` (views de KPI que o app lê).
`etl` guarda estado/fila/log da sincronização; `app` guarda perfis e papéis.

## Estado atual (M0 — Fundação)

- ✅ App, login, shell do dashboard e telas placeholder
- ✅ Migrations base e Edge Function de introspecção do Tier2 (código)
- ⏳ **Ativação ao vivo no Supabase** (aplicar migrations, secrets, deploy da função,
  chave anon) — depende de destravar o acesso ao Supabase. Veja `AGENTS.md`.

Detalhes e restrições do ambiente: `AGENTS.md`.
