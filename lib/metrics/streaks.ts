import { shiftDaysISO, todayISO } from "@/lib/metrics/utils";

export type StreakItem = {
  date: string;
  status?: string | null;
};

export function calcStreak(
  records: StreakItem[],
  referenceDateISO: string = todayISO(),
): number {
  const completed = new Set(
    records
      .filter((record) => record.status === "completed")
      .map((record) => record.date),
  );

  let cursor: string;
  if (completed.has(referenceDateISO)) {
    cursor = referenceDateISO;
  } else if (completed.has(shiftDaysISO(referenceDateISO, -1))) {
    cursor = shiftDaysISO(referenceDateISO, -1);
  } else {
    return 0;
  }

  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = shiftDaysISO(cursor, -1);
  }
  return streak;
}
