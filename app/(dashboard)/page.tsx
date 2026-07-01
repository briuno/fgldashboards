import { Package, DollarSign, TrendingDown, TrendingUp, Info } from "lucide-react";

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

// Dados ILUSTRATIVOS apenas para visualizar o layout. Serão substituídos pelos
// dados reais do Tier2 (mart.mv_kpi_monthly) no M1.
const demoTrend: AreaTrendPoint[] = [
  { label: "Jan", value: 320 },
  { label: "Fev", value: 298 },
  { label: "Mar", value: 361 },
  { label: "Abr", value: 342 },
  { label: "Mai", value: 388 },
  { label: "Jun", value: 405 },
];

export default function VisaoExecutivaPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Visão Executiva
          </h1>
          <p className="text-muted-foreground text-sm">
            Panorama geral — atualizado 1x por dia
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-medium">Fundação pronta.</span> Os números abaixo
          ainda são ilustrativos. Eles passam a ser reais assim que concluirmos a
          conexão com o Tier2 e a primeira sincronização (M1).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Processos (mês)" value="—" hint="Nº de embarques" icon={Package} />
        <KpiCard title="Receita (mês)" value="—" hint="Faturamento" icon={DollarSign} />
        <KpiCard title="Custo (mês)" value="—" hint="Custos diretos" icon={TrendingDown} />
        <KpiCard title="Lucro (mês)" value="—" hint="Lucro real" icon={TrendingUp} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Processos por mês</CardTitle>
              <Badge variant="secondary">exemplo ilustrativo</Badge>
            </div>
            <CardDescription>
              Prévia do estilo visual. Será ligado a dados reais no M1.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AreaTrend data={demoTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top clientes por lucro</CardTitle>
            <CardDescription>Disponível após a sincronização</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground flex h-[240px] items-center justify-center rounded-md border border-dashed text-center text-sm">
              Ranking de clientes aparecerá aqui
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
