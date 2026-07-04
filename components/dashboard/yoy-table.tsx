import { Delta } from "@/components/dashboard/delta";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { variacao } from "@/lib/format";

export type YoyRow = { label: string; prev: number | null; curr: number | null };

type YoyTableProps = {
  ano: number;
  rows: YoyRow[];
  fmt?: (v: number) => string;
  totalPrev?: number | null;
  totalCurr?: number | null;
  labelHeader?: string;
};

/** Tabela comparativa ano-1 × ano com variação % — padrão dos mockups. */
export function YoyTable({
  ano,
  rows,
  fmt = (v) => v.toLocaleString("pt-BR"),
  totalPrev,
  totalCurr,
  labelHeader = "Mês",
}: YoyTableProps) {
  if (rows.length === 0) {
    return <EmptyState className="h-[160px]" />;
  }
  const cell = (v: number | null) => (v !== null ? fmt(v) : "—");
  return (
    <Table className="text-[13px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{labelHeader}</TableHead>
          <TableHead className="text-right">{ano - 1}</TableHead>
          <TableHead className="text-right">{ano}</TableHead>
          <TableHead className="text-right">Variação %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.label}>
            <TableCell className="py-1.5">{r.label}</TableCell>
            <TableCell className="py-1.5 text-right tabular-nums">{cell(r.prev)}</TableCell>
            <TableCell className="py-1.5 text-right tabular-nums">{cell(r.curr)}</TableCell>
            <TableCell className="py-1.5 text-right">
              <Delta value={variacao(r.prev, r.curr)} className="text-[11px]" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {(totalPrev != null || totalCurr != null) && (
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell>Total</TableCell>
            <TableCell className="text-right tabular-nums">{cell(totalPrev ?? null)}</TableCell>
            <TableCell className="text-right tabular-nums">{cell(totalCurr ?? null)}</TableCell>
            <TableCell className="text-right">
              <Delta value={variacao(totalPrev, totalCurr)} className="text-[11px]" />
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
