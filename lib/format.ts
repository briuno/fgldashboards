/** Formatadores pt-BR compartilhados pelos dashboards (estilo Power BI/mockup FGL). */

export const num = new Intl.NumberFormat("pt-BR");
export const dec2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const pct1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const pct2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** "96,41 Mi" · "30,53 Mil" · "953" — notação dos cards do mockup. */
export function fmtMi(v: number, digits = 2): string {
  const abs = Math.abs(v);
  if (abs >= 1e6)
    return `${(v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} Mi`;
  if (abs >= 1e3)
    return `${(v / 1e3).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} Mil`;
  return int.format(v);
}

/** Compacto para eixos/rótulos de gráfico: "3 Mi", "500 Mil", "82". */
export function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Mi`;
  if (abs >= 1e3) return `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} Mil`;
  return int.format(v);
}

/** Variação percentual curr vs prev — null quando não comparável. */
export function variacao(prev: number | null | undefined, curr: number | null | undefined): number | null {
  if (prev == null || curr == null || prev === 0) return null;
  return (curr / prev - 1) * 100;
}

/** "+42,32%" / "-13,5%" com sinal explícito. */
export function fmtSigned(v: number, digits = 2): string {
  const f = v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return v > 0 ? `+${f}` : f;
}

/**
 * Nome curto de empresa (regra do Power BI / medida "Nome Cliente"):
 * 1ª palavra; se ela tiver menos de 6 letras, acrescenta a 2ª.
 * Ex.: "KORMAN INTERNATIONAL" → "KORMAN" (6 letras) · "Kope Logistics Inc" → "Kope Logistics".
 */
export function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const first = partes[0] ?? "";
  const second = partes[1] ?? "";
  return first.length < 6 && second ? `${first} ${second}` : first;
}

/** Tempo relativo curto em pt-BR: "agora", "há 12 min", "há 3 h", "há 2 d". */
export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

/** Data + hora curtas: "03/07 14:32". */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
