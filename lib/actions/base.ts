import { z } from "zod";
import { requireAuth } from "@/lib/auth/guards";
import type { Role } from "@/lib/auth/role";
import type { PermissionUser } from "@/lib/permissions";

/**
 * Errores de validación por campo (tarea 38.4). Se llenan cuando el fallo
 * viene del esquema Zod del Server Action, para que el formulario pueda
 * marcar el input responsable en lugar de mostrar un mensaje genérico.
 */
export type FieldErrors = Record<string, string>;

export type ActionError = {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T = null> = { ok: true; data: T } | ActionError;

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (
  error = "No autorizado",
  fieldErrors?: FieldErrors,
): ActionError => ({
  ok: false,
  error,
  ...(fieldErrors ? { fieldErrors } : {}),
});

export const INVALID_INPUT = "Datos inválidos";

/**
 * Convierte los issues de Zod en un mapa `campo → mensaje`. Solo se toma el
 * primer mensaje por campo: el formulario muestra uno bajo el input, y apilar
 * varios no aporta nada.
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
}

export class ActionFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionFailure";
  }
}

export async function runAction<S extends z.ZodType, T>(
  options: { schema: S; role?: Role },
  input: unknown,
  handler: (data: z.infer<S>, user: PermissionUser) => Promise<T>,
): Promise<ActionResult<T>> {
  const { user } = await requireAuth();
  if (options.role !== undefined && user.role !== options.role) {
    return fail();
  }
  const parsed = options.schema.safeParse(input);
  if (!parsed.success) {
    // Los mensajes de Zod son específicos y ya están en español, así que se
    // devuelven tal cual para poder mostrarlos bajo cada campo (tarea 38.4).
    return fail(INVALID_INPUT, toFieldErrors(parsed.error));
  }
  let data: T;
  try {
    data = await handler(parsed.data, {
      id: user.id,
      role: user.role,
    });
  } catch (error) {
    if (error instanceof ActionFailure) {
      return fail(error.message);
    }
    throw error;
  }
  return ok(data);
}
