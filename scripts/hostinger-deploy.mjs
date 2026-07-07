#!/usr/bin/env node
// Deploy do app para a Hostinger (recurso "Node.js web app") via API.
//
// Uso:   node scripts/hostinger-deploy.mjs [caminho-do-zip]
// Env:   HOSTINGER_API_TOKEN  (obrigatório)
//        DOMAIN               (default: data.octopushub.tech)
//
// Fluxo (o mesmo do MCP oficial da Hostinger): resolve a conta pelo domínio →
// pega credenciais de upload → sobe o zip por TUS → detecta o build → dispara →
// acompanha até completar. O endpoint direto é protegido por Cloudflare, por isso
// o User-Agent do MCP oficial.

import fs from "node:fs";

const BASE = "https://developers.hostinger.com";
const UA = "hostinger-mcp-server/1.2.1";
const TOKEN = process.env.HOSTINGER_API_TOKEN;
const DOMAIN = process.env.DOMAIN || "data.octopushub.tech";
const ARCHIVE = process.argv[2] || "app.zip";
const FNAME = "app.zip"; // nome do arquivo no storage do site

if (!TOKEN) {
  console.error("Falta a variável HOSTINGER_API_TOKEN.");
  process.exit(1);
}

const H = { Authorization: `Bearer ${TOKEN}`, "User-Agent": UA };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: r.status, json };
}

async function main() {
  if (!fs.existsSync(ARCHIVE)) throw new Error(`Arquivo não encontrado: ${ARCHIVE}`);
  const file = fs.readFileSync(ARCHIVE);
  console.log(`Arquivo: ${ARCHIVE} (${(file.length / 1024).toFixed(0)} KB) → ${DOMAIN}`);

  // 1. Resolve o usuário (conta de hospedagem) pelo domínio
  const w = await api(`/api/hosting/v1/websites?domain=${encodeURIComponent(DOMAIN)}`);
  const site = (w.json.data || [])[0];
  if (!site) throw new Error(`Website não encontrado para ${DOMAIN} (status ${w.status})`);
  const username = site.username;
  console.log("Conta:", username);

  // 2. Credenciais de upload
  const c = await api("/api/hosting/v1/files/upload-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, domain: DOMAIN }),
  });
  if (c.status !== 200) throw new Error(`upload-urls ${c.status}: ${JSON.stringify(c.json)}`);
  const upUrl = `${c.json.url.replace(/\/$/, "")}/${FNAME}?override=true`;
  const upH = { "X-Auth": c.json.auth_key, "X-Auth-Rest": c.json.rest_auth_key, "User-Agent": UA };

  // 3. Pré-upload (cria o arquivo) + envio por TUS (um chunk basta p/ código-fonte)
  let r = await fetch(upUrl, {
    method: "POST",
    headers: { ...upH, "upload-length": String(file.length), "upload-offset": "0" },
  });
  if (r.status !== 201) throw new Error(`pré-upload falhou (${r.status})`);
  r = await fetch(upUrl, {
    method: "PATCH",
    headers: {
      ...upH,
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": "0",
      "upload-length": String(file.length),
      "Content-Type": "application/offset+octet-stream",
    },
    body: file,
  });
  if (r.status !== 204) throw new Error(`upload TUS falhou (${r.status})`);
  console.log("Upload OK");

  // 4. Detecta as configurações do build a partir do package.json do arquivo
  const s = await api(
    `/api/hosting/v1/accounts/${username}/websites/${DOMAIN}/nodejs/builds/settings/from-archive?archive_path=${FNAME}`,
  );
  if (s.status !== 200) throw new Error(`settings ${s.status}: ${JSON.stringify(s.json)}`);
  console.log(`Detectado: ${s.json.app_type} · build "${s.json.build_script}" · ${s.json.package_manager}`);

  // 5. Dispara o build
  const buildData = {
    ...s.json,
    node_version: s.json.node_version || 22,
    source_type: "archive",
    source_options: { archive_path: FNAME },
  };
  const b = await api(`/api/hosting/v1/accounts/${username}/websites/${DOMAIN}/nodejs/builds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildData),
  });
  if (b.status !== 200) throw new Error(`build ${b.status}: ${JSON.stringify(b.json)}`);
  const uuid = b.json.uuid;
  console.log("Build iniciado:", uuid);

  // 6. Acompanha até completar (timeout ~5 min)
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const st = await api(`/api/hosting/v1/accounts/${username}/websites/${DOMAIN}/nodejs/builds`);
    const build = (st.json.data || st.json || []).find((x) => x.uuid === uuid);
    const state = build?.state ?? "unknown";
    console.log(`  [${(i + 1) * 5}s] ${state}`);
    if (state === "completed") {
      console.log(`✅ Deploy concluído → https://${DOMAIN}`);
      return;
    }
    if (state === "failed") {
      const logs = await api(
        `/api/hosting/v1/accounts/${username}/websites/${DOMAIN}/nodejs/builds/${uuid}/logs`,
      );
      console.error("❌ Build falhou. Logs:\n", JSON.stringify(logs.json).slice(0, 3000));
      process.exit(1);
    }
  }
  throw new Error("Timeout aguardando o build concluir.");
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
