import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sessionAssignments,
  sessionFeedback,
  users,
} from "@/lib/db/schema";
import { canPlanFor, type PermissionUser } from "@/lib/permissions";
import { whereSessionDateBetween } from "@/lib/services/plan.service";
import { notifyFeedbackCreated } from "@/lib/services/notification.service";
import type { ServiceResult } from "@/lib/services/template.service";

export type FeedbackMessage = {
  id: string;
  message: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
};

const NOT_FOUND = "Sesión no encontrada";
const NOT_ALLOWED = "No puedes comentar en esta sesión";

export async function addFeedback(
  input: { assignmentId: string; message: string },
  author: PermissionUser,
): Promise<ServiceResult<null>> {
  const [assignment] = await db
    .select({ id: sessionAssignments.id, athleteId: sessionAssignments.athleteId })
    .from(sessionAssignments)
    .where(eq(sessionAssignments.id, input.assignmentId))
    .limit(1);
  if (!assignment) {
    return { ok: false, error: NOT_FOUND };
  }

  const isOwnerAthlete =
    author.role === "athlete" && assignment.athleteId === author.id;
  const isCoach =
    author.role === "coach" &&
    (await canPlanFor(author, assignment.athleteId));
  const isAdmin = author.role === "admin";
  if (!isOwnerAthlete && !isCoach && !isAdmin) {
    return { ok: false, error: NOT_ALLOWED };
  }

  await db.insert(sessionFeedback).values({
    id: crypto.randomUUID(),
    assignmentId: assignment.id,
    authorId: author.id,
    message: input.message,
  });
  await notifyFeedbackCreated({
    assignmentId: assignment.id,
    authorId: author.id,
  });
  return { ok: true, data: null };
}

export async function getFeedback(
  assignmentId: string,
): Promise<FeedbackMessage[]> {
  const rows = await db
    .select({
      id: sessionFeedback.id,
      message: sessionFeedback.message,
      createdAt: sessionFeedback.createdAt,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(sessionFeedback)
    .innerJoin(users, eq(sessionFeedback.authorId, users.id))
    .where(eq(sessionFeedback.assignmentId, assignmentId))
    .orderBy(asc(sessionFeedback.createdAt));

  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    authorName: row.authorName,
    authorRole: row.authorRole,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getMonthFeedback(
  athleteId: string,
  year: number,
  month: number,
): Promise<Record<string, FeedbackMessage[]>> {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayNumber = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNumber).padStart(2, "0")}`;

  const assignmentRows = await db
    .select({ id: sessionAssignments.id })
    .from(sessionAssignments)
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        whereSessionDateBetween(firstDay, lastDay),
      ),
    );
  if (assignmentRows.length === 0) {
    return {};
  }
  const assignmentIds = assignmentRows.map((row) => row.id);

  const rows = await db
    .select({
      assignmentId: sessionFeedback.assignmentId,
      id: sessionFeedback.id,
      message: sessionFeedback.message,
      createdAt: sessionFeedback.createdAt,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(sessionFeedback)
    .innerJoin(users, eq(sessionFeedback.authorId, users.id))
    .where(inArray(sessionFeedback.assignmentId, assignmentIds))
    .orderBy(asc(sessionFeedback.createdAt));

  const byAssignment: Record<string, FeedbackMessage[]> = {};
  for (const row of rows) {
    const list = byAssignment[row.assignmentId] ?? [];
    list.push({
      id: row.id,
      message: row.message,
      authorName: row.authorName,
      authorRole: row.authorRole,
      createdAt: row.createdAt.toISOString(),
    });
    byAssignment[row.assignmentId] = list;
  }
  return byAssignment;
}
