// tier2-sync — ingestão do Tier2 rodando DENTRO do Supabase (rede robusta).
// Fonte: ShipmentProcessView (OData). Escreve JSON cru em raw.shipment_process,
// upsert idempotente que PRESERVA o lucro já embutido (`data || excluded.data`).
// Modos:
//   (sem params)      backfill mês a mês até o fim, depois DELTA por ShipmentUpdateOn.
//   ?months=YYYY-MM,… reprocessa meses com recuperação (subdivide a janela que o Tier2 nega).
//   ?nulldate=1       carrega as linhas com ProcessDate nulo (que o filtro mensal não pega).
//   ?proposal=1       sincroniza ShipmentProfitProposalView (GP2/Revenue do Financeiro) →
//                     raw.shipment_profit_proposal. A view não tem coluna de data; o ano está
//                     no ProcessID ('IA-26016395'): &year=26 filtra contains(ProcessId,'-26').
//                     Usa a recuperação por bissecção (linhas 502). Resumível com &skip=N.
// Chamar via pg_cron: no backfill até backfillComplete; depois roda o delta diário.

import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const BASE = (Deno.env.get("TIER2_BASE_URL") ?? "https://t2app-api.tier2systems.com").replace(/\/+$/, "");
const SELECT = "Oid,ProcessID,ProcessDate,CreatedOn,FirstCreatedOn,ShipmentUpdateOn,CustomerOID,CustomerName,SalesPerson,CustomerService,AgentName,ProcessType,ShipmentExpoImpo,QtyTEU,Status,ForecastGrossProfit,ForecastNetProfit";
// Lucro realizado (faturas) — computado e PESADO no servidor: usar só no modo ?profit=1 (páginas pequenas).
// NoExchVariation = GP1 do Financeiro (lucro faturas sem variação cambial).
const PROFIT_SELECT = SELECT + ",ShipmentProfitInvoiceNetProfit,ShipmentProfitInvoiceGrossProfit,ShipmentProfitInvoiceNetProfitNoExchVariation";
// GP2 (NetProfit) e Revenue (TotalSalesProposal) vêm da proposta — view 1:1 com o processo.
const PROPOSAL_SELECT = "Oid,ProcessId,ProcessOID,NetProfit,TotalSalesProposal";
const BUDGET_MS = 110_000;
const START_MONTH = "2020-01";
const STOP_MONTH = "2027-12";

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sql = any;
type Row = Record<string, unknown>;

async function auth(): Promise<string> {
  const res = await fetch(`${BASE}/api/Authentication/Authenticate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ UserName: Deno.env.get("TIER2_USERNAME"), Password: Deno.env.get("TIER2_PASSWORD") }),
  });
  const txt = (await res.text()).trim().replace(/^"|"$/g, "");
  if (!res.ok || !txt.startsWith("ey")) throw new Error(`auth Tier2 ${res.status}`);
  return txt;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
function monthFilter(ym: string): string {
  return `ProcessDate ge ${ym}-01T00:00:00-03:00 and ProcessDate lt ${nextMonth(ym)}-01T00:00:00-03:00`;
}

// Entidades sincronizáveis → tabela de aterrissagem correspondente.
const TABLES: Record<string, string> = {
  ShipmentProcessView: "shipment_process",
  ShipmentProfitProposalView: "shipment_profit_proposal",
  ProposalProcessView: "proposal_process",
};

// PROPOSTA COMERCIAL de verdade (cotação PROP-*), ≠ ShipmentProfitProposalView (= provisão).
// Tem CreatedOn, então janela mês a mês como a ShipmentProcessView.
const PROPOSTA_SELECT =
  "Oid,ProposalID,Status,StatusID,ProposalType,ModalityID,CreatedOn,StatusDate,ValidUntil,ProposalUpdateOn," +
  "ProposalVersionQty,TotalSales,SalesMargin,ForecastNetProfit,ForecastGrossProfit," +
  "CustomerOID,CustomerName,SalesPerson,InsideSales,Pricing,AgentName,OriginName,DestinationName";

function propostaMonthFilter(ym: string): string {
  return `CreatedOn ge ${ym}-01T00:00:00-03:00 and CreatedOn lt ${nextMonth(ym)}-01T00:00:00-03:00`;
}

async function fetchByFilter(token: string, filter: string, skip: number, size: number, orderby: string, select: string = SELECT, entity = "ShipmentProcessView"): Promise<Row[]> {
  const url =
    `${BASE}/api/odata/${entity}` +
    `?${filter ? `$filter=${encodeURIComponent(filter)}&` : ""}$orderby=${encodeURIComponent(orderby)}` +
    `&$top=${size}&$skip=${skip}&$select=${encodeURIComponent(select)}`;
  let lastErr = "";
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`odata ${res.status}`);
      return ((await res.json()).value ?? []) as Row[];
    } catch (e) {
      lastErr = String((e as Error).message);
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw new Error(lastErr);
}

async function upsert(sql: Sql, rows: Row[], table = "shipment_process"): Promise<void> {
  if (rows.length === 0) return;
  await sql`insert into raw.${sql(table)} as sp (oid, data)
            select (e->>'Oid')::uuid, e from jsonb_array_elements(${sql.json(rows)}::jsonb) e
            on conflict (oid) do update set data = sp.data || excluded.data, synced_at = now()`;
}

// Recupera um sub-range que falhou, dividindo ao meio até isolar a(s) linha(s) que o Tier2 nega.
async function recoverRange(sql: Sql, token: string, filter: string, orderby: string, skip: number, size: number, started: number, select: string = SELECT, entity = "ShipmentProcessView"): Promise<{ got: number; lost: number }> {
  if (Date.now() - started > BUDGET_MS) return { got: 0, lost: 0 };
  try {
    const rows = await fetchByFilter(token, filter, skip, size, orderby, select, entity);
    if (rows.length) await upsert(sql, rows, TABLES[entity]);
    return { got: rows.length, lost: 0 };
  } catch {
    if (size <= 4) return { got: 0, lost: size }; // bloco irrecuperável (linha que o Tier2 dá 502)
    const half = Math.floor(size / 2);
    const a = await recoverRange(sql, token, filter, orderby, skip, half, started, select, entity);
    const b = await recoverRange(sql, token, filter, orderby, skip + half, size - half, started, select, entity);
    return { got: a.got + b.got, lost: a.lost + b.lost };
  }
}

// Percorre um filtro inteiro; janela que falha é recuperada recursivamente (perde só ~4 linhas por registro quebrado).
async function recoverByFilter(sql: Sql, token: string, filter: string, orderby: string, size: number, started: number, startSkip = 0, select: string = SELECT, entity = "ShipmentProcessView") {
  let skip = startSkip, got = 0, lost = 0;
  for (;;) {
    if (Date.now() - started > BUDGET_MS) break;
    let rows: Row[] | null = null;
    try { rows = await fetchByFilter(token, filter, skip, size, orderby, select, entity); }
    catch {
      const r = await recoverRange(sql, token, filter, orderby, skip, size, started, select, entity);
      got += r.got; lost += r.lost;
      skip += size;
      continue;
    }
    if (rows.length === 0) break;
    await upsert(sql, rows, TABLES[entity]);
    got += rows.length; skip += rows.length;
    if (rows.length < size) break;
  }
  return { got, lost, nextSkip: skip };
}

async function processMonthFast(sql: Sql, token: string, ym: string): Promise<number> {
  // Página 50: os campos de forecast são computados e pesam a 150 (conexão cai).
  let skip = 0, got = 0;
  for (;;) {
    const rows = await fetchByFilter(token, monthFilter(ym), skip, 50, "ProcessDate asc");
    if (rows.length === 0) break;
    await upsert(sql, rows);
    skip += rows.length; got += rows.length;
    if (rows.length < 50) break;
  }
  return got;
}

async function updateHwm(sql: Sql): Promise<void> {
  await sql`update etl.sync_state set
              high_water_mark=(select max((data->>'ShipmentUpdateOn')::timestamptz) from raw.shipment_process),
              last_success_at=now(), updated_at=now()
            where entity='ShipmentProcessView'`;
}

Deno.serve(async (req) => {
  const started = Date.now();
  const params = new URL(req.url).searchParams;
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });
  const log: Record<string, unknown> = {};

  // Auditoria: uma linha por execução em etl.sync_log (running → success/error).
  const entity = params.get("propostas") ? "ProposalProcessView"
    : params.get("proposal") ? "ShipmentProfitProposalView"
    : "ShipmentProcessView";
  let mode = params.get("propostas") ? (params.get("delta") ? "propostas-delta" : "propostas")
    : params.get("proposal") ? "proposal"
    : params.get("nulldate") ? "nulldate"
    : params.get("months") ? "months"
    : "auto"; // backfill|delta definido em tempo de execução
  // rows_upserted conta linhas PROCESSADAS no upsert (não só as alteradas); rows_lost = linhas que o Tier2 nega (502).
  let rowsUpserted = 0, rowsLost = 0;
  let logId: number | null = null;
  try {
    const r = await sql`insert into etl.sync_log (entity, mode, status) values (${entity}, ${mode}, 'running') returning id`;
    logId = (r[0]?.id as number) ?? null;
  } catch (e) {
    console.error("sync_log insert:", String((e as Error).message));
  }

  try {
    const token = await auth();

    // ?peek=Entidade&top=&select=&filter=&order= — amostra CRUA, sem gravar nada.
    // Só para investigar o modelo de dados do Tier2 daqui (o sandbox não alcança a API).
    if (params.get("peek")) {
      const ent = params.get("peek")!;
      const qs = new URLSearchParams();
      qs.set("$top", params.get("top") ?? "3");
      if (params.get("select")) qs.set("$select", params.get("select")!);
      if (params.get("filter")) qs.set("$filter", params.get("filter")!);
      if (params.get("order")) qs.set("$orderby", params.get("order")!);
      if (params.get("skip")) qs.set("$skip", params.get("skip")!);
      const res = await fetch(`${BASE}/api/odata/${ent}?${qs}`, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
      const body = res.ok ? await res.json() : await res.text();
      const cnt = await fetch(`${BASE}/api/odata/${ent}/$count`, {
        headers: { authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.text() : "?")).catch(() => "?");
      await sql.end();
      return new Response(JSON.stringify({ entity: ent, status: res.status, count: cnt, body }, null, 2), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (params.get("propostas")) {
      // ?propostas=1&months=YYYY-MM,… → propostas comerciais (ProposalProcessView) por CreatedOn.
      // ?propostas=1&delta=1          → só as alteradas desde o último sync (ProposalUpdateOn).
      const results: Record<string, unknown>[] = [];
      if (params.get("delta")) {
        const st = (await sql`select to_char((coalesce(max((data->>'ProposalUpdateOn')::timestamptz), now() - interval '7 days')
                                              - interval '3 minutes') at time zone '-03:00',
                                             'YYYY-MM-DD"T"HH24:MI:SS')||'-03:00' as hwm
                              from raw.proposal_process`)[0];
        results.push({
          delta: st.hwm,
          ...(await recoverByFilter(sql, token, `ProposalUpdateOn ge ${st.hwm}`, "ProposalID asc", 100, started, 0, PROPOSTA_SELECT, "ProposalProcessView")),
        });
      } else {
        for (const ym of (params.get("months") ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
          if (Date.now() - started > BUDGET_MS) { log.timeBudget = true; break; }
          results.push({ month: ym, ...(await recoverByFilter(sql, token, propostaMonthFilter(ym), "ProposalID asc", 100, started, 0, PROPOSTA_SELECT, "ProposalProcessView")) });
        }
      }
      log.propostas = results;
      log.propostasCount = (await sql`select count(*)::int n from raw.proposal_process`)[0].n;
    } else if (params.get("proposal")) {
      // ?proposal=1&year=26 → só processos '-26' (ProcessID embute o ano). Sem year = view inteira.
      const startSkip = Number(params.get("skip") ?? 0);
      const size = Number(params.get("size") ?? 40);
      const year = params.get("year");
      const filter = year ? `contains(ProcessId,'-${year}')` : "";
      const res = await recoverByFilter(sql, token, filter, "ProcessId asc", size, started, startSkip, PROPOSAL_SELECT, "ShipmentProfitProposalView");
      rowsUpserted += res.got; rowsLost += res.lost;
      log.proposal = res;
      log.proposalCount = (await sql`select count(*)::int n from raw.shipment_profit_proposal`)[0].n;
    } else if (params.get("nulldate")) {
      const startSkip = Number(params.get("skip") ?? 0);
      const res = await recoverByFilter(sql, token, "ProcessDate eq null", "ProcessID asc", 150, started, startSkip);
      rowsUpserted += res.got; rowsLost += res.lost;
      log.nulldate = res;
    } else if (params.get("months")) {
      // ?profit=1 inclui o lucro realizado (faturas) — campos pesados, mas ok em páginas de 40
      const select = params.get("profit") ? PROFIT_SELECT : SELECT;
      const results: Record<string, unknown>[] = [];
      for (const ym of params.get("months")!.split(",").map((s) => s.trim()).filter(Boolean)) {
        if (Date.now() - started > BUDGET_MS) { log.timeBudget = true; break; }
        const res = await recoverByFilter(sql, token, monthFilter(ym), "ProcessID asc", 40, started, 0, select);
        rowsUpserted += res.got; rowsLost += res.lost;
        results.push({ month: ym, ...res });
      }
      log.recovered = results;
    } else {
      await sql`insert into etl.sync_state (entity, mode, delta_cursor)
                values ('ShipmentProcessView','full',${START_MONTH}) on conflict (entity) do nothing`;
      if (params.get("reset")) {
        await sql`update etl.sync_state set mode='full', delta_cursor=${START_MONTH}, updated_at=now() where entity='ShipmentProcessView'`;
      }
      const st = (await sql`select delta_cursor,
                  to_char((coalesce(high_water_mark,'2020-01-01'::timestamptz) - interval '3 minutes') at time zone '-03:00',
                          'YYYY-MM-DD"T"HH24:MI:SS')||'-03:00' as hwm_lit
                from etl.sync_state where entity='ShipmentProcessView'`)[0];
      let cursor: string = (st?.delta_cursor as string) ?? START_MONTH;

      if (cursor <= STOP_MONTH) {
        // ---- BACKFILL ----
        mode = "backfill";
        const failed: { month: string; error: string }[] = [];
        let monthsDone = 0, consec = 0;
        while (Date.now() - started < BUDGET_MS && cursor <= STOP_MONTH) {
          try { rowsUpserted += await processMonthFast(sql, token, cursor); monthsDone++; consec = 0; }
          catch (e) { failed.push({ month: cursor, error: String((e as Error).message).slice(0, 100) }); if (++consec >= 25) { log.systemic = true; break; } }
          cursor = nextMonth(cursor);
          await sql`update etl.sync_state set delta_cursor=${cursor}, updated_at=now() where entity='ShipmentProcessView'`;
        }
        if (cursor > STOP_MONTH) { await sql`update etl.sync_state set mode='delta' where entity='ShipmentProcessView'`; await updateHwm(sql); log.backfillComplete = true; }
        log.mode = "backfill"; log.monthsDone = monthsDone; log.failedMonths = failed; log.cursor = cursor;
      } else {
        // ---- DELTA (diário): linhas atualizadas desde o high-water-mark ----
        mode = "delta";
        const r = await recoverByFilter(sql, token, `ShipmentUpdateOn ge ${st.hwm_lit}`, "ProcessID asc", 150, started);
        rowsUpserted += r.got; rowsLost += r.lost;
        await updateHwm(sql);
        log.mode = "delta"; log.since = st.hwm_lit; log.delta = r;
      }
    }

    log.ok = true;
    log.rawCount = (await sql`select count(*)::int n from raw.shipment_process`)[0].n;
    log.elapsedMs = Date.now() - started;
  } catch (e) {
    log.ok = false; log.error = String((e as Error).message);
  } finally {
    // Fecha a auditoria — isolado: falha ao logar nunca aborta a ingestão.
    try {
      if (logId !== null) {
        await sql`update etl.sync_log set
                    finished_at   = now(),
                    status        = ${log.ok ? "success" : "error"},
                    mode          = ${mode},
                    rows_upserted = ${rowsUpserted},
                    rows_lost     = ${rowsLost},
                    http_status   = ${log.ok ? 200 : null},
                    error         = ${log.ok ? null : String(log.error ?? "").slice(0, 500)},
                    details       = ${sql.json(log)}
                  where id = ${logId}`;
      }
    } catch (e) {
      console.error("sync_log update:", String((e as Error).message));
    }
    await sql.end();
  }
  return new Response(JSON.stringify(log, null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
});
