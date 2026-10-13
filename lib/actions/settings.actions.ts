"use server";

import { requireRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/services/audit.service";
import {
  updateBaseSessionTypes,
  updateEmail,
  updateLimits,
  updateNotDoneReasons,
} from "@/lib/services/settings.service";
import {
  updateBaseSessionTypesSchema,
  updateEmailSchema,
  updateLimitsSchema,
  updateNotDoneReasonsSchema,
} from "@/lib/validations/settings.schemas";
import { fail, ok, type ActionResult } from "@/lib/actions/base";

/**
 * Server Actions de configuración global (Fase 34).
 *
 * Todas exigen rol admin: `requireRole("admin")` lanza si el usuario no lo
 * es, y además se registra el cambio en `audit_logs`.
 */

export async function updateLimitsAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const { user } = await requireRole("admin");

  const parsed = updateLimitsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "Revisa los valores de los límites",
    );
  }

  const result = await updateLimits(parsed.data);
  if (!result.ok) {
    return fail(result.error);
  }

  await logAudit({
    userId: user.id,
    action: "settings_updated",
    entityType: "settings",
    entityId: "limits",
    details: parsed.data as Record<string, unknown>,
  });

  return ok(null);
}

export async function updateNotDoneReasonsAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const { user } = await requireRole("admin");

  const parsed = updateNotDoneReasonsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "Revisa la lista de motivos",
    );
  }

  const result = await updateNotDoneReasons(parsed.data.reasons);
  if (!result.ok) {
    return fail(result.error);
  }

  await logAudit({
    userId: user.id,
    action: "settings_updated",
    entityType: "settings",
    entityId: "not_done_reasons",
    details: { count: parsed.data.reasons.length },
  });

  return ok(null);
}

export async function updateBaseSessionTypesAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const { user } = await requireRole("admin");

  const parsed = updateBaseSessionTypesSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisa los tipos de sesión");
  }

  const result = await updateBaseSessionTypes(parsed.data.types);
  if (!result.ok) {
    return fail(result.error);
  }

  await logAudit({
    userId: user.id,
    action: "settings_updated",
    entityType: "settings",
    entityId: "base_session_types",
    details: { count: parsed.data.types.length },
  });

  return ok(null);
}

export async function updateEmailAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const { user } = await requireRole("admin");

  const parsed = updateEmailSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ??
        "El remitente debe tener el formato: Nombre <correo@dominio.cl>",
    );
  }

  const result = await updateEmail(parsed.data);
  if (!result.ok) {
    return fail(result.error);
  }

  await logAudit({
    userId: user.id,
    action: "settings_updated",
    entityType: "settings",
    entityId: "email",
    details: { emailFrom: parsed.data.emailFrom },
  });

  return ok(null);
}
