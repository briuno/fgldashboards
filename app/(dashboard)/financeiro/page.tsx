import { Package, Users, DollarSign, TrendingUp, SlidersHorizontal, CalendarRange } from "lucide-react";

import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MonthlyBar, type MonthlyBarPoint } from "@/components/charts/monthly-bar";
import { GpStackedBar, type GpStackedPoint } from "@/components/charts/gp-stacked-bar";
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
import {
  getClientesFinanceiro,
  getFinanceiroMensal,
  getFinanceiroTotais,
  getTiposFinanceiro,
  type FinanceiroMensal,
} from "@/lib/queries/financeiro";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const num = new Intl.NumberFormat("pt-BR");
const dec = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1,
});

function Variacao({ prev, curr }: { prev: number | null; curr: number | null }) {
  if (!prev || curr === null) return <span className="text-muted-foreground">—</span>;
  const v = curr / prev - 1;
  const positive = v >= 0;
  return (
    <span
      className={`inline-flex items-center justify-end gap-1 tabular-nums ${
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
    </span>
  );
}

type YoyRow = { mes: number; prev: number | null; curr: number | null };

function YoyTable({
  title, subtitle, ano, rows, totalPrev, totalCurr,
}: {
  title: string;
  subtitle?: string;
  ano: number;
  rows: YoyRow[];
  totalPrev: number | null;
  totalCurr: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState className="h-[160px]" description="Sem dados para os filtros atuais." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">{ano - 1}</TableHead>
                <TableHead className="text-right">{ano}</TableHead>
                <TableHead className="text-right">Variação %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.mes}>
                  <TableCell className="py-1.5">{MESES[r.mes - 1]}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">
                    {r.prev !== null ? dec.format(r.prev) : "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">
                    {r.curr !== null ? dec.format(r.curr) : "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-right">
                    <Variacao prev={r.prev} curr={r.curr} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{totalPrev !== null ? dec.format(totalPrev) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{totalCurr !== null ? dec.format(totalCurr) : "—"}</TableCell>
                <TableCell className="text-right"><Variacao prev={totalPrev} curr={totalCurr} /></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function toYoyRows(
  prev: FinanceiroMensal[],
  curr: FinanceiroMensal[],
  metric: (r: FinanceiroMensal) => number,
): YoyRow[] {
  const p = new Map(prev.map((r) => [r.mes, metric(r)]));
  const c = new Map(curr.map((r) => [r.mes, metric(r)]));
  return Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((mes) => p.has(mes) || c.has(mes))
    .map((mes) => ({ mes, prev: p.get(mes) ?? null, curr: c.get(mes) ?? null }));
}

function toGpPoints(rows: FinanceiroMensal[]): GpStackedPoint[] {
  return rows.map((r) => ({
    label: MESES[r.mes - 1],
    gp1: Number(r.gp1),
    diff: Number(r.gp2) - Number(r.gp1),
    total: Number(r.gp2),
  }));
}

/** Variação "mesmo período": soma só os meses que têm dados no ano corrente. */
function samePeriod(
  prev: FinanceiroMensal[],
  curr: FinanceiroMensal[],
  metric: (r: FinanceiroMensal) => number,
) {
  if (curr.length === 0) return undefined;
  const meses = new Set(curr.map((r) => r.mes));
  const somaCur = curr.reduce((a, r) => a + metric(r), 0);
  const somaPrev = prev.filter((r) => meses.has(r.mes)).reduce((a, r) => a + metric(r), 0);
  if (somaPrev === 0) return undefined;
  const v = (somaCur / somaPrev - 1) * 100;
  return {
    label: `${v >= 0 ? "+" : ""}${pctFmt.format(v)}% vs mesmo período`,
    direction: (v > 0 ? "up" : v < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
    valor: v,
  };
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; cliente?: string; tipo?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;
  const cliente = sp.cliente || undefined;
  const tipo = sp.tipo || undefined;

  const [mensal, totais, clientes, tipos] = await Promise.all([
    getFinanceiroMensal(ano, cliente, tipo),
    getFinanceiroTotais(ano, cliente, tipo),
    getClientesFinanceiro(ano),
    getTiposFinanceiro(ano),
  ]);

  const curr = mensal.filter((m) => m.ano === ano).sort((a, b) => a.mes - b.mes);
  const prev = mensal.filter((m) => m.ano === ano - 1).sort((a, b) => a.mes - b.mes);
  const tCurr = totais.find((t) => t.ano === ano);
  const tPrev = totais.find((t) => t.ano === ano - 1);

  const gp2Trend: MonthlyBarPoint[] = curr.map((r) => ({ label: MESES[r.mes - 1], value: Number(r.gp2) }));

  const ticket = (r: FinanceiroMensal) => (r.processos > 0 ? Number(r.gp2) / r.processos : 0);
  const ticketTotal = (t?: { gp2: number; processos: number }) =>
    t && t.processos > 0 ? Number(t.gp2) / t.processos : null;

  // GP1 do ano anterior pode ainda não ter sido sincronizado (campo pesado, puxado por ano).
  const gp1PrevDisponivel = prev.some((r) => Number(r.gp1) !== 0);

  // Leituras derivadas dos dados carregados
  const trendGp2 = samePeriod(prev, curr, (r) => Number(r.gp2));
  const trendRevenue = samePeriod(prev, curr, (r) => Number(r.revenue));
  const trendProc = samePeriod(prev, curr, (r) => Number(r.processos));
  const melhorMes = curr.length
    ? curr.reduce((a, b) => (Number(b.gp2) > Number(a.gp2) ? b : a))
    : undefined;
  const gapGp = tCurr ? Number(tCurr.gp2) - Number(tCurr.gp1) : null;
  const gapPct = tCurr && Number(tCurr.gp2) !== 0 && gapGp !== null ? (gapGp / Number(tCurr.gp2)) * 100 : null;

  const filtrosAtivos = [cliente, tipo].filter(Boolean).length;
  const yearHref = (a: number) => {
    const q = new URLSearchParams({ ano: String(a) });
    if (cliente) q.set("cliente", cliente);
    if (tipo) q.set("tipo", tipo);
    return `/financeiro?${q.toString()}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="Financeiro"
        description={`Quanto lucramos vs ${ano - 1} e de onde vem a diferença — data do processo`}
      >
        <Segmented
          items={[2025, 2026].map((a) => ({ label: String(a), href: yearHref(a), active: a === ano }))}
        />
      </PageHeader>

      {/* Controles de análise */}
      <div className="bg-card flex flex-wrap items-center gap-2 rounded-xl border p-3 shadow-sm">
        <span className="text-muted-foreground mr-1 inline-flex items-center gap-1.5 text-xs font-medium">
          <SlidersHorizontal className="size-3.5" />
          Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}
        </span>
        <FilterSelect param="cliente" value={cliente} placeholder="Cliente: Todos" options={clientes.map((c) => c.nome)} />
        <FilterSelect param="tipo" value={tipo} placeholder="Modalidade: Todas" options={tipos.map((t) => t.nome)} />
      </div>

      {/* 01 · Panorama */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Processos ${ano}`}
          value={tCurr ? num.format(tCurr.processos) : "—"}
          trend={trendProc}
          hint={trendProc ? undefined : "Exclui cancelados e CONS"}
          icon={Package}
        />
        <KpiCard title={`Clientes ${ano}`} value={tCurr ? num.format(tCurr.clientes) : "—"} hint="Distintos no ano" icon={Users} />
        <KpiCard
          title={`GP2 ${ano}`}
          value={tCurr ? brlCompact.format(Number(tCurr.gp2)) : "—"}
          trend={trendGp2}
          hint={trendGp2 ? undefined : "Lucro da proposta"}
          icon={TrendingUp}
        />
        <KpiCard
          title={`Revenue ${ano}`}
          value={tCurr ? brlCompact.format(Number(tCurr.revenue)) : "—"}
          trend={trendRevenue}
          hint={trendRevenue ? undefined : "Receita da proposta"}
          icon={DollarSign}
        />
      </div>

      {/* Leitura rápida */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trendGp2 && (
          <InsightCard
            kicker="Lucro vs ano anterior"
            variant={trendGp2.valor >= 0 ? "positive" : "negative"}
            title={`GP2 ${trendGp2.valor >= 0 ? "cresceu" : "caiu"} ${pctFmt.format(Math.abs(trendGp2.valor))}%`}
            description={`Somando os mesmos meses de ${ano} e ${ano - 1}, com os filtros atuais aplicados.`}
          />
        )}
        {melhorMes && (
          <InsightCard
            kicker="Melhor mês do ano"
            icon={CalendarRange}
            title={`${MESES[melhorMes.mes - 1]}: ${brlCompact.format(Number(melhorMes.gp2))} de GP2`}
            description={`${num.format(melhorMes.processos)} processos no mês — maior lucro mensal de ${ano} até agora.`}
          />
        )}
        {gapGp !== null && gapPct !== null && tCurr && (
          <InsightCard
            kicker="Proposta × faturado"
            variant={Math.abs(gapPct) > 20 ? "warning" : "default"}
            title={`${brlCompact.format(Math.abs(gapGp))} entre GP2 e GP1 (${pctFmt.format(Math.abs(gapPct))}%)`}
            description="Diferença entre o lucro da proposta (GP2) e o realizado por faturas sem variação cambial (GP1) — detalhe na seção Gross Profit."
          />
        )}
      </div>

      {/* 02 · Evolução */}
      <SectionHeader
        kicker="02 · Evolução"
        title={`GP2 mês a mês em ${ano}`}
        description="Lucro líquido da proposta (NetProfit) por mês — rótulos mostram o valor exato"
      />
      <Card>
        <CardContent className="pt-2">
          <MonthlyBar data={gp2Trend} name="GP2" />
        </CardContent>
      </Card>

      {/* 03 · O que mudou */}
      <SectionHeader
        kicker="03 · O que mudou"
        title={`Comparativo mensal ${ano - 1} × ${ano}`}
        description="GP2, Revenue e Ticket Médio lado a lado, com variação percentual por mês"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <YoyTable
          title="GP2"
          subtitle="Lucro da proposta"
          ano={ano}
          rows={toYoyRows(prev, curr, (r) => Number(r.gp2))}
          totalPrev={tPrev ? Number(tPrev.gp2) : null}
          totalCurr={tCurr ? Number(tCurr.gp2) : null}
        />
        <YoyTable
          title="Revenue"
          subtitle="Receita da proposta"
          ano={ano}
          rows={toYoyRows(prev, curr, (r) => Number(r.revenue))}
          totalPrev={tPrev ? Number(tPrev.revenue) : null}
          totalCurr={tCurr ? Number(tCurr.revenue) : null}
        />
        <YoyTable
          title="Ticket Médio"
          subtitle="GP2 ÷ processos"
          ano={ano}
          rows={toYoyRows(prev, curr, ticket)}
          totalPrev={ticketTotal(tPrev)}
          totalCurr={ticketTotal(tCurr)}
        />
      </div>

      {/* 04 · Proposta × faturado */}
      <SectionHeader
        kicker="04 · Proposta × faturado"
        title="Gross Profit — GP1 × GP2"
        description="GP1 = lucro realizado por faturas (sem variação cambial) · barra escura = diferença até o GP2 da proposta"
      />
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard title={`GP1 ${ano}`} value={tCurr ? brlCompact.format(Number(tCurr.gp1)) : "—"} />
        <KpiCard title={`GP2 ${ano}`} value={tCurr ? brlCompact.format(Number(tCurr.gp2)) : "—"} />
        <KpiCard title={`Diferença ${ano}`} value={tCurr ? brlCompact.format(Number(tCurr.gp2) - Number(tCurr.gp1)) : "—"} />
        <KpiCard title={`GP1 ${ano - 1}`} value={tPrev && gp1PrevDisponivel ? brlCompact.format(Number(tPrev.gp1)) : "—"} />
        <KpiCard title={`GP2 ${ano - 1}`} value={tPrev ? brlCompact.format(Number(tPrev.gp2)) : "—"} />
        <KpiCard title={`Diferença ${ano - 1}`} value={tPrev && gp1PrevDisponivel ? brlCompact.format(Number(tPrev.gp2) - Number(tPrev.gp1)) : "—"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gross Profit {ano}</CardTitle>
            <CardDescription>GP1 (claro) + diferença até o GP2 (escuro) — rótulo à direita = GP2</CardDescription>
          </CardHeader>
          <CardContent>
            <GpStackedBar data={toGpPoints(curr)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gross Profit {ano - 1}</CardTitle>
            <CardDescription>
              {gp1PrevDisponivel
                ? "GP1 (claro) + diferença até o GP2 (escuro) — rótulo à direita = GP2"
                : `GP1 de ${ano - 1} ainda não sincronizado`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gp1PrevDisponivel ? (
              <GpStackedBar data={toGpPoints(prev)} />
            ) : (
              <EmptyState
                className="h-[420px]"
                title={`GP1 de ${ano - 1} pendente`}
                description={`Campo pesado do Tier2, sincronizado por ano. O GP2 de ${ano - 1} já aparece nas tabelas acima.`}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 (ShipmentProcessView + ShipmentProfitProposalView) · GP1 = lucro por faturas sem
        variação cambial · GP2 = lucro da proposta · Revenue = receita da proposta · Ticket Médio = GP2 ÷
        processos · Data-base: data do processo; exclui cancelados e consolidações (CONS). Equivale ao
        Power BI com filtro Sistema = Tier2.
      </p>
    </div>
  );
}
