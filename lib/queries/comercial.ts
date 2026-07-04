import { createClient } from "@/lib/supabase/server";

// Comercial — foco no lucro PREVISTO (não realizado).
//   Profit Previsto = ShipmentProcessView.ForecastNetProfit
//   Receita         = ShipmentProfitProposalView.TotalSalesProposal
// Regras do PBI: data-base = ProcessDate; exclui Canceled e consolidações (CONS).

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

export type ComercialVendedor = {
  ano: number;
  sales_person: string;
  processos: number;
  clientes: number;
  revenue: number;
  profit_previsto: number;
  ticket_medio: number;
};

export type ComercialCustomer = {
  ano: number;
  customer_name: string;
  processos: number;
  revenue: number;
  profit_previsto: number;
  ticket_medio: number;
};

/** Mensal de {ano-1, ano} — gráficos, tabelas YoY e estatísticas (aba Proposta). */
export async function getComercialMensal(ano: number): Promise<ComercialMensal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("comercial_mensal")
    .select("ano, mes, processos, clientes, revenue, profit_previsto")
    .in("ano", [ano - 1, ano]).order("ano").order("mes");
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
    .schema("mart").from("comercial_totais")
    .select("ano, processos, clientes, revenue, profit_previsto")
    .in("ano", [ano - 1, ano]);
  if (error) {
    console.error("[comercial] totais:", error.message);
    return [];
  }
  return (data ?? []) as ComercialTotais[];
}

/** Ranking por vendedor no ano (aba Vendedor). */
export async function getComercialVendedor(ano: number): Promise<ComercialVendedor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("comercial_vendedor")
    .select("ano, sales_person, processos, clientes, revenue, profit_previsto, ticket_medio")
    .eq("ano", ano).order("revenue", { ascending: false });
  if (error) {
    console.error("[comercial] vendedor:", error.message);
    return [];
  }
  return (data ?? []) as ComercialVendedor[];
}

/** Ranking por cliente no ano (aba Customer). */
export async function getComercialCustomer(ano: number, limit = 100): Promise<ComercialCustomer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("comercial_customer")
    .select("ano, customer_name, processos, revenue, profit_previsto, ticket_medio")
    .eq("ano", ano).order("revenue", { ascending: false }).limit(limit);
  if (error) {
    console.error("[comercial] customer:", error.message);
    return [];
  }
  return (data ?? []) as ComercialCustomer[];
}

// ── Aba Semanal (visão de conversões/cancelamentos por semana do PBI) ──

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
  forecast_net: number;
};

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

/** Uma linha por semana do ano — cards e tendência. */
export async function getSemanas(ano: number): Promise<SemanaKpi[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("comercial_semana")
    .select("ano, semana, convertidos, cancelados, profit_previsto")
    .eq("ano", ano).order("semana", { ascending: true });
  if (error) {
    console.error("[comercial] semana:", error.message);
    return [];
  }
  return (data ?? []) as SemanaKpi[];
}

/** Processos de uma semana (quebras por vendedor/tipo/cliente). */
export async function getDetalheSemana(ano: number, semana: number): Promise<ProcessoDetalhe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("comercial_detalhe")
    .select("process_id, ano, semana, sales_person, process_type, customer_name, status, is_cancelado, forecast_net")
    .eq("ano", ano).eq("semana", semana);
  if (error) {
    console.error("[comercial] detalhe:", error.message);
    return [];
  }
  return (data ?? []) as ProcessoDetalhe[];
}

/** Cancelados do ano — bucketizados por "Criado Em" (CreatedOn), regra do PBI. */
export async function getCancelados(ano: number): Promise<Cancelado[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("comercial_detalhe")
    .select("process_id, semana_criacao, created_on, sales_person, customer_service, agent_name, process_type, customer_name")
    .eq("ano_criacao", ano).eq("is_cancelado", true)
    .order("created_on", { ascending: false });
  if (error) {
    console.error("[comercial] cancelados:", error.message);
    return [];
  }
  return (data ?? []) as Cancelado[];
}
