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

export type AreaTrendPoint = { label: string; value: number };

type AreaTrendProps = {
  data: AreaTrendPoint[];
  color?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
};

export function AreaTrend({
  data,
  color = "#2563eb",
  height = 280,
  valueFormatter = (v) => v.toLocaleString("pt-BR"),
}: AreaTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="area-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickFormatter={(v) => valueFormatter(Number(v))}
        />
        <Tooltip
          formatter={(v) => valueFormatter(Number(v))}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill="url(#area-trend-fill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
