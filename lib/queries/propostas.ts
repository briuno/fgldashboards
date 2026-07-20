import { createClient } from "@/lib/supabase/server";

// Propostas comerciais (cotações PROP-*) — fonte: Tier2 `ProposalProcessView`.
//
// CUIDADO com o nome: nesta API "Proposal" tem dois sentidos. A
// `ShipmentProfitProposalView` é a PROVISÃO do lucro de um processo (é a fonte do
// Financeiro). A proposta comercial de verdade é a `ProposalProcessView` — esta aqui.
// Ela não tem processo nem "data processo": a data-base é a CRIAÇÃO da proposta.

// `com_valor` = nº de propostas com TotalSales > 0. Os campos monetários do Tier2 só
// passaram a ser preenchidos em 2025/2026 (0% até 2024) — a tela usa isso para mostrar
// "—" em vez de "R$ 0", do mesmo jeito que o Financeiro faz com o GP1.
export type PropostasTotais = {
  ano: number;
  propostas: number;
  ganhas: number;
  perdidas: number;
  abertas: number;
  com_valor: number;
  clientes: number;
  total_sales: number;
  total_sales_ganhas: number;
  profit_previsto: number;
  profit_ganho: number;
};

export type PropostasMensal = Omit<PropostasTotais, "clientes"> & { mes: number };

export type QuebraRow = {
  rotulo: string;
  propostas: number;
  ganhas: number;
  perdidas: number;
  total_sales: number;
  profit_previsto: number;
};

export type QuebraDim = "vendedor" | "modalidade" | "cliente" | "status";

export async function getPropostasTotais(ano: number): Promise<PropostasTotais[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("propostas_totais").select("*").in("ano", [ano - 1, ano]);
  if (error) {
    console.error("[propostas] totais:", error.message);
    return [];
  }
  return (data ?? []) as PropostasTotais[];
}

export async function getPropostasMensal(ano: number): Promise<PropostasMensal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").from("propostas_mensal").select("*")
    .in("ano", [ano - 1, ano]).order("ano").order("mes");
  if (error) {
    console.error("[propostas] mensal:", error.message);
    return [];
  }
  return (data ?? []) as PropostasMensal[];
}

/** Quebra por vendedor / modalidade / cliente / status (agregada no servidor). */
export async function getPropostasQuebra(ano: number, dim: QuebraDim): Promise<QuebraRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart").rpc("propostas_quebra", { p_ano: ano, p_dim: dim });
  if (error) {
    console.error(`[propostas] quebra ${dim}:`, error.message);
    return [];
  }
  return (data ?? []) as QuebraRow[];
}
