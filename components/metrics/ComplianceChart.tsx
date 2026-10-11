"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

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
  const data = [
    { name: "Completadas", value: completed },
    { name: "Pendientes", value: Math.max(total - completed, 0) },
  ];
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
            <Cell fill="#37b24d" />
            <Cell fill="#e9ecef" />
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
