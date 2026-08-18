"use client";

import * as React from "react";
import { ChevronRight, LoaderCircle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dec2, pct2 } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ProfitMapDetalhe,
  ProfitMapLinha,
  ProfitMapProcesso,
  ProfitMapTotais,
} from "@/lib/queries/profitmap";

// Matriz Payable × Receivable do Tier2, com a árvore do relatório de origem:
//   processo → cliente → item → parceiro
// O nível 1 chega pronto do servidor; os demais são buscados sob demanda ao expandir
// (o grão é item de fatura — um ano inteiro não cabe numa resposta só).

/** Data vem como 'YYYY-MM-DD' do Postgres. Formatar por string, e NÃO via new Date():
 *  'new Date("2025-03-05")' é lido como UTC e volta um dia atrás em fusos negativos. */
function fmtData(d: string | null): string {
  return d ? d.slice(0, 10).split("-").reverse().join("/") : "";
}

/** "USD -6.400,00" — só quando o grupo tem moeda única (senão a soma não existe). */
function fmtOriginal(moeda: string | null, valor: number): string {
  return moeda ? `${moeda} ${dec2.format(valor)}` : "";
}

/** Uma banda só é exibida quando o grupo tem lançamentos dela. */
function temBanda(l: ProfitMapLinha, lado: "pay" | "rec"): boolean {
  return lado === "pay"
    ? l.pay_brl !== 0 || l.pay_liquidado !== 0 || l.pay_moeda != null || l.pay_data_liq != null
    : l.rec_brl !== 0 || l.rec_liquidado !== 0 || l.rec_moeda != null || l.rec_data_liq != null;
}

type No = {
  chave: string;
  rotulo: string;
  nivel: 2 | 3 | 4;
  dados: ProfitMapLinha;
  filhos: No[];
};

function agrupar<T>(itens: T[], chave: (i: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const i of itens) {
    const k = chave(i);
    const atual = m.get(k);
    if (atual) atual.push(i);
    else m.set(k, [i]);
  }
  return m;
}

/** Agrega folhas num nó-pai, com a mesma regra do servidor: moeda e taxa só sobrevivem
 *  quando o grupo é homogêneo; data de liquidação é a mais recente. */
function agrega(linhas: ProfitMapLinha[]): ProfitMapLinha {
  const unico = <T,>(vals: (T | null)[]): T | null => {
    const s = new Set(vals.filter((v): v is T => v != null));
    return s.size === 1 ? [...s][0] : null;
  };
  const soma = (f: (l: ProfitMapLinha) => number) => linhas.reduce((a, l) => a + (f(l) || 0), 0);
  const ultimaData = (f: (l: ProfitMapLinha) => string | null) =>
    linhas
      .map(f)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

  const rec_brl = soma((l) => l.rec_brl);
  const total_brl = soma((l) => l.total_brl);
  return {
    // Somar "Valor Original" entre moedas diferentes não teria sentido — mas só é
    // exibido quando `*_moeda` sobrevive, ou seja, quando a moeda é única.
    pay_moeda: unico(linhas.map((l) => l.pay_moeda)),
    pay_valor_original: soma((l) => l.pay_valor_original),
    pay_taxa: unico(linhas.map((l) => l.pay_taxa)),
    pay_brl: soma((l) => l.pay_brl),
    pay_liquidado: soma((l) => l.pay_liquidado),
    pay_data_liq: ultimaData((l) => l.pay_data_liq),
    rec_moeda: unico(linhas.map((l) => l.rec_moeda)),
    rec_valor_original: soma((l) => l.rec_valor_original),
    rec_taxa: unico(linhas.map((l) => l.rec_taxa)),
    rec_brl,
    rec_liquidado: soma((l) => l.rec_liquidado),
    rec_data_liq: ultimaData((l) => l.rec_data_liq),
    total_brl,
    total_liquidado: soma((l) => l.total_liquidado),
    profit_pct: rec_brl === 0 ? null : (total_brl / rec_brl) * 100,
  };
}

function montarArvore(linhas: ProfitMapDetalhe[]): No[] {
  return [...agrupar(linhas, (r) => r.customer_name ?? "(sem cliente)")].map(
    ([cliente, doCliente]) => ({
      chave: `c:${cliente}`,
      rotulo: cliente,
      nivel: 2 as const,
      dados: agrega(doCliente),
      filhos: [...agrupar(doCliente, (r) => r.item_name)].map(([item, doItem]) => ({
        chave: `c:${cliente}|i:${item}`,
        rotulo: item,
        nivel: 3 as const,
        dados: agrega(doItem),
        // O nível de parceiro é sempre navegável: mesmo com um só, ele responde
        // "quem cobrou / quem pagou", que a linha do item não mostra.
        filhos: doItem.map((r) => ({
          chave: `c:${cliente}|i:${item}|p:${r.partner_name}`,
          rotulo: r.partner_name,
          nivel: 4 as const,
          dados: r,
          filhos: [],
        })),
      })),
    }),
  );
}

const NUM = "px-2 py-1.5 text-right whitespace-nowrap tabular-nums";
const GRUPO = "border-l";

/** Células de uma banda (Payable ou Receivable): 5 colunas do relatório. */
function CelulasBanda({ l, lado }: { l: ProfitMapLinha; lado: "pay" | "rec" }) {
  const vazio = !temBanda(l, lado);
  const moeda = lado === "pay" ? l.pay_moeda : l.rec_moeda;
  const original = lado === "pay" ? l.pay_valor_original : l.rec_valor_original;
  const taxa = lado === "pay" ? l.pay_taxa : l.rec_taxa;
  const brl = lado === "pay" ? l.pay_brl : l.rec_brl;
  const liq = lado === "pay" ? l.pay_liquidado : l.rec_liquidado;
  const data = lado === "pay" ? l.pay_data_liq : l.rec_data_liq;

  return (
    <>
      <TableCell className={cn(NUM, GRUPO)}>
        {vazio ? "" : fmtOriginal(moeda, original)}
      </TableCell>
      <TableCell className={NUM}>{vazio || taxa == null ? "" : dec2.format(taxa)}</TableCell>
      <TableCell className={NUM}>{vazio ? "" : dec2.format(brl)}</TableCell>
      <TableCell className={NUM}>{vazio ? "" : dec2.format(liq)}</TableCell>
      <TableCell className={cn(NUM, "text-muted-foreground")}>
        {vazio ? "" : fmtData(data)}
      </TableCell>
    </>
  );
}

function CelulasTotal({ l }: { l: ProfitMapLinha }) {
  return (
    <>
      <TableCell className={cn(NUM, GRUPO, "font-medium")}>{dec2.format(l.total_brl)}</TableCell>
      <TableCell className={NUM}>{dec2.format(l.total_liquidado)}</TableCell>
      <TableCell
        className={cn(NUM, "font-medium", l.profit_pct != null && l.profit_pct < 0 && "text-destructive")}
      >
        {l.profit_pct == null ? "" : `${pct2.format(l.profit_pct)}%`}
      </TableCell>
    </>
  );
}

/** Coluna-âncora: indenta pelo nível, com seta de expandir quando há filhos. */
function CelulaRotulo({
  rotulo,
  nivel,
  expansivel,
  aberto,
  carregando,
  onToggle,
}: {
  rotulo: string;
  nivel: 1 | 2 | 3 | 4;
  expansivel: boolean;
  aberto: boolean;
  carregando?: boolean;
  onToggle?: () => void;
}) {
  const conteudo = (
    <>
      {expansivel ? (
        carregando ? (
          <LoaderCircle className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <ChevronRight
            className={cn("size-3.5 shrink-0 transition-transform", aberto && "rotate-90")}
          />
        )
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <span className="truncate">{rotulo}</span>
    </>
  );

  return (
    <TableCell
      className={cn(
        // sticky: são 14 colunas, o rótulo precisa sobreviver ao scroll horizontal
        "bg-background sticky left-0 z-10 max-w-[22rem] min-w-[16rem] py-1.5 pr-3",
        nivel === 1 && "font-medium",
        nivel >= 3 && "text-muted-foreground",
      )}
      style={{ paddingLeft: `${(nivel - 1) * 1.15}rem` }}
    >
      {expansivel ? (
        <button
          type="button"
          onClick={onToggle}
          className="hover:text-foreground flex w-full items-center gap-1.5 text-left"
          aria-expanded={aberto}
        >
          {conteudo}
        </button>
      ) : (
        <span className="flex items-center gap-1.5">{conteudo}</span>
      )}
    </TableCell>
  );
}

function LinhaNo({
  no,
  abertos,
  onToggle,
}: {
  no: No;
  abertos: Set<string>;
  onToggle: (chave: string) => void;
}) {
  const aberto = abertos.has(no.chave);
  const expansivel = no.filhos.length > 0;
  return (
    <>
      <TableRow className={cn(no.nivel === 2 && "bg-muted/20")}>
        <CelulaRotulo
          rotulo={no.rotulo}
          nivel={no.nivel}
          expansivel={expansivel}
          aberto={aberto}
          onToggle={() => onToggle(no.chave)}
        />
        <CelulasBanda l={no.dados} lado="pay" />
        <CelulasBanda l={no.dados} lado="rec" />
        <CelulasTotal l={no.dados} />
      </TableRow>
      {aberto &&
        no.filhos.map((f) => (
          <LinhaNo key={f.chave} no={f} abertos={abertos} onToggle={onToggle} />
        ))}
    </>
  );
}

export function ProfitMapTable({
  processos,
  totais,
  carregarDetalhe,
}: {
  processos: ProfitMapProcesso[];
  totais: ProfitMapTotais | null;
  /** Server Function passada pela página — busca os níveis 2-4 de um processo. */
  carregarDetalhe: (processId: string) => Promise<ProfitMapDetalhe[]>;
}) {
  const [abertos, setAbertos] = React.useState<Set<string>>(new Set());
  const [detalhes, setDetalhes] = React.useState<Record<string, No[]>>({});
  const [carregando, setCarregando] = React.useState<Set<string>>(new Set());
  const [erros, setErros] = React.useState<Record<string, string>>({});

  const alterna = React.useCallback((chave: string) => {
    setAbertos((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  }, []);

  async function alternaProcesso(processId: string) {
    alterna(processId);
    if (detalhes[processId] || carregando.has(processId)) return;

    setCarregando((p) => new Set(p).add(processId));
    setErros((p) => {
      const proximo = { ...p };
      delete proximo[processId];
      return proximo;
    });
    try {
      const linhas = await carregarDetalhe(processId);
      setDetalhes((p) => ({ ...p, [processId]: montarArvore(linhas) }));
    } catch {
      // Sem isto a linha ficava aberta e vazia, como se o processo não tivesse custo.
      setErros((p) => ({ ...p, [processId]: "Não foi possível carregar o detalhe." }));
    } finally {
      setCarregando((p) => {
        const proximo = new Set(p);
        proximo.delete(processId);
        return proximo;
      });
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="bg-background sticky left-0 z-20" />
          <TableHead colSpan={5} className={cn("text-center", GRUPO)}>
            Payable
          </TableHead>
          <TableHead colSpan={5} className={cn("text-center", GRUPO)}>
            Receivable
          </TableHead>
          <TableHead colSpan={3} className={cn("text-center", GRUPO)}>
            Total
          </TableHead>
        </TableRow>
        <TableRow className="hover:bg-transparent">
          <TableHead className="bg-background sticky left-0 z-20 min-w-[16rem]">
            Processo Embarque
          </TableHead>
          {(["pay", "rec"] as const).map((lado) => (
            <React.Fragment key={lado}>
              <TableHead className={cn("text-right", GRUPO)}>Valor Original</TableHead>
              <TableHead className="text-right">Taxa</TableHead>
              <TableHead className="text-right">Valor BRL</TableHead>
              <TableHead className="text-right">Liquidado</TableHead>
              <TableHead className="text-right">Data Liquidação</TableHead>
            </React.Fragment>
          ))}
          <TableHead className={cn("text-right", GRUPO)}>Valor BRL</TableHead>
          <TableHead className="text-right">Liquidado</TableHead>
          <TableHead className="text-right">Profit%</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {processos.map((p) => {
          const aberto = abertos.has(p.process_id);
          return (
            <React.Fragment key={p.process_id}>
              <TableRow>
                <CelulaRotulo
                  rotulo={p.process_id}
                  nivel={1}
                  expansivel
                  aberto={aberto}
                  carregando={carregando.has(p.process_id)}
                  onToggle={() => void alternaProcesso(p.process_id)}
                />
                <CelulasBanda l={p} lado="pay" />
                <CelulasBanda l={p} lado="rec" />
                <CelulasTotal l={p} />
              </TableRow>
              {aberto && erros[p.process_id] && (
                <TableRow>
                  <TableCell colSpan={14} className="text-destructive py-2 pl-8 text-xs">
                    {erros[p.process_id]}
                  </TableCell>
                </TableRow>
              )}
              {aberto &&
                (detalhes[p.process_id] ?? []).map((no) => (
                  <LinhaNo key={no.chave} no={no} abertos={abertos} onToggle={alterna} />
                ))}
            </React.Fragment>
          );
        })}
      </TableBody>

      {totais && (
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell className="bg-muted sticky left-0 z-10 py-2 font-semibold">Total</TableCell>
            <TableCell className={cn(NUM, GRUPO)} colSpan={2} />
            <TableCell className={cn(NUM, "font-semibold")}>
              {dec2.format(totais.pay_brl)}
            </TableCell>
            <TableCell className={cn(NUM, "font-semibold")}>
              {dec2.format(totais.pay_liquidado)}
            </TableCell>
            <TableCell className={NUM} />
            <TableCell className={cn(NUM, GRUPO)} colSpan={2} />
            <TableCell className={cn(NUM, "font-semibold")}>
              {dec2.format(totais.rec_brl)}
            </TableCell>
            <TableCell className={cn(NUM, "font-semibold")}>
              {dec2.format(totais.rec_liquidado)}
            </TableCell>
            <TableCell className={NUM} />
            <TableCell className={cn(NUM, GRUPO, "font-semibold")}>
              {dec2.format(totais.total_brl)}
            </TableCell>
            <TableCell className={cn(NUM, "font-semibold")}>
              {dec2.format(totais.total_liquidado)}
            </TableCell>
            <TableCell className={cn(NUM, "font-semibold")}>
              {totais.profit_pct == null ? "" : `${pct2.format(totais.profit_pct)}%`}
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
