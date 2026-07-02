import Link from "next/link";
import { Hash, Package, Users, TrendingUp } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { AreaTrend, type AreaTrendPoint } from "@/components/charts/area-trend";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSemanas, getDetalheSemana, type ProcessoDetalhe } from "@/lib/queries/comercial";

const num = new Intl.NumberFormat("pt-BR");
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

type Agg = { label: string; value: number };

function aggregate(
  rows: ProcessoDetalhe[],
  key: (r: ProcessoDetalhe) => string | null,
  metric: (r: ProcessoDetalhe) => number,
): Agg[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || "—";
    map.set(k, (map.get(k) ?? 0) + metric(r));
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function BarList({ title, items, currency = false }: { title: string; items: Agg[]; currency?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const fmt = currency ? brl : num;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2.5">
          {items.slice(0, 10).map((i) => (
            <li key={i.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate" title={i.label}>{i.label}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">{fmt.format(i.value)}</span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full rounded-full" style={{ width: `${(i.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-muted-foreground text-sm">Sem dados.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; semana?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;
  const semanas = await getSemanas(ano);

  const comData = semanas.filter((s) => s.convertidos > 0);
  const semanaSel = Number(sp.semana) || (comData.length ? comData[comData.length - 1].semana : 1);

  const detalhe = await getDetalheSemana(ano, semanaSel);
  const convertidos = detalhe.filter((r) => !r.is_cancelado);

  const clientes = new Set(convertidos.map((r) => r.customer_name)).size;
  const profitPrev = convertidos.reduce((a, r) => a + Number(r.forecast_gross), 0);

  const porVendedor = aggregate(convertidos, (r) => r.sales_person, () => 1);
  const porTipo = aggregate(convertidos, (r) => r.process_type, () => 1);
  const porCliente = aggregate(convertidos, (r) => r.customer_name, () => 1);
  const profitVendedor = aggregate(convertidos, (r) => r.sales_person, (r) => Number(r.forecast_gross));

  const trend: AreaTrendPoint[] = semanas.map((s) => ({ label: `S${s.semana}`, value: s.convertidos }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Comercial</h1>
          <p className="text-muted-foreground text-sm">
            Processos convertidos e profit previsto — semana {semanaSel} de {ano}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Nº da Semana" value={String(semanaSel)} hint={`Ano ${ano}`} icon={Hash} />
        <KpiCard title="Processos convertidos" value={num.format(convertidos.length)} hint="Na semana" icon={Package} />
        <KpiCard title="Clientes" value={num.format(clientes)} hint="Distintos na semana" icon={Users} />
        <KpiCard title="Gross Profit Previsto" value={brl.format(profitPrev)} hint="Convertidos da semana" icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Selecione a semana de referência ({ano})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {comData.map((s) => (
              <Link
                key={s.semana}
                href={`/comercial?ano=${ano}&semana=${s.semana}`}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm tabular-nums transition-colors ${
                  s.semana === semanaSel
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {s.semana}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processos convertidos por semana</CardTitle>
          <CardDescription>Ano {ano} — semana ISO de FirstCreatedOn</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaTrend data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <BarList title="Convertidos por Vendedor" items={porVendedor} />
        <BarList title="Convertidos por Tipo" items={porTipo} />
        <BarList title="Convertidos por Cliente" items={porCliente} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Profit Previsto por Vendedor" items={profitVendedor} currency />
      </div>
    </div>
  );
}
