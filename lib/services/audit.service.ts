import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { getClientIp } from "@/lib/utils/request";

/**
 * Registro de auditoría (Fase 35).
 *
 * La IP del cliente se resuelve aquí de forma automática cuando la llamada
 * no la pasa explícitamente. Antes solo `createCoach` la registraba, así que
 * el resto de acciones críticas quedaban sin IP.
 *
 * La resolución se hace con `headers()` de Next, que solo funciona dentro
 * de un request (Server Action o Route Handler). Si se llama fuera de ese
 * contexto la lectura falla y se registra `null` sin romper la acción: la
 * auditoría nunca debe tumbar la operación principal.
 */

export type AuditAction =
  | "coach_created"
  | "coach_updated"
  | "coach_deactivated"
  | "coach_reactivated"
  | "coach_deleted"
  | "password_reset"
  | "invitation_resent"
  | "group_created"
  | "group_updated"
  | "group_deleted"
  | "request_sent"
  | "request_approved"
  | "request_rejected"
  | "director_toggled"
  | "announcement_sent"
  | "team_created"
  | "team_updated"
  | "team_deleted"
  | "athlete_created"
  | "athlete_profile_updated"
  | "athlete_transferred"
  | "athlete_assigned"
  | "athlete_removed"
  | "template_created"
  | "template_updated"
  | "template_deleted"
  | "template_cloned"
  | "template_shared"
  | "template_unshared"
  | "official_template_created"
  | "official_template_updated"
  | "official_template_deleted"
  | "session_assigned"
  | "session_removed"
  | "session_recorded"
  | "week_copied"
  | "week_generated"
  | "email_failed"
  | "data_exported"
  | "settings_updated"
  | "avatars_cleaned"
  | (string & {});

async function resolveIp(explicit?: string | null): Promise<string | null> {
  if (explicit !== undefined) {
    return explicit;
  }
  try {
    return await getClientIp();
  } catch {
    // Fuera de un contexto de request (scripts, seeds, tests).
    return null;
  }
}

export async function logAudit(params: {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  /** Si se omite, se resuelve desde los headers del request. */
  ipAddress?: string | null;
}): Promise<void> {
  const ipAddress = await resolveIp(params.ipAddress);

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details,
    ipAddress,
  });
}
