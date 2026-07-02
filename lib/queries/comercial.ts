import { createClient } from "@/lib/supabase/server";

export type SemanaKpi = {
  ano: number;
  semana: number;
  convertidos: number;
  cancelados: number;
  profit_previsto: number;
};

export type ProcessoDetalhe = {
  process_id: string;
  ano: number;
  semana: number;
  sales_person: string | null;
  process_type: string | null;
  customer_name: string | null;
  status: string | null;
  is_cancelado: boolean;
  forecast_gross: number;
};

/** Uma linha por semana (do ano) — para os cards e a tendência. */
export async function getSemanas(ano: number): Promise<SemanaKpi[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("comercial_semana")
    .select("ano, semana, convertidos, cancelados, profit_previsto")
    .eq("ano", ano)
    .order("semana", { ascending: true });
  if (error) {
    console.error("[comercial] semana:", error.message);
    return [];
  }
  return (data ?? []) as SemanaKpi[];
}

/** Processos de uma semana específica (para as quebras por vendedor/tipo/cliente). */
export async function getDetalheSemana(ano: number, semana: number): Promise<ProcessoDetalhe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("comercial_detalhe")
    .select("process_id, ano, semana, sales_person, process_type, customer_name, status, is_cancelado, forecast_gross")
    .eq("ano", ano)
    .eq("semana", semana);
  if (error) {
    console.error("[comercial] detalhe:", error.message);
    return [];
  }
  return (data ?? []) as ProcessoDetalhe[];
}

export type Cancelado = {
  process_id: string;
  semana_criacao: number;
  created_on: string;
  sales_person: string | null;
  customer_service: string | null;
  agent_name: string | null;
  process_type: string | null;
  customer_name: string | null;
};

/** Cancelados do ano — bucketizados por "Criado Em" (CreatedOn), regra do PBI. */
export async function getCancelados(ano: number): Promise<Cancelado[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("comercial_detalhe")
    .select("process_id, semana_criacao, created_on, sales_person, customer_service, agent_name, process_type, customer_name")
    .eq("ano_criacao", ano)
    .eq("is_cancelado", true)
    .order("created_on", { ascending: false });
  if (error) {
    console.error("[comercial] cancelados:", error.message);
    return [];
  }
  return (data ?? []) as Cancelado[];
}
