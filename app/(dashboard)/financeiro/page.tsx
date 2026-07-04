import {
  ArrowLeftRight,
  BarChart3,
  CircleDollarSign,
  Percent,
  PiggyBank,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Delta } from "@/components/dashboard/delta";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ComboGp, type ComboGpPoint } from "@/components/charts/combo-gp";
import { GroupedCompare } from "@/components/charts/grouped-compare";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MESES, MESES_CURTO, fmtMi, int, nomeCurto, num, variacao } from "@/lib/format";
import {
  getClientesFinanceiro,
  getFinanceiroMensal,
  getFinanceiroTotais,
  getTiposFinanceiro,
  type FinanceiroMensal,
} from "@/lib/queries/financeiro";

/** Soma "mesmo período": só os meses que existem no ano corrente. */
function samePeriod(
  prev: FinanceiroMensal[],
  curr: FinanceiroMensal[],
  metric: (r: FinanceiroMensal) => number,
): { prev: number; curr: number; var: number | null } {
  const meses = new Set(curr.map((r) => r.mes));
  const somaCur = curr.reduce((a, r) => a + metric(r), 0);
  const somaPrev = prev.filter((r) => meses.has(r.mes)).reduce((a, r) => a + metric(r), 0);
  return { prev: somaPrev, curr: somaCur, var: variacao(somaPrev, somaCur) };
}

/** Mini-card de destaque (grid "Destaques Financeiros" do mockup). */
function Destaque({
  icon: Icon,
  iconClass,
  label,
  value,
  delta,
  unit,
  suffix,
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: string;
  delta: number | null;
  unit?: "%" | "p.p.";
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3.5">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="size-4.5" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground truncate text-[10.5px] font-semibold tracking-wide uppercase">
          {label}
        </p>
        <p className="text-lg leading-tight font-bold tabular-nums">{value}</p>
        <Delta value={delta} unit={unit} suffix={suffix} className="text-[11px]" />
      </div>
    </div>
  );
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

  // GP1 do ano anterior pode ainda não ter sido sincronizado (campo pesado, por ano)
  const gp1PrevOk = prev.some((r) => Number(r.gp1) !== 0);

  // Comparações "mesmo período" (meses fechados do ano corrente vs os mesmos do anterior)
  const spRevenue = samePeriod(prev, curr, (r) => Number(r.revenue));
  const spGp1 = gp1PrevOk ? samePeriod(prev, curr, (r) => Number(r.gp1)) : null;
  const spGp2 = samePeriod(prev, curr, (r) => Number(r.gp2));

  const margem = (gp2: number, rev: number) => (rev > 0 ? (gp2 / rev) * 100 : null);
  const margemCur = margem(spGp2.curr, spRevenue.curr);
  const margemPrev = margem(spGp2.prev, spRevenue.prev);
  const margemPp = margemCur !== null && margemPrev !== null ? margemCur - margemPrev : null;

  const diffGp = tCurr ? Number(tCurr.gp2) - Number(tCurr.gp1) : null;
  const diffGpVar = spGp1 ? variacao(spGp2.prev - spGp1.prev, spGp2.curr - spGp1.curr) : null;

  const comboData: ComboGpPoint[] = curr.map((r) => ({
    label: MESES_CURTO[r.mes - 1],
    gp1: Number(r.gp1),
    gp2: Number(r.gp2),
    diff: Number(r.gp2) - Number(r.gp1),
  }));

  const groupedData = [
    { label: "GP1", prev: gp1PrevOk && tPrev ? Number(tPrev.gp1) : null, curr: tCurr ? Number(tCurr.gp1) : null },
    { label: "GP2", prev: tPrev ? Number(tPrev.gp2) : null, curr: tCurr ? Number(tCurr.gp2) : null },
  ];

  const lineData = (metric: (r: FinanceiroMensal) => number): ComparePoint[] => {
    const p = new Map(prev.map((r) => [r.mes, metric(r)]));
    const c = new Map(curr.map((r) => [r.mes, metric(r)]));
    return MESES_CURTO.map((label, i) => ({
      label,
      prev: p.get(i + 1) ?? null,
      curr: c.get(i + 1) ?? null,
    })).filter((r) => r.prev !== null || r.curr !== null);
  };

  // Donut por modalidade (participação em processos — proxy até termos GP2 por tipo no mart)
  const donutTipos = tipos.slice(0, 5).map((t) => ({ name: t.nome, value: t.processos }));
  const outros = tipos.slice(5).reduce((a, t) => a + t.processos, 0);
  if (outros > 0) donutTipos.push({ name: "Demais", value: outros });

  const topClientes = [...clientes].sort((a, b) => b.processos - a.processos).slice(0, 5);
  const totalProcClientes = clientes.reduce((a, c) => a + c.processos, 0);

  const filtrosAtivos = [cliente, tipo].filter(Boolean).length;
  const yearHref = (a: number) => {
    const q = new URLSearchParams({ ano: String(a) });
    if (cliente) q.set("cliente", cliente);
    if (tipo) q.set("tipo", tipo);
    return `/financeiro?${q.toString()}`;
  };

  const vsAnt = `vs ${ano - 1}`;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        title="Financeiro"
        description="Desempenho financeiro e análise de rentabilidade"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
            <SlidersHorizontal className="size-3.5" />
            Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}
          </span>
          <FilterSelect param="cliente" value={cliente} placeholder="Cliente: Todos" options={clientes.map((c) => c.nome)} />
          <FilterSelect param="tipo" value={tipo} placeholder="Modalidade: Todas" options={tipos.map((t) => t.nome)} />
          <Segmented items={[2025, 2026].map((a) => ({ label: String(a), href: yearHref(a), active: a === ano }))} />
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Receita ${ano} (R$)`}
          value={tCurr ? fmtMi(Number(tCurr.revenue)) : "—"}
          icon={CircleDollarSign}
          accent="red"
          delta={{ value: spRevenue.var, suffix: vsAnt }}
        />
        <KpiCard
          title={`GP1 ${ano} (R$)`}
          value={tCurr ? fmtMi(Number(tCurr.gp1)) : "—"}
          icon={TrendingUp}
          accent="dark"
          delta={spGp1 ? { value: spGp1.var, suffix: vsAnt } : undefined}
          hint={spGp1 ? undefined : `GP1 de ${ano - 1} pendente`}
        />
        <KpiCard
          title={`GP2 ${ano} (R$)`}
          value={tCurr ? fmtMi(Number(tCurr.gp2)) : "—"}
          icon={BarChart3}
          accent="red"
          delta={{ value: spGp2.var, suffix: vsAnt }}
        />
        <KpiCard
          title="Margem média GP2"
          value={margemCur !== null ? `${margemCur.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
          icon={Percent}
          accent="dark"
          delta={{ value: margemPp, unit: "p.p.", suffix: vsAnt }}
        />
      </div>

      {/* Gross Profit: combo mensal + comparativo anual + destaques/donut */}
      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gross Profit {ano}: GP1 vs GP2</CardTitle>
            <CardDescription>Comparativo mensal (R$) · linha vermelha = diferença</CardDescription>
          </CardHeader>
          <CardContent>
            <ComboGp data={comboData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gross Profit {ano} vs {ano - 1}</CardTitle>
            <CardDescription>Comparativo GP1 e GP2 (R$)</CardDescription>
          </CardHeader>
          <CardContent>
            <GroupedCompare
              data={groupedData}
              prevName={String(ano - 1)}
              currName={String(ano)}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Destaques Financeiros {ano}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Destaque
                icon={ArrowLeftRight}
                iconClass="bg-chart-2/12 text-chart-2"
                label="Diferença GP1 e GP2"
                value={diffGp !== null ? fmtMi(diffGp) : "—"}
                delta={diffGpVar}
                suffix={vsAnt}
              />
              <Destaque
                icon={PiggyBank}
                iconClass="bg-emerald-500/12 text-emerald-600"
                label="Receita acumulada"
                value={tCurr ? fmtMi(Number(tCurr.revenue)) : "—"}
                delta={spRevenue.var}
                suffix={vsAnt}
              />
              <Destaque
                icon={Wallet}
                iconClass="bg-chart-5/12 text-chart-5"
                label={`Receita ${ano - 1} (mesmo período)`}
                value={fmtMi(spRevenue.prev)}
                delta={spRevenue.var !== null ? -spRevenue.var : null}
                suffix={`vs ${ano}`}
              />
              <Destaque
                icon={Percent}
                iconClass="bg-chart-7/15 text-chart-7"
                label="Margem média GP2"
                value={margemCur !== null ? `${margemCur.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
                delta={margemPp}
                unit="p.p."
                suffix={vsAnt}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabela mensal + modalidade/clientes */}
      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Desempenho Financeiro Mensal: {ano - 1} vs {ano}
            </CardTitle>
            <CardDescription>
              Receita, GP1, GP2 e margem GP2 mês a mês, com variação percentual
            </CardDescription>
          </CardHeader>
          <CardContent>
            {curr.length === 0 && prev.length === 0 ? (
              <EmptyState className="h-[200px]" description="Sem dados para os filtros atuais." />
            ) : (
              <MensalTable ano={ano} prev={prev} curr={curr} tPrev={tPrev} tCurr={tCurr} gp1PrevOk={gp1PrevOk} />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Modalidades {ano}</CardTitle>
              <CardDescription>Participação por processos</CardDescription>
            </CardHeader>
            <CardContent>
              <Donut
                data={donutTipos}
                centerValue={tCurr ? fmtMi(Number(tCurr.gp2)) : undefined}
                centerLabel={`GP2 ${ano}`}
                colors={["var(--chart-3)", "var(--chart-2)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-4)"]}
                legend="bottom"
                size={170}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 5 Clientes {ano}</CardTitle>
              <CardDescription>Por volume de processos</CardDescription>
            </CardHeader>
            <CardContent>
              {topClientes.length === 0 ? (
                <EmptyState className="h-[140px]" />
              ) : (
                <ul className="flex flex-col gap-2">
                  {topClientes.map((c, i) => (
                    <li key={c.nome} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span className="truncate" title={c.nome}>{nomeCurto(c.nome)}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {num.format(c.processos)}
                        <span className="opacity-75">
                          {" "}({totalProcClientes > 0 ? ((c.processos / totalProcClientes) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : 0}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Evoluções */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução da Receita (R$)</CardTitle>
            <CardDescription>{ano} × {ano - 1} — receita da proposta por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <CompareLine
              data={lineData((r) => Number(r.revenue))}
              prevName={String(ano - 1)}
              currName={String(ano)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução do GP2 (R$)</CardTitle>
            <CardDescription>{ano} × {ano - 1} — lucro da proposta por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <CompareLine
              data={lineData((r) => Number(r.gp2))}
              prevName={String(ano - 1)}
              currName={String(ano)}
            />
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 · GP1 = lucro por faturas sem variação cambial · GP2 = lucro da proposta ·
        Receita = TotalSalesProposal · Margem GP2 = GP2 ÷ Receita · Variações comparam os mesmos
        meses de {ano} e {ano - 1} · Data-base: data do processo; exclui cancelados e consolidações
        (CONS). Equivale ao Power BI com filtro Sistema = Tier2.
      </p>
    </div>
  );
}

/** Tabela mensal completa: Receita | GP1 | GP2 | Margem, com anos lado a lado. */
function MensalTable({
  ano,
  prev,
  curr,
  tPrev,
  tCurr,
  gp1PrevOk,
}: {
  ano: number;
  prev: FinanceiroMensal[];
  curr: FinanceiroMensal[];
  tPrev?: { revenue: number; gp1: number; gp2: number };
  tCurr?: { revenue: number; gp1: number; gp2: number };
  gp1PrevOk: boolean;
}) {
  const p = new Map(prev.map((r) => [r.mes, r]));
  const c = new Map(curr.map((r) => [r.mes, r]));
  const meses = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => p.has(m) || c.has(m));

  const margem = (r?: FinanceiroMensal) =>
    r && Number(r.revenue) > 0 ? (Number(r.gp2) / Number(r.revenue)) * 100 : null;

  const cell = (v: number | null | undefined) => (v != null ? int.format(v) : "—");
  const pctCell = (v: number | null) =>
    v !== null ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";

  const mPrevTot = tPrev && Number(tPrev.revenue) > 0 ? (Number(tPrev.gp2) / Number(tPrev.revenue)) * 100 : null;
  const mCurTot = tCurr && Number(tCurr.revenue) > 0 ? (Number(tCurr.gp2) / Number(tCurr.revenue)) * 100 : null;

  return (
    <div className="overflow-x-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead rowSpan={2} className="align-bottom">Mês</TableHead>
            <TableHead colSpan={3} className="border-b text-center">Receita (R$)</TableHead>
            <TableHead colSpan={3} className="border-b text-center">GP1 (R$)</TableHead>
            <TableHead colSpan={3} className="border-b text-center">GP2 (R$)</TableHead>
            <TableHead colSpan={3} className="border-b text-center">Margem GP2 (%)</TableHead>
          </TableRow>
          <TableRow className="hover:bg-transparent">
            {["Receita", "GP1", "GP2", "Margem"].flatMap((g) => [
              <TableHead key={`${g}-p`} className="text-right">{ano - 1}</TableHead>,
              <TableHead key={`${g}-c`} className="text-right">{ano}</TableHead>,
              <TableHead key={`${g}-v`} className="text-right">Var.</TableHead>,
            ])}
          </TableRow>
        </TableHeader>
        <TableBody>
          {meses.map((m) => {
            const rp = p.get(m);
            const rc = c.get(m);
            const mp = margem(rp);
            const mc = margem(rc);
            return (
              <TableRow key={m}>
                <TableCell className="py-1.5 whitespace-nowrap">{MESES[m - 1]}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{cell(rp && Number(rp.revenue))}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{cell(rc && Number(rc.revenue))}</TableCell>
                <TableCell className="py-1.5 text-right">
                  <Delta value={variacao(rp && Number(rp.revenue), rc && Number(rc.revenue))} className="text-[11px]" />
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">
                  {gp1PrevOk ? cell(rp && Number(rp.gp1)) : "—"}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{cell(rc && Number(rc.gp1))}</TableCell>
                <TableCell className="py-1.5 text-right">
                  <Delta
                    value={gp1PrevOk ? variacao(rp && Number(rp.gp1), rc && Number(rc.gp1)) : null}
                    className="text-[11px]"
                  />
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{cell(rp && Number(rp.gp2))}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{cell(rc && Number(rc.gp2))}</TableCell>
                <TableCell className="py-1.5 text-right">
                  <Delta value={variacao(rp && Number(rp.gp2), rc && Number(rc.gp2))} className="text-[11px]" />
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{pctCell(mp)}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{pctCell(mc)}</TableCell>
                <TableCell className="py-1.5 text-right">
                  <Delta
                    value={mp !== null && mc !== null ? mc - mp : null}
                    unit="p.p."
                    digits={1}
                    className="text-[11px]"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell>Total</TableCell>
            <TableCell className="text-right tabular-nums">{cell(tPrev && Number(tPrev.revenue))}</TableCell>
            <TableCell className="text-right tabular-nums">{cell(tCurr && Number(tCurr.revenue))}</TableCell>
            <TableCell className="text-right">
              <Delta value={variacao(tPrev && Number(tPrev.revenue), tCurr && Number(tCurr.revenue))} className="text-[11px]" />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {gp1PrevOk ? cell(tPrev && Number(tPrev.gp1)) : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">{cell(tCurr && Number(tCurr.gp1))}</TableCell>
            <TableCell className="text-right">
              <Delta
                value={gp1PrevOk ? variacao(tPrev && Number(tPrev.gp1), tCurr && Number(tCurr.gp1)) : null}
                className="text-[11px]"
              />
            </TableCell>
            <TableCell className="text-right tabular-nums">{cell(tPrev && Number(tPrev.gp2))}</TableCell>
            <TableCell className="text-right tabular-nums">{cell(tCurr && Number(tCurr.gp2))}</TableCell>
            <TableCell className="text-right">
              <Delta value={variacao(tPrev && Number(tPrev.gp2), tCurr && Number(tCurr.gp2))} className="text-[11px]" />
            </TableCell>
            <TableCell className="text-right tabular-nums">{pctCell(mPrevTot)}</TableCell>
            <TableCell className="text-right tabular-nums">{pctCell(mCurTot)}</TableCell>
            <TableCell className="text-right">
              <Delta
                value={mPrevTot !== null && mCurTot !== null ? mCurTot - mPrevTot : null}
                unit="p.p."
                digits={1}
                className="text-[11px]"
              />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
