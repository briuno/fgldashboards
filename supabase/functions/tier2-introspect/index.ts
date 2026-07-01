// Spike de conexão com o Tier2.
// Roda no Supabase (saída de rede aberta) para: (1) validar credenciais,
// (2) descobrir o OpenAPI/swagger e (3) listar as entidades/endpoints.
// Isso guia a modelagem das tabelas e a ingestão nos próximos passos (M1).

import { discoverSpec, getTier2Env, tryLogin } from "../_shared/tier2.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async () => {
  const env = getTier2Env();
  const result: Record<string, unknown> = {
    baseUrl: env.baseUrl,
    hasCreds: Boolean(env.username && env.password),
  };

  // 1) Tenta autenticar (valida credenciais e habilita specs protegidos)
  const auth = await tryLogin(env);
  result.auth = auth ? { ok: true, endpoint: auth.endpoint } : { ok: false };
  const authHeaders = auth ? { Authorization: `Bearer ${auth.token}` } : {};

  // 2) Descobre o OpenAPI (sem auth e, se preciso, com auth)
  let found = await discoverSpec(env.baseUrl);
  if (!found && auth) found = await discoverSpec(env.baseUrl, authHeaders);

  if (!found) {
    return json(
      {
        ...result,
        ok: false,
        message:
          "OpenAPI/swagger não encontrado. Confirme TIER2_BASE_URL e as credenciais.",
      },
      502
    );
  }

  const spec = found.spec as {
    info?: { title?: string; version?: string };
    paths?: Record<string, Record<string, unknown>>;
    components?: { schemas?: Record<string, unknown> };
    definitions?: Record<string, unknown>;
  };

  const paths = Object.keys(spec.paths ?? {});
  const schemas = Object.keys(
    spec.components?.schemas ?? spec.definitions ?? {}
  );
  const getEndpoints = paths.filter((p) => spec.paths?.[p]?.get);

  return json({
    ...result,
    ok: true,
    specUrl: found.url,
    title: spec.info?.title,
    version: spec.info?.version,
    counts: {
      paths: paths.length,
      schemas: schemas.length,
      getEndpoints: getEndpoints.length,
    },
    getEndpoints: getEndpoints.slice(0, 250),
    schemas: schemas.slice(0, 400),
  });
});
