import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  notifications,
  sessionAssignments,
  templates,
  users,
} from "@/lib/db/schema";
import { formatDateChile } from "@/lib/utils/date";

function formatSessionDay(date: Date): string {
  const iso = date.toISOString().slice(0, 10);
  return formatDateChile(new Date(`${iso}T12:00:00`));
}

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

export async function notify(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  } catch (error) {
    console.error("[notification] falló al crear notificación:", error);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return row.value;
}

export async function getNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {},
): Promise<NotificationItem[]> {
  const conditions = [eq(notifications.userId, userId)];
  if (options.unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      isRead: notifications.isRead,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(options.limit ?? 20);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function markAsRead(id: string, userId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1);
  if (!existing) {
    return false;
  }
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return true;
}

export async function markAllAsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function notifySessionRecorded(params: {
  assignmentId: string;
  athleteId: string;
  kind: "completed" | "partial" | "not_done";
}): Promise<void> {
  const [row] = await db
    .select({
      createdBy: sessionAssignments.createdBy,
      sessionDate: sessionAssignments.sessionDate,
      templateName: templates.name,
      athleteName: users.name,
    })
    .from(sessionAssignments)
    .innerJoin(templates, eq(sessionAssignments.templateId, templates.id))
    .innerJoin(users, eq(sessionAssignments.athleteId, users.id))
    .where(eq(sessionAssignments.id, params.assignmentId))
    .limit(1);
  if (!row || !row.createdBy || row.createdBy === params.athleteId) {
    return;
  }

  const fecha = formatSessionDay(row.sessionDate);
  let message: string;
  if (params.kind === "completed") {
    message = `Tu atleta ${row.athleteName} completó "${row.templateName}" el ${fecha}.`;
  } else if (params.kind === "partial") {
    message = `Tu atleta ${row.athleteName} registró parcialmente "${row.templateName}" el ${fecha}.`;
  } else {
    message = `Tu atleta ${row.athleteName} marcó "${row.templateName}" como no realizada.`;
  }

  await notify({
    userId: row.createdBy,
    type: params.kind === "not_done" ? "session_not_done" : "session_completed",
    title:
      params.kind === "not_done"
        ? "Sesión no realizada"
        : "Sesión registrada",
    message,
    entityType: "session_assignment",
    entityId: params.assignmentId,
  });
}

export async function notifyFeedbackCreated(params: {
  assignmentId: string;
  authorId: string;
}): Promise<void> {
  const [row] = await db
    .select({
      athleteId: sessionAssignments.athleteId,
      createdBy: sessionAssignments.createdBy,
      sessionDate: sessionAssignments.sessionDate,
      authorName: users.name,
    })
    .from(sessionAssignments)
    .innerJoin(users, eq(sessionAssignments.athleteId, users.id))
    .where(eq(sessionAssignments.id, params.assignmentId))
    .limit(1);
  if (!row) {
    return;
  }

  const recipients = new Set<string>();
  if (params.authorId !== row.athleteId) {
    recipients.add(row.athleteId);
  }
  if (row.createdBy && params.authorId !== row.createdBy) {
    recipients.add(row.createdBy);
  }

  const fecha = formatSessionDay(row.sessionDate);
  for (const userId of recipients) {
    await notify({
      userId,
      type: "feedback_added",
      title: "Nuevo comentario",
      message: `${row.authorName} comentó en tu sesión del ${fecha}.`,
      entityType: "session_assignment",
      entityId: params.assignmentId,
    });
  }
}
