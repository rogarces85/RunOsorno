"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "./chartColors";

type AthleteComplianceChartProps = {
  athletes: { name: string; compliance: number }[];
};

function shortName(name: string): string {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

export function AthleteComplianceChart({
  athletes,
}: AthleteComplianceChartProps) {
  if (athletes.length === 0) {
    return (
      <div className="text-secondary text-center py-4">
        Sin atletas con plan en el periodo.
      </div>
    );
  }
  const data = athletes.map((athlete) => ({
    ...athlete,
    label: shortName(athlete.name),
  }));
  return (
    <div style={{ height: Math.max(180, data.length * 44 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            unit="%"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Bar
            dataKey="compliance"
            name="Cumplimiento"
            fill={CHART_COLORS[0]}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
