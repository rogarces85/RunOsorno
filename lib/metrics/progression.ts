import type { LoadRecord } from "@/lib/metrics/load";
import {
  parseKm,
  round2,
  shiftDaysISO,
  todayISO,
  weekStartOfISO,
} from "@/lib/metrics/utils";

export type ProgressionPoint = {
  week: string;
  km: number;
  minutes: number;
};

export function calcProgression(
  records: LoadRecord[],
  numberOfWeeks: number,
  referenceDateISO: string = todayISO(),
): ProgressionPoint[] {
  const weeks = Math.max(1, Math.floor(numberOfWeeks));
  const currentWeek = weekStartOfISO(referenceDateISO);

  const points: ProgressionPoint[] = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const weekStart = shiftDaysISO(currentWeek, -7 * index);
    const weekEnd = shiftDaysISO(weekStart, 6);
    const inWeek = records.filter(
      (record) => record.date >= weekStart && record.date <= weekEnd,
    );
    let km = 0;
    let minutes = 0;
    for (const record of inWeek) {
      km += parseKm(record.distanceKm);
      minutes += record.durationMinutes ?? 0;
    }
    points.push({ week: weekStart, km: round2(km), minutes });
  }
  return points;
}
