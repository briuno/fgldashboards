"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { EmptyState } from "@/components/dashboard/empty-state";

export type GpStackedPoint = {
  label: string; // mês
  gp1: number;
  diff: number; // GP2 - GP1
  total: number; // GP2
};

type GpStackedBarProps = {
  data: GpStackedPoint[];
  height?: number;
};

const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** Barras horizontais empilhadas GP1 + diferença (GP1×GP2), com o GP2 total à direita —
 *  réplica do "Painel de Performance de Gross Profit" do Power BI. */
export function GpStackedBar({ data, height = 420 }: GpStackedBarProps) {
  if (data.length === 0) {
    return <EmptyState className="h-[420px]" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 64, top: 4, bottom: 0 }}>
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v) => `${(Number(v) / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Mi`}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={72}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltip valueFormatter={(v) => int.format(v)} />}
        />
        <Bar dataKey="gp1" stackId="gp" fill="var(--chart-1)" name="GP1 (faturas, s/ câmbio)">
          <LabelList
            dataKey="gp1"
            position="center"
            formatter={(v) => (Math.abs(Number(v)) > 0 ? int.format(Number(v)) : "")}
            style={{ fill: "var(--primary-foreground)", fontSize: 10 }}
          />
        </Bar>
        <Bar dataKey="diff" stackId="gp" fill="var(--primary)" name="Diferença até o GP2" radius={[0, 3, 3, 0]}>
          <LabelList
            dataKey="total"
            position="right"
            formatter={(v) => int.format(Number(v))}
            style={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
