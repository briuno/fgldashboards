import { Package, DollarSign, Ship, TrendingUp, Info } from "lucide-react";

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
import { getMonthlyKpis, getTopClients } from "@/lib/queries/kpi";

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
  const [monthly, topClients] = await Promise.all([getMonthlyKpis(), getTopClients(6)]);

  const totals = monthly.reduce(
    (a, m) => ({
      processos: a.processos + Number(m.processos),
      lucro_liquido: a.lucro_liquido + Number(m.lucro_liquido),
      lucro_bruto: a.lucro_bruto + Number(m.lucro_bruto),
      teu: a.teu + Number(m.teu),
    }),
    { processos: 0, lucro_liquido: 0, lucro_bruto: 0, teu: 0 }
  );

  const trend: AreaTrendPoint[] = monthly
    .slice(-14)
    .map((m) => ({ label: mesLabel(m.month), value: Number(m.processos) }));
  const maxLucro = Math.max(1, ...topClients.map((c) => Number(c.lucro_liquido)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Visão Executiva</h1>
          <p className="text-muted-foreground text-sm">
            Panorama geral — dados do Tier2 · {num.format(totals.processos)} processos (2021–2026)
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-medium">Dados reais do Tier2.</span> Backfill inicial em ~77% do
          histórico. Receita/custo e o lucro dos meses mais recentes entram na próxima
          sincronização (Edge Function + pg_cron).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Processos" value={num.format(totals.processos)} hint="Embarques (2021–2026)" icon={Package} />
        <KpiCard title="Lucro líquido" value={brl.format(totals.lucro_liquido)} hint="Acumulado" icon={TrendingUp} />
        <KpiCard title="Lucro bruto" value={brl.format(totals.lucro_bruto)} hint="Antes de impostos/ajustes" icon={DollarSign} />
        <KpiCard title="TEU" value={num.format(totals.teu)} hint="Contêineres movimentados" icon={Ship} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Processos por mês</CardTitle>
              <Badge variant="secondary">últimos 14 meses</Badge>
            </div>
            <CardDescription>Volume de embarques por ProcessDate — Tier2</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaTrend data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top clientes por lucro</CardTitle>
            <CardDescription>Lucro líquido acumulado</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {topClients.map((c) => (
                <li key={c.customer_name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate" title={c.customer_name}>
                      {c.customer_name}
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {brl.format(Number(c.lucro_liquido))}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${(Number(c.lucro_liquido) / maxLucro) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
              {topClients.length === 0 && (
                <li className="text-muted-foreground text-sm">Sem dados ainda.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
