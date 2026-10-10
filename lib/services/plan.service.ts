import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sessionAssignments,
  sessionFeedback,
  sessionRecords,
  teamMembers,
  templates,
  type TemplateSection,
} from "@/lib/db/schema";
import { canPlanFor } from "@/lib/permissions";
import type { ServiceResult } from "@/lib/services/template.service";
import {
  getTemplateById,
  getTemplateVisibility,
  getTemplatesByCoach,
  parseStructure,
} from "@/lib/services/template.service";
import { logAudit } from "./audit.service";
import type { WeekPatternItem } from "@/lib/validations/plan.schemas";

export type PlanStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "partial"
  | "not_done";

export type PlanRecord = {
  id: string;
  distanceKm: string | null;
  durationMinutes: number | null;
  rpe: number | null;
  comments: string | null;
  notDoneReason: string | null;
  customReason: string | null;
};

export type PlanItem = {
  id: string;
  sessionDate: string;
  weekStart: string;
  status: PlanStatus;
  template: {
    id: string;
    name: string;
    sessionType: string;
    structure: TemplateSection[];
  } | null;
  record: PlanRecord | null;
};

export type AssignSessionResult = {
  assignmentId: string;
  needsConfirm: boolean;
};

const AUTH_PLAN_ERROR = "No puedes planificar sesiones para este atleta";

function dayISOToNoon(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function whereSessionDate(dateISO: string) {
  return sql`${sessionAssignments.sessionDate} = ${dateISO}`;
}

function whereWeekStart(weekStartISO: string) {
  return sql`${sessionAssignments.weekStart} = ${weekStartISO}`;
}

export function whereSessionDateBetween(firstISO: string, lastISO: string) {
  return sql`${sessionAssignments.sessionDate} >= ${firstISO} AND ${sessionAssignments.sessionDate} <= ${lastISO}`;
}

function weekStartOfISO(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday));
  return utc.toISOString().slice(0, 10);
}

function shiftDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function toISO(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function assertCanPlan(
  coachId: string,
  athleteId: string,
): Promise<string | null> {
  const allowed = await canPlanFor({ id: coachId, role: "coach" }, athleteId);
  return allowed ? null : AUTH_PLAN_ERROR;
}

async function assertTemplateVisible(
  coachId: string,
  templateId: string,
): Promise<string | null> {
  const template = await getTemplateById(templateId);
  if (!template) {
    return "Plantilla no encontrada";
  }
  const visibility = await getTemplateVisibility(template, {
    id: coachId,
    role: "coach",
  });
  return visibility.canView ? null : "No tienes acceso a esta plantilla";
}

async function findAssignmentOnDay(athleteId: string, dateISO: string) {
  const [existing] = await db
    .select()
    .from(sessionAssignments)
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereSessionDate(dateISO),
      ),
    )
    .limit(1);
  return existing;
}

async function deleteAssignmentCascade(assignmentId: string) {
  await db
    .delete(sessionRecords)
    .where(eq(sessionRecords.assignmentId, assignmentId));
  await db
    .delete(sessionFeedback)
    .where(eq(sessionFeedback.assignmentId, assignmentId));
  await db
    .delete(sessionAssignments)
    .where(eq(sessionAssignments.id, assignmentId));
}

async function insertAssignment(params: {
  athleteId: string;
  templateId: string;
  dateISO: string;
  weekStartISO: string;
  createdBy: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(sessionAssignments).values({
    id,
    athleteId: params.athleteId,
    templateId: params.templateId,
    sessionDate: dayISOToNoon(params.dateISO),
    weekStart: dayISOToNoon(params.weekStartISO),
    status: "planned",
    createdBy: params.createdBy,
  });
  return id;
}

export async function assignSession(
  athleteId: string,
  templateId: string,
  date: string,
  coachId: string,
): Promise<ServiceResult<AssignSessionResult>> {
  const planError = await assertCanPlan(coachId, athleteId);
  if (planError) {
    return { ok: false, error: planError };
  }
  const templateError = await assertTemplateVisible(coachId, templateId);
  if (templateError) {
    return { ok: false, error: templateError };
  }

  const existing = await findAssignmentOnDay(athleteId, date);
  if (existing) {
    return {
      ok: true,
      data: { assignmentId: existing.id, needsConfirm: true },
    };
  }

  const assignmentId = await insertAssignment({
    athleteId,
    templateId,
    dateISO: date,
    weekStartISO: weekStartOfISO(date),
    createdBy: coachId,
  });
  return { ok: true, data: { assignmentId, needsConfirm: false } };
}

export async function assignSessionReplace(
  athleteId: string,
  templateId: string,
  date: string,
  coachId: string,
): Promise<ServiceResult<AssignSessionResult>> {
  const planError = await assertCanPlan(coachId, athleteId);
  if (planError) {
    return { ok: false, error: planError };
  }
  const templateError = await assertTemplateVisible(coachId, templateId);
  if (templateError) {
    return { ok: false, error: templateError };
  }

  const existing = await findAssignmentOnDay(athleteId, date);
  if (existing) {
    await deleteAssignmentCascade(existing.id);
  }

  const assignmentId = await insertAssignment({
    athleteId,
    templateId,
    dateISO: date,
    weekStartISO: weekStartOfISO(date),
    createdBy: coachId,
  });
  return { ok: true, data: { assignmentId, needsConfirm: false } };
}

export async function bulkAssign(
  athleteIds: string[],
  templateId: string,
  date: string,
  coachId: string,
): Promise<ServiceResult<{ created: number; skipped: number }>> {
  if (athleteIds.length === 0) {
    return { ok: false, error: "Selecciona al menos un atleta." };
  }
  const templateError = await assertTemplateVisible(coachId, templateId);
  if (templateError) {
    return { ok: false, error: templateError };
  }
  for (const athleteId of athleteIds) {
    const planError = await assertCanPlan(coachId, athleteId);
    if (planError) {
      return { ok: false, error: planError };
    }
  }

  const weekStartISO = weekStartOfISO(date);
  let created = 0;
  let skipped = 0;
  for (const athleteId of athleteIds) {
    const existing = await findAssignmentOnDay(athleteId, date);
    if (existing) {
      skipped += 1;
      continue;
    }
    await insertAssignment({
      athleteId,
      templateId,
      dateISO: date,
      weekStartISO,
      createdBy: coachId,
    });
    created += 1;
  }

  if (created > 0) {
    await logAudit({
      userId: coachId,
      action: "bulk_assign",
      entityType: "session_assignment",
      details: { templateId, date, created, skipped },
    });
  }
  return { ok: true, data: { created, skipped } };
}

export async function removeAssignment(
  assignmentId: string,
  coachId: string,
): Promise<ServiceResult<null>> {
  const [assignment] = await db
    .select()
    .from(sessionAssignments)
    .where(eq(sessionAssignments.id, assignmentId))
    .limit(1);
  if (!assignment) {
    return { ok: false, error: "Asignación no encontrada" };
  }
  const planError = await assertCanPlan(coachId, assignment.athleteId);
  if (planError) {
    return { ok: false, error: planError };
  }

  await deleteAssignmentCascade(assignmentId);

  await logAudit({
    userId: coachId,
    action: "assignment_removed",
    entityType: "session_assignment",
    entityId: assignmentId,
    details: { athleteId: assignment.athleteId },
  });
  return { ok: true, data: null };
}

export async function copyPreviousWeek(
  athleteId: string,
  weekStart: string,
  coachId: string,
): Promise<ServiceResult<{ copied: number; skipped: number }>> {
  const planError = await assertCanPlan(coachId, athleteId);
  if (planError) {
    return { ok: false, error: planError };
  }

  const targetStart = weekStartOfISO(weekStart);
  const previousStart = shiftDaysISO(targetStart, -7);

  const previousRows = await db
    .select()
    .from(sessionAssignments)
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereWeekStart(previousStart),
      ),
    );
  if (previousRows.length === 0) {
    return { ok: false, error: "No hay semana anterior para copiar" };
  }

  const targetRows = await db
    .select({ sessionDate: sessionAssignments.sessionDate })
    .from(sessionAssignments)
    .where(
      and(eq(sessionAssignments.athleteId, athleteId), whereWeekStart(targetStart)),
    );
  const occupiedDates = new Set(targetRows.map((row) => toISO(row.sessionDate)));

  let copied = 0;
  let skipped = 0;
  for (const row of previousRows) {
    const newDate = shiftDaysISO(toISO(row.sessionDate), 7);
    if (occupiedDates.has(newDate)) {
      skipped += 1;
      continue;
    }
    await insertAssignment({
      athleteId,
      templateId: row.templateId,
      dateISO: newDate,
      weekStartISO: targetStart,
      createdBy: coachId,
    });
    occupiedDates.add(newDate);
    copied += 1;
  }

  await logAudit({
    userId: coachId,
    action: "week_copied",
    entityType: "session_assignment",
    details: { athleteId, weekStart: targetStart, copied, skipped },
  });
  return { ok: true, data: { copied, skipped } };
}

export async function generateWeek(
  athleteId: string,
  weekStart: string,
  pattern: WeekPatternItem[],
  coachId: string,
): Promise<ServiceResult<{ created: number }>> {
  const planError = await assertCanPlan(coachId, athleteId);
  if (planError) {
    return { ok: false, error: planError };
  }

  const visibleTemplates = await getTemplatesByCoach(coachId);
  const slots: string[] = [];
  for (const entry of pattern) {
    const byId = visibleTemplates.find((item) => item.id === entry.type);
    const byType = byId
      ? undefined
      : visibleTemplates.find(
          (item) =>
            item.sessionType.toLowerCase() === entry.type.toLowerCase(),
        );
    const match = byId ?? byType;
    if (!match) {
      return {
        ok: false,
        error: `No hay plantillas visibles del tipo "${entry.type}"`,
      };
    }
    for (let i = 0; i < entry.count; i += 1) {
      slots.push(match.id);
    }
  }

  const targetStart = weekStartOfISO(weekStart);
  if (slots.length > 7) {
    return { ok: false, error: "El patrón supera los 7 días de la semana" };
  }

  const targetRows = await db
    .select({ sessionDate: sessionAssignments.sessionDate })
    .from(sessionAssignments)
    .where(
      and(eq(sessionAssignments.athleteId, athleteId), whereWeekStart(targetStart)),
    );
  const occupiedDates = new Set(
    targetRows.map((row) => toISO(row.sessionDate)),
  );
  const freeDays: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const dayISO = shiftDaysISO(targetStart, offset);
    if (!occupiedDates.has(dayISO)) {
      freeDays.push(dayISO);
    }
  }
  if (freeDays.length < slots.length) {
    return {
      ok: false,
      error: `La semana tiene ${occupiedDates.size} día${occupiedDates.size === 1 ? "" : "s"} planificado${occupiedDates.size === 1 ? "" : "s"} y no hay días libres suficientes para el patrón`,
    };
  }

  for (let i = 0; i < slots.length; i += 1) {
    await insertAssignment({
      athleteId,
      templateId: slots[i],
      dateISO: freeDays[i],
      weekStartISO: targetStart,
      createdBy: coachId,
    });
  }

  await logAudit({
    userId: coachId,
    action: "week_generated",
    entityType: "session_assignment",
    details: { athleteId, weekStart: targetStart, created: slots.length },
  });
  return { ok: true, data: { created: slots.length } };
}

function toPlanItem(row: {
  id: string;
  sessionDate: Date;
  weekStart: Date;
  status: string;
  templateId: string | null;
  templateName: string | null;
  templateSessionType: string | null;
  templateStructure: TemplateSection[] | null;
  recordId: string | null;
  recordDistanceKm: string | null;
  recordDurationMinutes: number | null;
  recordRpe: number | null;
  recordComments: string | null;
  recordNotDoneReason: string | null;
  recordCustomReason: string | null;
}): PlanItem {
  return {
    id: row.id,
    sessionDate: toISO(row.sessionDate),
    weekStart: toISO(row.weekStart),
    status: row.status as PlanStatus,
    template:
      row.templateName && row.templateId
        ? {
            id: row.templateId,
            name: row.templateName,
            sessionType: row.templateSessionType ?? "",
            structure: parseStructure(row.templateStructure),
          }
        : null,
    record: row.recordId
      ? {
          id: row.recordId,
          distanceKm: row.recordDistanceKm,
          durationMinutes: row.recordDurationMinutes,
          rpe: row.recordRpe,
          comments: row.recordComments,
          notDoneReason: row.recordNotDoneReason,
          customReason: row.recordCustomReason,
        }
      : null,
  };
}

const planSelect = {
  id: sessionAssignments.id,
  sessionDate: sessionAssignments.sessionDate,
  weekStart: sessionAssignments.weekStart,
  status: sessionAssignments.status,
  templateId: templates.id,
  templateName: templates.name,
  templateSessionType: templates.sessionType,
  templateStructure: templates.structure,
  recordId: sessionRecords.id,
  recordDistanceKm: sessionRecords.distanceKm,
  recordDurationMinutes: sessionRecords.durationMinutes,
  recordRpe: sessionRecords.rpe,
  recordComments: sessionRecords.comments,
  recordNotDoneReason: sessionRecords.notDoneReason,
  recordCustomReason: sessionRecords.customReason,
};

export async function getWeekPlan(
  athleteId: string,
  weekStart: string,
): Promise<PlanItem[]> {
  const rows = await db
    .select(planSelect)
    .from(sessionAssignments)
    .leftJoin(templates, eq(sessionAssignments.templateId, templates.id))
    .leftJoin(sessionRecords, eq(sessionRecords.assignmentId, sessionAssignments.id))
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereWeekStart(weekStartOfISO(weekStart)),
      ),
    )
    .orderBy(asc(sessionAssignments.sessionDate));
  return rows.map(toPlanItem);
}

export async function getMonthPlan(
  athleteId: string,
  year: number,
  month: number,
): Promise<PlanItem[]> {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayNumber = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNumber).padStart(2, "0")}`;

  const rows = await db
    .select(planSelect)
    .from(sessionAssignments)
    .leftJoin(templates, eq(sessionAssignments.templateId, templates.id))
    .leftJoin(sessionRecords, eq(sessionRecords.assignmentId, sessionAssignments.id))
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereSessionDateBetween(firstDay, lastDay),
      ),
    )
    .orderBy(asc(sessionAssignments.sessionDate));
  return rows.map(toPlanItem);
}

export type DayCompliance = { done: number; total: number };

export async function getTeamMonthCompliance(
  teamId: string,
  year: number,
  month: number,
): Promise<Record<string, DayCompliance>> {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayNumber = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNumber).padStart(2, "0")}`;

  const rows = await db
    .select({
      sessionDate: sessionAssignments.sessionDate,
      status: sessionAssignments.status,
    })
    .from(sessionAssignments)
    .innerJoin(teamMembers, eq(teamMembers.athleteId, sessionAssignments.athleteId))
    .where(
      and(eq(teamMembers.teamId, teamId), whereSessionDateBetween(firstDay, lastDay)),
    );

  const byDate: Record<string, DayCompliance> = {};
  for (const row of rows) {
    const dateISO = toISO(row.sessionDate);
    const entry = byDate[dateISO] ?? { done: 0, total: 0 };
    entry.total += 1;
    if (row.status === "completed") {
      entry.done += 1;
    }
    byDate[dateISO] = entry;
  }
  return byDate;
}

export async function countWeekAssignments(
  athleteId: string,
  weekStart: string,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(sessionAssignments)
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereWeekStart(weekStartOfISO(weekStart)),
      ),
    );
  return row?.value ?? 0;
}
