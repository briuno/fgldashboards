import { Package, Clock, TrendingUp, Ship, Info, Crown } from "lucide-react";

import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { InsightCard } from "@/components/dashboard/insight-card";
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

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const num = new Intl.NumberFormat("pt-BR");
const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
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

  // Leitura de ritmo: compara os 2 últimos meses já FECHADOS (ignora o mês corrente,
  // parcial, e meses futuros — a carteira tem ETAs à frente).
  const hoje = new Date();
  const mesAtualYm = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const fechados = monthly.filter((m) => m.month.slice(0, 7) < mesAtualYm);
  const ult = fechados[fechados.length - 1];
  const ant = fechados[fechados.length - 2];
  const ritmo =
    ult && ant && Number(ant.processos) > 0
      ? (Number(ult.processos) / Number(ant.processos) - 1) * 100
      : null;

  // Concentração: participação do maior cliente no lucro acumulado.
  const lucroTotal = Number(totals.lucro_liquido);
  const top1 = topClients[0];
  const share1 = top1 && lucroTotal > 0 ? (Number(top1.lucro_liquido) / lucroTotal) * 100 : null;

  // Pipeline: participação dos processos ainda sem ETA.
  const sharePipeline =
    Number(totals.processos_total) > 0
      ? (Number(totals.processos_novos) / Number(totals.processos_total)) * 100
      : null;

  const maxLucro = Math.max(1, ...topClients.map((c) => Number(c.lucro_liquido)));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="Visão Executiva"
        description={
          <>
            Como está a operação e para onde ela caminha — Tier2 ·{" "}
            <span className="tabular-nums">{num.format(Number(totals.processos_total))}</span>{" "}
            processos desde 2021
          </>
        }
      />

      {/* 01 · Onde estamos */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Processos"
          value={num.format(Number(totals.processos_total))}
          hint={`${num.format(Number(totals.processos_com_data))} com ETA definida`}
          icon={Package}
        />
        <KpiCard
          title="Pipeline (sem ETA)"
          value={num.format(Number(totals.processos_novos))}
          hint="Processos novos, sem data prevista"
          icon={Clock}
        />
        <KpiCard
          title="Lucro líquido"
          value={brl.format(lucroTotal)}
          hint="Acumulado desde 2021"
          icon={TrendingUp}
        />
        <KpiCard
          title="TEU"
          value={num.format(Number(totals.teu))}
          hint="Contêineres movimentados"
          icon={Ship}
        />
      </div>

      {/* Leitura rápida — fatos derivados dos números acima */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ritmo !== null && ult && ant && (
          <InsightCard
            kicker="Ritmo mensal"
            variant={ritmo >= 0 ? "positive" : "negative"}
            title={`${mesLabel(ult.month)}: ${num.format(Number(ult.processos))} processos (${ritmo >= 0 ? "+" : ""}${pct.format(ritmo)}%)`}
            description={`Comparado a ${mesLabel(ant.month)} (${num.format(Number(ant.processos))}). Meses futuros com ETA agendada não entram nesta leitura.`}
          />
        )}
        {share1 !== null && top1 && (
          <InsightCard
            kicker="Concentração"
            icon={Crown}
            title={`${pct.format(share1)}% do lucro vem de 1 cliente`}
            description={`${top1.customer_name} lidera com ${brl.format(Number(top1.lucro_liquido))} do lucro líquido acumulado.`}
          />
        )}
        {sharePipeline !== null && (
          <InsightCard
            kicker="Pipeline"
            variant={sharePipeline > 25 ? "warning" : "default"}
            icon={Clock}
            title={`${pct.format(sharePipeline)}% da carteira ainda sem ETA`}
            description="Processos abertos aguardando data prevista — entram nos gráficos mensais quando ganham ETA."
          />
        )}
      </div>

      {/* 02 · Evolução */}
      <SectionHeader
        kicker="02 · Evolução"
        title="Volume de embarques ao longo do tempo"
        description="Processos por mês (ProcessDate) — inclui ETAs futuras já agendadas"
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Processos por mês</CardTitle>
            <Badge variant="secondary">últimos 14 meses</Badge>
          </div>
          <CardDescription>Passe o mouse para ver o volume exato de cada mês</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaTrend data={trend} name="Processos" />
        </CardContent>
      </Card>

      {/* 03 · Concentração */}
      <SectionHeader
        kicker="03 · Concentração"
        title="Onde o lucro se concentra"
        description="Maiores clientes por lucro líquido acumulado — participação sobre o total"
      />
      <Card>
        <CardContent>
          {topClients.length === 0 ? (
            <EmptyState className="h-[240px]" />
          ) : (
            <ul className="flex flex-col gap-3">
              {topClients.map((c, i) => {
                const lucro = Number(c.lucro_liquido);
                const share = lucroTotal > 0 ? (lucro / lucroTotal) * 100 : 0;
                return (
                  <li key={c.customer_name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-muted-foreground/70 w-4 shrink-0 text-right text-xs tabular-nums">
                          {i + 1}
                        </span>
                        <span className="truncate" title={c.customer_name}>
                          {c.customer_name}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[13px] tabular-nums">
                        {brl.format(lucro)} · {pct.format(share)}%
                      </span>
                    </div>
                    <div className="bg-muted ml-6 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-chart-1 h-full rounded-full"
                        style={{ width: `${(lucro / maxLucro) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground flex items-start gap-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Dados reais do Tier2, com sincronização diária ativa (Edge Function + pg_cron). Receita/custo
        e o lucro de alguns meses entram ao ligarmos a view de faturamento.
      </p>
    </div>
  );
}
