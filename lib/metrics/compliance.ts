export type ComplianceItem = {
  status: string;
};

export type ComplianceResult = {
  percent: number;
  completed: number;
  total: number;
};

export function calcCompliance(items: ComplianceItem[]): ComplianceResult {
  const total = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { percent, completed, total };
}
