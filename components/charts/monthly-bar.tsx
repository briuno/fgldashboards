"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { EmptyState } from "@/components/dashboard/empty-state";

export type MonthlyBarPoint = { label: string; value: number };

type MonthlyBarProps = {
  data: MonthlyBarPoint[];
  name?: string;
  height?: number;
};

const full = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function compact(v: number): string {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Mi`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return v.toLocaleString("pt-BR");
}

/** Barras mensais com o valor completo no topo (estilo do painel do Power BI). */
export function MonthlyBar({ data, name = "Valor", height = 320 }: MonthlyBarProps) {
  if (data.length === 0) {
    return <EmptyState className="h-[320px]" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 4, right: 12, top: 24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickFormatter={(v) => compact(Number(v))}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltip valueFormatter={(v) => full.format(v)} />}
        />
        <Bar dataKey="value" name={name} fill="var(--chart-1)" radius={[3, 3, 0, 0]}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => full.format(Number(v))}
            style={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
