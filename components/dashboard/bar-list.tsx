import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <ul className="flex flex-col gap-2.5">
          {items.slice(0, maxItems).map((i) => (
            <li key={i.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate" title={i.label}>{i.label}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">{fmt.format(i.value)}</span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full rounded-full" style={{ width: `${(i.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-muted-foreground text-sm">Sem dados.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
