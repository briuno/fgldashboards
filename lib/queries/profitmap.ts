import { createClient } from "@/lib/supabase/server";

// Profit Map — matriz Payable × Receivable do Tier2 (relatório "ProfitMap" do ERP).
// Grão da origem: item de fatura/proposta. A árvore da tela tem 4 níveis:
//   processo → cliente → item → parceiro
// O nível 1 vem de mart.profitmap_processos e os níveis 2-4 de mart.profitmap_detalhe,
// que compartilham o MESMO contrato de bandas (ProfitMapLinha) — a tela usa um único
// renderizador de linha para os quatro.
//
// Profit% = Total BRL ÷ Receivable BRL (conferido contra o relatório do Tier2).

/** Bandas Payable/Receivable + Total — comum a todos os níveis da árvore. */
export type ProfitMapLinha = {
  pay_moeda: string | null;
  pay_valor_original: number;
  pay_taxa: number | null;
  pay_brl: number;
  pay_liquidado: number;
  pay_data_liq: string | null;
  rec_moeda: string | null;
  rec_valor_original: number;
  rec_taxa: number | null;
  rec_brl: number;
  rec_liquidado: number;
  rec_data_liq: string | null;
  total_brl: number;
  total_liquidado: number;
  profit_pct: number | null;
};

export type ProfitMapProcesso = ProfitMapLinha & {
  process_id: string;
  customer_name: string | null;
  process_type: string | null;
  modalidade: string | null;
  process_date: string | null;
  /** nº de lançamentos do processo — distingue "sem custo" de "não sincronizado". */
  linhas: number;
};

export type ProfitMapDetalhe = ProfitMapLinha & {
  customer_name: string | null;
  item_name: string;
  partner_name: string;
};

export type ProfitMapTotais = {
  processos: number;
  linhas: number;
  pay_brl: number;
  pay_liquidado: number;
  rec_brl: number;
  rec_liquidado: number;
  total_brl: number;
  total_liquidado: number;
  profit_pct: number | null;
};

export type ProfitMapFiltros = {
  cliente?: string;
  modalidade?: string;
  busca?: string;
};

const args = (ano: number, f: ProfitMapFiltros) => ({
  p_ano: ano,
  p_cliente: f.cliente ?? null,
  p_modalidade: f.modalidade ?? null,
  p_busca: f.busca ?? null,
});

/** Nível 1: processos do ano, paginado (a matriz pode ter dezenas de milhares). */
export async function getProfitMapProcessos(
  ano: number,
  f: ProfitMapFiltros = {},
  limite = 100,
  offset = 0,
): Promise<ProfitMapProcesso[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("mart").rpc("profitmap_processos", {
    ...args(ano, f),
    p_limit: limite,
    p_offset: offset,
  });
  if (error) {
    console.error("[profitmap] processos:", error.message);
    return [];
  }
  return (data ?? []) as ProfitMapProcesso[];
}

/** Rodapé "Total": mesmo recorte de filtros, sem o limite da paginação. */
export async function getProfitMapTotais(
  ano: number,
  f: ProfitMapFiltros = {},
): Promise<ProfitMapTotais | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .rpc("profitmap_totais", args(ano, f));
  if (error) {
    console.error("[profitmap] totais:", error.message);
    return null;
  }
  return ((data ?? [])[0] ?? null) as ProfitMapTotais | null;
}

/** Níveis 2-4 de um processo (folhas cliente/item/parceiro). A tela monta a árvore. */
export async function getProfitMapDetalhe(processId: string): Promise<ProfitMapDetalhe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .rpc("profitmap_detalhe", { p_process_id: processId });
  if (error) {
    console.error("[profitmap] detalhe:", error.message);
    return [];
  }
  return (data ?? []) as ProfitMapDetalhe[];
}

/** Opções do dropdown de cliente (ano inteiro, independente do filtro ativo). */
export async function getProfitMapClientes(ano: number): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("mart")
    .from("profitmap_clientes")
    .select("customer_name, processos")
    .eq("ano", ano)
    .order("processos", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[profitmap] clientes:", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.customer_name as string).filter(Boolean);
}
