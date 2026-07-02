import { Package, Clock, TrendingUp, Ship, Info } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AreaTrend, type AreaTrendPoint } from "@/components/charts/area-trend";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getTotals, getMonthlyKpis, getTopClients } from "@/lib/queries/kpi";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const num = new Intl.NumberFormat("pt-BR");
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

function mesLabel(d: string) {
  const [y, m] = d.split("-");
  return `${MESES[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

export default async function VisaoExecutivaPage() {
  const [totals, monthly, topClients] = await Promise.all([
    getTotals(),
    getMonthlyKpis(),
    getTopClients(6),
  ]);

  const trend: AreaTrendPoint[] = monthly
    .slice(-14)
    .map((m) => ({ label: mesLabel(m.month), value: Number(m.processos) }));
  const maxLucro = Math.max(1, ...topClients.map((c) => Number(c.lucro_liquido)));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="Visão Executiva"
        description={
          <>
            Panorama geral — dados do Tier2 ·{" "}
            <span className="tabular-nums">{num.format(Number(totals.processos_total))}</span>{" "}
            processos (2021–2026)
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Processos"
          value={num.format(Number(totals.processos_total))}
          hint={`${num.format(Number(totals.processos_com_data))} com ETA`}
          icon={Package}
        />
        <KpiCard
          title="Novos (sem ETA)"
          value={num.format(Number(totals.processos_novos))}
          hint="Pipeline — sem data prevista"
          icon={Clock}
        />
        <KpiCard
          title="Lucro líquido"
          value={brl.format(Number(totals.lucro_liquido))}
          hint="Acumulado"
          icon={TrendingUp}
        />
        <KpiCard
          title="TEU"
          value={num.format(Number(totals.teu))}
          hint="Contêineres movimentados"
          icon={Ship}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Processos por mês</CardTitle>
              <Badge variant="secondary">últimos 14 meses</Badge>
            </div>
            <CardDescription>Volume de embarques por ProcessDate — Tier2</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaTrend data={trend} name="Processos" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top clientes por lucro</CardTitle>
            <CardDescription>Lucro líquido acumulado</CardDescription>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <EmptyState className="h-[240px]" />
            ) : (
              <ul className="flex flex-col gap-3">
                {topClients.map((c) => (
                  <li key={c.customer_name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate" title={c.customer_name}>
                        {c.customer_name}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[13px] tabular-nums">
                        {brl.format(Number(c.lucro_liquido))}
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-chart-1 h-full rounded-full"
                        style={{ width: `${(Number(c.lucro_liquido) / maxLucro) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground flex items-start gap-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Dados reais do Tier2, com sincronização diária ativa (Edge Function + pg_cron). Receita/custo
        e o lucro de alguns meses entram ao ligarmos a view de faturamento.
      </p>
    </div>
  );
}
