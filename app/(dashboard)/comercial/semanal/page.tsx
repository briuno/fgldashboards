import { Hash, Package, TrendingUp, Users, XCircle } from "lucide-react";

import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MonthlyBar, type MonthlyBarPoint } from "@/components/charts/monthly-bar";
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
import { fmtMi, int, num } from "@/lib/format";
import { getCancelados, getDetalheSemana, getSemanas } from "@/lib/queries/comercial";

type Agg = { label: string; value: number };

function aggregate<T>(rows: T[], key: (r: T) => string | null, metric: (r: T) => number): Agg[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || "—";
    map.set(k, (map.get(k) ?? 0) + metric(r));
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Lista compacta de barras horizontais (substitui a antiga BarList). */
function MiniBars({ title, items, currency = false, max = 8 }: { title: string; items: Agg[]; currency?: boolean; max?: number }) {
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState className="h-[140px]" />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.slice(0, max).map((i, idx) => (
              <li key={i.label} className="flex items-center gap-3">
                <span className="text-muted-foreground/70 w-4 shrink-0 text-right text-xs tabular-nums">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate" title={i.label}>{i.label}</span>
                    <span className="text-muted-foreground shrink-0 text-[13px] tabular-nums">
                      {currency ? int.format(i.value) : num.format(i.value)}
                    </span>
                  </div>
                  <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
                    <div className="bg-chart-1 h-full rounded-full" style={{ width: `${Math.max(2, (i.value / maxVal) * 100)}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ComercialSemanalPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; semana?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;
  const [semanas, cancelados] = await Promise.all([getSemanas(ano), getCancelados(ano)]);

  const comData = semanas.filter((s) => s.convertidos > 0);
  const semanaSel = Number(sp.semana) || (comData.length ? comData[comData.length - 1].semana : 1);

  const detalhe = await getDetalheSemana(ano, semanaSel);
  const convertidos = detalhe.filter((r) => !r.is_cancelado);

  const clientes = new Set(convertidos.map((r) => r.customer_name)).size;
  const profitPrev = convertidos.reduce((a, r) => a + Number(r.forecast_net), 0);

  const porVendedor = aggregate(convertidos, (r) => r.sales_person, () => 1);
  const porTipo = aggregate(convertidos, (r) => r.process_type, () => 1);
  const porCliente = aggregate(convertidos, (r) => r.customer_name, () => 1);
  const profitVendedor = aggregate(convertidos, (r) => r.sales_person, (r) => Number(r.forecast_net));

  const trend: MonthlyBarPoint[] = semanas.map((s) => ({ label: `S${s.semana}`, value: s.convertidos }));

  const cancPorVendedor = aggregate(cancelados, (r) => r.sales_person, () => 1);
  const cancPorTipo = aggregate(cancelados, (r) => r.process_type, () => 1);
  const cancPorCliente = aggregate(cancelados, (r) => r.customer_name, () => 1);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader title="Comercial · Semanal" description={`Conversões e cancelamentos — semana ${semanaSel} de ${ano}`}>
        <Segmented
          items={[2022, 2023, 2024, 2025, 2026].map((a) => ({ label: String(a), href: `/comercial/semanal?ano=${a}`, active: a === ano }))}
        />
      </PageHeader>

      {/* Seletor de semana */}
      {comData.length > 0 && (
        <Segmented
          scroll
          className="max-w-full"
          items={comData.map((s) => ({
            label: String(s.semana),
            href: `/comercial/semanal?ano=${ano}&semana=${s.semana}`,
            active: s.semana === semanaSel,
          }))}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Nº da Semana" value={String(semanaSel)} icon={Hash} accent="dark" hint={`Ano ${ano}`} />
        <KpiCard title="Processos convertidos" value={num.format(convertidos.length)} icon={Package} accent="red" hint="Na semana" />
        <KpiCard title="Clientes" value={num.format(clientes)} icon={Users} accent="dark" hint="Distintos na semana" />
        <KpiCard title="Profit Previsto (R$)" value={fmtMi(profitPrev)} icon={TrendingUp} accent="red" hint="ForecastNetProfit dos convertidos" />
      </div>

      <SectionHeader kicker="Diagnóstico" title="Quem puxou o resultado da semana" description="Conversões quebradas por vendedor, tipo e cliente" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MiniBars title="Convertidos por Vendedor" items={porVendedor} />
        <MiniBars title="Convertidos por Tipo" items={porTipo} />
        <MiniBars title="Convertidos por Cliente" items={porCliente} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <MiniBars title="Profit Previsto por Vendedor (R$)" items={profitVendedor} currency />
      </div>

      <SectionHeader kicker="Evolução" title="Conversões ao longo do ano" description={`Semana a semana em ${ano} (semana começa no domingo)`} />
      <Card>
        <CardContent className="pt-4">
          <MonthlyBar data={trend} name="Convertidos" color="var(--chart-2)" />
        </CardContent>
      </Card>

      <SectionHeader kicker="Ofensores" title="Processos Cancelados" description={`Ano ${ano} inteiro — semana pela data de criação`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Processos cancelados" value={num.format(cancelados.length)} icon={XCircle} accent="red" hint={`Ano ${ano}`} />
        <KpiCard
          title="Clientes"
          value={num.format(new Set(cancelados.map((c) => c.customer_name)).size)}
          icon={Users}
          accent="dark"
          hint="Com cancelamento no ano"
        />
        <KpiCard
          title="Máx. semana de criação"
          value={String(Math.max(0, ...cancelados.map((c) => c.semana_criacao)))}
          icon={Hash}
          accent="dark"
          hint="Semana mais recente com cancelamento"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MiniBars title="Cancelados por Vendedor" items={cancPorVendedor} />
        <MiniBars title="Cancelados por Tipo" items={cancPorTipo} />
        <MiniBars title="Cancelados por Cliente" items={cancPorCliente} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cancelados — detalhe operacional</CardTitle>
          <CardDescription>Os 30 mais recentes de {num.format(cancelados.length)} no ano</CardDescription>
        </CardHeader>
        <CardContent>
          {cancelados.length === 0 ? (
            <EmptyState className="h-[160px]" description="Nenhum processo cancelado no ano selecionado." />
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Processo</TableHead>
                    <TableHead>Customer Service</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Criado Em</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Agente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelados.slice(0, 30).map((c) => (
                    <TableRow key={c.process_id + c.created_on}>
                      <TableCell className="py-1.5 font-mono text-xs whitespace-nowrap">{c.process_id}</TableCell>
                      <TableCell className="py-1.5 whitespace-nowrap">{c.customer_service || "—"}</TableCell>
                      <TableCell className="py-1.5 whitespace-nowrap">{c.sales_person || "—"}</TableCell>
                      <TableCell className="py-1.5 whitespace-nowrap tabular-nums">{new Date(c.created_on).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="max-w-[280px] truncate py-1.5" title={c.customer_name ?? ""}>{c.customer_name || "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate py-1.5" title={c.agent_name ?? ""}>{c.agent_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
