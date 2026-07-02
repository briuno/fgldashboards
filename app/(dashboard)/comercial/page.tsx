import { Hash, Package, Users, TrendingUp, XCircle } from "lucide-react";

import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BarList, aggregate } from "@/components/dashboard/bar-list";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AreaTrend, type AreaTrendPoint } from "@/components/charts/area-trend";
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
import { getSemanas, getDetalheSemana, getCancelados } from "@/lib/queries/comercial";

const num = new Intl.NumberFormat("pt-BR");
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export default async function ComercialPage({
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
  const profitPrev = convertidos.reduce((a, r) => a + Number(r.forecast_gross), 0);

  const porVendedor = aggregate(convertidos, (r) => r.sales_person, () => 1);
  const porTipo = aggregate(convertidos, (r) => r.process_type, () => 1);
  const porCliente = aggregate(convertidos, (r) => r.customer_name, () => 1);
  const profitVendedor = aggregate(convertidos, (r) => r.sales_person, (r) => Number(r.forecast_gross));

  const trend: AreaTrendPoint[] = semanas.map((s) => ({ label: `S${s.semana}`, value: s.convertidos }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="Comercial"
        description={`Processos convertidos e profit previsto — semana ${semanaSel} de ${ano}`}
      >
        <Segmented
          scroll
          className="max-w-[calc(100vw-3rem)] md:max-w-md lg:max-w-xl"
          items={comData.map((s) => ({
            label: String(s.semana),
            href: `/comercial?ano=${ano}&semana=${s.semana}`,
            active: s.semana === semanaSel,
          }))}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Nº da Semana" value={String(semanaSel)} hint={`Ano ${ano}`} icon={Hash} />
        <KpiCard title="Processos convertidos" value={num.format(convertidos.length)} hint="Na semana" icon={Package} />
        <KpiCard title="Clientes" value={num.format(clientes)} hint="Distintos na semana" icon={Users} />
        <KpiCard title="Gross Profit Previsto" value={brl.format(profitPrev)} hint="Convertidos da semana" icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processos convertidos por semana</CardTitle>
          <CardDescription>Ano {ano} — semana (domingo) de FirstCreatedOn</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaTrend data={trend} name="Convertidos" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarList title="Convertidos por Vendedor" items={porVendedor} />
        <BarList title="Convertidos por Tipo" items={porTipo} />
        <BarList title="Convertidos por Cliente" items={porCliente} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarList title="Profit Previsto por Vendedor" items={profitVendedor} currency />
      </div>

      {/* ------ Cancelados (ano) — por "Criado Em" ------ */}
      <SectionHeader
        title="Processos Cancelados"
        description={`Ano ${ano} inteiro — semana por data de criação (Criado Em)`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Processos cancelados" value={num.format(cancelados.length)} hint={`Ano ${ano}`} icon={XCircle} />
        <KpiCard
          title="Clientes"
          value={num.format(new Set(cancelados.map((c) => c.customer_name)).size)}
          hint="Com cancelamento no ano"
          icon={Users}
        />
        <KpiCard
          title="Máx. semana de criação"
          value={String(Math.max(0, ...cancelados.map((c) => c.semana_criacao)))}
          hint="Semana mais recente com cancelamento"
          icon={Hash}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarList title="Cancelados por Vendedor" items={aggregate(cancelados, (r) => r.sales_person, () => 1)} />
        <BarList title="Cancelados por Tipo" items={aggregate(cancelados, (r) => r.process_type, () => 1)} />
        <BarList title="Cancelados por Cliente" items={aggregate(cancelados, (r) => r.customer_name, () => 1)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cancelados — detalhe</CardTitle>
          <CardDescription>Mais recentes primeiro · {num.format(cancelados.length)} no ano</CardDescription>
        </CardHeader>
        <CardContent>
          {cancelados.length === 0 ? (
            <EmptyState className="h-[160px]" />
          ) : (
            <Table>
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
                    <TableCell className="font-mono text-xs whitespace-nowrap">{c.process_id}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.customer_service || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.sales_person || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {new Date(c.created_on).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate" title={c.customer_name ?? ""}>
                      {c.customer_name || "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate" title={c.agent_name ?? ""}>
                      {c.agent_name || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
