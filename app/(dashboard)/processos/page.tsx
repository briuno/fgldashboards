import { PagePlaceholder } from "@/components/dashboard/page-placeholder";

export default function ProcessosPage() {
  return (
    <PagePlaceholder
      title="Processos"
      description="Lista detalhada de processos/embarques com filtros e drill-down (tabela com ordenação e busca)."
      points={[
        "Tabela de processos com filtros",
        "Detalhe de receita, custo e lucro por processo",
        "Status e datas (abertura, ETD, ETA, conclusão)",
        "Cliente, vendedor, transportadora e rota",
        "Exportação para CSV",
        "Link para o processo no Tier2",
      ]}
    />
  );
}
