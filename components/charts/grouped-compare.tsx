"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { EmptyState } from "@/components/dashboard/empty-state";
import { fmtCompact } from "@/lib/format";

export type GroupedComparePoint = { label: string; prev: number | null; curr: number | null };

type GroupedCompareProps = {
  data: GroupedComparePoint[];
  prevName: string;
  currName: string;
  height?: number;
  /** Paleta [anterior, corrente]. */
  colors?: [string, string];
};

const valueFormatter = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

/** Barras agrupadas ano anterior × corrente com rótulos — "Gross Profit 2025 vs 2024". */
export function GroupedCompare({
  data,
  prevName,
  currName,
  height = 300,
  colors = ["var(--chart-4)", "var(--chart-3)"],
}: GroupedCompareProps) {
  if (data.length === 0) {
    return <EmptyState className="h-[300px]" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 24, bottom: 0 }} barGap={6}>
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
          width={48}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v) => fmtCompact(Number(v))}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltip valueFormatter={valueFormatter} />}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        <Bar dataKey="prev" name={prevName} fill={colors[0]} radius={[3, 3, 0, 0]} maxBarSize={52}>
          <LabelList
            dataKey="prev"
            position="top"
            formatter={(v) => (v != null ? fmtCompact(Number(v)) : "")}
            style={{ fill: "var(--muted-foreground)", fontSize: 10.5, fontWeight: 600 }}
          />
        </Bar>
        <Bar dataKey="curr" name={currName} fill={colors[1]} radius={[3, 3, 0, 0]} maxBarSize={52}>
          <LabelList
            dataKey="curr"
            position="top"
            formatter={(v) => (v != null ? fmtCompact(Number(v)) : "")}
            style={{ fill: "var(--foreground)", fontSize: 10.5, fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
