import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";

export type Agg = { label: string; value: number };

const num = new Intl.NumberFormat("pt-BR");
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function aggregate<T>(
  rows: T[],
  key: (r: T) => string | null,
  metric: (r: T) => number,
): Agg[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || "—";
    map.set(k, (map.get(k) ?? 0) + metric(r));
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function BarList({
  title,
  items,
  currency = false,
  max: maxItems = 10,
}: {
  title: string;
  items: Agg[];
  currency?: boolean;
  max?: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const fmt = currency ? brl : num;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState className="h-[160px]" />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.slice(0, maxItems).map((i, idx) => (
              <li key={i.label} className="group flex items-center gap-3">
                <span className="text-muted-foreground/70 w-4 shrink-0 text-right text-xs tabular-nums">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate" title={i.label}>{i.label}</span>
                    <span className="text-muted-foreground group-hover:text-foreground shrink-0 text-[13px] tabular-nums transition-colors">
                      {fmt.format(i.value)}
                    </span>
                  </div>
                  <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-chart-1 h-full rounded-full"
                      style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
