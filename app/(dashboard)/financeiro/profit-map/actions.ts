"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfitMapDetalhe, type ProfitMapDetalhe } from "@/lib/queries/profitmap";

/**
 * Carrega os níveis 2-4 (cliente → item → parceiro) de UM processo, sob demanda,
 * quando o usuário expande a linha. Carregar tudo de uma vez não é opção: o grão é
 * item de fatura e um ano tem centenas de milhares de lançamentos.
 *
 * A checagem de sessão é explícita de propósito: Server Functions atendem POST direto,
 * fora da UI, então o guard do `proxy.ts` não cobre este caminho.
 */
export async function carregarDetalhe(processId: string): Promise<ProfitMapDetalhe[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  return getProfitMapDetalhe(processId);
}
