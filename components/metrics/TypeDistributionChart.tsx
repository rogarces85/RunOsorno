import { formatSessionType } from "@/lib/utils/format";
import { colorForIndex } from "./chartColors";
import { DonutChart } from "./DonutChart";

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
      <div className="text-secondary text-center py-4">
        Sin sesiones con tipo en el periodo.
      </div>
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
      centerLabel={`${top.value}%`}
      emptyMessage="Sin sesiones con tipo en el periodo."
      slices={slices}
      formatValue={(slice) => `${slice.value}%`}
    />
  );
}