import { PagePlaceholder } from "@/components/dashboard/page-placeholder";

export default function OperacoesPage() {
  return (
    <PagePlaceholder
      title="Operações"
      description="Indicadores operacionais dos processos/embarques por modal, rota e transportadora."
      points={[
        "Processos por tipo de transporte (aéreo, marítimo FCL/LCL, rodoviário…)",
        "Processos por rota / trade lane",
        "Volume por transportadora / agente",
        "Prazo de trânsito e pontualidade (on-time)",
        "Processos abertos × concluídos",
        "Sazonalidade por período",
      ]}
    />
  );
}
