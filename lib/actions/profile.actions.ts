"use server";

import {
  ActionFailure,
  runAction,
  toFieldErrors,
  type ActionResult,
} from "@/lib/actions/base";
import { requireAuth } from "@/lib/auth/guards";
import { getSessionId } from "@/lib/auth/session";
import { changePassword, updateProfile } from "@/lib/services/profile.service";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/validations/auth.schemas";

/**
 * Server Actions del perfil (Fase 37).
 *
 * `changePasswordAction` necesita el id de la sesión actual para conservar
 * esa y revocar el resto, por eso usa `requireAuth` en vez de `runAction`
 * (que no expone el id de sesión al handler).
 */

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult<{ revokedSessions: number }>> {
  const { user } = await requireAuth();

  const sessionId = await getSessionId();
  if (!sessionId) {
    return { ok: false, error: "Sesión no válida" };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Revisa los datos del formulario",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const result = await changePassword(user.id, sessionId, {
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  });

  // `ActionFailure` solo se convierte en `{ok:false}` dentro de
  // `runAction`. Como esta acción se escribe a mano (necesita el id de
  // sesión), hay que manejar el fallo aquí o el error sube como 500 y el
  // usuario ve la pantalla de error en vez del mensaje.
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data };
}

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: updateProfileSchema },
    input,
    async (data, user) => {
      const result = await updateProfile(user.id, { name: data.name });
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}
