import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfitMapTable } from "@/components/dashboard/profitmap-table";
import { Segmented } from "@/components/dashboard/segmented";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { int } from "@/lib/format";
import { MODALIDADES } from "@/lib/modalidades";
import {
  getProfitMapClientes,
  getProfitMapProcessos,
  getProfitMapTotais,
} from "@/lib/queries/profitmap";

import { carregarDetalhe } from "./actions";

const ANOS = [2022, 2023, 2024, 2025, 2026];
const PAGINA = 100;

export default async function ProfitMapPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; cliente?: string; tipo?: string; n?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;
  const cliente = sp.cliente || undefined;
  const tipo = sp.tipo || undefined;
  const filtros = { cliente, modalidade: tipo };
  // Paginação por URL (sem estado no cliente): cada "carregar mais" soma uma página.
  const limite = Math.min(Math.max(Number(sp.n) || PAGINA, PAGINA), 2000);

  const [processos, totais, clientes] = await Promise.all([
    getProfitMapProcessos(ano, filtros, limite),
    getProfitMapTotais(ano, filtros),
    getProfitMapClientes(ano),
  ]);

  const query = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const base = { ano, cliente, tipo, n: sp.n, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, String(v));
    return `/financeiro/profit-map?${p.toString()}`;
  };

  const temMais = totais != null && processos.length < totais.processos;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Profit Map"
        description="Custos (Payable) e receitas (Receivable) de cada processo, do total até o item e o parceiro."
      >
        <FilterSelect
          param="cliente"
          value={cliente}
          options={clientes}
          placeholder="Todos os clientes"
        />
        <FilterSelect
          param="tipo"
          value={tipo}
          options={MODALIDADES.map((m) => m.db)}
          placeholder="Todas as modalidades"
        />
        <Segmented
          items={ANOS.map((a) => ({
            label: String(a),
            // troca de ano reinicia a paginação
            href: query({ ano: a, n: undefined }),
            active: a === ano,
          }))}
        />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de lucro por processo</CardTitle>
          <CardDescription>
            {totais
              ? `${int.format(totais.processos)} processos · ${int.format(totais.linhas)} lançamentos em ${ano}`
              : `Sem dados em ${ano}`}
            {" · "}
            Profit% = Total ÷ Receivable
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processos.length === 0 ? (
            <EmptyState
              title="Sem lançamentos"
              description="Nenhum processo com custo ou receita no recorte selecionado."
            />
          ) : (
            <>
              <ProfitMapTable
                processos={processos}
                totais={totais}
                carregarDetalhe={carregarDetalhe}
              />
              {totais && temMais && (
                <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Mostrando {int.format(processos.length)} de {int.format(totais.processos)}{" "}
                    processos
                  </span>
                  <Link
                    href={query({ n: limite + PAGINA })}
                    className="border-input hover:bg-muted rounded-md border px-3 py-1.5 font-medium"
                  >
                    Carregar mais
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* O rodapé "Total" cobre TODO o recorte filtrado, não só as linhas carregadas —
          sem este aviso, o total parecia não fechar com a soma visível na tela. */}
      {totais && temMais && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            A linha <span className="font-semibold">Total</span> soma os{" "}
            {int.format(totais.processos)} processos do filtro, e não apenas os{" "}
            {int.format(processos.length)} exibidos acima.
          </p>
        </div>
      )}
    </div>
  );
}
