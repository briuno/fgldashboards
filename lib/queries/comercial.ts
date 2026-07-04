import { createClient } from "@/lib/supabase/server";

// Comercial — foco no lucro PREVISTO (não realizado).
//   Profit Previsto = ShipmentProcessView.ForecastNetProfit
//   Receita         = ShipmentProfitProposalView.TotalSalesProposal
// Regras do PBI: data-base = ProcessDate; exclui Canceled e consolidações (CONS).
// Fonte: views mart.comercial_mensal / mart.comercial_totais.

export type ComercialMensal = {
  ano: number;
  mes: number;
  processos: number;
  clientes: number;
  revenue: number;
  profit_previsto: number;
};

export type ComercialTotais = {
  ano: number;
  processos: number;
  clientes: number;
  revenue: number;
  profit_previsto: number;
};

/** Mensal de {ano-1, ano} — para gráficos, tabelas YoY e estatísticas. */
export async function getComercialMensal(ano: number): Promise<ComercialMensal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("comercial_mensal")
    .select("ano, mes, processos, clientes, revenue, profit_previsto")
    .in("ano", [ano - 1, ano])
    .order("ano")
    .order("mes");
  if (error) {
    console.error("[comercial] mensal:", error.message);
    return [];
  }
  return (data ?? []) as ComercialMensal[];
}

/** Totais anuais de {ano-1, ano} (clientes distintos do ano ≠ soma dos meses). */
export async function getComercialTotais(ano: number): Promise<ComercialTotais[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("comercial_totais")
    .select("ano, processos, clientes, revenue, profit_previsto")
    .in("ano", [ano - 1, ano]);
  if (error) {
    console.error("[comercial] totais:", error.message);
    return [];
  }
  return (data ?? []) as ComercialTotais[];
}
