import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionError, ActionResult } from "@/lib/actions/base";

/**
 * Marca los inputs con los errores de validación que devolvió el Server
 * Action (tarea 38.4). Devuelve `true` si al menos un campo quedó marcado,
 * para que el llamador decida si hace falta además un `Alert` con el mensaje
 * resumido.
 */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: ActionError["fieldErrors"],
): boolean {
  if (!fieldErrors) {
    return false;
  }
  let applied = false;
  for (const [field, message] of Object.entries(fieldErrors)) {
    if (field === "_root" || field === "root") {
      continue;
    }
    setError(field as Path<T>, { type: "server", message });
    applied = true;
  }
  return applied;
}

/** `true` si el Server Action devolvió un error de negocio (no de campo). */
export function isBusinessError<T>(
  result: ActionResult<T>,
): result is Extract<ActionResult<T>, { ok: false }> {
  return !result.ok && !result.fieldErrors;
}
