import { createClient } from "@/lib/supabase/server";

// Financeiro — replica os painéis do Power BI (referência: filtro Sistema = Tier2).
// Definições (validadas contra o PBI em 2026-07-02, delta < 0,5%):
//   GP1 = ShipmentProfitInvoiceNetProfitNoExchVariation (lucro faturas s/ var. cambial)
//   GP2 = NetProfit da proposta · Revenue = TotalSalesProposal da proposta
//   Ticket Médio = GP2 / processos. Exclui cancelados e consolidações (CONS).

export type FinanceiroMensal = {
  ano: number;
  mes: number;
  processos: number;
  clientes: number;
  gp1: number;
  gp2: number;
  revenue: number;
};

export type FinanceiroTotais = {
  ano: number;
  processos: number;
  clientes: number;
  gp1: number;
  gp2: number;
  revenue: number;
};

export type FiltroOpcao = { nome: string; processos: number };

/** Mensal de {ano-1, ano}, com filtros opcionais (agregação server-side via RPC). */
export async function getFinanceiroMensal(
  ano: number,
  cliente?: string,
  tipo?: string,
): Promise<FinanceiroMensal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("mart").rpc("financeiro_mensal_filtrado", {
    p_ano: ano,
    p_cliente: cliente ?? null,
    p_tipo: tipo ?? null,
  });
  if (error) {
    console.error("[financeiro] mensal:", error.message);
    return [];
  }
  return (data ?? []) as FinanceiroMensal[];
}

/** Totais anuais de {ano-1, ano} (clientes distintos do ano ≠ soma dos meses). */
export async function getFinanceiroTotais(
  ano: number,
  cliente?: string,
  tipo?: string,
): Promise<FinanceiroTotais[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("mart").rpc("financeiro_totais_filtrado", {
    p_ano: ano,
    p_cliente: cliente ?? null,
    p_tipo: tipo ?? null,
  });
  if (error) {
    console.error("[financeiro] totais:", error.message);
    return [];
  }
  return (data ?? []) as FinanceiroTotais[];
}

export async function getClientesFinanceiro(ano: number): Promise<FiltroOpcao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("financeiro_clientes")
    .select("customer_name, processos")
    .eq("ano", ano)
    .order("customer_name")
    .limit(1000);
  if (error) {
    console.error("[financeiro] clientes:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ nome: r.customer_name as string, processos: r.processos as number }));
}

export async function getTiposFinanceiro(ano: number): Promise<FiltroOpcao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("financeiro_tipos")
    .select("process_type, processos")
    .eq("ano", ano)
    .order("processos", { ascending: false });
  if (error) {
    console.error("[financeiro] tipos:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ nome: r.process_type as string, processos: r.processos as number }));
}
