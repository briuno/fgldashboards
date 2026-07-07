import { CircleDollarSign, Package, TrendingUp, Users } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EntityBars } from "@/components/charts/entity-bars";
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
import { fmtMi, int, nomeCurto, num } from "@/lib/format";
import { getComercialVendedor } from "@/lib/queries/comercial";

export default async function ComercialVendedorPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;

  const vendedores = await getComercialVendedor(ano);

  const totalProc = vendedores.reduce((a, v) => a + Number(v.processos), 0);
  const totalRev = vendedores.reduce((a, v) => a + Number(v.revenue), 0);
  const totalProfit = vendedores.reduce((a, v) => a + Number(v.profit_previsto), 0);
  const topProfit = [...vendedores].sort((a, b) => Number(b.profit_previsto) - Number(a.profit_previsto));

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader title="Comercial · Vendedor" description="Receita e lucro previsto por vendedor">
        <Segmented
          items={[2022, 2023, 2024, 2025, 2026].map((a) => ({
            label: String(a),
            href: `/comercial/vendedor?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={`Vendedores ${ano}`} value={num.format(vendedores.length)} icon={Users} accent="red" hint="Com processos no ano" />
        <KpiCard title={`Processos ${ano}`} value={num.format(totalProc)} icon={Package} accent="dark" hint="Total no ano" />
        <KpiCard title={`Receita ${ano} (R$)`} value={fmtMi(totalRev)} icon={CircleDollarSign} accent="red" hint="Soma das propostas" />
        <KpiCard title={`Profit Previsto ${ano} (R$)`} value={fmtMi(totalProfit)} icon={TrendingUp} accent="dark" hint="ForecastNetProfit" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profit Previsto por Vendedor {ano}</CardTitle>
          <CardDescription>Top 12 por lucro líquido previsto</CardDescription>
        </CardHeader>
        <CardContent>
          <EntityBars
            data={topProfit.slice(0, 12).map((v) => ({ label: nomeCurto(v.sales_person), value: Number(v.profit_previsto) }))}
            color="var(--chart-2)"
            height={300}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ranking de Vendedores {ano}</CardTitle>
          <CardDescription>Ordenado por receita — profit previsto = ForecastNetProfit</CardDescription>
        </CardHeader>
        <CardContent>
          {vendedores.length === 0 ? (
            <EmptyState className="h-[200px]" />
          ) : (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Processos</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Receita (R$)</TableHead>
                  <TableHead className="text-right">Profit Previsto (R$)</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.map((v, i) => (
                  <TableRow key={v.sales_person}>
                    <TableCell className="py-1.5">
                      <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                        {i + 1}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate py-1.5" title={v.sales_person}>{v.sales_person}</TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums">{num.format(Number(v.processos))}</TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums">{num.format(Number(v.clientes))}</TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(v.revenue))}</TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(v.profit_previsto))}</TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(v.ticket_medio))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{num.format(totalProc)}</TableCell>
                  <TableCell className="text-right tabular-nums">—</TableCell>
                  <TableCell className="text-right tabular-nums">{int.format(totalRev)}</TableCell>
                  <TableCell className="text-right tabular-nums">{int.format(totalProfit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{totalProc > 0 ? int.format(totalRev / totalProc) : "—"}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 · SalesPerson do processo · Receita = TotalSalesProposal · Profit Previsto =
        ForecastNetProfit · Exclui cancelados e consolidações (CONS).
      </p>
    </div>
  );
}
