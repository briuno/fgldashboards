import { PagePlaceholder } from "@/components/dashboard/page-placeholder";

export default function FinanceiroPage() {
  return (
    <PagePlaceholder
      title="Financeiro"
      description="Contas a receber/pagar, fluxo de caixa e margem — com normalização multi-moeda."
      points={[
        "Contas a receber (AR) e a pagar (AP)",
        "Aging (0-30, 31-60, 61-90, 90+)",
        "Fluxo de caixa por mês (entradas × saídas)",
        "Inadimplência e DSO",
        "Margem / lucro por período",
        "Exposição por moeda (BRL/USD)",
      ]}
    />
  );
}
