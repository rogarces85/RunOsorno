import { calcTRIMP, type HRProfile } from "@/lib/metrics/heart-rate";
import {
  parseKm,
  round2,
  shiftDaysISO,
} from "@/lib/metrics/utils";

export type LoadRecord = {
  date: string;
  distanceKm?: string | number | null;
  durationMinutes?: number | null;
  rpe?: number | null;
};

export type WeeklyLoad = {
  km: number;
  minutes: number;
  tss: number | null;
  trimp: number | null;
};

function recordsInWeek(records: LoadRecord[], weekStart: string): LoadRecord[] {
  const lastDay = shiftDaysISO(weekStart, 6);
  return records.filter(
    (record) => record.date >= weekStart && record.date <= lastDay,
  );
}

export function calcWeeklyLoad(
  records: LoadRecord[],
  weekStart: string,
  profile?: HRProfile,
): WeeklyLoad {
  const inWeek = recordsInWeek(records, weekStart);

  let km = 0;
  let minutes = 0;
  let tss = 0;
  let hasTssData = false;

  for (const record of inWeek) {
    km += parseKm(record.distanceKm);
    minutes += record.durationMinutes ?? 0;
    if (record.rpe && record.durationMinutes) {
      // TSS estimado por RPE: horas × (RPE × 10). 1h @ RPE 10 ≈ 100.
      tss += (record.durationMinutes / 60) * record.rpe * 10;
      hasTssData = true;
    }
  }

  return {
    km: round2(km),
    minutes,
    tss: hasTssData ? Math.round(tss) : null,
    trimp: profile ? calcTRIMP(inWeek, profile) : null,
  };
}
