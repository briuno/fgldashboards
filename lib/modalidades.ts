// Modalidades do Desempenho — mapa slug (URL) ↔ valor no banco ↔ rótulos.
// O valor `db` bate com mart.desempenho_base.modalidade.

export const MODALIDADES = [
  { slug: "impo-maritimo", db: "Ocean Import", label: "Importação Marítima", short: "Impo Marítimo" },
  { slug: "expo-maritimo", db: "Ocean Export", label: "Exportação Marítima", short: "Expo Marítimo" },
  { slug: "impo-aereo", db: "Air Import", label: "Importação Aérea", short: "Impo Aéreo" },
  { slug: "expo-aereo", db: "Air Export", label: "Exportação Aérea", short: "Expo Aéreo" },
  { slug: "rodoviario", db: "Others & Road", label: "Rodoviário / Outros", short: "Rodoviário" },
] as const;

export type Modalidade = (typeof MODALIDADES)[number];
export type ModalidadeSlug = Modalidade["slug"];

export function modalidadeBySlug(slug: string): Modalidade | undefined {
  return MODALIDADES.find((m) => m.slug === slug);
}
