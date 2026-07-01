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
