import { notFound } from "next/navigation";
import { Package, Ship, TrendingUp, Users } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { YoyTable, type YoyRow } from "@/components/dashboard/yoy-table";
import { EntityBars } from "@/components/charts/entity-bars";
import { CompareLine, type ComparePoint } from "@/components/charts/compare-line";
import { MultiLine, type MultiLinePoint } from "@/components/charts/multi-line";
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
import { MODALIDADES, modalidadeBySlug } from "@/lib/modalidades";
import {
  getModalAgenteMensal,
  getModalAgentes,
  getModalClientes,
  getModalMensal,
  getModalTotais,
} from "@/lib/queries/desempenho";

export function generateStaticParams() {
  return MODALIDADES.map((m) => ({ modalidade: m.slug }));
}

export default async function DesempenhoModalidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ modalidade: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const { modalidade: slug } = await params;
  const mod = modalidadeBySlug(slug);
  if (!mod) notFound();

  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;

  const [totais, totaisPrev, mensal, agentes, clientes] = await Promise.all([
    getModalTotais(ano, mod.db),
    getModalTotais(ano - 1, mod.db),
    getModalMensal(ano, mod.db),
    getModalAgentes(ano, mod.db, 12),
    getModalClientes(ano, mod.db, 12),
  ]);

  const top3 = agentes.slice(0, 3).map((a) => a.agent_name);
  const agenteMensal = await getModalAgenteMensal(ano, mod.db, top3);

  // Evolução mensal (processos) — linha 2 anos
  const procPrev = new Map(mensal.filter((r) => r.ano === ano - 1).map((r) => [r.mes, Number(r.processos)]));
  const procCur = new Map(mensal.filter((r) => r.ano === ano).map((r) => [r.mes, Number(r.processos)]));
  const evolucao: ComparePoint[] = MESES_CURTO.map((label, i) => ({
    label,
    prev: procPrev.get(i + 1) ?? null,
    curr: procCur.get(i + 1) ?? null,
  })).filter((r) => r.prev !== null || r.curr !== null);

  // Variação "mesmo período" de processos
  const mesesCur = new Set([...procCur.keys()]);
  const somaCur = [...procCur.values()].reduce((a, b) => a + b, 0);
  const somaPrevSame = [...procPrev.entries()].filter(([m]) => mesesCur.has(m)).reduce((a, [, v]) => a + v, 0);
  const varProc = variacao(somaPrevSame, somaCur);

  // Tabelas comparativas processos / TEU
  const teuPrev = new Map(mensal.filter((r) => r.ano === ano - 1).map((r) => [r.mes, Number(r.teu)]));
  const teuCur = new Map(mensal.filter((r) => r.ano === ano).map((r) => [r.mes, Number(r.teu)]));
  const toRows = (p: Map<number, number>, c: Map<number, number>): YoyRow[] =>
    MESES.map((nome, i) => ({ label: nome, prev: p.get(i + 1) ?? null, curr: c.get(i + 1) ?? null })).filter(
      (r) => r.prev !== null || r.curr !== null,
    );
  const sumVals = (m: Map<number, number>) => [...m.values()].reduce((a, b) => a + b, 0);

  // Top 3 agentes mensal (linha)
  const shortName = (n: string) => (n.length > 22 ? n.slice(0, 22) + "…" : n);
  const linhasTop3: MultiLinePoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const rows = agenteMensal.filter((r) => r.mes === m);
    if (rows.length === 0) continue;
    const point: MultiLinePoint = { label: MESES_CURTO[m - 1] };
    for (const a of top3) point[shortName(a)] = rows.find((r) => r.agent_name === a)?.processos ?? 0;
    linhasTop3.push(point);
  }

  const topAgentesGp2 = [...agentes].sort((a, b) => Number(b.gp2) - Number(a.gp2)).slice(0, 10);
  const vsAnt = `vs ${ano - 1}`;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader title={`Desempenho · ${mod.label}`} description="Performance operacional e de agentes da modalidade">
        <Segmented
          items={[2022, 2023, 2024, 2025, 2026].map((a) => ({
            label: String(a),
            href: `/desempenho/${mod.slug}?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Processos ${ano}`}
          value={num.format(Number(totais?.processos ?? 0))}
          icon={Package}
          accent="red"
          delta={{ value: varProc, suffix: vsAnt }}
        />
        <KpiCard
          title={`Clientes ${ano}`}
          value={num.format(Number(totais?.clientes ?? 0))}
          icon={Users}
          accent="dark"
          delta={{ value: variacao(totaisPrev?.clientes, totais?.clientes), suffix: vsAnt }}
        />
        <KpiCard
          title={`TEU's ${ano}`}
          value={num.format(Number(totais?.teu ?? 0))}
          icon={Ship}
          accent="red"
          delta={{ value: variacao(totaisPrev?.teu, totais?.teu), suffix: vsAnt }}
        />
        <KpiCard
          title={`GP2 ${ano} (R$)`}
          value={fmtMi(Number(totais?.gp2 ?? 0))}
          icon={TrendingUp}
          accent="dark"
          hint="Lucro realizado (faturas)"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Principais Agentes por Processos</CardTitle>
            <CardDescription>Top 12 em {mod.label} — {ano}</CardDescription>
          </CardHeader>
          <CardContent>
            <EntityBars
              data={agentes.slice(0, 12).map((a) => ({ label: nomeCurto(a.agent_name), value: Number(a.processos) }))}
              color="var(--chart-2)"
              height={290}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução de Processos {ano} x {ano - 1}</CardTitle>
            <CardDescription>Mensal — {mod.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <CompareLine data={evolucao} prevName={String(ano - 1)} currName={String(ano)} height={290} showLabels />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 10 Agentes por GP2</CardTitle>
            <CardDescription>Lucro realizado e ticket médio — {mod.label}</CardDescription>
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
                      <TableCell className="max-w-[240px] truncate py-1.5" title={a.agent_name}>{a.agent_name}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{num.format(Number(a.processos))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(a.gp2))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(a.ticket_medio))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Principais Clientes por Processos</CardTitle>
            <CardDescription>Top 12 em {mod.label} — {ano}</CardDescription>
          </CardHeader>
          <CardContent>
            <EntityBars
              data={clientes.slice(0, 12).map((c) => ({ label: nomeCurto(c.customer_name), value: Number(c.processos) }))}
              color="var(--chart-1)"
              height={290}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparativo Top 3 Agentes — Processos por Mês</CardTitle>
            <CardDescription>Disputa mês a mês entre os líderes</CardDescription>
          </CardHeader>
          <CardContent>
            <MultiLine data={linhasTop3} series={top3.map(shortName)} height={260} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <YoyTable ano={ano} rows={toRows(procPrev, procCur)} totalPrev={sumVals(procPrev)} totalCurr={sumVals(procCur)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">TEU&apos;s por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <YoyTable ano={ano} rows={toRows(teuPrev, teuCur)} totalPrev={sumVals(teuPrev)} totalCurr={sumVals(teuCur)} />
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 · Modalidade: {mod.label} ({mod.db}) · GP2 = lucro realizado (faturas) ·
        Data-base: data do processo · Exclui cancelados e consolidações (CONS) · Variações comparam
        os mesmos meses de {ano} e {ano - 1}.
      </p>
    </div>
  );
}
