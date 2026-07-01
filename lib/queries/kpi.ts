import { createClient } from "@/lib/supabase/server";

export type MonthlyKpi = {
  month: string; // "2026-04-01"
  processos: number;
  lucro_liquido: number;
  lucro_bruto: number;
  teu: number;
};

export type ClientProfit = {
  customer_name: string;
  processos: number;
  lucro_liquido: number;
};

export type Totals = {
  processos_total: number;
  processos_com_data: number;
  processos_novos: number;
  lucro_liquido: number;
  lucro_bruto: number;
  teu: number;
};

const ZERO_TOTALS: Totals = {
  processos_total: 0,
  processos_com_data: 0,
  processos_novos: 0,
  lucro_liquido: 0,
  lucro_bruto: 0,
  teu: 0,
};

/** Totais gerais — inclui processos novos (sem ProcessDate = ainda sem ETA). */
export async function getTotals(): Promise<Totals> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("mart").from("kpi_totals").select("*").single();
  if (error) {
    console.error("[kpi] kpi_totals:", error.message);
    return ZERO_TOTALS;
  }
  return data as Totals;
}

/** KPIs mensais do mart (Visão Executiva). Ordenados por mês asc. */
export async function getMonthlyKpis(): Promise<MonthlyKpi[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("kpi_monthly")
    .select("month, processos, lucro_liquido, lucro_bruto, teu")
    .order("month", { ascending: true });
  if (error) {
    console.error("[kpi] kpi_monthly:", error.message);
    return [];
  }
  return (data ?? []) as MonthlyKpi[];
}

/** Top clientes por lucro líquido acumulado. */
export async function getTopClients(limit = 6): Promise<ClientProfit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("profit_by_client")
    .select("customer_name, processos, lucro_liquido")
    .order("lucro_liquido", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[kpi] profit_by_client:", error.message);
    return [];
  }
  return (data ?? []) as ClientProfit[];
}
