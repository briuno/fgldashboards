// Helpers de acesso à API do Tier2.
// PROVISÓRIO: os caminhos de login/spec são "tentativas" com base em padrões
// comuns de APIs REST/.NET. Serão fixados quando confirmarmos o swagger real
// (rodando a função tier2-introspect no Supabase, onde a saída de rede é aberta).

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

const SPEC_PATHS = [
  "/swagger/v1/swagger.json",
  "/openapi/v1.json",
  "/swagger/docs/v1",
  "/swagger/v1/swagger.yaml",
];

export type SpecResult = {
  url: string;
  spec: Record<string, unknown>;
  status: number;
};

export async function discoverSpec(
  baseUrl: string,
  headers: Record<string, string> = {}
): Promise<SpecResult | null> {
  for (const p of SPEC_PATHS) {
    const url = `${baseUrl}${p}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", ...headers },
      });
      const ct = res.headers.get("content-type") ?? "";
      if (res.ok && ct.includes("json")) {
        return {
          url,
          spec: (await res.json()) as Record<string, unknown>,
          status: res.status,
        };
      }
    } catch (_e) {
      // tenta o próximo caminho
    }
  }
  return null;
}

type LoginCandidate = {
  path: string;
  form?: boolean;
  body: (u: string, p: string) => Record<string, string>;
};

const LOGIN_PATHS: LoginCandidate[] = [
  { path: "/api/Auth/login", body: (u, p) => ({ username: u, password: p }) },
  { path: "/api/auth/login", body: (u, p) => ({ username: u, password: p }) },
  { path: "/api/authenticate", body: (u, p) => ({ username: u, password: p }) },
  { path: "/api/login", body: (u, p) => ({ username: u, password: p }) },
  {
    path: "/connect/token",
    form: true,
    body: (u, p) => ({ grant_type: "password", username: u, password: p }),
  },
];

export type LoginResult = {
  token: string;
  endpoint: string;
};

export async function tryLogin(env: Tier2Env): Promise<LoginResult | null> {
  if (!env.username || !env.password) return null;

  for (const cand of LOGIN_PATHS) {
    const url = `${env.baseUrl}${cand.path}`;
    try {
      const payload = cand.body(env.username, env.password);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": cand.form
            ? "application/x-www-form-urlencoded"
            : "application/json",
          Accept: "application/json",
        },
        body: cand.form
          ? new URLSearchParams(payload).toString()
          : JSON.stringify(payload),
      });
      if (!res.ok) continue;
      const data = (await res.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!data) continue;
      const token =
        (data.token as string) ??
        (data.access_token as string) ??
        (data.accessToken as string) ??
        (data.jwt as string) ??
        ((data.data as Record<string, unknown> | undefined)?.token as string);
      if (token) return { token: String(token), endpoint: cand.path };
    } catch (_e) {
      // tenta o próximo endpoint
    }
  }
  return null;
}
