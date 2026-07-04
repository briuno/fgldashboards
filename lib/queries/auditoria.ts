import { createClient } from "@/lib/supabase/server";

// Auditoria da sincronização com o Tier2 — lê as views do schema `mart` criadas
// na migration 20260703_m1_auditoria (fonte: etl.sync_log / etl.sync_state / raw).

export type SyncHealth = {
  entity: string;
  high_water_mark: string | null;
  last_success_at: string | null;
  last_status: "running" | "success" | "error" | null;
  last_mode: string | null;
  last_run_at: string | null;
  last_finished_at: string | null;
  last_rows_upserted: number | null;
  last_rows_lost: number | null;
  last_error: string | null;
  hours_since_success: number | null;
  is_stale: boolean;
  zeroed: boolean;
};

export type SyncRun = {
  id: number;
  entity: string;
  mode: string | null;
  started_at: string;
  finished_at: string | null;
  duration_s: number | null;
  rows_upserted: number;
  rows_lost: number;
  http_status: number | null;
  status: "running" | "success" | "error";
  error: string | null;
};

export type RowsSyncedDaily = { dia: string; linhas: number };

export type DataFreshness = {
  ultima_atualizacao: string | null;
  linhas_hoje: number;
  raw_count: number;
  mart_processos: number | null;
  high_water_mark: string | null;
};

const ENTITY_PRINCIPAL = "ShipmentProcessView";

export type SyncLevel = "ok" | "warn" | "error" | "none";

/** Classifica a saúde da sync em nível + rótulo (usado no badge e na página). */
export function classifySync(h: SyncHealth | null): { level: SyncLevel; label: string } {
  if (!h || (h.last_success_at === null && h.last_status === null)) {
    return { level: "none", label: "Sem dados de sincronização" };
  }
  if (h.last_status === "error") return { level: "error", label: "Sincronização com erro" };
  if (h.is_stale) return { level: "warn", label: "Sincronização atrasada" };
  if (h.zeroed) return { level: "warn", label: "Sync sem novidades" };
  return { level: "ok", label: "Sincronização em dia" };
}

/** Saúde da sincronização da entidade principal (base do badge e dos cards). */
export async function getSyncHealth(entity = ENTITY_PRINCIPAL): Promise<SyncHealth | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("sync_health")
    .select("*")
    .eq("entity", entity)
    .maybeSingle();
  if (error) {
    console.error("[auditoria] sync_health:", error.message);
    return null;
  }
  return data as SyncHealth | null;
}

/** Saúde de todas as entidades sincronizadas. */
export async function getAllSyncHealth(): Promise<SyncHealth[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("mart").from("sync_health").select("*");
  if (error) {
    console.error("[auditoria] sync_health (all):", error.message);
    return [];
  }
  return (data ?? []) as SyncHealth[];
}

/** Últimas execuções (auditoria por run). */
export async function getSyncRuns(limit = 30): Promise<SyncRun[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[auditoria] sync_runs:", error.message);
    return [];
  }
  return (data ?? []) as SyncRun[];
}

/** Linhas atualizadas por dia (últimos 30d) — para o gráfico de "dando zero". */
export async function getRowsSyncedDaily(): Promise<RowsSyncedDaily[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("rows_synced_daily")
    .select("*")
    .order("dia", { ascending: true });
  if (error) {
    console.error("[auditoria] rows_synced_daily:", error.message);
    return [];
  }
  return (data ?? []) as RowsSyncedDaily[];
}

/** Frescor dos dados + reconciliação raw × mart. */
export async function getDataFreshness(): Promise<DataFreshness | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("data_freshness")
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[auditoria] data_freshness:", error.message);
    return null;
  }
  return data as DataFreshness | null;
}
