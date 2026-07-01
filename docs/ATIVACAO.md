# Guia de Ativação — FGL Dashboards

A **fundação (M0)** está pronta no repositório. Falta "ativar" o que depende de
serviços externos (Supabase e Tier2). Isso **não pode ser feito de dentro do
ambiente de build do Claude** porque a política de rede desse ambiente bloqueia
(403) `*.supabase.co`, `mcp.supabase.com`, `api.supabase.com` e
`t2app-api.tier2systems.com`. É uma limitação só do ambiente de build — em
produção (Vercel + Supabase) tudo se comunica normalmente.

Há dois caminhos:

---

## Opção A (recomendada): liberar a rede do ambiente → o Claude faz o resto

Nas configurações do ambiente do Claude Code (web), ajuste a **política de rede**
para permitir a saída para estes domínios:

- `*.supabase.co` — API/Functions do projeto
- `mcp.supabase.com` — MCP do Supabase (ativação automática)
- `api.supabase.com` — API de gerenciamento / CLI (alternativa ao MCP)
- `t2app-api.tier2systems.com` — API do Tier2 (para o spike de conexão)

Docs: https://code.claude.com/docs/en/claude-code-on-the-web

Com isso liberado, em uma nova sessão o Claude consegue: aplicar as migrations,
publicar a Edge Function, **testar a conexão com o Tier2**, pegar a chave anon e
seguir direto para o M1 (dados reais).

---

## Opção B: ativar manualmente agora (pelo seu computador / painel do Supabase)

### 1. Criar as tabelas (SQL Editor do Supabase)
No painel do Supabase → **SQL Editor**, rode o conteúdo dos arquivos abaixo,
**nesta ordem**:

1. `supabase/migrations/20260701090001_init_schemas.sql`
2. `supabase/migrations/20260701090002_etl.sql`
3. `supabase/migrations/20260701090003_app_auth.sql`
4. `supabase/migrations/20260701090004_core_dim_date.sql`

### 2. Pegar a chave pública (anon)
Painel → **Settings → API** → copie a **Project URL** e a **anon/publishable key**.
Coloque em `.env.local` (local) e nas variáveis de ambiente da Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://ifjpzyqjdagnxygbkwpm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

### 3. Segredos do Tier2 (para as Edge Functions)
Com a [Supabase CLI](https://supabase.com/docs/guides/cli) no seu computador:

```bash
supabase login
supabase link --project-ref ifjpzyqjdagnxygbkwpm
supabase secrets set \
  TIER2_BASE_URL=https://t2app-api.tier2systems.com \
  TIER2_USERNAME='br.fgl.apiuser@' \
  TIER2_PASSWORD='***'          # use a senha atual (e troque depois)
```

### 4. Publicar e testar a função de conexão
```bash
supabase functions deploy tier2-introspect
supabase functions invoke tier2-introspect --no-verify-jwt
```
A resposta deve listar as entidades/endpoints do Tier2 (prova que a conexão e as
credenciais funcionam). **Guarde essa saída** — ela guia a modelagem do M1.

### 5. Publicar o app (Vercel)
- Conecte o repositório `briuno/fgldashboards` na Vercel.
- Defina as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Deploy. O login e o shell do dashboard já funcionam.

### 6. Criar um usuário gestor de teste
Painel → **Authentication → Users → Add user** (email + senha), ou envie um convite.

---

## Segurança
- A senha do Tier2 trafegou pelo chat durante o setup — **troque-a** após validar.
- Nunca commitar segredos. `.env.local` está no `.gitignore`; segredos do Tier2
  ficam só como *secrets* no Supabase.
