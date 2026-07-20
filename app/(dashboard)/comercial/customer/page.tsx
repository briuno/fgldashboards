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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtMi, int, nomeCurto, num } from "@/lib/format";
import { getComercialCustomer } from "@/lib/queries/comercial";

export default async function ComercialCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;

  const clientes = await getComercialCustomer(ano, 100);

  const totalProc = clientes.reduce((a, c) => a + Number(c.processos), 0);
  const totalRev = clientes.reduce((a, c) => a + Number(c.revenue), 0);
  const totalProfit = clientes.reduce((a, c) => a + Number(c.profit_previsto), 0);
  const topProfit = [...clientes].sort((a, b) => Number(b.profit_previsto) - Number(a.profit_previsto));

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader title="Comercial · Customer" description="Receita e lucro previsto por cliente">
        <Segmented
          items={[2022, 2023, 2024, 2025, 2026].map((a) => ({
            label: String(a),
            href: `/comercial/customer?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={`Clientes ${ano}`} value={num.format(clientes.length)} icon={Users} accent="red" hint="Com processos no ano" />
        <KpiCard title={`Processos ${ano}`} value={num.format(totalProc)} icon={Package} accent="dark" hint="Total no ano" />
        <KpiCard title={`Receita ${ano} (R$)`} value={fmtMi(totalRev)} icon={CircleDollarSign} accent="red" hint="Soma das propostas" />
        <KpiCard title={`Profit Previsto ${ano} (R$)`} value={fmtMi(totalProfit)} icon={TrendingUp} accent="dark" hint="ForecastNetProfit" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profit Previsto por Cliente {ano}</CardTitle>
          <CardDescription>Top 12 por lucro líquido previsto</CardDescription>
        </CardHeader>
        <CardContent>
          <EntityBars
            data={topProfit.slice(0, 12).map((c) => ({ label: nomeCurto(c.customer_name), value: Number(c.profit_previsto) }))}
            color="var(--chart-1)"
            height={300}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ranking de Clientes {ano}</CardTitle>
          <CardDescription>Top 100 por receita — profit previsto = ForecastNetProfit</CardDescription>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <EmptyState className="h-[200px]" />
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Processos</TableHead>
                    <TableHead className="text-right">Receita (R$)</TableHead>
                    <TableHead className="text-right">Profit Previsto (R$)</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">% Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c, i) => (
                    <TableRow key={c.customer_name}>
                      <TableCell className="py-1.5">
                        <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate py-1.5" title={c.customer_name}>{c.customer_name}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{num.format(Number(c.processos))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(c.revenue))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(c.profit_previsto))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{int.format(Number(c.ticket_medio))}</TableCell>
                      <TableCell className="text-muted-foreground py-1.5 text-right tabular-nums">
                        {totalRev > 0 ? ((Number(c.revenue) / totalRev) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 · CustomerName do processo · Receita = TotalSalesProposal · Profit Previsto =
        ForecastNetProfit · Exclui cancelados e consolidações (CONS).
      </p>
    </div>
  );
}
