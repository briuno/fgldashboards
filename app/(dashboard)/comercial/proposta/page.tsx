import { CircleDollarSign, FileText, Percent, TriangleAlert, Trophy } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Delta } from "@/components/dashboard/delta";
import { Segmented } from "@/components/dashboard/segmented";
import { EmptyState } from "@/components/dashboard/empty-state";
import { YoyTable, type YoyRow } from "@/components/dashboard/yoy-table";
import { CompareLine, type ComparePoint } from "@/components/charts/compare-line";
import { Donut } from "@/components/charts/donut";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MESES, MESES_CURTO, fmtMi, int, num, pct1, variacao } from "@/lib/format";
import {
  getPropostasMensal,
  getPropostasQuebra,
  getPropostasTotais,
  type PropostasMensal,
  type PropostasTotais,
  type QuebraRow,
} from "@/lib/queries/propostas";

const ANOS = [2022, 2023, 2024, 2025, 2026];

/**
 * Conversão = ganhas ÷ DECIDIDAS (ganhas + perdidas). As abertas ainda estão em
 * disputa — incluí-las afundaria a taxa do ano corrente — e as canceladas nunca
 * chegaram a ser disputadas.
 */
function conversao(t: { ganhas: number; perdidas: number } | undefined): number | null {
  if (!t) return null;
  const decididas = t.ganhas + t.perdidas;
  return decididas > 0 ? (t.ganhas / decididas) * 100 : null;
}

/** Soma do ano anterior restrita aos meses que já existem no ano corrente. */
function samePeriod(
  prev: PropostasMensal[],
  curr: PropostasMensal[],
  metric: (r: PropostasMensal) => number,
) {
  const meses = new Set(curr.map((r) => r.mes));
  return {
    prev: prev.filter((r) => meses.has(r.mes)).reduce((a, r) => a + metric(r), 0),
    curr: curr.reduce((a, r) => a + metric(r), 0),
  };
}

function QuebraTable({
  rows,
  rotulo,
  limite = 10,
  mostrarValor = true,
}: {
  rows: QuebraRow[];
  rotulo: string;
  limite?: number;
  mostrarValor?: boolean;
}) {
  if (rows.length === 0) return <EmptyState className="h-[240px]" />;
  return (
    <Table className="text-[13px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{rotulo}</TableHead>
          <TableHead className="text-right">Propostas</TableHead>
          <TableHead className="text-right">Ganhas</TableHead>
          <TableHead className="text-right">Conversão</TableHead>
          {mostrarValor && <TableHead className="text-right">Valor (R$)</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, limite).map((r) => {
          const decididas = r.ganhas + r.perdidas;
          const conv = decididas > 0 ? (r.ganhas / decididas) * 100 : null;
          return (
            <TableRow key={r.rotulo}>
              <TableCell className="max-w-[240px] truncate py-1.5" title={r.rotulo}>
                {r.rotulo}
              </TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">{num.format(r.propostas)}</TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">{num.format(r.ganhas)}</TableCell>
              <TableCell className="py-1.5 text-right tabular-nums">
                {conv !== null ? `${pct1.format(conv)}%` : "—"}
              </TableCell>
              {mostrarValor && (
                <TableCell className="py-1.5 text-right tabular-nums">{fmtMi(Number(r.total_sales))}</TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function PropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const sp = await searchParams;
  const ano = Number(sp.ano) || 2026;

  const [totais, mensal, porVendedor, porModalidade, porCliente, porStatus] = await Promise.all([
    getPropostasTotais(ano),
    getPropostasMensal(ano),
    getPropostasQuebra(ano, "vendedor"),
    getPropostasQuebra(ano, "modalidade"),
    getPropostasQuebra(ano, "cliente"),
    getPropostasQuebra(ano, "status"),
  ]);

  const curr = mensal.filter((m) => m.ano === ano).sort((a, b) => a.mes - b.mes);
  const prev = mensal.filter((m) => m.ano === ano - 1).sort((a, b) => a.mes - b.mes);
  const tCurr = totais.find((t) => t.ano === ano);
  const tPrev = totais.find((t) => t.ano === ano - 1);

  const spPropostas = samePeriod(prev, curr, (r) => r.propostas);
  const spGanhas = samePeriod(prev, curr, (r) => r.ganhas);
  const spPerdidas = samePeriod(prev, curr, (r) => r.perdidas);
  const spValor = samePeriod(prev, curr, (r) => Number(r.total_sales));
  const spProfitGanho = samePeriod(prev, curr, (r) => Number(r.profit_ganho));

  const convCurr = conversao(tCurr);
  const decididasPrev = spGanhas.prev + spPerdidas.prev;
  const convPrevSame = decididasPrev > 0 ? (spGanhas.prev / decididasPrev) * 100 : null;
  const convPp = convCurr !== null && convPrevSame !== null ? convCurr - convPrevSame : null;

  // Os campos monetários do Tier2 só começam em 2025/2026 — abaixo de 50% de cobertura
  // o valor é escondido; entre 50% e 95%, exibido com aviso.
  const cobValor = (t?: PropostasTotais) => (t && t.propostas > 0 ? t.com_valor / t.propostas : 0);
  const valorCurrPct = cobValor(tCurr);
  const valorPrevPct = cobValor(tPrev);
  const valorCurrOk = valorCurrPct >= 0.5;
  const valorPrevOk = valorPrevPct >= 0.5;
  const valorComparavel = valorCurrOk && valorPrevOk;

  const avisos: string[] = [];
  const parcial = (p: number) => `${(p * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
  if (!valorCurrOk) {
    avisos.push(
      tCurr && tCurr.com_valor === 0
        ? `o Tier2 não registrou valores em ${ano}`
        : `valores existem em só ${parcial(valorCurrPct)} das propostas de ${ano}`,
    );
  } else if (valorCurrPct < 0.95) {
    avisos.push(`valores cobrem ${parcial(valorCurrPct)} das propostas de ${ano} — subestimados`);
  }
  if (valorCurrOk && !valorPrevOk) avisos.push(`${ano - 1} sem valores — comparativo financeiro oculto`);

  const vsAnt = `vs ${ano - 1}`;

  const linha = (metric: (r: PropostasMensal) => number): ComparePoint[] => {
    const p = new Map(prev.map((r) => [r.mes, metric(r)]));
    const c = new Map(curr.map((r) => [r.mes, metric(r)]));
    return MESES_CURTO.map((label, i) => ({
      label,
      prev: p.get(i + 1) ?? null,
      curr: c.get(i + 1) ?? null,
    })).filter((r) => r.prev !== null || r.curr !== null);
  };

  // Tabela YoY: propostas criadas por mês
  const yoyPropostas: YoyRow[] = MESES.map((label, i) => {
    const p = prev.find((r) => r.mes === i + 1);
    const c = curr.find((r) => r.mes === i + 1);
    return { label, prev: p ? p.propostas : null, curr: c ? c.propostas : null };
  }).filter((r) => r.prev !== null || r.curr !== null);

  const donutModalidade = porModalidade
    .filter((m) => m.propostas > 0)
    .map((m) => ({ name: m.rotulo, value: m.propostas }));

  const semDados = !tCurr || tCurr.propostas === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
      <PageHeader
        title="Comercial · Propostas"
        description="Funil de cotações enviadas ao cliente — volume, valor e conversão"
      >
        <Segmented
          items={ANOS.map((a) => ({
            label: String(a),
            href: `/comercial/proposta?ano=${a}`,
            active: a === ano,
          }))}
        />
      </PageHeader>

      {semDados ? (
        <EmptyState
          className="h-[320px]"
          title={`Sem propostas em ${ano}`}
          description="Nenhuma cotação encontrada para o ano selecionado."
        />
      ) : (
        <>
          {avisos.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-[13px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-semibold">Cobertura de valores:</span> {avisos.join(" · ")}. O
                volume e a conversão seguem confiáveis; os indicadores em R$ aparecem como “—”.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={`Propostas ${ano}`}
              value={num.format(tCurr.propostas)}
              icon={FileText}
              accent="red"
              delta={{ value: variacao(spPropostas.prev, spPropostas.curr), suffix: vsAnt }}
            />
            <KpiCard
              title={`Ganhas ${ano}`}
              value={num.format(tCurr.ganhas)}
              icon={Trophy}
              accent="dark"
              delta={{ value: variacao(spGanhas.prev, spGanhas.curr), suffix: vsAnt }}
              hint={`${num.format(tCurr.abertas)} ainda em aberto`}
            />
            <KpiCard
              title="Taxa de conversão"
              value={convCurr !== null ? `${pct1.format(convCurr)}%` : "—"}
              icon={Percent}
              accent="red"
              delta={{ value: convPp, unit: "p.p.", suffix: vsAnt }}
            />
            <KpiCard
              title={`Valor proposto ${ano} (R$)`}
              value={valorCurrOk ? fmtMi(Number(tCurr.total_sales)) : "—"}
              icon={CircleDollarSign}
              accent="dark"
              delta={
                valorComparavel ? { value: variacao(spValor.prev, spValor.curr), suffix: vsAnt } : undefined
              }
              hint={valorCurrOk ? undefined : "não registrado no Tier2"}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Propostas criadas por mês — {ano} vs {ano - 1}
                </CardTitle>
                <CardDescription>Data-base: criação da proposta</CardDescription>
              </CardHeader>
              <CardContent>
                <CompareLine
                  data={linha((r) => r.propostas)}
                  prevName={String(ano - 1)}
                  currName={String(ano)}
                  showLabels
                  labelFormat="inteiro"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Situação {ano}</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                <Donut
                  data={porStatus.map((s) => ({ name: s.rotulo, value: s.propostas }))}
                  centerValue={num.format(tCurr.propostas)}
                  centerLabel="propostas"
                  legend="bottom"
                  size={170}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Valor proposto (R$) — {ano} vs {ano - 1}</CardTitle>
                <CardDescription>Soma de TotalSales das propostas criadas no mês</CardDescription>
              </CardHeader>
              <CardContent>
                {valorCurrOk ? (
                  <CompareLine
                    data={linha((r) => Number(r.total_sales)).map((p) => ({
                      ...p,
                      prev: valorPrevOk ? p.prev : null,
                    }))}
                    prevName={String(ano - 1)}
                    currName={String(ano)}
                  />
                ) : (
                  <EmptyState
                    className="h-[280px]"
                    title="Sem valores registrados"
                    description={`O Tier2 só passou a preencher o valor das propostas a partir de 2025. Em ${ano} o volume e a conversão continuam válidos.`}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Modalidades {ano}</CardTitle>
                <CardDescription>Participação em nº de propostas</CardDescription>
              </CardHeader>
              <CardContent>
                <Donut data={donutModalidade} legend="bottom" size={170} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Vendedores {ano}</CardTitle>
                <CardDescription>Volume, conversão e valor proposto</CardDescription>
              </CardHeader>
              <CardContent>
                <QuebraTable rows={porVendedor} rotulo="Vendedor" mostrarValor={valorCurrOk} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Clientes {ano}</CardTitle>
                <CardDescription>Top 10 por volume de propostas</CardDescription>
              </CardHeader>
              <CardContent>
                <QuebraTable rows={porCliente} rotulo="Cliente" mostrarValor={valorCurrOk} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Propostas por mês</CardTitle>
                <CardDescription>{ano - 1} × {ano} com variação</CardDescription>
              </CardHeader>
              <CardContent>
                <YoyTable
                  ano={ano}
                  rows={yoyPropostas}
                  fmt={(v) => int.format(v)}
                  totalPrev={tPrev?.propostas ?? null}
                  totalCurr={tCurr.propostas}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Propostas ganhas — valor e profit</CardTitle>
                <CardDescription>Somente as com status Won</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {valorCurrOk ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border p-3.5">
                        <p className="text-muted-foreground text-[10.5px] font-semibold tracking-wide uppercase">
                          Profit previsto ganho {ano}
                        </p>
                        <p className="text-lg leading-tight font-bold tabular-nums">
                          {fmtMi(Number(tCurr.profit_ganho))}
                        </p>
                        <Delta
                          value={valorComparavel ? variacao(spProfitGanho.prev, spProfitGanho.curr) : null}
                          suffix={vsAnt}
                          className="text-[11px]"
                        />
                      </div>
                      <div className="rounded-xl border p-3.5">
                        <p className="text-muted-foreground text-[10.5px] font-semibold tracking-wide uppercase">
                          Valor ganho {ano}
                        </p>
                        <p className="text-lg leading-tight font-bold tabular-nums">
                          {fmtMi(Number(tCurr.total_sales_ganhas))}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          de {fmtMi(Number(tCurr.total_sales))} propostos
                        </p>
                      </div>
                    </div>
                    <CompareLine
                      data={linha((r) => Number(r.profit_ganho)).map((p) => ({
                        ...p,
                        prev: valorPrevOk ? p.prev : null,
                      }))}
                      prevName={String(ano - 1)}
                      currName={String(ano)}
                      height={220}
                    />
                  </>
                ) : (
                  <EmptyState
                    className="h-[300px]"
                    title="Sem valores registrados"
                    description={`Valor e profit das propostas só existem no Tier2 a partir de 2025.`}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <p className="text-muted-foreground text-xs">
        Fonte: Tier2 · <span className="font-medium">ProposalProcessView</span> (cotações PROP-*) ·
        Data-base: criação da proposta · Conversão = ganhas ÷ propostas criadas · Valor =
        TotalSales · Profit previsto = ForecastNetProfit. Não confundir com a
        “ShipmentProfitProposalView”, que é a <span className="font-medium">provisão</span> de lucro
        do processo e alimenta o Financeiro.
      </p>
    </div>
  );
}
