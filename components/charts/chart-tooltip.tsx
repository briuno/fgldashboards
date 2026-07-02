"use client";

type Formatter = (v: number) => string;

type TooltipItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  valueFormatter?: Formatter;
};

/** Tooltip padrão dos gráficos: cartão compacto seguindo o tema. */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => v.toLocaleString("pt-BR"),
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      <ul className="flex flex-col gap-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: p.color ?? "var(--chart-1)" }}
              />
              <span className="text-muted-foreground max-w-[160px] truncate">{p.name}</span>
            </span>
            <span className="font-medium tabular-nums">
              {valueFormatter(Number(p.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
