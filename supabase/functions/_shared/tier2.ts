// Cliente da API do Tier2 Cargo (DevExpress XAF / OData v4).
// Validado em 2026-07-01 contra https://t2app-api.tier2systems.com:
//   - Auth:     POST /api/Authentication/Authenticate  { UserName, Password }  -> JWT (texto puro no body).
//   - Dados:    GET  /api/odata/{Entidade}   ($top, $skip, $filter, $orderby, $select).
//   - Contagem: GET  /api/odata/{Entidade}/$count   (o "$count=true" inline devolve 404 nessa API).

export type Tier2Env = {
  baseUrl: string;
  username?: string;
  password?: string;
};

export function getTier2Env(): Tier2Env {
  return {
    baseUrl: (
      Deno.env.get("TIER2_BASE_URL") ?? "https://t2app-api.tier2systems.com"
    ).replace(/\/+$/, ""),
    username: Deno.env.get("TIER2_USERNAME") ?? undefined,
    password: Deno.env.get("TIER2_PASSWORD") ?? undefined,
  };
}

/** Autentica e devolve o JWT (texto puro). Lança erro em caso de falha. */
export async function authenticate(env: Tier2Env): Promise<string> {
  if (!env.username || !env.password) {
    throw new Error("TIER2_USERNAME/TIER2_PASSWORD ausentes — defina os secrets.");
  }
  const res = await fetch(`${env.baseUrl}/api/Authentication/Authenticate`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/plain" },
    body: JSON.stringify({ UserName: env.username, Password: env.password }),
  });
  const text = (await res.text()).trim();
  if (!res.ok) throw new Error(`Auth Tier2 falhou (${res.status}): ${text.slice(0, 200)}`);
  // O corpo é o JWT cru; alguns proxies envolvem em aspas.
  const token = text.replace(/^"|"$/g, "");
  if (!token.startsWith("ey")) {
    throw new Error(`Auth respondeu 200 mas o corpo não parece um JWT: ${token.slice(0, 60)}`);
  }
  return token;
}

export type ODataParams = {
  top?: number;
  skip?: number;
  filter?: string;
  orderby?: string;
  select?: string;
  expand?: string;
};

function buildODataUrl(baseUrl: string, entity: string, p: ODataParams): string {
  const qs = new URLSearchParams();
  if (p.top != null) qs.set("$top", String(p.top));
  if (p.skip != null) qs.set("$skip", String(p.skip));
  if (p.filter) qs.set("$filter", p.filter);
  if (p.orderby) qs.set("$orderby", p.orderby);
  if (p.select) qs.set("$select", p.select);
  if (p.expand) qs.set("$expand", p.expand);
  const q = qs.toString();
  return `${baseUrl}/api/odata/${entity}${q ? `?${q}` : ""}`;
}

/** Busca uma página (array `value`) de uma entidade OData. */
export async function odataGet<T = Record<string, unknown>>(
  env: Tier2Env,
  token: string,
  entity: string,
  params: ODataParams = {},
): Promise<T[]> {
  const res = await fetch(buildODataUrl(env.baseUrl, entity, params), {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`OData ${entity} falhou (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { value?: T[] };
  return data.value ?? [];
}

/** Conta registros de uma entidade (endpoint /$count desta API). */
export async function odataCount(
  env: Tier2Env,
  token: string,
  entity: string,
  filter?: string,
): Promise<number> {
  const qs = filter ? `?$filter=${encodeURIComponent(filter)}` : "";
  const res = await fetch(`${env.baseUrl}/api/odata/${entity}/$count${qs}`, {
    headers: { accept: "text/plain", authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Count ${entity} falhou (${res.status})`);
  return Number((await res.text()).trim());
}

/** Percorre TODAS as páginas de uma entidade (backfill / sync incremental via $filter). */
export async function* odataIterate<T = Record<string, unknown>>(
  env: Tier2Env,
  token: string,
  entity: string,
  params: Omit<ODataParams, "top" | "skip"> & { pageSize?: number } = {},
): AsyncGenerator<T[]> {
  const pageSize = params.pageSize ?? 500;
  let skip = 0;
  for (;;) {
    const page = await odataGet<T>(env, token, entity, { ...params, top: pageSize, skip });
    if (page.length === 0) break;
    yield page;
    if (page.length < pageSize) break;
    skip += pageSize;
  }
}

/** Descobre o OpenAPI/swagger (público) — útil para introspecção/inventário. */
const SPEC_PATHS = ["/swagger/v1/swagger.json", "/openapi/v1.json"];
export async function discoverSpec(
  baseUrl: string,
): Promise<{ url: string; spec: Record<string, unknown> } | null> {
  for (const p of SPEC_PATHS) {
    try {
      const res = await fetch(`${baseUrl}${p}`, { headers: { accept: "application/json" } });
      if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) {
        return { url: `${baseUrl}${p}`, spec: (await res.json()) as Record<string, unknown> };
      }
    } catch (_e) {
      // tenta o próximo caminho
    }
  }
  return null;
}
