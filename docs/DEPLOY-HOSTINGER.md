# Deploy na Hostinger (plano Business — app Node.js)

O plano **Business** tem o recurso **"Deploy your Node.js web app"** com suporte a
**Next.js** e **auto-deploy via GitHub**. É o caminho recomendado (não precisa de VPS
manual). O app é **SSR (Node.js)** — por isso usamos esse recurso, e não a
hospedagem de arquivos estáticos.

## Passo a passo

1. **hPanel → Websites** → no card *"Deploy your Node.js web app"* clique **Get started**.
2. **Conectar o GitHub** e autorizar o repositório `briuno/fgldashboards`.
3. Configure o deploy:
   - **Repositório:** `briuno/fgldashboards`
   - **Branch:** `main`
   - **Framework:** Next.js (deve ser detectado automaticamente)
   - **Build command:** `npm run build` (padrão)
   - **Start command:** `npm start` (padrão)
   - **Node.js:** versão 20 ou 22
4. **Environment variables** — adicione estas duas (são públicas, seguras no navegador):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ifjpzyqjdagnxygbkwpm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_HUUaQD6U9TdtMeGc-MPAbw_RcnpX3lg
   ```
   > ⚠️ **NÃO** coloque aqui a chave secreta (`sb_secret_...`) nem as credenciais do
   > Tier2. Segredos ficam só no Supabase (Vault/secrets das Edge Functions).
5. **Deploy.** Ao concluir, você recebe uma URL. Cada novo push na branch **republica
   automaticamente**.
6. **Domínio + HTTPS:** aponte seu domínio no hPanel; a Hostinger emite o SSL.

## O que funciona já no 1º deploy
- Tela de **login** e navegação completa do dashboard (menu, telas).
- **Visão Executiva, Comercial, Desempenho e Financeiro** com **dados reais** do Tier2
  (via views do `mart`) — a tela **Processos** ainda é placeholder.
- Para dar acesso a um gestor: crie o usuário no Supabase → **Authentication → Users → Add user**.

## Pipeline de dados (já ativo)
- **Migrations** aplicadas no Supabase (fonte: `supabase/migrations/`).
- **Sincronização diária** do Tier2 pela Edge Function `tier2-sync` (backfill mês-a-mês +
  delta), agendada por pg_cron. `tier2-introspect` serve para inspecionar o schema da API.

## Dicas
- Se o build reclamar de versão do Node, fixe **Node 20/22** nas configurações do app.
- Variáveis `NEXT_PUBLIC_*` são embutidas no build — se mudar alguma, faça um novo deploy.
- O `next.config.ts` já usa `output: "standalone"`, o que deixa o servidor de produção
  mais enxuto (funciona tanto com `npm start` quanto com `node .next/standalone/server.js`).
