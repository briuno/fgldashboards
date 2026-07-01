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
- A **Visão Executiva** mostra a prévia com dados de exemplo.
- Para testar o login: crie um usuário no Supabase → **Authentication → Users → Add user**.

## Para os dados reais (M1 — depois)
1. **Migrations** no Supabase — já aplicadas no M0 (fonte: `supabase/migrations/`).
2. Conectar o **Tier2** (Edge Function `tier2-introspect`) e a sincronização diária.
3. Ligar a Visão Executiva aos dados reais.

## Dicas
- Se o build reclamar de versão do Node, fixe **Node 20/22** nas configurações do app.
- Variáveis `NEXT_PUBLIC_*` são embutidas no build — se mudar alguma, faça um novo deploy.
- O `next.config.ts` já usa `output: "standalone"`, o que deixa o servidor de produção
  mais enxuto (funciona tanto com `npm start` quanto com `node .next/standalone/server.js`).
