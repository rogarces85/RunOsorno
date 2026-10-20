import { formatSessionType } from "@/lib/utils/format";
import { colorForIndex } from "./chartColors";
import { DonutChart } from "./DonutChart";
import { formatPercent } from "@/lib/i18n/format";
import { EmptyState } from "@/components/ui/EmptyState";

type TypeDistributionChartProps = {
  distribution: Record<string, number>;
};

export function TypeDistributionChart({
  distribution,
}: TypeDistributionChartProps) {
  const entries = Object.entries(distribution)
    .filter(([, percent]) => percent > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Sin sesiones con tipo"
        description="No hay sesiones con tipo en el periodo seleccionado."
        compact
      />
    );
  }

  const slices = entries.map(([type, percent], index) => ({
    name: formatSessionType(type),
    value: percent,
    color: colorForIndex(index),
  }));
  const top = slices[0];

  return (
    <DonutChart
      centerLabel={formatPercent(top.value)}
      emptyMessage="Sin sesiones con tipo en el periodo."
      slices={slices}
      formatValue={(slice) => formatPercent(slice.value)}
    />
  );
}
