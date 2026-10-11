"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "./chartColors";

type LoadChartProps = {
  points: { week: string; km: number; minutes: number }[];
};

export function LoadChart({ points }: LoadChartProps) {
  if (points.length === 0) {
    return (
      <div className="text-secondary text-center py-4">
        Sin carga registrada en el periodo.
      </div>
    );
  }
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={points}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis
            dataKey="week"
            tickFormatter={(value: string) => value.slice(5)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="km"
            allowDecimals={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis yAxisId="minutes" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar
            yAxisId="km"
            dataKey="km"
            name="Km"
            fill={CHART_COLORS[0]}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="minutes"
            dataKey="minutes"
            name="Minutos"
            stroke={CHART_COLORS[1]}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
