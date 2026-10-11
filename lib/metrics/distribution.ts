export type DistributionItem = {
  sessionType: string;
};

export function calcTypeDistribution(
  items: DistributionItem[],
): Record<string, number> {
  const total = items.length;
  if (total === 0) {
    return {};
  }

  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.sessionType.trim() || "Sin tipo";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result: Record<string, number> = {};
  let assigned = 0;
  let topKey = "";
  let topCount = 0;
  for (const [key, count] of counts) {
    const percent = Math.round((count / total) * 100);
    result[key] = percent;
    assigned += percent;
    if (count > topCount) {
      topCount = count;
      topKey = key;
    }
  }

  if (assigned !== 100 && topKey) {
    result[topKey] += 100 - assigned;
  }
  return result;
}
