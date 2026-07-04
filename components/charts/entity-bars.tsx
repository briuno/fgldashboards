"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { EmptyState } from "@/components/dashboard/empty-state";
import { fmtCompact, nomeCurto } from "@/lib/format";

export type EntityBarPoint = { label: string; value: number };

type EntityBarsProps = {
  data: EntityBarPoint[];
  height?: number;
  color?: string;
  name?: string;
};

const valueFormatter = (v: number) => v.toLocaleString("pt-BR");

/** Tick com nome curto de empresa (regra do PBI: 1ª palavra; se < 6 letras, 1ª + 2ª). */
function NameTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  const curto = nomeCurto(String(payload?.value ?? ""));
  const label = curto.length > 16 ? curto.slice(0, 15) + "…" : curto;
  return (
    <text
      x={x}
      y={y}
      dy={8}
      textAnchor="end"
      transform={`rotate(-32 ${x} ${y})`}
      fill="var(--muted-foreground)"
      fontSize={9.5}
    >
      {label}
    </text>
  );
}

/** Barras verticais por entidade (cliente/agente) com valor no topo — padrão do mockup. */
export function EntityBars({
  data,
  height = 300,
  color = "var(--primary)",
  name = "Processos",
}: EntityBarsProps) {
  if (data.length === 0) {
    return <EmptyState className="h-[300px]" />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 24, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={0}
          height={56}
          tick={<NameTick />}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(v) => fmtCompact(Number(v))}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltip valueFormatter={valueFormatter} />}
        />
        <Bar dataKey="value" name={name} radius={[4, 4, 0, 0]} maxBarSize={44}>
          {data.map((d) => (
            <Cell key={d.label} fill={color} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => fmtCompact(Number(v))}
            style={{ fill: "var(--foreground)", fontSize: 10.5, fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
