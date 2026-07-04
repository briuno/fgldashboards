import { Boxes, Package, Plane, Ship, Truck, TrendingUp, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { YoyTable, type YoyRow } from "@/components/dashboard/yoy-table";
import { EntityBars } from "@/components/charts/entity-bars";
import { CompareLine, type ComparePoint } from "@/components/charts/compare-line";
import { MultiLine, type MultiLinePoint } from "@/components/charts/multi-line";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MESES, MESES_CURTO, fmtMi, int, nomeCurto, num, variacao } from "@/lib/format";
import {
  getAgenteMensal,
  getAgentes,
  getDesempenhoMensal,
  getDesempenhoTotais,
  getModalidade,
  type MensalRow,
} from "@/lib/queries/desempenho";

function modalIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("marítima") || n.includes("maritima") || n.includes("ocean")) return Ship;
  if (n.includes("aérea") || n.includes("aerea") || n.includes("air")) return Plane;
  if (n.includes("road") || n.includes("rodo")) return Truck;
  return Boxes;
}

function samePeriodVar(rows: MensalRow[], ano: number, campo: "processos" | "teu"): number | null {
  const mesesCur = new Set(rows.filter((r) => r.ano === ano).map((r) => r.mes));
  if (mesesCur.size === 0) return null;
  const somaCur = rows.filter((r) => r.ano === ano).reduce((a, r) => a + Number(r[campo]), 0);
  const somaPrev = rows
    .filter((r) => r.ano === ano - 1 && mesesCur.has(r.mes))
    .reduce((a, r) => a + Number(r[campo]), 0);
  return variacao(somaPrev, somaCur);
}

export default async function DesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;

  const [totais, mensal, modalidade, agentes, agentesPrev] = await Promise.all([
    getDesempenhoTotais(ano),
    getDesempenhoMensal(ano),
    getModalidade(ano),
    getAgentes(ano),
    getAgentes(ano - 1),
  ]);

  const top3 = agentes.slice(0, 3).map((a) => a.agent_name);
  const agenteMensal = await getAgenteMensal(ano, top3);

  const linhasTop3: MultiLinePoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const rows = agenteMensal.filter((r) => r.mes === m);
    if (rows.length === 0) continue;
    const point: MultiLinePoint = { label: MESES_CURTO[m - 1] };
    for (const a of top3) {
      point[nomeCurto(a)] = rows.find((r) => r.agent_name === a)?.processos ?? 0;
    }
    linhasTop3.push(point);
  }

  const topAgentesGp2 = [...agentes].sort((a, b) => Number(b.gp2) - Number(a.gp2)).slice(0, 10);
  const totalGp2Top = topAgentesGp2.reduce((a, r) => a + Number(r.gp2), 0);
  const totalProcTop = topAgentesGp2.reduce((a, r) => a + Number(r.processos), 0);

  const trendProc = samePeriodVar(mensal, ano, "processos");
  const trendTeu = samePeriodVar(mensal, ano, "teu");
  const agentesAtivos = agentes.filter((a) => Number(a.processos) > 0).length;
  const agentesAtivosPrev = agentesPrev.filter((a) => Number(a.processos) > 0).length;

  const totalProc = Number(totais?.processos ?? 0);
  const gp2Total = Number(totais?.gp2 ?? 0);

  // Evolução mensal: linha 2 anos
  const procPrev = new Map(mensal.filter((r) => r.ano === ano - 1).map((r) => [r.mes, Number(r.processos)]));
  const procCur = new Map(mensal.filter((r) => r.ano === ano).map((r) => [r.mes, Number(r.processos)]));
  const evolucao: ComparePoint[] = MESES_CURTO.map((label, i) => ({
    label,
    prev: procPrev.get(i + 1) ?? null,
    curr: procCur.get(i + 1) ?? null,
  })).filter((r) => r.prev !== null || r.curr !== null);

  // Tabelas comparativas
  const teuPrev = new Map(mensal.filter((r) => r.ano === ano - 1).map((r) => [r.mes, Number(r.teu)]));
  const teuCur = new Map(mensal.filter((r) => r.ano === ano).map((r) => [r.mes, Number(r.teu)]));
  const toRows = (p: Map<number, number>, c: Map<number, number>): YoyRow[] =>
    MESES.map((nome, i) => ({
      label: nome,
      prev: p.get(i + 1) ?? null,
      curr: c.get(i + 1) ?? null,
    })).filter((r) => r.prev !== null || r.curr !== null);
  const sumVals = (m: Map<number, number>) => [...m.values()].reduce((a, b) => a + b, 0);

  // Modalidades
  const donutModal = modalidade.slice(0, 5).map((m) => ({ name: m.modalidade, value: Number(m.processos) }));
  const outrosModal = modalidade.slice(5).reduce((a, m) => a + Number(m.processos), 0);
  if (outrosModal > 0) donutModal.push({ name: "Demais", value: outrosModal });

  const vsAnt = `vs ${ano - 1}`;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        title="Desempenho"
        description="Análise detalhada de performance operacional e de agentes"
      >
        <Segmented
          items={[2024, 2025, 2026].map((a) => ({
            label: String(a),
            href: `/desempenho?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Processos ${ano}`}
          value={num.format(totalProc)}
          icon={Package}
          accent="red"
          delta={{ value: trendProc, suffix: vsAnt }}
        />
        <KpiCard
          title="Agentes ativos"
          value={num.format(agentesAtivos)}
          icon={UsersRound}
          accent="dark"
          delta={{ value: variacao(agentesAtivosPrev, agentesAtivos), suffix: vsAnt }}
        />
        <KpiCard
          title={`TEU's ${ano}`}
          value={num.format(Number(totais?.teu ?? 0))}
          icon={Ship}
          accent="red"
          delta={{ value: trendTeu, suffix: vsAnt }}
        />
        <KpiCard
          title={`GP2 ${ano} (R$)`}
          value={fmtMi(gp2Total)}
          icon={TrendingUp}
          accent="dark"
          hint="Lucro realizado (faturas)"
        />
      </div>

      {/* Agentes: volume + comparativo top 3 */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Principais Agentes por Quantidade de Processos</CardTitle>
            <CardDescription>Top 10 do ano</CardDescription>
          </CardHeader>
          <CardContent>
            <EntityBars
              data={agentes.slice(0, 10).map((a) => ({ label: a.agent_name, value: Number(a.processos) }))}
              color="var(--chart-2)"
              height={290}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparativo Top 3 Agentes — Processos por Mês</CardTitle>
            <CardDescription>Disputa mês a mês entre os líderes de volume</CardDescription>
          </CardHeader>
          <CardContent>
            <MultiLine data={linhasTop3} series={top3.map(nomeCurto)} height={290} />
          </CardContent>
        </Card>
      </div>

      {/* GP2 por agente + evolução */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 10 Agentes por GP2</CardTitle>
            <CardDescription>Lucro realizado e ticket médio por processo</CardDescription>
          </CardHeader>
          <CardContent>
            {topAgentesGp2.length === 0 ? (
              <EmptyState className="h-[240px]" />
            ) : (
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead className="text-right">Processos</TableHead>
                    <TableHead className="text-right">GP2 (R$)</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAgentesGp2.map((a, i) => (
                    <TableRow key={a.agent_name}>
                      <TableCell className="py-1.5">
                        <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate py-1.5" title={a.agent_name}>
                        {nomeCurto(a.agent_name)}
                      </TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{num.format(Number(a.processos))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(a.gp2))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(a.ticket_medio))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={2}>Total (Top 10)</TableCell>
                    <TableCell className="text-right tabular-nums">{num.format(totalProcTop)}</TableCell>
                    <TableCell className="text-right tabular-nums">{int.format(totalGp2Top)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {totalProcTop > 0 ? int.format(totalGp2Top / totalProcTop) : "—"}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução de Processos {ano} x {ano - 1}</CardTitle>
            <CardDescription>Mensal — data do processo</CardDescription>
          </CardHeader>
          <CardContent>
            <CompareLine
              data={evolucao}
              prevName={String(ano - 1)}
              currName={String(ano)}
              height={330}
              showLabels
            />
          </CardContent>
        </Card>
      </div>

      {/* Modalidades + comparativos mensais */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Desempenho por Modalidade</CardTitle>
          </CardHeader>
          <CardContent>
            {modalidade.length === 0 ? (
              <EmptyState className="h-[160px]" />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {modalidade.map((m) => {
                  const Icon = modalIcon(m.modalidade);
                  const share = totalProc > 0 ? (Number(m.processos) / totalProc) * 100 : 0;
                  return (
                    <li key={m.modalidade} className="flex items-center gap-3">
                      <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                        <Icon className="size-4" />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm" title={m.modalidade}>
                        {m.modalidade}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{num.format(Number(m.processos))}</span>
                      <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                        {share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processos por Modalidade</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut
              data={donutModal}
              centerValue={num.format(totalProc)}
              centerLabel="Processos"
              colors={["var(--chart-2)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-1)", "var(--chart-4)"]}
              legend="bottom"
              size={175}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <YoyTable
              ano={ano}
              rows={toRows(procPrev, procCur)}
              totalPrev={sumVals(procPrev)}
              totalCurr={sumVals(procCur)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">TEU&apos;s por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <YoyTable
              ano={ano}
              rows={toRows(teuPrev, teuCur)}
              totalPrev={sumVals(teuPrev)}
              totalCurr={sumVals(teuCur)}
            />
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 · Data-base: data do processo · GP2 = lucro realizado (faturas) · Exclui
        cancelados e consolidações (CONS) · Variações comparam os mesmos meses de {ano} e {ano - 1}.
      </p>
    </div>
  );
}
