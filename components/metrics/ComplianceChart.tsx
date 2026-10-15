import { DonutChart } from "./DonutChart";
import { formatPercent } from "@/lib/i18n/format";

const COMPLETED_COLOR = "#37b24d";
const PENDING_COLOR = "#dfe3e6";

type ComplianceChartProps = {
  completed: number;
  total: number;
};

export function ComplianceChart({ completed, total }: ComplianceChartProps) {
  if (total === 0) {
    return (
      <div className="text-secondary text-center py-4">
        Sin sesiones planificadas en el periodo.
      </div>
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