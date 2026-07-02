"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { EmptyState } from "@/components/dashboard/empty-state";

export type AreaTrendPoint = { label: string; value: number };

type AreaTrendProps = {
  data: AreaTrendPoint[];
  name?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
};

export function AreaTrend({
  data,
  name = "Valor",
  height = 280,
  valueFormatter = (v) => v.toLocaleString("pt-BR"),
}: AreaTrendProps) {
  if (data.length === 0) {
    return <EmptyState className="h-[280px]" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="area-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickFormatter={(v) => valueFormatter(Number(v))}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={<ChartTooltip valueFormatter={valueFormatter} />}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={name}
          stroke="var(--chart-1)"
          fill="url(#area-trend-fill)"
          strokeWidth={2}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
