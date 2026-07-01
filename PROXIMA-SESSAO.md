# Instruções para a próxima sessão — FGL Dashboards

> App de BI que substitui o Power BI da FGL Global (freight forwarding), puxando
> dados do ERP **Tier2 Cargo** para o **Supabase** e mostrando dashboards com login.

## ✅ Onde paramos (M0 — Fundação, concluído)
- App **Next.js 16** + TypeScript + Tailwind v4, build OK (`npm run build`).
- **Login Supabase** (senha + magic link) e **shell do dashboard**: Visão Executiva
  (com dados de exemplo) + telas Comercial, Operações, Financeiro, Processos.
- **Migrations base** em `supabase/migrations/` (schemas `raw/core/mart/etl/app`,
  tabelas de ETL, perfis/papéis + RLS, `dim_date`). Consolidado: `supabase/setup-completo.sql`.
- **Edge Function** `supabase/functions/tier2-introspect` (spike de conexão com o Tier2).
- Guias: `docs/ATIVACAO.md`, `docs/DEPLOY-HOSTINGER.md`. Contexto técnico: `AGENTS.md`.

## ⛔ Bloqueio que impediu o M1
O ambiente de build (Claude Code web) estava com **Network access = Default/Trusted**,
que **bloqueia (403)** Supabase e Tier2. Por isso não deu para aplicar migrations nem
testar a conexão com o Tier2 a partir do sandbox.

**Correção (a fazer antes desta sessão):** criar/usar um ambiente com
**Network access = Custom** liberando estes domínios:
```
api.supabase.com
*.supabase.co
t2app-api.tier2systems.com
```
(`mcp.supabase.com` não precisa — tráfego de MCP passa pela Anthropic.)
Como o "Default" não é editável, criar um ambiente novo (**Add environment**) com esses
domínios e abrir a sessão nele. Doc: https://code.claude.com/docs/en/claude-code-on-the-web

## ▶️ O que fazer nesta sessão (com a rede liberada)
1. **Confirmar acesso**: `mcp__Supabase__list_tables` (project_id `ifjpzyqjdagnxygbkwpm`).
   Se o MCP ainda pedir aprovação, pedir ao usuário um **Personal Access Token** do
   Supabase (Account → Access Tokens) e usar a API/CLI direto.
2. **Criar as tabelas**: aplicar `supabase/migrations/*.sql` na ordem (ou rodar
   `supabase/setup-completo.sql`). Via MCP: `apply_migration` por arquivo.
3. **Segredos do Tier2** (pegar com o usuário — NÃO estão no repo): guardar como secrets
   do Supabase: `TIER2_BASE_URL=https://t2app-api.tier2systems.com`,
   `TIER2_USERNAME=br.fgl.apiuser@`, `TIER2_PASSWORD=<usuário fornece>`.
4. **Deploy + rodar** a função `tier2-introspect` (já vem com `verify_jwt=false`).
   **Ler a saída** (entidades/endpoints do Tier2) — é o mapa para modelar `core`/`mart`.
5. **M1**: com o schema real do Tier2, modelar `core` (`fact_process`, `fact_invoice`,
   dims) e `mart` (views de KPI: `mv_kpi_monthly`, `v_profit_by_client`, …), escrever o
   worker de ingestão (fila `etl.sync_queue`) + transform + **pg_cron diário**, e ligar a
   **Visão Executiva** aos dados reais. Validar números contra o Power BI atual.

## 🔑 Dados do projeto
- **Supabase** project_ref: `ifjpzyqjdagnxygbkwpm` — URL `https://ifjpzyqjdagnxygbkwpm.supabase.co`
- **Chave publishable** (pública, já usada no app): `sb_publishable_HUUaQD6U9TdtMeGc-MPAbw_RcnpX3lg`
- **Chave secreta (service role)** e **senha do Tier2**: fornecidas pelo usuário no chat
  anterior — **NÃO versionadas**. Pedir de novo se necessário. **Recomendado ROTACIONAR ambas.**
- **Tier2 API**: `https://t2app-api.tier2systems.com` (Swagger). Usuário `br.fgl.apiuser@` (confirmado).

## 🚀 Deploy (Hostinger Business)
Recurso "Deploy Node.js web app" via GitHub. Passos em `docs/DEPLOY-HOSTINGER.md`.
Env vars no Hostinger: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable).
App já configurado com `output: "standalone"`.

## 🌿 Git
Tudo está em **`main`** e em **`claude/erp-data-dashboard-e1drny`** (mesmos commits).
