import { CircleDollarSign, Package, Receipt, TrendingUp, Users } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Delta } from "@/components/dashboard/delta";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { YoyTable, type YoyRow } from "@/components/dashboard/yoy-table";
import { CompareLine, type ComparePoint } from "@/components/charts/compare-line";
import { MonthlyBar, type MonthlyBarPoint } from "@/components/charts/monthly-bar";
import { Donut } from "@/components/charts/donut";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MESES, MESES_CURTO, fmtMi, int, num, variacao } from "@/lib/format";
import { getComercialMensal, getComercialTotais, type ComercialMensal } from "@/lib/queries/comercial";
import { getModalidade, getTopClientesAno } from "@/lib/queries/desempenho";

type Stat = { label: string; prev: number | null; curr: number | null };

/** Estatísticas Total / Média / Maior / Menor de uma métrica mensal. */
function stats(prev: ComercialMensal[], curr: ComercialMensal[], metric: (r: ComercialMensal) => number) {
  const vals = (rows: ComercialMensal[]) => rows.map(metric).filter((v) => v > 0);
  const p = vals(prev);
  const c = vals(curr);
  const agg = (arr: number[], f: (a: number, b: number) => number, init: number) =>
    arr.length ? arr.reduce(f, init) : null;
  return {
    total: { prev: agg(p, (a, b) => a + b, 0), curr: agg(c, (a, b) => a + b, 0) },
    media: {
      prev: p.length ? p.reduce((a, b) => a + b, 0) / p.length : null,
      curr: c.length ? c.reduce((a, b) => a + b, 0) / c.length : null,
    },
    maior: { prev: agg(p, Math.max, -Infinity), curr: agg(c, Math.max, -Infinity) },
    menor: { prev: agg(p, Math.min, Infinity), curr: agg(c, Math.min, Infinity) },
  };
}

function StatRows({ rows }: { rows: Stat[] }) {
  return (
    <Table className="text-[13px]">
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.label} className="hover:bg-transparent">
            <TableCell className="text-muted-foreground py-1.5">{r.label}</TableCell>
            <TableCell className="py-1.5 text-right tabular-nums">
              {r.prev !== null ? fmtMi(r.prev) : "—"}
            </TableCell>
            <TableCell className="py-1.5 text-right font-semibold tabular-nums">
              {r.curr !== null ? fmtMi(r.curr) : "—"}
            </TableCell>
            <TableCell className="py-1.5 text-right">
              <Delta value={variacao(r.prev, r.curr)} className="text-[11px]" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function ComercialPropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;

  const [mensal, totais, topClientes, modalidade] = await Promise.all([
    getComercialMensal(ano),
    getComercialTotais(ano),
    getTopClientesAno(ano, 10),
    getModalidade(ano),
  ]);

  const curr = mensal.filter((m) => m.ano === ano).sort((a, b) => a.mes - b.mes);
  const prev = mensal.filter((m) => m.ano === ano - 1).sort((a, b) => a.mes - b.mes);
  const tCurr = totais.find((t) => t.ano === ano);
  const tPrev = totais.find((t) => t.ano === ano - 1);

  const mesesCur = new Set(curr.map((r) => r.mes));
  const sum = (rows: ComercialMensal[], metric: (r: ComercialMensal) => number, onlySame = false) =>
    rows.filter((r) => !onlySame || mesesCur.has(r.mes)).reduce((a, r) => a + metric(r), 0);

  const revCur = sum(curr, (r) => Number(r.revenue));
  const revPrevSame = sum(prev, (r) => Number(r.revenue), true);
  const procCur = sum(curr, (r) => r.processos);
  const procPrevSame = sum(prev, (r) => r.processos, true);
  const profitCur = sum(curr, (r) => Number(r.profit_previsto));
  const profitPrevSame = sum(prev, (r) => Number(r.profit_previsto), true);
  const ticketCur = procCur > 0 ? revCur / procCur : null;
  const ticketPrev = procPrevSame > 0 ? revPrevSame / procPrevSame : null;

  const vsAnt = `vs ${ano - 1}`;

  const revPrevMap = new Map(prev.map((r) => [r.mes, Number(r.revenue)]));
  const revCurMap = new Map(curr.map((r) => [r.mes, Number(r.revenue)]));
  const receitaLinha: ComparePoint[] = MESES_CURTO.map((label, i) => ({
    label,
    prev: revPrevMap.get(i + 1) ?? null,
    curr: revCurMap.get(i + 1) ?? null,
  })).filter((r) => r.prev !== null || r.curr !== null);

  const profitBarras: MonthlyBarPoint[] = curr.map((r) => ({
    label: MESES_CURTO[r.mes - 1],
    value: Number(r.profit_previsto),
  }));

  const profPrevMap = new Map(prev.map((r) => [r.mes, Number(r.profit_previsto)]));
  const profCurMap = new Map(curr.map((r) => [r.mes, Number(r.profit_previsto)]));
  const profitRows: YoyRow[] = MESES.map((nome, i) => ({
    label: nome,
    prev: profPrevMap.get(i + 1) ?? null,
    curr: profCurMap.get(i + 1) ?? null,
  })).filter((r) => r.prev !== null || r.curr !== null);

  const totalProc = tCurr ? Number(tCurr.processos) : 0;
  const top5 = topClientes.slice(0, 5);
  const top5Proc = top5.reduce((a, c) => a + Number(c.processos), 0);
  const concentracao = [
    ...top5.map((c) => ({ name: c.customer_name, value: Number(c.processos) })),
    ...(totalProc > top5Proc ? [{ name: "Demais Clientes", value: totalProc - top5Proc }] : []),
  ];
  const shareTop5 = totalProc > 0 ? (top5Proc / totalProc) * 100 : 0;

  const donutModal = modalidade.slice(0, 6).map((m) => ({ name: m.modalidade, value: Number(m.processos) }));
  const outrosModal = modalidade.slice(6).reduce((a, m) => a + Number(m.processos), 0);
  if (outrosModal > 0) donutModal.push({ name: "Demais", value: outrosModal });

  const receitaStats = stats(prev, curr, (r) => Number(r.revenue));
  const ticketStats = stats(prev, curr, (r) => (r.processos > 0 ? Number(r.revenue) / r.processos : 0));

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader title="Comercial · Proposta" description="Receita e lucro previsto pela proposta comercial">
        <Segmented
          items={[2022, 2023, 2024, 2025, 2026].map((a) => ({
            label: String(a),
            href: `/comercial/proposta?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Clientes ${ano}`}
          value={tCurr ? num.format(tCurr.clientes) : "—"}
          icon={Users}
          accent="red"
          delta={{ value: variacao(tPrev?.clientes, tCurr?.clientes), suffix: vsAnt }}
        />
        <KpiCard
          title={`Processos ${ano}`}
          value={tCurr ? num.format(tCurr.processos) : "—"}
          icon={Package}
          accent="dark"
          delta={{ value: variacao(procPrevSame, procCur), suffix: vsAnt }}
        />
        <KpiCard
          title={`Receita ${ano} (R$)`}
          value={tCurr ? fmtMi(Number(tCurr.revenue)) : "—"}
          icon={CircleDollarSign}
          accent="red"
          delta={{ value: variacao(revPrevSame, revCur), suffix: vsAnt }}
        />
        <KpiCard
          title={`Ticket Médio ${ano}`}
          value={ticketCur !== null ? fmtMi(ticketCur) : "—"}
          icon={Receipt}
          accent="dark"
          delta={{ value: variacao(ticketPrev, ticketCur), suffix: vsAnt }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita Mensal (R$) — {ano} vs {ano - 1}</CardTitle>
            <CardDescription>Receita da proposta comercial por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <CompareLine data={receitaLinha} prevName={String(ano - 1)} currName={String(ano)} showLabels />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit Previsto Mensal {ano}</CardTitle>
            <CardDescription>Lucro líquido previsto (ForecastNetProfit) por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyBar data={profitBarras} name="Profit Previsto" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Profit Previsto ${ano} (R$)`}
          value={fmtMi(profitCur)}
          icon={TrendingUp}
          accent="red"
          delta={{ value: variacao(profitPrevSame, profitCur), suffix: vsAnt }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 10 Clientes por Processos {ano}</CardTitle>
            <CardDescription>Volume e participação na carteira</CardDescription>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <EmptyState className="h-[240px]" />
            ) : (
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Processos</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientes.map((c, i) => (
                    <TableRow key={c.customer_name}>
                      <TableCell className="py-1.5">
                        <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate py-1.5" title={c.customer_name}>
                        {c.customer_name}
                      </TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{num.format(Number(c.processos))}</TableCell>
                      <TableCell className="text-muted-foreground py-1.5 text-right tabular-nums">
                        {totalProc > 0
                          ? ((Number(c.processos) / totalProc) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita e Ticket Médio — {ano - 1} vs {ano}</CardTitle>
            <CardDescription>Total, média e extremos mensais (R$)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">Receita (R$)</p>
              <StatRows
                rows={[
                  { label: "Total", ...receitaStats.total },
                  { label: "Média mensal", ...receitaStats.media },
                  { label: "Maior mês", ...receitaStats.maior },
                  { label: "Menor mês", ...receitaStats.menor },
                ]}
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">Ticket Médio (R$)</p>
              <StatRows
                rows={[
                  { label: "Ticket médio", prev: ticketPrev, curr: ticketCur },
                  { label: "Maior ticket", ...ticketStats.maior },
                  { label: "Menor ticket", ...ticketStats.menor },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Concentração da Carteira — Top 5</CardTitle>
            <CardDescription>Participação dos maiores clientes (processos)</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut
              data={concentracao}
              centerValue={`${shareTop5.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              centerLabel="da carteira"
              colors={["var(--chart-1)", "var(--chart-3)", "var(--chart-2)", "var(--chart-5)", "var(--chart-8)", "var(--chart-4)"]}
              legend="bottom"
              size={180}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mix por Modalidade {ano}</CardTitle>
            <CardDescription>Participação por volume de processos</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut data={donutModal} centerValue={num.format(totalProc)} centerLabel="Processos" size={190} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit Previsto (R$) por Mês — {ano - 1} vs {ano}</CardTitle>
          </CardHeader>
          <CardContent>
            <YoyTable
              ano={ano}
              rows={profitRows}
              fmt={(v) => int.format(v)}
              totalPrev={tPrev ? Number(tPrev.profit_previsto) : null}
              totalCurr={tCurr ? Number(tCurr.profit_previsto) : null}
            />
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 · Profit Previsto = ForecastNetProfit (lucro líquido previsto do processo) ·
        Receita = TotalSalesProposal · Ticket Médio = Receita ÷ processos · Variações comparam os
        mesmos meses de {ano} e {ano - 1} · Data-base: data do processo; exclui cancelados e
        consolidações (CONS).
      </p>
    </div>
  );
}
