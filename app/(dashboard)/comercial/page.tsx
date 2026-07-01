import { PagePlaceholder } from "@/components/dashboard/page-placeholder";

export default function ComercialPage() {
  return (
    <PagePlaceholder
      title="Comercial"
      description="Indicadores de vendas e rentabilidade comercial da operação de freight forwarding."
      points={[
        "Receita e lucro por cliente",
        "Lucro por vendedor / equipe",
        "Comparação cotado × estimado × real (3 estágios)",
        "Ticket médio por processo",
        "Evolução de vendas por período",
        "Ranking de clientes e concentração",
      ]}
    />
  );
}
