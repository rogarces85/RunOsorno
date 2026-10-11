"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { colorForIndex } from "./chartColors";

type TypeDistributionChartProps = {
  distribution: Record<string, number>;
};

export function TypeDistributionChart({
  distribution,
}: TypeDistributionChartProps) {
  const data = Object.entries(distribution)
    .filter(([, percent]) => percent > 0)
    .map(([name, value]) => ({ name, value }));
  if (data.length === 0) {
    return (
      <div className="text-secondary text-center py-4">
        Sin sesiones con tipo en el periodo.
      </div>
    );
  }
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colorForIndex(index)} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
