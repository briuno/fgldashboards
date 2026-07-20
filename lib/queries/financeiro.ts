import { createClient } from "@/lib/supabase/server";

// Financeiro — replica os painéis do Power BI (referência: filtro Sistema = Tier2).
// Definições (validadas contra o PBI, delta < 0,5%):
//   GP1 = ShipmentProfitInvoiceNetProfitNoExchVariation (lucro faturas s/ var. cambial)
//   GP2 = NetProfit da proposta · Revenue = TotalSalesProposal da proposta
//   Margem GP2 = GP2 / Revenue. Exclui cancelados e consolidações (CONS).
//
// `com_gp1` / `com_proposta` = nº de processos que têm o dado. Servem para a tela
// distinguir "lucro zero" de "campo ainda não sincronizado" — sem isso um ano sem
// GP1 aparecia como R$ 0,00 e parecia número real.

export type FinanceiroMensal = {
  ano: number;
  mes: number;
  processos: number;
  clientes: number;
  com_gp1: number;
  com_proposta: number;
  gp1: number;
  gp2: number;
  revenue: number;
};

export type FinanceiroTotais = Omit<FinanceiroMensal, "mes">;

export type ClienteTop = {
  customer_name: string;
  processos: number;
  gp2: number;
  revenue: number;
};

export type ModalidadeRow = { modalidade: string; processos: number; gp2: number };

export type FiltroOpcao = { nome: string; processos: number };

type Filtros = { cliente?: string; modalidade?: string };

const args = (ano: number, f: Filtros) => ({
  p_ano: ano,
  p_cliente: f.cliente ?? null,
  p_modalidade: f.modalidade ?? null,
});

/** Mensal de {ano-1, ano}, com filtros opcionais (agregação server-side via RPC). */
export async function getFinanceiroMensal(ano: number, f: Filtros = {}): Promise<FinanceiroMensal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").rpc("financeiro_mensal_filtrado", args(ano, f));
  if (error) {
    console.error("[financeiro] mensal:", error.message);
    return [];
  }
  return (data ?? []) as FinanceiroMensal[];
}

/** Totais anuais de {ano-1, ano} (clientes distintos do ano ≠ soma dos meses). */
export async function getFinanceiroTotais(ano: number, f: Filtros = {}): Promise<FinanceiroTotais[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").rpc("financeiro_totais_filtrado", args(ano, f));
  if (error) {
    console.error("[financeiro] totais:", error.message);
    return [];
  }
  return (data ?? []) as FinanceiroTotais[];
}

/** Top clientes por GP2 do ano, respeitando os filtros ativos. */
export async function getClientesTop(ano: number, f: Filtros = {}, limit = 5): Promise<ClienteTop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").rpc("financeiro_clientes_top", { ...args(ano, f), p_limit: limit });
  if (error) {
    console.error("[financeiro] clientes top:", error.message);
    return [];
  }
  return (data ?? []) as ClienteTop[];
}

/** Participação por modalidade (GP2) do ano, respeitando os filtros ativos. */
export async function getModalidades(ano: number, f: Filtros = {}): Promise<ModalidadeRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").rpc("financeiro_modalidades", args(ano, f));
  if (error) {
    console.error("[financeiro] modalidades:", error.message);
    return [];
  }
  return (data ?? []) as ModalidadeRow[];
}

/** Opções do dropdown de cliente — lista completa do ano (não segue o filtro ativo). */
export async function getClientesFinanceiro(ano: number): Promise<FiltroOpcao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("financeiro_clientes")
    .select("customer_name, processos")
    .eq("ano", ano)
    .order("customer_name")
    .limit(2000);
  if (error) {
    console.error("[financeiro] clientes:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ nome: r.customer_name as string, processos: r.processos as number }));
}

/** Opções do dropdown de modalidade (os 5 baldes, iguais aos do Desempenho). */
export async function getTiposFinanceiro(ano: number): Promise<FiltroOpcao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("financeiro_tipos")
    .select("modalidade, processos")
    .eq("ano", ano)
    .order("processos", { ascending: false });
  if (error) {
    console.error("[financeiro] tipos:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ nome: r.modalidade as string, processos: r.processos as number }));
}
