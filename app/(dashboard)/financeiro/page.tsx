import {
  ArrowLeftRight,
  BarChart3,
  CircleDollarSign,
  Percent,
  PiggyBank,
  SlidersHorizontal,
  TrendingUp,
  TriangleAlert,
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
  getClientesTop,
  getFinanceiroMensal,
  getFinanceiroTotais,
  getModalidades,
  getTiposFinanceiro,
  type FinanceiroMensal,
  type FinanceiroTotais,
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
  const filtros = { cliente, modalidade: tipo };

  const [mensal, totais, clientes, tipos, topClientes, modalidades] = await Promise.all([
    getFinanceiroMensal(ano, filtros),
    getFinanceiroTotais(ano, filtros),
    getClientesFinanceiro(ano),
    getTiposFinanceiro(ano),
    getClientesTop(ano, filtros, 5),
    getModalidades(ano, filtros),
  ]);

  const curr = mensal.filter((m) => m.ano === ano).sort((a, b) => a.mes - b.mes);
  const prev = mensal.filter((m) => m.ano === ano - 1).sort((a, b) => a.mes - b.mes);
  const tCurr = totais.find((t) => t.ano === ano);
  const tPrev = totais.find((t) => t.ano === ano - 1);

  // Cobertura do dado no ano. Sem isso, um ano sem GP1 sincronizado aparecia como
  // "R$ 0,00" — indistinguível de lucro zero. Abaixo de 50% o número é escondido;
  // entre 50% e 95% ele aparece, mas com aviso de que está subestimado.
  const pct = (t: FinanceiroTotais | undefined, campo: "com_gp1" | "com_proposta") =>
    t && t.processos > 0 ? t[campo] / t.processos : 0;
  const gp1CurrPct = pct(tCurr, "com_gp1");
  const gp1PrevPct = pct(tPrev, "com_gp1");
  const propCurrPct = pct(tCurr, "com_proposta");
  const propPrevPct = pct(tPrev, "com_proposta");

  const gp1CurrOk = gp1CurrPct >= 0.5;
  const gp1PrevOk = gp1PrevPct >= 0.5;
  const propCurrOk = propCurrPct >= 0.5;
  const propPrevOk = propPrevPct >= 0.5;
  const gp1Ok = gp1CurrOk && gp1PrevOk; // comparação GP1 exige os dois anos

  // Comparações "mesmo período" (meses fechados do ano corrente vs os mesmos do anterior)
  const spRevenue = propPrevOk ? samePeriod(prev, curr, (r) => Number(r.revenue)) : null;
  const spGp1 = gp1Ok ? samePeriod(prev, curr, (r) => Number(r.gp1)) : null;
  const spGp2 = propPrevOk ? samePeriod(prev, curr, (r) => Number(r.gp2)) : null;

  const margem = (gp2: number, rev: number) => (rev > 0 ? (gp2 / rev) * 100 : null);
  const margemCur =
    tCurr && propCurrOk ? margem(Number(tCurr.gp2), Number(tCurr.revenue)) : null;
  // Base do ano anterior restrita aos mesmos meses — igual às demais variações da tela.
  const margemPrev = spGp2 && spRevenue ? margem(spGp2.prev, spRevenue.prev) : null;
  const margemPp = margemCur !== null && margemPrev !== null ? margemCur - margemPrev : null;

  const diffGp = tCurr && gp1CurrOk && propCurrOk ? Number(tCurr.gp2) - Number(tCurr.gp1) : null;
  const diffGpVar =
    spGp1 && spGp2 ? variacao(spGp2.prev - spGp1.prev, spGp2.curr - spGp1.curr) : null;

  const comboData: ComboGpPoint[] = curr.map((r) => ({
    label: MESES_CURTO[r.mes - 1],
    gp1: Number(r.gp1),
    gp2: Number(r.gp2),
    diff: Number(r.gp2) - Number(r.gp1),
  }));

  const groupedData = [
    { label: "GP1", prev: gp1PrevOk && tPrev ? Number(tPrev.gp1) : null, curr: gp1CurrOk && tCurr ? Number(tCurr.gp1) : null },
    { label: "GP2", prev: propPrevOk && tPrev ? Number(tPrev.gp2) : null, curr: propCurrOk && tCurr ? Number(tCurr.gp2) : null },
  ];

  const lineData = (metric: (r: FinanceiroMensal) => number): ComparePoint[] => {
    const p = new Map(prev.map((r) => [r.mes, metric(r)]));
    const c = new Map(curr.map((r) => [r.mes, metric(r)]));
    return MESES_CURTO.map((label, i) => ({
      label,
      prev: propPrevOk ? p.get(i + 1) ?? null : null,
      curr: c.get(i + 1) ?? null,
    })).filter((r) => r.prev !== null || r.curr !== null);
  };

  // Donut de modalidades por GP2 (tela financeira ranqueia por lucro), já filtrado.
  const donutTipos = modalidades
    .filter((m) => Number(m.gp2) > 0)
    .map((m) => ({ name: m.modalidade, value: Number(m.gp2) }));

  // Participação de cada cliente no GP2 total do ano (não no total do top-5).
  const gp2Ano = tCurr && propCurrOk ? Number(tCurr.gp2) : 0;

  // Avisos de cobertura — o usuário precisa saber quando um número está incompleto.
  // Abaixo de 50%: escondido. Entre 50% e 95%: exibido, mas subestimado.
  const avisos: string[] = [];
  const parcial = (p: number) => `${(p * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% dos processos`;
  if (!gp1CurrOk) avisos.push(`GP1 de ${ano} não sincronizado`);
  else if (gp1CurrPct < 0.95) avisos.push(`GP1 de ${ano} cobre só ${parcial(gp1CurrPct)}`);
  if (!propCurrOk) avisos.push(`Receita/GP2 de ${ano} não sincronizados`);
  else if (propCurrPct < 0.95) avisos.push(`Receita/GP2 de ${ano} cobrem só ${parcial(propCurrPct)} — valores subestimados`);
  if (!propPrevOk) avisos.push(`${ano - 1} sem dados de proposta — comparativos ocultos`);
  else {
    if (propPrevPct < 0.95) avisos.push(`Receita/GP2 de ${ano - 1} cobrem só ${parcial(propPrevPct)}`);
    if (!gp1PrevOk) avisos.push(`GP1 de ${ano - 1} ausente — comparativo de GP1 oculto`);
  }

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
          <Segmented items={[2022, 2023, 2024, 2025, 2026].map((a) => ({ label: String(a), href: yearHref(a), active: a === ano }))} />
        </div>
      </PageHeader>

      {avisos.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">Cobertura parcial:</span> {avisos.join(" · ")}. Os
            indicadores afetados aparecem como “—” em vez de zero.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={`Receita ${ano} (R$)`}
          value={tCurr && propCurrOk ? fmtMi(Number(tCurr.revenue)) : "—"}
          icon={CircleDollarSign}
          accent="red"
          delta={spRevenue ? { value: spRevenue.var, suffix: vsAnt } : undefined}
          hint={spRevenue ? undefined : `sem base de ${ano - 1}`}
        />
        <KpiCard
          title={`GP1 ${ano} (R$)`}
          value={tCurr && gp1CurrOk ? fmtMi(Number(tCurr.gp1)) : "—"}
          icon={TrendingUp}
          accent="dark"
          delta={spGp1 ? { value: spGp1.var, suffix: vsAnt } : undefined}
          hint={gp1CurrOk ? (spGp1 ? undefined : `sem base de ${ano - 1}`) : "não sincronizado"}
        />
        <KpiCard
          title={`GP2 ${ano} (R$)`}
          value={tCurr && propCurrOk ? fmtMi(Number(tCurr.gp2)) : "—"}
          icon={BarChart3}
          accent="red"
          delta={spGp2 ? { value: spGp2.var, suffix: vsAnt } : undefined}
          hint={spGp2 ? undefined : `sem base de ${ano - 1}`}
        />
        <KpiCard
          title="Margem média GP2"
          value={margemCur !== null ? `${margemCur.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
          icon={Percent}
          accent="dark"
          delta={margemPp !== null ? { value: margemPp, unit: "p.p.", suffix: vsAnt } : undefined}
          hint="GP2 ÷ Receita"
        />
      </div>

      {/* Gross Profit: combo mensal + comparativo anual + destaques/donut.
          Fica em xl: a 4 colunas o lg deixaria os painéis com 168px e cortaria os rótulos. */}
      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Gross Profit {ano}: {gp1CurrOk ? "GP1 vs GP2" : "GP2 mensal"}
            </CardTitle>
            <CardDescription>
              {gp1CurrOk
                ? "Comparativo mensal (R$) · linha vermelha = diferença"
                : `Mensal (R$) · GP1 de ${ano} ainda não sincronizado`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ComboGp data={comboData} showGp1={gp1CurrOk} />
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
                value={tCurr && propCurrOk ? fmtMi(Number(tCurr.revenue)) : "—"}
                delta={spRevenue?.var ?? null}
                suffix={vsAnt}
              />
              <Destaque
                icon={Wallet}
                iconClass="bg-chart-5/12 text-chart-5"
                label={`Receita ${ano - 1} (mesmo período)`}
                value={spRevenue ? fmtMi(spRevenue.prev) : "—"}
                delta={spRevenue?.var != null ? -spRevenue.var : null}
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

      {/* Tabela mensal + modalidade/clientes — idem: em lg a coluna lateral cairia p/ 168px. */}
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
              <MensalTable
                ano={ano}
                prev={prev}
                curr={curr}
                tPrev={tPrev}
                tCurr={tCurr}
                gp1PrevOk={gp1PrevOk}
                gp1CurrOk={gp1CurrOk}
                propPrevOk={propPrevOk}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Modalidades {ano}</CardTitle>
              <CardDescription>Participação no GP2</CardDescription>
            </CardHeader>
            <CardContent>
              <Donut
                data={donutTipos}
                centerValue={tCurr && propCurrOk ? fmtMi(Number(tCurr.gp2)) : undefined}
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
              <CardDescription>Por GP2 gerado</CardDescription>
            </CardHeader>
            <CardContent>
              {topClientes.length === 0 ? (
                <EmptyState className="h-[140px]" />
              ) : (
                <ul className="flex flex-col gap-2">
                  {topClientes.map((c, i) => (
                    <li key={c.customer_name} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span className="truncate" title={`${c.customer_name} · ${num.format(c.processos)} processos`}>
                          {nomeCurto(c.customer_name)}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">
                        {fmtMi(Number(c.gp2))}
                        {gp2Ano > 0 && (
                          <span className="opacity-75">
                            {" "}({((Number(c.gp2) / gp2Ano) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)
                          </span>
                        )}
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
      <div className="grid gap-4 lg:grid-cols-2">
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
        meses de {ano} e {ano - 1} · Modalidade usa os mesmos 5 grupos da tela Desempenho ·
        Data-base: data do processo; exclui cancelados e consolidações (CONS). Indicadores sem dado
        sincronizado aparecem como “—”, nunca como zero. Equivale ao Power BI com filtro Sistema = Tier2.
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
  gp1CurrOk,
  propPrevOk,
}: {
  ano: number;
  prev: FinanceiroMensal[];
  curr: FinanceiroMensal[];
  tPrev?: FinanceiroTotais;
  tCurr?: FinanceiroTotais;
  gp1PrevOk: boolean;
  gp1CurrOk: boolean;
  propPrevOk: boolean;
}) {
  const p = new Map(prev.map((r) => [r.mes, r]));
  const c = new Map(curr.map((r) => [r.mes, r]));
  const meses = Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => p.has(m) || c.has(m));

  // Só mostra o número quando o dado existe — senão "—" (zero != ausente).
  const vPrev = (r: FinanceiroMensal | undefined, campo: "revenue" | "gp1" | "gp2") => {
    if (!r || !propPrevOk) return null;
    if (campo === "gp1" && !gp1PrevOk) return null;
    return Number(r[campo]);
  };
  const vCurr = (r: FinanceiroMensal | undefined, campo: "revenue" | "gp1" | "gp2") => {
    if (!r) return null;
    if (campo === "gp1" && !gp1CurrOk) return null;
    return Number(r[campo]);
  };

  const margem = (r: FinanceiroMensal | undefined, isPrev: boolean) => {
    if (!r || (isPrev && !propPrevOk)) return null;
    return Number(r.revenue) > 0 ? (Number(r.gp2) / Number(r.revenue)) * 100 : null;
  };

  const cell = (v: number | null | undefined) => (v != null ? int.format(v) : "—");
  const pctCell = (v: number | null) =>
    v !== null ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";

  const totPrev = (campo: "revenue" | "gp1" | "gp2") =>
    !tPrev || !propPrevOk || (campo === "gp1" && !gp1PrevOk) ? null : Number(tPrev[campo]);
  const totCurr = (campo: "revenue" | "gp1" | "gp2") =>
    !tCurr || (campo === "gp1" && !gp1CurrOk) ? null : Number(tCurr[campo]);

  const mPrevTot = tPrev && propPrevOk && Number(tPrev.revenue) > 0 ? (Number(tPrev.gp2) / Number(tPrev.revenue)) * 100 : null;
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
            const mp = margem(rp, true);
            const mc = margem(rc, false);
            return (
              <TableRow key={m}>
                <TableCell className="py-1.5 whitespace-nowrap">{MESES[m - 1]}</TableCell>
                {(["revenue", "gp1", "gp2"] as const).map((campo) => {
                  const a = vPrev(rp, campo);
                  const b = vCurr(rc, campo);
                  return [
                    <TableCell key={`${campo}-p`} className="py-1.5 text-right tabular-nums">{cell(a)}</TableCell>,
                    <TableCell key={`${campo}-c`} className="py-1.5 text-right tabular-nums">{cell(b)}</TableCell>,
                    <TableCell key={`${campo}-v`} className="py-1.5 text-right">
                      <Delta value={variacao(a, b)} className="text-[11px]" />
                    </TableCell>,
                  ];
                })}
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
            {(["revenue", "gp1", "gp2"] as const).map((campo) => {
              const a = totPrev(campo);
              const b = totCurr(campo);
              return [
                <TableCell key={`${campo}-p`} className="text-right tabular-nums">{cell(a)}</TableCell>,
                <TableCell key={`${campo}-c`} className="text-right tabular-nums">{cell(b)}</TableCell>,
                <TableCell key={`${campo}-v`} className="text-right">
                  <Delta value={variacao(a, b)} className="text-[11px]" />
                </TableCell>,
              ];
            })}
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
