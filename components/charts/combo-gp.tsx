"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { EmptyState } from "@/components/dashboard/empty-state";
import { fmtCompact } from "@/lib/format";

export type ComboGpPoint = { label: string; gp1: number; gp2: number; diff: number };

type ComboGpProps = {
  data: ComboGpPoint[];
  height?: number;
  /** Oculta GP1 e a linha de diferença quando o GP1 do ano não está sincronizado. */
  showGp1?: boolean;
};

const valueFormatter = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

/** GP1 × GP2 mensal (barras azuis) + linha vermelha da diferença — painel do mockup Financeiro. */
export function ComboGp({ data, height = 300, showGp1 = true }: ComboGpProps) {
  if (data.length === 0) {
    return <EmptyState className="h-[300px]" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v) => fmtCompact(Number(v))}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v) => fmtCompact(Number(v))}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltip valueFormatter={valueFormatter} />}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        {showGp1 && (
          <Bar yAxisId="left" dataKey="gp1" name="GP1" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        )}
        <Bar yAxisId="left" dataKey="gp2" name="GP2" fill="var(--chart-3)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        {showGp1 && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="diff"
            name="Diferença GP1 e GP2"
            stroke="var(--primary)"
            strokeWidth={2.2}
            dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
            activeDot={{ r: 4.5, strokeWidth: 0 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
