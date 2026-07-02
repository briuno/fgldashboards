import { Package, Users, Ship, TrendingUp, Anchor, Handshake } from "lucide-react";

import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { InsightCard } from "@/components/dashboard/insight-card";
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
const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
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

/** Variação "mesmo período": considera só os meses que têm dados no ano corrente. */
function samePeriodTrend(rows: MensalRow[], ano: number, campo: "processos" | "teu") {
  const mesesCur = new Set(rows.filter((r) => r.ano === ano).map((r) => r.mes));
  if (mesesCur.size === 0) return undefined;
  const somaCur = rows.filter((r) => r.ano === ano).reduce((a, r) => a + Number(r[campo]), 0);
  const somaPrev = rows
    .filter((r) => r.ano === ano - 1 && mesesCur.has(r.mes))
    .reduce((a, r) => a + Number(r[campo]), 0);
  if (somaPrev === 0) return undefined;
  const v = (somaCur / somaPrev - 1) * 100;
  return {
    label: `${v >= 0 ? "+" : ""}${pctFmt.format(v)}% vs mesmo período`,
    direction: (v > 0 ? "up" : v < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
    valor: v,
  };
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

  // Leituras derivadas dos dados carregados
  const trendProc = samePeriodTrend(mensal, ano, "processos");
  const trendTeu = samePeriodTrend(mensal, ano, "teu");
  const totalProc = Number(totais?.processos ?? 0);
  const topModal = modalidade[0];
  const shareModal = topModal && totalProc > 0 ? (Number(topModal.processos) / totalProc) * 100 : null;
  const topAgente = topAgentesGp2[0];
  const gp2Total = Number(totais?.gp2 ?? 0);
  const shareAgente = topAgente && gp2Total > 0 ? (Number(topAgente.gp2) / gp2Total) * 100 : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="Desempenho"
        description={`O ano está melhor ou pior que ${ano - 1} — e quem explica o resultado (data do processo)`}
      >
        <Segmented
          items={[2024, 2025, 2026].map((a) => ({
            label: String(a),
            href: `/desempenho?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      {/* 01 · Panorama do ano */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Processos ${ano}`}
          value={num.format(totalProc)}
          trend={trendProc}
          hint={trendProc ? undefined : "Sem cancelados/consolidações"}
          icon={Package}
        />
        <KpiCard title={`Clientes ${ano}`} value={num.format(totais?.clientes ?? 0)} hint="Distintos no ano" icon={Users} />
        <KpiCard
          title={`TEU's ${ano}`}
          value={num.format(totais?.teu ?? 0)}
          trend={trendTeu}
          hint={trendTeu ? undefined : "Contêineres"}
          icon={Ship}
        />
        <KpiCard title={`GP2 ${ano}`} value={brl.format(gp2Total)} hint="Lucro realizado (faturas)" icon={TrendingUp} />
      </div>

      {/* Leitura rápida */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trendProc && (
          <InsightCard
            kicker="Volume vs ano anterior"
            variant={trendProc.valor >= 0 ? "positive" : "negative"}
            title={`Processos ${trendProc.valor >= 0 ? "cresceram" : "caíram"} ${pctFmt.format(Math.abs(trendProc.valor))}%`}
            description={`Comparando os mesmos meses de ${ano} e ${ano - 1} (meses sem dados em ${ano} ficam de fora da conta).`}
          />
        )}
        {shareModal !== null && topModal && (
          <InsightCard
            kicker="Modalidade dominante"
            icon={Anchor}
            title={`${topModal.modalidade}: ${pctFmt.format(shareModal)}% da operação`}
            description={`${num.format(Number(topModal.processos))} de ${num.format(totalProc)} processos em ${ano}.`}
          />
        )}
        {shareAgente !== null && topAgente && (
          <InsightCard
            kicker="Parceiro-chave"
            icon={Handshake}
            title={`${shortName(topAgente.agent_name)} gera ${pctFmt.format(shareAgente)}% do GP2`}
            description={`${brlFull.format(Number(topAgente.gp2))} em lucro realizado, ticket médio de ${brlFull.format(Number(topAgente.ticket_medio))} por processo.`}
          />
        )}
      </div>

      {/* 02 · O que mudou */}
      <SectionHeader
        kicker="02 · O que mudou"
        title={`Comparativo mensal ${ano - 1} × ${ano}`}
        description="Evolução mês a mês de volume e contêineres, com variação percentual"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ComparativoMensal titulo={`Processos ${ano - 1} × ${ano}`} ano={ano} rows={mensal} campo="processos" />
        <ComparativoMensal titulo={`TEU's ${ano - 1} × ${ano}`} ano={ano} rows={mensal} campo="teu" />
        <BarList
          title={`Processos por Modalidade ${ano}`}
          items={modalidade.map((m) => ({ label: m.modalidade, value: Number(m.processos) }))}
        />
      </div>

      {/* 03 · Onde está o volume */}
      <SectionHeader
        kicker="03 · Onde está o volume"
        title="Principais clientes do ano"
        description="Quantidade de processos por cliente — concentração da carteira"
      />
      <BarList
        title="Principais Clientes por Quantidade de Processos"
        items={topClientes.map((c) => ({ label: c.customer_name, value: Number(c.processos) }))}
        max={18}
      />

      {/* 04 · Quem entrega */}
      <SectionHeader
        kicker="04 · Quem entrega"
        title="Painel de Agentes"
        description="Parceiros por volume e por lucro realizado (GP2) — e a disputa mês a mês entre os líderes"
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
          <CardDescription>Processos por mês em {ano} — passe o mouse para comparar os parceiros</CardDescription>
        </CardHeader>
        <CardContent>
          <MultiLine data={linhas} series={top3.map(shortName)} />
        </CardContent>
      </Card>
    </div>
  );
}
