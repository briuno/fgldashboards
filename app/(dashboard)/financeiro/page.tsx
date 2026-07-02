import { Package, Users, DollarSign, TrendingUp } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { FilterSelect } from "@/components/dashboard/filter-select";
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
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1,
});

function Variacao({ prev, curr }: { prev: number | null; curr: number | null }) {
  if (!prev || curr === null) return <span className="text-muted-foreground">—</span>;
  const v = curr / prev - 1;
  const positive = v >= 0;
  return (
    <span className="inline-flex items-center justify-end gap-1.5 tabular-nums">
      <span className={`inline-block size-2.5 rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`} />
      {(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
    </span>
  );
}

type YoyRow = { mes: number; prev: number | null; curr: number | null };

function YoyTable({
  title, ano, rows, totalPrev, totalCurr,
}: {
  title: string;
  ano: number;
  rows: YoyRow[];
  totalPrev: number | null;
  totalCurr: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-xs">
              <th className="py-1.5 text-left font-medium">Mês</th>
              <th className="py-1.5 text-right font-medium">{ano - 1}</th>
              <th className="py-1.5 text-right font-medium">{ano}</th>
              <th className="py-1.5 text-right font-medium">Variação %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mes} className="border-b border-dashed last:border-0">
                <td className="py-1.5">{MESES[r.mes - 1]}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {r.prev !== null ? dec.format(r.prev) : ""}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {r.curr !== null ? dec.format(r.curr) : ""}
                </td>
                <td className="py-1.5 text-right">
                  <Variacao prev={r.prev} curr={r.curr} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right tabular-nums">{totalPrev !== null ? dec.format(totalPrev) : ""}</td>
              <td className="py-2 text-right tabular-nums">{totalCurr !== null ? dec.format(totalCurr) : ""}</td>
              <td className="py-2 text-right"><Variacao prev={totalPrev} curr={totalCurr} /></td>
            </tr>
          </tfoot>
        </table>
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground text-sm">
            Performance de processos e gross profit — {ano} vs {ano - 1} (data processo)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect param="cliente" value={cliente} placeholder="Cliente: Todos" options={clientes.map((c) => c.nome)} />
          <FilterSelect param="tipo" value={tipo} placeholder="Modalidade: Todas" options={tipos.map((t) => t.nome)} />
          <FilterSelect param="ano" value={sp.ano} placeholder="Ano: 2026" options={["2025"]} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={`Processos ${ano}`} value={tCurr ? num.format(tCurr.processos) : "—"} hint="Exclui cancelados e CONS" icon={Package} />
        <KpiCard title={`Clientes ${ano}`} value={tCurr ? num.format(tCurr.clientes) : "—"} hint="Distintos no ano" icon={Users} />
        <KpiCard title={`GP2 ${ano}`} value={tCurr ? brlCompact.format(Number(tCurr.gp2)) : "—"} hint="Lucro da proposta" icon={TrendingUp} />
        <KpiCard title={`Revenue ${ano}`} value={tCurr ? brlCompact.format(Number(tCurr.revenue)) : "—"} hint="Receita da proposta" icon={DollarSign} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processos por GP2 Mensal {ano}</CardTitle>
          <CardDescription>GP2 = lucro líquido da proposta (NetProfit)</CardDescription>
        </CardHeader>
        <CardContent>
          {gp2Trend.length > 0 ? (
            <MonthlyBar data={gp2Trend} />
          ) : (
            <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
              Sem dados para {ano} com os filtros atuais.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <YoyTable
          title="GP2"
          ano={ano}
          rows={toYoyRows(prev, curr, (r) => Number(r.gp2))}
          totalPrev={tPrev ? Number(tPrev.gp2) : null}
          totalCurr={tCurr ? Number(tCurr.gp2) : null}
        />
        <YoyTable
          title="Revenue"
          ano={ano}
          rows={toYoyRows(prev, curr, (r) => Number(r.revenue))}
          totalPrev={tPrev ? Number(tPrev.revenue) : null}
          totalCurr={tCurr ? Number(tCurr.revenue) : null}
        />
        <YoyTable
          title="Ticket Médio"
          ano={ano}
          rows={toYoyRows(prev, curr, ticket)}
          totalPrev={ticketTotal(tPrev)}
          totalCurr={ticketTotal(tCurr)}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Gross Profit — GP1 × GP2</h2>
        <p className="text-muted-foreground text-sm">
          GP1 = lucro realizado por faturas (sem variação cambial) · barra escura = diferença até o GP2
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard title={`GP1 ${ano}`} value={tCurr ? brlCompact.format(Number(tCurr.gp1)) : "—"} />
        <KpiCard title={`GP2 ${ano}`} value={tCurr ? brlCompact.format(Number(tCurr.gp2)) : "—"} />
        <KpiCard title={`Diferença ${ano}`} value={tCurr ? brlCompact.format(Number(tCurr.gp2) - Number(tCurr.gp1)) : "—"} />
        <KpiCard title={`GP1 ${ano - 1}`} value={tPrev && gp1PrevDisponivel ? brlCompact.format(Number(tPrev.gp1)) : "—"} />
        <KpiCard title={`GP2 ${ano - 1}`} value={tPrev ? brlCompact.format(Number(tPrev.gp2)) : "—"} />
        <KpiCard title={`Diferença ${ano - 1}`} value={tPrev && gp1PrevDisponivel ? brlCompact.format(Number(tPrev.gp2) - Number(tPrev.gp1)) : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gross Profit {ano}</CardTitle>
            <CardDescription>GP1 (claro) + diferença GP1 e GP2 (escuro) — rótulo = GP2</CardDescription>
          </CardHeader>
          <CardContent>
            {curr.length > 0 ? (
              <GpStackedBar data={toGpPoints(curr)} />
            ) : (
              <div className="text-muted-foreground flex h-[420px] items-center justify-center text-sm">
                Sem dados para {ano}.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gross Profit {ano - 1}</CardTitle>
            <CardDescription>
              {gp1PrevDisponivel
                ? `GP1 (claro) + diferença GP1 e GP2 (escuro) — rótulo = GP2`
                : `GP1 de ${ano - 1} ainda não sincronizado`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gp1PrevDisponivel ? (
              <GpStackedBar data={toGpPoints(prev)} />
            ) : (
              <div className="text-muted-foreground flex h-[420px] items-center justify-center px-8 text-center text-sm">
                O GP1 (lucro por faturas) de {ano - 1} é um campo pesado do Tier2 e ainda não foi
                sincronizado. O GP2 de {ano - 1} já aparece nas tabelas acima.
              </div>
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
