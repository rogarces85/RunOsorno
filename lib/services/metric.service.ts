import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  athleteProfiles,
  groupMembers,
  groups,
  sessionAssignments,
  sessionRecords,
  teamMembers,
  teams,
  templates,
  users,
} from "@/lib/db/schema";
import { detectAlerts, type AthleteAlert } from "@/lib/metrics/alerts";
import {
  calcCompliance,
  type ComplianceResult,
} from "@/lib/metrics/compliance";
import {
  calcHRZones,
  calcThresholdHr,
  type HRProfile,
  type HRZone,
} from "@/lib/metrics/heart-rate";
import {
  calcProgression,
  type ProgressionPoint,
} from "@/lib/metrics/progression";
import { calcStreak } from "@/lib/metrics/streaks";
import { calcTypeDistribution } from "@/lib/metrics/distribution";
import {
  calcWeeklyLoad,
  type LoadRecord,
  type WeeklyLoad,
} from "@/lib/metrics/load";
import { calcPlannedRpe } from "@/lib/metrics/rpe";
import { estimateVO2max } from "@/lib/metrics/vo2max";
import {
  daysBetweenISO,
  parseKm,
  round2,
  todayISO,
  weekStartOfISO,
} from "@/lib/metrics/utils";
import { whereSessionDateBetween } from "@/lib/services/plan.service";
import type { ServiceResult } from "@/lib/services/template.service";
import type { MetricsPeriod } from "@/lib/validations/metric.schemas";

export type MetricsRange = {
  from: string;
  to: string;
};

export type AthleteMetrics = {
  period: MetricsRange;
  totals: {
    sessions: number;
    completed: number;
    km: number;
    minutes: number;
  };
  compliance: ComplianceResult;
  weeklyLoad: WeeklyLoad;
  progression: ProgressionPoint[];
  distribution: Record<string, number>;
  avgRpe: number | null;
  plannedRpe: number | null;
  streak: number;
  vo2max: number | null;
  thresholdHr: number | null;
  hrZones: HRZone[] | null;
};

export type TeamAthleteMetrics = {
  athleteId: string;
  name: string;
  compliance: number;
  sessions: number;
  completed: number;
  km: number;
};

export type TeamMetrics = {
  period: MetricsRange;
  athletes: TeamAthleteMetrics[];
  buckets: {
    high: number;
    medium: number;
    low: number;
    withoutPlan: number;
  };
  averageLoadKm: number;
  alerts: AthleteAlert[];
};

export type GroupTeamMetrics = {
  teamId: string;
  teamName: string;
  coachId: string;
  coachName: string;
  compliance: number;
  sessions: number;
  completed: number;
  km: number;
  alerts: number;
};

export type GroupCoachMetrics = {
  coachId: string;
  coachName: string;
  teams: number;
  compliance: number;
  sessions: number;
  completed: number;
};

export type GroupMetrics = {
  period: MetricsRange;
  teams: GroupTeamMetrics[];
  coaches: GroupCoachMetrics[];
};

function toDayISO(value: Date): string {
  return value.toISOString().slice(0, 10);
}

// Temporada austral: 1 de agosto → 31 de julio (orientado a Chile).
export function getMetricsPeriod(period: MetricsPeriod): MetricsRange {
  if (period.kind === "custom") {
    return { from: period.from, to: period.to };
  }
  const today = todayISO();
  if (period.kind === "year") {
    const year = period.year ?? Number(today.slice(0, 4));
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  if (month >= 8) {
    return { from: `${year}-08-01`, to: `${year + 1}-07-31` };
  }
  return { from: `${year - 1}-08-01`, to: `${year}-07-31` };
}

type JoinedRow = {
  athleteId: string;
  status: string;
  sessionDate: Date;
  recordId: string | null;
  distanceKm: string | null;
  durationMinutes: number | null;
  rpe: number | null;
};

async function loadJoinedRows(
  athleteIds: string[],
): Promise<JoinedRow[]> {
  if (athleteIds.length === 0) {
    return [];
  }
  return db
    .select({
      athleteId: sessionAssignments.athleteId,
      status: sessionAssignments.status,
      sessionDate: sessionAssignments.sessionDate,
      recordId: sessionRecords.id,
      distanceKm: sessionRecords.distanceKm,
      durationMinutes: sessionRecords.durationMinutes,
      rpe: sessionRecords.rpe,
    })
    .from(sessionAssignments)
    .leftJoin(
      sessionRecords,
      eq(sessionRecords.assignmentId, sessionAssignments.id),
    )
    .where(inArray(sessionAssignments.athleteId, athleteIds));
}

function inRange(row: JoinedRow, range: MetricsRange): boolean {
  const iso = toDayISO(row.sessionDate);
  return iso >= range.from && iso <= range.to;
}

function toAlertRecords(rows: JoinedRow[]) {
  return rows
    .filter((row) => row.recordId !== null)
    .map((row) => ({
      athleteId: row.athleteId,
      date: toDayISO(row.sessionDate),
      status: row.status,
      rpe: row.rpe,
      distanceKm: row.distanceKm,
      durationMinutes: row.durationMinutes,
    }));
}

export async function getAthleteMetrics(
  athleteId: string,
  period: MetricsPeriod,
): Promise<ServiceResult<AthleteMetrics>> {
  const [athlete] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, athleteId), eq(users.role, "athlete")))
    .limit(1);
  if (!athlete) {
    return { ok: false, error: "Atleta no encontrado" };
  }

  const range = getMetricsPeriod(period);

  const rows = await db
    .select({
      status: sessionAssignments.status,
      sessionDate: sessionAssignments.sessionDate,
      sessionType: templates.sessionType,
      distanceKm: sessionRecords.distanceKm,
      durationMinutes: sessionRecords.durationMinutes,
      rpe: sessionRecords.rpe,
    })
    .from(sessionAssignments)
    .innerJoin(templates, eq(sessionAssignments.templateId, templates.id))
    .leftJoin(
      sessionRecords,
      eq(sessionRecords.assignmentId, sessionAssignments.id),
    )
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereSessionDateBetween(range.from, range.to),
      ),
    )
    .orderBy(asc(sessionAssignments.sessionDate));

  const [profile] = await db
    .select()
    .from(athleteProfiles)
    .where(eq(athleteProfiles.userId, athleteId))
    .limit(1);
  const hrProfile: HRProfile = {
    maxHr: profile?.maxHr ?? null,
    restingHr: profile?.restingHr ?? null,
  };

  const today = todayISO();
  const reference = range.to < today ? range.to : today;

  const compliance = calcCompliance(rows.map((row) => ({ status: row.status })));

  const records: LoadRecord[] = rows.map((row) => ({
    date: toDayISO(row.sessionDate),
    distanceKm: row.distanceKm,
    durationMinutes: row.durationMinutes,
    rpe: row.rpe,
  }));

  const weeklyLoad = calcWeeklyLoad(
    records,
    weekStartOfISO(reference),
    hrProfile,
  );

  const spanWeeks = Math.floor(daysBetweenISO(range.from, reference) / 7) + 1;
  const progression = calcProgression(
    records,
    Math.min(12, Math.max(1, spanWeeks)),
    reference,
  );

  const distribution = calcTypeDistribution(
    rows.map((row) => ({ sessionType: row.sessionType })),
  );

  const rpes = rows
    .map((row) => row.rpe)
    .filter((rpe): rpe is number => rpe !== null);
  const avgRpe =
    rpes.length > 0
      ? Math.round((rpes.reduce((sum, rpe) => sum + rpe, 0) / rpes.length) * 10) /
        10
      : null;

  const streak = calcStreak(
    rows.map((row) => ({ date: toDayISO(row.sessionDate), status: row.status })),
    reference,
  );

  const vo2max = estimateVO2max(records, hrProfile);
  const hrZones =
    hrProfile.maxHr && hrProfile.restingHr && hrProfile.maxHr > hrProfile.restingHr
      ? calcHRZones(hrProfile.maxHr, hrProfile.restingHr)
      : null;
  const thresholdHr =
    hrProfile.maxHr && hrProfile.restingHr
      ? calcThresholdHr(hrProfile.maxHr, hrProfile.restingHr)
      : null;
  const plannedRpe = calcPlannedRpe(rows.map((row) => row.sessionType));

  let km = 0;
  let minutes = 0;
  for (const record of records) {
    km += parseKm(record.distanceKm);
    minutes += record.durationMinutes ?? 0;
  }

  return {
    ok: true,
    data: {
      period: range,
      totals: {
        sessions: rows.length,
        completed: compliance.completed,
        km: round2(km),
        minutes,
      },
      compliance,
      weeklyLoad,
      progression,
      distribution,
      avgRpe,
      plannedRpe,
      streak,
      vo2max,
      thresholdHr,
      hrZones,
    },
  };
}

export async function getTeamMetrics(
  teamId: string,
  period: MetricsPeriod,
): Promise<ServiceResult<TeamMetrics>> {
  const range = getMetricsPeriod(period);

  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) {
    return { ok: false, error: "Team no encontrado" };
  }

  const members = await db
    .select({ athleteId: teamMembers.athleteId, name: users.name })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.athleteId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(users.name);
  if (members.length === 0) {
    return {
      ok: true,
      data: {
        period: range,
        athletes: [],
        buckets: { high: 0, medium: 0, low: 0, withoutPlan: 0 },
        averageLoadKm: 0,
        alerts: [],
      },
    };
  }

  const allRows = await loadJoinedRows(members.map((member) => member.athleteId));
  const periodRows = allRows.filter((row) => inRange(row, range));

  const athletes: TeamAthleteMetrics[] = members.map((member) => {
    const own = periodRows.filter((row) => row.athleteId === member.athleteId);
    const compliance = calcCompliance(own.map((row) => ({ status: row.status })));
    let km = 0;
    for (const row of own) {
      km += parseKm(row.distanceKm);
    }
    return {
      athleteId: member.athleteId,
      name: member.name,
      compliance: compliance.percent,
      sessions: compliance.total,
      completed: compliance.completed,
      km: round2(km),
    };
  });

  const buckets = { high: 0, medium: 0, low: 0, withoutPlan: 0 };
  for (const athlete of athletes) {
    if (athlete.sessions === 0) {
      buckets.withoutPlan += 1;
    } else if (athlete.compliance > 80) {
      buckets.high += 1;
    } else if (athlete.compliance >= 50) {
      buckets.medium += 1;
    } else {
      buckets.low += 1;
    }
  }

  const totalKm = athletes.reduce((sum, athlete) => sum + athlete.km, 0);
  const averageLoadKm = Math.round((totalKm / athletes.length) * 10) / 10;

  const alerts = detectAlerts(
    members.map((member) => ({ id: member.athleteId, name: member.name })),
    toAlertRecords(allRows),
  );

  return {
    ok: true,
    data: { period: range, athletes, buckets, averageLoadKm, alerts },
  };
}

export async function getGroupMetrics(
  groupId: string,
  period: MetricsPeriod,
): Promise<ServiceResult<GroupMetrics>> {
  const range = getMetricsPeriod(period);

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) {
    return { ok: false, error: "Grupo no encontrado" };
  }

  const teamRows = await db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      coachId: teams.coachId,
      coachName: users.name,
    })
    .from(teams)
    .innerJoin(users, eq(teams.coachId, users.id))
    .innerJoin(groupMembers, eq(groupMembers.userId, teams.coachId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(users.name, teams.name);
  if (teamRows.length === 0) {
    return { ok: true, data: { period: range, teams: [], coaches: [] } };
  }

  const teamIds = teamRows.map((row) => row.teamId);
  const athleteRows = await db
    .select({
      athleteId: teamMembers.athleteId,
      teamId: teamMembers.teamId,
      name: users.name,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.athleteId, users.id))
    .where(inArray(teamMembers.teamId, teamIds))
    .orderBy(users.name);

  const allRows = await loadJoinedRows(
    athleteRows.map((row) => row.athleteId),
  );
  const periodRows = allRows.filter((row) => inRange(row, range));
  const alertRecords = toAlertRecords(allRows);

  const teamsMetrics: GroupTeamMetrics[] = teamRows.map((teamRow) => {
    const athleteIds = new Set(
      athleteRows
        .filter((row) => row.teamId === teamRow.teamId)
        .map((row) => row.athleteId),
    );
    const own = periodRows.filter((row) => athleteIds.has(row.athleteId));
    const compliance = calcCompliance(own.map((row) => ({ status: row.status })));
    let km = 0;
    for (const row of own) {
      km += parseKm(row.distanceKm);
    }
    const alerts = detectAlerts(
      athleteRows
        .filter((row) => athleteIds.has(row.athleteId))
        .map((row) => ({ id: row.athleteId, name: row.name })),
      alertRecords.filter((record) => athleteIds.has(record.athleteId)),
    );
    return {
      teamId: teamRow.teamId,
      teamName: teamRow.teamName,
      coachId: teamRow.coachId,
      coachName: teamRow.coachName,
      compliance: compliance.percent,
      sessions: compliance.total,
      completed: compliance.completed,
      km: round2(km),
      alerts: alerts.length,
    };
  });

  const coachMap = new Map<
    string,
    { coachId: string; coachName: string; teams: number; sessions: number; completed: number }
  >();
  for (const teamMetric of teamsMetrics) {
    const entry = coachMap.get(teamMetric.coachId) ?? {
      coachId: teamMetric.coachId,
      coachName: teamMetric.coachName,
      teams: 0,
      sessions: 0,
      completed: 0,
    };
    entry.teams += 1;
    entry.sessions += teamMetric.sessions;
    entry.completed += teamMetric.completed;
    coachMap.set(teamMetric.coachId, entry);
  }
  const coaches: GroupCoachMetrics[] = [...coachMap.values()]
    .map((entry) => ({
      ...entry,
      compliance:
        entry.sessions > 0
          ? Math.round((entry.completed / entry.sessions) * 100)
          : 0,
    }))
    .sort((a, b) => a.coachName.localeCompare(b.coachName));

  return { ok: true, data: { period: range, teams: teamsMetrics, coaches } };
}
