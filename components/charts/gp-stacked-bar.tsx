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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 64, top: 4, bottom: 0 }}>
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#6b7280", fontSize: 11 }}
          tickFormatter={(v) => `${(Number(v) / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Mi`}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={72}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#374151", fontSize: 12 }}
        />
        <Tooltip
          formatter={(v, name) => [int.format(Number(v)), name === "gp1" ? "GP1" : "Diferença GP1 e GP2"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Bar dataKey="gp1" stackId="gp" fill="#3b82f6" name="gp1">
          <LabelList
            dataKey="gp1"
            position="center"
            formatter={(v) => (Math.abs(Number(v)) > 0 ? int.format(Number(v)) : "")}
            style={{ fill: "#ffffff", fontSize: 10 }}
          />
        </Bar>
        <Bar dataKey="diff" stackId="gp" fill="#1e3a8a" name="diff" radius={[0, 3, 3, 0]}>
          <LabelList
            dataKey="total"
            position="right"
            formatter={(v) => int.format(Number(v))}
            style={{ fill: "#374151", fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
