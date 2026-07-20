import { Boxes, CircleDollarSign, Package, Plane, Ship, Truck, TrendingUp, Users } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { YoyTable, type YoyRow } from "@/components/dashboard/yoy-table";
import { EntityBars } from "@/components/charts/entity-bars";
import { CompareLine, type ComparePoint } from "@/components/charts/compare-line";
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
import { MESES, MESES_CURTO, fmtMi, int, nomeCurto, num, variacao } from "@/lib/format";
import {
  getAgentes,
  getDesempenhoMensal,
  getDesempenhoTotais,
  getModalidade,
  getTopClientesAno,
  type MensalRow,
} from "@/lib/queries/desempenho";
import { getFinanceiroMensal, getFinanceiroTotais } from "@/lib/queries/financeiro";

/** Ícone por modalidade (Importação/Exportação Marítima/Aérea, rodoviário…). */
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

export default async function VisaoExecutivaPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;

  const [totais, totaisPrev, mensal, modalidade, topClientes, agentes, finTotais, finMensal] =
    await Promise.all([
      getDesempenhoTotais(ano),
      getDesempenhoTotais(ano - 1),
      getDesempenhoMensal(ano),
      getModalidade(ano),
      getTopClientesAno(ano, 10),
      getAgentes(ano),
      getFinanceiroTotais(ano),
      getFinanceiroMensal(ano),
    ]);

  const tCurr = finTotais.find((t) => t.ano === ano);
  const finCurr = finMensal.filter((m) => m.ano === ano);
  const finPrev = finMensal.filter((m) => m.ano === ano - 1);

  // Variações "mesmo período" (meses presentes no ano corrente)
  const varProc = samePeriodVar(mensal, ano, "processos");
  const varClientes = variacao(totaisPrev?.clientes, totais?.clientes);
  const mesesCur = new Set(finCurr.map((r) => r.mes));
  const revCur = finCurr.reduce((a, r) => a + Number(r.revenue), 0);
  const revPrevSame = finPrev.filter((r) => mesesCur.has(r.mes)).reduce((a, r) => a + Number(r.revenue), 0);
  const gp2Cur = finCurr.reduce((a, r) => a + Number(r.gp2), 0);
  const gp2PrevSame = finPrev.filter((r) => mesesCur.has(r.mes)).reduce((a, r) => a + Number(r.gp2), 0);

  // Evolução de processos: linha ano corrente × anterior
  const procPrev = new Map(mensal.filter((r) => r.ano === ano - 1).map((r) => [r.mes, Number(r.processos)]));
  const procCur = new Map(mensal.filter((r) => r.ano === ano).map((r) => [r.mes, Number(r.processos)]));
  const evolucao: ComparePoint[] = MESES_CURTO.map((label, i) => ({
    label,
    prev: procPrev.get(i + 1) ?? null,
    curr: procCur.get(i + 1) ?? null,
  })).filter((r) => r.prev !== null || r.curr !== null);

  // Tabelas mensais
  const procRows: YoyRow[] = MESES.map((nome, i) => ({
    label: nome,
    prev: procPrev.get(i + 1) ?? null,
    curr: procCur.get(i + 1) ?? null,
  })).filter((r) => r.prev !== null || r.curr !== null);
  const totalProcPrev = [...procPrev.values()].reduce((a, b) => a + b, 0);
  const totalProcCur = [...procCur.values()].reduce((a, b) => a + b, 0);

  const revPrevMap = new Map(finPrev.map((r) => [r.mes, Number(r.revenue)]));
  const revCurMap = new Map(finCurr.map((r) => [r.mes, Number(r.revenue)]));
  const revRows: YoyRow[] = MESES.map((nome, i) => ({
    label: nome,
    prev: revPrevMap.get(i + 1) ?? null,
    curr: revCurMap.get(i + 1) ?? null,
  })).filter((r) => r.prev !== null || r.curr !== null);
  const totalRevPrev = [...revPrevMap.values()].reduce((a, b) => a + b, 0);

  // Modalidades
  const totalProc = Number(totais?.processos ?? 0);
  const donutModal = modalidade.slice(0, 5).map((m) => ({ name: m.modalidade, value: Number(m.processos) }));
  const outrosModal = modalidade.slice(5).reduce((a, m) => a + Number(m.processos), 0);
  if (outrosModal > 0) donutModal.push({ name: "Demais", value: outrosModal });

  const top5Agentes = [...agentes].slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        title="Visão Executiva"
        description="Resumo geral de performance e resultados"
      >
        <Segmented
          items={[2022, 2023, 2024, 2025, 2026].map((a) => ({
            label: String(a),
            href: `/?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={`Processos ${ano}`}
          value={num.format(totalProc)}
          icon={Package}
          accent="red"
          delta={{ value: varProc, suffix: `vs ${ano - 1}` }}
        />
        <KpiCard
          title={`Clientes ${ano}`}
          value={num.format(totais?.clientes ?? 0)}
          icon={Users}
          accent="dark"
          delta={{ value: varClientes, suffix: `vs ${ano - 1}` }}
        />
        <KpiCard
          title={`Receita ${ano} (R$)`}
          value={tCurr ? fmtMi(Number(tCurr.revenue)) : "—"}
          icon={CircleDollarSign}
          accent="red"
          delta={{ value: variacao(revPrevSame, revCur), suffix: `vs ${ano - 1}` }}
        />
        <KpiCard
          title={`GP2 ${ano} (R$)`}
          value={tCurr ? fmtMi(Number(tCurr.gp2)) : "—"}
          icon={TrendingUp}
          accent="dark"
          delta={{ value: variacao(gp2PrevSame, gp2Cur), suffix: `vs ${ano - 1}` }}
        />
      </div>

      {/* Clientes + evolução + modalidades */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Principais Clientes por Quantidade de Processos</CardTitle>
            <CardDescription>Top 10 do ano</CardDescription>
          </CardHeader>
          <CardContent>
            <EntityBars
              data={topClientes.slice(0, 10).map((c) => ({ label: c.customer_name, value: Number(c.processos) }))}
              height={290}
            />
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
              height={290}
              showLabels
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processos por Modalidade {ano}</CardTitle>
            <CardDescription>Participação no volume do ano</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut
              data={donutModal}
              centerValue={num.format(totalProc)}
              centerLabel="Processos"
              legend="bottom"
              size={185}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabelas comparativas + agentes + resumo. São 4 tabelas de 4 colunas cada:
          em lg cairiam para 168px e ficariam ilegíveis, então seguem em xl. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <YoyTable ano={ano} rows={procRows} totalPrev={totalProcPrev} totalCurr={totalProcCur} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita (R$) por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <YoyTable
              ano={ano}
              rows={revRows}
              fmt={(v) => int.format(v)}
              totalPrev={totalRevPrev}
              totalCurr={revCur}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 5 Agentes por Processos {ano}</CardTitle>
          </CardHeader>
          <CardContent>
            {top5Agentes.length === 0 ? (
              <EmptyState className="h-[160px]" />
            ) : (
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Agente</TableHead>
                    <TableHead className="text-right">Processos</TableHead>
                    <TableHead className="text-right">GP2 (R$)</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top5Agentes.map((a, i) => (
                    <TableRow key={a.agent_name}>
                      <TableCell className="max-w-[180px] py-2">
                        <span className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <span className="truncate" title={a.agent_name}>{nomeCurto(a.agent_name)}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right tabular-nums">{num.format(Number(a.processos))}</TableCell>
                      <TableCell className="py-2 text-right tabular-nums">{int.format(Number(a.gp2))}</TableCell>
                      <TableCell className="py-2 text-right tabular-nums">{int.format(Number(a.ticket_medio))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumo de Modalidades</CardTitle>
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
                      <div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
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
      </div>

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 · Data-base: data do processo · Exclui cancelados e consolidações (CONS) ·
        Variações comparam os mesmos meses de {ano} e {ano - 1} · Receita e GP2 = proposta comercial.
      </p>
    </div>
  );
}
