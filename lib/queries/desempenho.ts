import { createClient } from "@/lib/supabase/server";

// Regras (validadas contra o PBI): data-base = ProcessDate ("data processo"),
// exclui Canceled e ProcessID com CONS. GP2 = lucro realizado (faturas).

export type DesempenhoTotais = {
  ano: number;
  processos: number;
  clientes: number;
  teu: number;
  gp2: number;
};

export type MensalRow = { ano: number; mes: number; processos: number; teu: number };
export type ModalidadeRow = { ano: number; modalidade: string; processos: number };
export type ClienteRow = { ano: number; customer_name: string; processos: number };
export type AgenteRow = {
  ano: number;
  agent_name: string;
  processos: number;
  gp2: number;
  ticket_medio: number;
};
export type AgenteMensalRow = { ano: number; mes: number; agent_name: string; processos: number };

export async function getDesempenhoTotais(ano: number): Promise<DesempenhoTotais | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_totais").select("*").eq("ano", ano).maybeSingle();
  if (error) {
    console.error("[desempenho] totais:", error.message);
    return null;
  }
  return data as DesempenhoTotais | null;
}

/** Mensal dos dois anos (ano e ano-1) para as tabelas comparativas. */
export async function getDesempenhoMensal(ano: number): Promise<MensalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_mensal").select("*")
    .in("ano", [ano - 1, ano])
    .order("ano").order("mes");
  if (error) {
    console.error("[desempenho] mensal:", error.message);
    return [];
  }
  return (data ?? []) as MensalRow[];
}

export async function getModalidade(ano: number): Promise<ModalidadeRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_modalidade").select("*")
    .eq("ano", ano).order("processos", { ascending: false });
  if (error) {
    console.error("[desempenho] modalidade:", error.message);
    return [];
  }
  return (data ?? []) as ModalidadeRow[];
}

export async function getTopClientesAno(ano: number, limit = 18): Promise<ClienteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_cliente").select("*")
    .eq("ano", ano).order("processos", { ascending: false }).limit(limit);
  if (error) {
    console.error("[desempenho] clientes:", error.message);
    return [];
  }
  return (data ?? []) as ClienteRow[];
}

/** Todos os agentes do ano (ordenar no server component conforme o visual). */
export async function getAgentes(ano: number): Promise<AgenteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_agente").select("*")
    .eq("ano", ano).order("processos", { ascending: false }).limit(400);
  if (error) {
    console.error("[desempenho] agentes:", error.message);
    return [];
  }
  return (data ?? []) as AgenteRow[];
}

/** Série mensal dos agentes indicados (comparativo top 3). */
export async function getAgenteMensal(ano: number, agentes: string[]): Promise<AgenteMensalRow[]> {
  if (agentes.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_agente_mensal").select("*")
    .eq("ano", ano).in("agent_name", agentes).order("mes");
  if (error) {
    console.error("[desempenho] agente_mensal:", error.message);
    return [];
  }
  return (data ?? []) as AgenteMensalRow[];
}

// ── Desempenho filtrado por modalidade (sub-abas: Impo/Expo Marítimo/Aéreo, Rodoviário) ──

export type ModalTotais = {
  ano: number;
  modalidade: string;
  processos: number;
  clientes: number;
  teu: number;
  gp2: number;
};

export async function getModalTotais(ano: number, modalidade: string): Promise<ModalTotais | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_totais_modal").select("*")
    .eq("ano", ano).eq("modalidade", modalidade).maybeSingle();
  if (error) {
    console.error("[desempenho] modal_totais:", error.message);
    return null;
  }
  return data as ModalTotais | null;
}

/**
 * Totais até um mês de corte — use para o ano anterior, com o último mês que o ano
 * corrente tem. Sem isso o comparativo soma 12 meses contra 9 e a variação mente.
 * `clientes` é distinct, então não dá para somar mês a mês no app.
 */
export async function getModalTotaisPeriodo(
  ano: number,
  modalidade: string,
  ateMes: number,
): Promise<ModalTotais | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").rpc("desempenho_totais_periodo", {
      p_ano: ano,
      p_modalidade: modalidade,
      p_ate_mes: ateMes,
    });
  if (error) {
    console.error("[desempenho] totais_periodo:", error.message);
    return null;
  }
  const row = (data ?? [])[0];
  return row ? ({ ...row, modalidade } as ModalTotais) : null;
}

/** Mensal (processos/teu) de {ano-1, ano} para uma modalidade. */
export async function getModalMensal(ano: number, modalidade: string): Promise<MensalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_mensal_modal")
    .select("ano, mes, processos, teu")
    .eq("modalidade", modalidade).in("ano", [ano - 1, ano]).order("ano").order("mes");
  if (error) {
    console.error("[desempenho] modal_mensal:", error.message);
    return [];
  }
  return (data ?? []) as MensalRow[];
}

export async function getModalAgentes(ano: number, modalidade: string, limit = 15): Promise<AgenteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_agente_modal")
    .select("ano, agent_name, processos, gp2, ticket_medio")
    .eq("ano", ano).eq("modalidade", modalidade)
    .order("processos", { ascending: false }).limit(limit);
  if (error) {
    console.error("[desempenho] modal_agente:", error.message);
    return [];
  }
  return (data ?? []) as AgenteRow[];
}

export async function getModalClientes(ano: number, modalidade: string, limit = 12): Promise<ClienteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_cliente_modal")
    .select("ano, customer_name, processos")
    .eq("ano", ano).eq("modalidade", modalidade)
    .order("processos", { ascending: false }).limit(limit);
  if (error) {
    console.error("[desempenho] modal_cliente:", error.message);
    return [];
  }
  return (data ?? []) as ClienteRow[];
}

export async function getModalAgenteMensal(ano: number, modalidade: string, agentes: string[]): Promise<AgenteMensalRow[]> {
  if (agentes.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("desempenho_agente_mensal_modal")
    .select("ano, mes, agent_name, processos")
    .eq("ano", ano).eq("modalidade", modalidade).in("agent_name", agentes).order("mes");
  if (error) {
    console.error("[desempenho] modal_agente_mensal:", error.message);
    return [];
  }
  return (data ?? []) as AgenteMensalRow[];
}
