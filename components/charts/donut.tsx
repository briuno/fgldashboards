"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { EmptyState } from "@/components/dashboard/empty-state";
import { cn } from "@/lib/utils";

export type DonutSlice = { name: string; value: number };

type DonutProps = {
  data: DonutSlice[];
  /** Texto central grande (ex.: total formatado). */
  centerValue?: string;
  /** Texto central pequeno (ex.: "Processos"). */
  centerLabel?: string;
  colors?: string[];
  size?: number;
  /** Legenda ao lado (right) ou abaixo (bottom). */
  legend?: "right" | "bottom";
  className?: string;
};

const valueFormatter = (v: number) => v.toLocaleString("pt-BR");

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-8)",
  "var(--chart-2)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

/** Donut com valor central e legenda com valores + participação — padrão do mockup. */
export function Donut({
  data,
  centerValue,
  centerLabel,
  colors = DEFAULT_COLORS,
  size = 190,
  legend = "right",
  className,
}: DonutProps) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (data.length === 0 || total === 0) {
    return <EmptyState className="h-[200px]" />;
  }
  return (
    <div
      className={cn(
        "flex items-center gap-5",
        legend === "bottom" && "flex-col items-stretch gap-3",
        className,
      )}
    >
      <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={size * 0.335}
            outerRadius={size * 0.475}
            paddingAngle={1.5}
            strokeWidth={0}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && (
            <span className="text-xl font-bold tracking-tight tabular-nums">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-muted-foreground text-[11px]">{centerLabel}</span>
          )}
        </div>
      </div>
      <ul className={cn("flex min-w-0 flex-1 flex-col gap-2", legend === "bottom" && "gap-1.5")}>
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: colors[i % colors.length] }}
              />
              <span className="truncate" title={d.name}>
                {d.name}
              </span>
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {valueFormatter(d.value)}{" "}
              <span className="opacity-75">({((d.value / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
