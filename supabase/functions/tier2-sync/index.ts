// tier2-sync — ingestão do Tier2 rodando DENTRO do Supabase (rede robusta).
// Fonte: ShipmentProcessView (OData). Escreve JSON cru em raw.shipment_process,
// upsert idempotente que PRESERVA o lucro já embutido (`data || excluded.data`).
// Modos:
//   (sem params)      backfill mês a mês até o fim, depois DELTA por ShipmentUpdateOn.
//   ?months=YYYY-MM,… reprocessa meses com recuperação (subdivide a janela que o Tier2 nega).
//   ?nulldate=1       carrega as linhas com ProcessDate nulo (que o filtro mensal não pega).
// Chamar via pg_cron: no backfill até backfillComplete; depois roda o delta diário.

import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const BASE = (Deno.env.get("TIER2_BASE_URL") ?? "https://t2app-api.tier2systems.com").replace(/\/+$/, "");
const SELECT = "Oid,ProcessID,ProcessDate,CreatedOn,ShipmentUpdateOn,CustomerOID,CustomerName,SalesPerson,ProcessType,ShipmentExpoImpo,QtyTEU,Status";
const BUDGET_MS = 110_000;
const START_MONTH = "2020-01";
const STOP_MONTH = "2027-12";

// deno-lint-ignore no-explicit-any
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

async function fetchByFilter(token: string, filter: string, skip: number, size: number, orderby: string): Promise<Row[]> {
  const url =
    `${BASE}/api/odata/ShipmentProcessView` +
    `?$filter=${encodeURIComponent(filter)}&$orderby=${encodeURIComponent(orderby)}` +
    `&$top=${size}&$skip=${skip}&$select=${encodeURIComponent(SELECT)}`;
  let lastErr = "";
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`odata ${res.status}`);
      return ((await res.json()).value ?? []) as Row[];
    } catch (e) {
      lastErr = String((e as Error).message);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(lastErr);
}

async function upsert(sql: Sql, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  await sql`insert into raw.shipment_process as sp (oid, data)
            select (e->>'Oid')::uuid, e from jsonb_array_elements(${sql.json(rows)}::jsonb) e
            on conflict (oid) do update set data = sp.data || excluded.data, synced_at = now()`;
}

// Percorre um filtro inteiro; janela que falha é subdividida (pega os pedaços bons).
async function recoverByFilter(sql: Sql, token: string, filter: string, orderby: string, size: number, started: number) {
  let skip = 0, got = 0, holes = 0;
  for (;;) {
    if (Date.now() - started > BUDGET_MS) break;
    let rows: Row[] | null = null;
    try { rows = await fetchByFilter(token, filter, skip, size, orderby); }
    catch {
      const sub = Math.max(10, Math.floor(size / 5));
      for (let s = skip; s < skip + size; s += sub) {
        if (Date.now() - started > BUDGET_MS) break;
        try { const r = await fetchByFilter(token, filter, s, sub, orderby); if (r.length) { await upsert(sql, r); got += r.length; } }
        catch { holes++; }
      }
      skip += size;
      continue;
    }
    if (rows.length === 0) break;
    await upsert(sql, rows);
    got += rows.length; skip += rows.length;
    if (rows.length < size) break;
  }
  return { got, holes };
}

async function processMonthFast(sql: Sql, token: string, ym: string): Promise<void> {
  let skip = 0;
  for (;;) {
    const rows = await fetchByFilter(token, monthFilter(ym), skip, 150, "ProcessDate asc");
    if (rows.length === 0) break;
    await upsert(sql, rows);
    skip += rows.length;
    if (rows.length < 150) break;
  }
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
  try {
    const token = await auth();

    if (params.get("nulldate")) {
      log.nulldate = await recoverByFilter(sql, token, "ProcessDate eq null", "ProcessID asc", 100, started);
    } else if (params.get("months")) {
      const results: Record<string, unknown>[] = [];
      for (const ym of params.get("months")!.split(",").map((s) => s.trim()).filter(Boolean)) {
        if (Date.now() - started > BUDGET_MS) { log.timeBudget = true; break; }
        results.push({ month: ym, ...(await recoverByFilter(sql, token, monthFilter(ym), "ProcessID asc", 40, started)) });
      }
      log.recovered = results;
    } else {
      await sql`insert into etl.sync_state (entity, mode, delta_cursor)
                values ('ShipmentProcessView','full',${START_MONTH}) on conflict (entity) do nothing`;
      const st = (await sql`select delta_cursor,
                  to_char((coalesce(high_water_mark,'2020-01-01'::timestamptz) - interval '3 minutes') at time zone '-03:00',
                          'YYYY-MM-DD"T"HH24:MI:SS')||'-03:00' as hwm_lit
                from etl.sync_state where entity='ShipmentProcessView'`)[0];
      let cursor: string = (st?.delta_cursor as string) ?? START_MONTH;

      if (cursor <= STOP_MONTH) {
        // ---- BACKFILL ----
        const failed: { month: string; error: string }[] = [];
        let monthsDone = 0, consec = 0;
        while (Date.now() - started < BUDGET_MS && cursor <= STOP_MONTH) {
          try { await processMonthFast(sql, token, cursor); monthsDone++; consec = 0; }
          catch (e) { failed.push({ month: cursor, error: String((e as Error).message).slice(0, 100) }); if (++consec >= 8) { log.systemic = true; break; } }
          cursor = nextMonth(cursor);
          await sql`update etl.sync_state set delta_cursor=${cursor}, updated_at=now() where entity='ShipmentProcessView'`;
        }
        if (cursor > STOP_MONTH) { await sql`update etl.sync_state set mode='delta' where entity='ShipmentProcessView'`; await updateHwm(sql); log.backfillComplete = true; }
        log.mode = "backfill"; log.monthsDone = monthsDone; log.failedMonths = failed; log.cursor = cursor;
      } else {
        // ---- DELTA (diário): linhas atualizadas desde o high-water-mark ----
        const r = await recoverByFilter(sql, token, `ShipmentUpdateOn ge ${st.hwm_lit}`, "ProcessID asc", 150, started);
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
    await sql.end();
  }
  return new Response(JSON.stringify(log, null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
});
