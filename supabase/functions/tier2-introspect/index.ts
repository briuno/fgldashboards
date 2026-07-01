// Health-check / inventário da conexão com o Tier2 (roda no Supabase).
// Valida credenciais, confirma o OpenAPI e lista as entidades OData disponíveis.
// Útil para checar que os secrets TIER2_* estão certos antes da ingestão.

import { authenticate, discoverSpec, getTier2Env } from "../_shared/tier2.ts";

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

  // 1) Autentica (valida os secrets)
  try {
    const token = await authenticate(env);
    result.auth = { ok: true, tokenLength: token.length };
  } catch (e) {
    result.auth = { ok: false, error: String((e as Error).message) };
  }

  // 2) Descobre o OpenAPI (público) e lista as entidades OData
  const found = await discoverSpec(env.baseUrl);
  if (!found) {
    return json({ ...result, ok: false, message: "OpenAPI não encontrado — confirme TIER2_BASE_URL." }, 502);
  }
  const spec = found.spec as {
    info?: { title?: string; version?: string };
    paths?: Record<string, Record<string, unknown>>;
  };
  const paths = Object.keys(spec.paths ?? {});

  // Raízes OData: /api/odata/{Entidade}  (sem chave, sem $count, sem sub-recurso)
  const entities = Array.from(
    new Set(
      paths
        .map((p) => /^\/api\/odata\/([A-Za-z0-9]+)$/.exec(p)?.[1])
        .filter((x): x is string => Boolean(x)),
    ),
  ).sort();

  return json({
    ...result,
    ok: true,
    specUrl: found.url,
    title: spec.info?.title,
    version: spec.info?.version,
    entityCount: entities.length,
    entities,
  });
});
