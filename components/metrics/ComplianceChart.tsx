import { DonutChart } from "./DonutChart";
import { formatPercent } from "@/lib/i18n/format";
import { EmptyState } from "@/components/ui/EmptyState";

const COMPLETED_COLOR = "var(--app-chart-3)";
const PENDING_COLOR = "var(--app-surface-3)";

type ComplianceChartProps = {
  completed: number;
  total: number;
};

export function ComplianceChart({ completed, total }: ComplianceChartProps) {
  if (total === 0) {
    return (
      <EmptyState
        title="Sin sesiones planificadas"
        description="No hay sesiones planificadas en el periodo seleccionado."
        compact
      />
    );
  }
  const percent = Math.round((completed / total) * 100);
  const pending = Math.max(total - completed, 0);

  return (
    <DonutChart
      centerLabel={formatPercent(percent)}
      emptyMessage="Sin sesiones planificadas en el periodo."
      slices={[
        { name: "Completadas", value: completed, color: COMPLETED_COLOR },
        { name: "Pendientes", value: pending, color: PENDING_COLOR },
      ]}
      formatValue={(slice) => `${slice.value} de ${total}`}
    />
  );
}
