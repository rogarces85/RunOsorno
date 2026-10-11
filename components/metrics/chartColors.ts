export const CHART_COLORS = [
  "#206bc4",
  "#f59f00",
  "#37b24d",
  "#e03131",
  "#7048e8",
  "#1098ad",
  "#f76707",
  "#868e96",
];

export function colorForIndex(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function complianceBadgeClass(percent: number): string {
  if (percent >= 80) {
    return "badge bg-green-lt text-green";
  }
  if (percent >= 50) {
    return "badge bg-yellow-lt text-yellow";
  }
  return "badge bg-red-lt text-red";
}
