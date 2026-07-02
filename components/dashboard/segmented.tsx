import Link from "next/link";

import { cn } from "@/lib/utils";

export type SegmentedItem = { label: string; href: string; active: boolean };

/**
 * Controle segmentado por links (seleção de ano, semana etc.).
 * `scroll` habilita rolagem horizontal para muitas opções (ex.: semanas).
 */
export function Segmented({
  items,
  scroll = false,
  className,
}: {
  items: SegmentedItem[];
  scroll?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted inline-flex max-w-full items-center gap-0.5 rounded-lg p-0.5",
        scroll && "overflow-x-auto",
        className
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "inline-flex h-7 min-w-8 shrink-0 items-center justify-center rounded-md px-2.5 text-sm tabular-nums transition-colors",
            item.active
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
