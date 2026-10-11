"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "./chartColors";

type ProgressChartProps = {
  points: { week: string; km: number }[];
};

export function ProgressChart({ points }: ProgressChartProps) {
  if (points.length === 0) {
    return (
      <div className="text-secondary text-center py-4">
        Sin datos de progresión en el periodo.
      </div>
    );
  }
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="week"
            tickFormatter={(value: string) => value.slice(5)}
            tick={{ fontSize: 12 }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="km"
            name="Km"
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
