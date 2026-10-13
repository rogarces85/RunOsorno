import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionAssignments, sessionRecords } from "@/lib/db/schema";
import { logAudit } from "./audit.service";
import { notifySessionRecorded } from "./notification.service";
import { getNumberSetting, getNotDoneReasons } from "./settings.service";
import type { ServiceResult } from "./template.service";

export type RecordSessionData = {
  assignmentId: string;
  distanceKm?: number;
  durationMinutes?: number;
  rpe?: number;
  comments?: string;
  status: "completed" | "partial";
};

export type MarkNotDoneData = {
  assignmentId: string;
  /**
   * Identificador del motivo. Es un string (no un enum fijo) porque el admin
   * puede configurar la lista desde la interfaz (Fase 34); la validación
   * contra la configuración ocurre en `markNotDone`.
   */
  reason: string;
  customReason?: string;
};

export type SessionRecordRow = {
  id: string;
  assignmentId: string;
  distanceKm: string | null;
  durationMinutes: number | null;
  rpe: number | null;
  comments: string | null;
  notDoneReason: string | null;
  customReason: string | null;
  recordedAt: Date;
  updatedAt: Date;
};

export type RecordResult = { id: string; status: string };

const NOT_FOUND = "Sesión no encontrada";
const NOT_ALLOWED = "No puedes registrar esta sesión";
const FUTURE = "No puedes registrar sesiones de días futuros";
const EXPIRED = "La ventana de edición ha expirado";

function localTodayISO(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toDecimal(value: number | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  return String(Math.round(value * 100) / 100);
}

type EditableData = {
  assignmentId: string;
  recordId: string | null;
};

async function assertEditable(
  assignmentId: string,
  athleteId: string,
): Promise<ServiceResult<EditableData>> {
  const [assignment] = await db
    .select()
    .from(sessionAssignments)
    .where(eq(sessionAssignments.id, assignmentId))
    .limit(1);
  if (!assignment) {
    return { ok: false, error: NOT_FOUND };
  }
  if (assignment.athleteId !== athleteId) {
    return { ok: false, error: NOT_ALLOWED };
  }

  const sessionISO = assignment.sessionDate.toISOString().slice(0, 10);
  if (sessionISO > localTodayISO()) {
    return { ok: false, error: FUTURE };
  }

  const [record] = await db
    .select()
    .from(sessionRecords)
    .where(eq(sessionRecords.assignmentId, assignmentId))
    .limit(1);
  if (record) {
    const windowHours = await getNumberSetting("edit_window_hours", 48);
    const deadline =
      new Date(record.recordedAt).getTime() + windowHours * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      return { ok: false, error: EXPIRED };
    }
    return { ok: true, data: { assignmentId, recordId: record.id } };
  }
  return { ok: true, data: { assignmentId, recordId: null } };
}

export async function canEditRecord(
  assignmentId: string,
  userId: string,
): Promise<boolean> {
  return (await assertEditable(assignmentId, userId)).ok;
}

export async function getRecord(
  assignmentId: string,
): Promise<SessionRecordRow | null> {
  const [record] = await db
    .select()
    .from(sessionRecords)
    .where(eq(sessionRecords.assignmentId, assignmentId))
    .limit(1);
  return record ?? null;
}

export async function recordSession(
  input: RecordSessionData,
  athleteId: string,
): Promise<ServiceResult<RecordResult>> {
  const editable = await assertEditable(input.assignmentId, athleteId);
  if (!editable.ok) {
    return editable;
  }

  const values = {
    distanceKm: toDecimal(input.distanceKm),
    durationMinutes: input.durationMinutes ?? null,
    rpe: input.rpe ?? null,
    comments: input.comments ?? null,
    updatedAt: new Date(),
  };
  let recordId = editable.data.recordId;
  if (recordId) {
    await db
      .update(sessionRecords)
      .set({ ...values, notDoneReason: null, customReason: null })
      .where(eq(sessionRecords.assignmentId, input.assignmentId));
  } else {
    recordId = crypto.randomUUID();
    await db.insert(sessionRecords).values({
      id: recordId,
      assignmentId: input.assignmentId,
      ...values,
      recordedAt: new Date(),
    });
  }

  await db
    .update(sessionAssignments)
    .set({ status: input.status })
    .where(eq(sessionAssignments.id, input.assignmentId));

  if (!editable.data.recordId) {
    await notifySessionRecorded({
      assignmentId: input.assignmentId,
      athleteId,
      kind: input.status,
      record: {
        distanceKm: input.distanceKm ?? null,
        durationMinutes: input.durationMinutes ?? null,
      },
    });
  }

  await logAudit({
    userId: athleteId,
    action: "session_recorded",
    entityType: "session_record",
    entityId: input.assignmentId,
    details: {
      status: input.status,
      distanceKm: input.distanceKm ?? null,
      durationMinutes: input.durationMinutes ?? null,
      rpe: input.rpe ?? null,
    },
  });

  return { ok: true, data: { id: recordId, status: input.status } };
}

export async function markNotDone(
  input: MarkNotDoneData,
  athleteId: string,
): Promise<ServiceResult<RecordResult>> {
  const editable = await assertEditable(input.assignmentId, athleteId);
  if (!editable.ok) {
    return editable;
  }

  // El motivo debe existir en la configuración actual (Fase 34): el admin
  // puede agregar o quitar motivos desde la interfaz de configuración.
  const validReasons = await getNotDoneReasons();
  if (!validReasons.some((reason) => reason.id === input.reason)) {
    return {
      ok: false,
      error: "El motivo seleccionado no es válido",
    };
  }

  const values = {
    notDoneReason: input.reason,
    customReason: input.reason === "otro" ? input.customReason ?? null : null,
    distanceKm: null,
    durationMinutes: null,
    rpe: null,
    updatedAt: new Date(),
  };
  let recordId = editable.data.recordId;
  if (recordId) {
    await db
      .update(sessionRecords)
      .set(values)
      .where(eq(sessionRecords.assignmentId, input.assignmentId));
  } else {
    recordId = crypto.randomUUID();
    await db.insert(sessionRecords).values({
      id: recordId,
      assignmentId: input.assignmentId,
      ...values,
      comments: null,
      recordedAt: new Date(),
    });
  }

  await db
    .update(sessionAssignments)
    .set({ status: "not_done" })
    .where(eq(sessionAssignments.id, input.assignmentId));

  if (!editable.data.recordId) {
    await notifySessionRecorded({
      assignmentId: input.assignmentId,
      athleteId,
      kind: "not_done",
    });
  }

  await logAudit({
    userId: athleteId,
    action: "session_recorded",
    entityType: "session_record",
    entityId: input.assignmentId,
    details: {
      status: "not_done",
      reason: input.reason,
      customReason: input.customReason ?? null,
    },
  });

  return { ok: true, data: { id: recordId, status: "not_done" } };
}
