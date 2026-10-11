import {
  daysBetweenISO,
  parseKm,
  round2,
  shiftDaysISO,
  todayISO,
} from "@/lib/metrics/utils";

export type AlertKind = "no_logging" | "load_drop" | "high_rpe";

export type AlertAthlete = {
  id: string;
  name: string;
};

export type AlertRecord = {
  athleteId: string;
  date: string;
  status?: string | null;
  rpe?: number | null;
  distanceKm?: string | number | null;
  durationMinutes?: number | null;
};

export type AlertSettings = {
  daysWithoutLogging?: number;
  loadDropPercent?: number;
  highRpeDays?: number;
  highRpe?: number;
};

export type AthleteAlert = {
  athleteId: string;
  athleteName: string;
  kind: AlertKind;
  message: string;
};

const DEFAULT_SETTINGS: Required<AlertSettings> = {
  daysWithoutLogging: 7,
  loadDropPercent: 40,
  highRpeDays: 3,
  highRpe: 8,
};

export function detectAlerts(
  athletes: AlertAthlete[],
  records: AlertRecord[],
  settings: AlertSettings = {},
  referenceDateISO: string = todayISO(),
): AthleteAlert[] {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const alerts: AthleteAlert[] = [];

  for (const athlete of athletes) {
    const own = records.filter((record) => record.athleteId === athlete.id);

    const lastDate = own.reduce<string | null>(
      (max, record) => (!max || record.date > max ? record.date : max),
      null,
    );
    const idleDays = lastDate
      ? daysBetweenISO(lastDate, referenceDateISO)
      : null;
    if (idleDays === null || idleDays > config.daysWithoutLogging) {
      alerts.push({
        athleteId: athlete.id,
        athleteName: athlete.name,
        kind: "no_logging",
        message:
          idleDays === null
            ? `${athlete.name} no tiene registros de sesiones.`
            : `${athlete.name} lleva ${idleDays} días sin registrar sesiones.`,
      });
    }

    const sumKm = (from: string, to: string) =>
      round2(
        own
          .filter((record) => record.date >= from && record.date <= to)
          .reduce((acc, record) => acc + parseKm(record.distanceKm), 0),
      );
    const currentKm = sumKm(
      shiftDaysISO(referenceDateISO, -6),
      referenceDateISO,
    );
    const previousKm = sumKm(
      shiftDaysISO(referenceDateISO, -13),
      shiftDaysISO(referenceDateISO, -7),
    );
    if (previousKm > 0) {
      const drop = ((previousKm - currentKm) / previousKm) * 100;
      if (drop >= config.loadDropPercent) {
        alerts.push({
          athleteId: athlete.id,
          athleteName: athlete.name,
          kind: "load_drop",
          message: `${athlete.name}: caída de carga del ${Math.round(drop)}% respecto a la semana anterior.`,
        });
      }
    }

    const highRpeDates = new Set(
      own
        .filter(
          (record) =>
            record.status === "completed" && (record.rpe ?? 0) >= config.highRpe,
        )
        .map((record) => record.date),
    );
    let cursor = referenceDateISO;
    if (!highRpeDates.has(cursor)) {
      cursor = shiftDaysISO(cursor, -1);
    }
    let run = 0;
    while (highRpeDates.has(cursor)) {
      run += 1;
      cursor = shiftDaysISO(cursor, -1);
    }
    if (run >= config.highRpeDays) {
      alerts.push({
        athleteId: athlete.id,
        athleteName: athlete.name,
        kind: "high_rpe",
        message: `${athlete.name}: RPE alto sostenido (${run} días seguidos).`,
      });
    }
  }

  return alerts;
}
