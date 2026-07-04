"use client";

import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { EmptyState } from "@/components/dashboard/empty-state";
import { fmtCompact } from "@/lib/format";

export type ComparePoint = { label: string; prev: number | null; curr: number | null };

type CompareLineProps = {
  data: ComparePoint[];
  /** Nomes das séries (ex.: "2024" / "2025"). */
  prevName: string;
  currName: string;
  height?: number;
  /** Rótulos de valor sobre a série corrente. */
  showLabels?: boolean;
};

const valueFormatter = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

/** Linha comparativa 2 anos: corrente em vermelho sólido, anterior em cinza tracejado. */
export function CompareLine({
  data,
  prevName,
  currName,
  height = 280,
  showLabels = false,
}: CompareLineProps) {
  if (data.length === 0) {
    return <EmptyState className="h-[280px]" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 4, right: 16, top: 20, bottom: 0 }}>
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
        <Tooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        <Line
          type="monotone"
          dataKey="prev"
          name={prevName}
          stroke="var(--chart-4)"
          strokeWidth={1.8}
          strokeDasharray="5 4"
          connectNulls
          dot={{ r: 2.5, fill: "var(--chart-4)", strokeWidth: 0 }}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="curr"
          name={currName}
          stroke="var(--primary)"
          strokeWidth={2.4}
          connectNulls
          dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
          activeDot={{ r: 4.5, strokeWidth: 0 }}
        >
          {showLabels && (
            <LabelList
              dataKey="curr"
              position="top"
              offset={10}
              formatter={(v) => (v != null ? fmtCompact(Number(v)) : "")}
              style={{ fill: "var(--foreground)", fontSize: 10, fontWeight: 600 }}
            />
          )}
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
