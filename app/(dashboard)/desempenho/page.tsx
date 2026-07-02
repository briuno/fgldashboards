import { Package, Users, Ship, TrendingUp } from "lucide-react";

import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BarList } from "@/components/dashboard/bar-list";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MultiLine, type MultiLinePoint } from "@/components/charts/multi-line";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDesempenhoTotais,
  getDesempenhoMensal,
  getModalidade,
  getTopClientesAno,
  getAgentes,
  getAgenteMensal,
  type MensalRow,
} from "@/lib/queries/desempenho";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const num = new Intl.NumberFormat("pt-BR");
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1,
});
const brlFull = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function Variacao({ antes, depois }: { antes: number; depois: number }) {
  if (!antes || !depois) return <span className="text-muted-foreground">—</span>;
  const v = ((depois - antes) / antes) * 100;
  return (
    <span
      className={
        v < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
      }
    >
      {v > 0 ? "+" : ""}{pct.format(v)}%
    </span>
  );
}

function ComparativoMensal({
  titulo, ano, rows, campo,
}: {
  titulo: string; ano: number; rows: MensalRow[]; campo: "processos" | "teu";
}) {
  const prev = new Map(rows.filter((r) => r.ano === ano - 1).map((r) => [r.mes, Number(r[campo])]));
  const cur = new Map(rows.filter((r) => r.ano === ano).map((r) => [r.mes, Number(r[campo])]));
  const totPrev = [...prev.values()].reduce((a, b) => a + b, 0);
  const totCur = [...cur.values()].reduce((a, b) => a + b, 0);
  const linhas = MESES.map((nome, i) => ({ nome, m: i + 1, a: prev.get(i + 1), b: cur.get(i + 1) }))
    .filter((l) => l.a != null || l.b != null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {linhas.length === 0 ? (
          <EmptyState className="h-[160px]" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">{ano - 1}</TableHead>
                <TableHead className="text-right">{ano}</TableHead>
                <TableHead className="text-right">Variação %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ nome, m, a, b }) => (
                <TableRow key={m}>
                  <TableCell className="py-1.5">{nome}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">{a != null ? num.format(a) : "—"}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">{b != null ? num.format(b) : "—"}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">
                    <Variacao antes={a ?? 0} depois={b ?? 0} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{num.format(totPrev)}</TableCell>
                <TableCell className="text-right tabular-nums">{num.format(totCur)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <Variacao antes={totPrev} depois={totCur} />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;

  const [totais, mensal, modalidade, topClientes, agentes] = await Promise.all([
    getDesempenhoTotais(ano),
    getDesempenhoMensal(ano),
    getModalidade(ano),
    getTopClientesAno(ano, 18),
    getAgentes(ano),
  ]);

  const top3 = agentes.slice(0, 3).map((a) => a.agent_name);
  const agenteMensal = await getAgenteMensal(ano, top3);

  const shortName = (n: string) => (n.length > 22 ? n.slice(0, 22) + "…" : n);
  const linhas: MultiLinePoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const rows = agenteMensal.filter((r) => r.mes === m);
    if (rows.length === 0) continue;
    const point: MultiLinePoint = { label: MESES_CURTO[m - 1] };
    for (const a of top3) {
      point[shortName(a)] = rows.find((r) => r.agent_name === a)?.processos ?? 0;
    }
    linhas.push(point);
  }

  const topAgentesGp2 = [...agentes].sort((a, b) => Number(b.gp2) - Number(a.gp2)).slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="Desempenho"
        description="Performance de processos, financeiro e agentes — data-base: data do processo (ProcessDate)"
      >
        <Segmented
          items={[2024, 2025, 2026].map((a) => ({
            label: String(a),
            href: `/desempenho?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={`Processos ${ano}`} value={num.format(totais?.processos ?? 0)} hint="Sem cancelados/consolidações" icon={Package} />
        <KpiCard title={`Clientes ${ano}`} value={num.format(totais?.clientes ?? 0)} hint="Distintos no ano" icon={Users} />
        <KpiCard title={`TEU's ${ano}`} value={num.format(totais?.teu ?? 0)} hint="Contêineres" icon={Ship} />
        <KpiCard title={`GP2 ${ano}`} value={brl.format(Number(totais?.gp2 ?? 0))} hint="Lucro realizado (faturas)" icon={TrendingUp} />
      </div>

      <BarList
        title="Principais Clientes por Quantidade de Processos"
        items={topClientes.map((c) => ({ label: c.customer_name, value: Number(c.processos) }))}
        max={18}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ComparativoMensal titulo={`Processos ${ano - 1} × ${ano}`} ano={ano} rows={mensal} campo="processos" />
        <ComparativoMensal titulo={`TEU's ${ano - 1} × ${ano}`} ano={ano} rows={mensal} campo="teu" />
        <BarList title={`Processos por Modalidade ${ano}`} items={modalidade.map((m) => ({ label: m.modalidade, value: Number(m.processos) }))} />
      </div>

      <SectionHeader
        title="Painel de Agentes"
        description="Principais agentes por volume e lucro realizado (GP2)"
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <BarList
          title="Principais Agentes por Quantidade de Processos"
          items={agentes.slice(0, 15).map((a) => ({ label: a.agent_name, value: Number(a.processos) }))}
          max={15}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Agentes por GP2</CardTitle>
            <CardDescription>GP2 = lucro realizado · ticket médio por processo</CardDescription>
          </CardHeader>
          <CardContent>
            {topAgentesGp2.length === 0 ? (
              <EmptyState className="h-[200px]" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Agente</TableHead>
                    <TableHead className="text-right">Processos</TableHead>
                    <TableHead className="text-right">GP2</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAgentesGp2.map((a) => (
                    <TableRow key={a.agent_name}>
                      <TableCell className="max-w-[220px] truncate py-1.5" title={a.agent_name}>{a.agent_name}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{num.format(Number(a.processos))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{brlFull.format(Number(a.gp2))}</TableCell>
                      <TableCell className="py-1.5 text-right tabular-nums">{brlFull.format(Number(a.ticket_medio))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo mensal — 3 principais agentes</CardTitle>
          <CardDescription>Processos por mês ({ano})</CardDescription>
        </CardHeader>
        <CardContent>
          <MultiLine data={linhas} series={top3.map(shortName)} />
        </CardContent>
      </Card>
    </div>
  );
}
