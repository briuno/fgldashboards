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
import { fmtCompact, fmtMi, int } from "@/lib/format";

export type MonthlyBarPoint = { label: string; value: number };

type MonthlyBarProps = {
  data: MonthlyBarPoint[];
  name?: string;
  height?: number;
  /** Cor das barras (mockup usa azul para valores R$). */
  color?: string;
};

/** Barras mensais com o valor compacto no topo (ex.: "2,28 Mi") — padrão do mockup. */
export function MonthlyBar({
  data,
  name = "Valor",
  height = 300,
  color = "var(--chart-2)",
}: MonthlyBarProps) {
  if (data.length === 0) {
    return <EmptyState className="h-[300px]" />;
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
          width={44}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v) => fmtCompact(Number(v))}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltip valueFormatter={(v) => int.format(v)} />}
        />
        <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => fmtMi(Number(v))}
            style={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
