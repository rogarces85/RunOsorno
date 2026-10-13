import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupRequests,
  groups,
  sessionAssignments,
  teams,
  teamMembers,
  templates,
  users,
} from "@/lib/db/schema";
import { todayISO } from "@/lib/metrics/utils";
import type { PlanStatus } from "./plan.service";

/**
 * Servicios de agregación para los dashboards por rol (Fase 30).
 * Consultas ligeras orientadas a "vista de hoy / resumen", sin reemplazar
 * los servicios de métricas (metric.service) que se usan para detalle.
 */

export type AdminStats = {
  coachesActive: number;
  coachesInactive: number;
  groupsCount: number;
  athletesCount: number;
  pendingRequests: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const [coaches, groupsCount, athletesCount, pendingRequests] =
    await Promise.all([
      db
        .select({ active: users.isActive, value: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "coach"))
        .groupBy(users.isActive),
      db.select({ value: sql<number>`count(*)` }).from(groups),
      db
        .select({ value: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "athlete")),
      db
        .select({ value: sql<number>`count(*)` })
        .from(groupRequests)
        .where(eq(groupRequests.status, "pending")),
    ]);

  return {
    coachesActive: coaches.find((row) => row.active)?.value ?? 0,
    coachesInactive: coaches.find((row) => !row.active)?.value ?? 0,
    groupsCount: groupsCount[0]?.value ?? 0,
    athletesCount: athletesCount[0]?.value ?? 0,
    pendingRequests: pendingRequests[0]?.value ?? 0,
  };
}

export type TeamTodaySession = {
  assignmentId: string;
  athleteId: string;
  athleteName: string;
  templateName: string | null;
  sessionType: string | null;
  status: PlanStatus;
};

/**
 * Sesiones planificadas para hoy en un team, con nombre del atleta.
 * Verifica que el team pertenezca al coach indicado.
 */
export async function getTeamTodaySessions(
  teamId: string,
  coachId: string,
): Promise<TeamTodaySession[]> {
  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.coachId, coachId)))
    .limit(1);
  if (!team) {
    return [];
  }

  const today = todayISO();
  const rows = await db
    .select({
      assignmentId: sessionAssignments.id,
      athleteId: sessionAssignments.athleteId,
      athleteName: users.name,
      templateName: templates.name,
      sessionType: templates.sessionType,
      status: sessionAssignments.status,
    })
    .from(sessionAssignments)
    .innerJoin(
      teamMembers,
      eq(teamMembers.athleteId, sessionAssignments.athleteId),
    )
    .innerJoin(users, eq(users.id, sessionAssignments.athleteId))
    .leftJoin(templates, eq(templates.id, sessionAssignments.templateId))
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        sql`${sessionAssignments.sessionDate} = ${today}`,
      ),
    )
    .orderBy(asc(users.name));

  return rows.map((row) => ({
    assignmentId: row.assignmentId,
    athleteId: row.athleteId,
    athleteName: row.athleteName,
    templateName: row.templateName,
    sessionType: row.sessionType,
    status: row.status as PlanStatus,
  }));
}

