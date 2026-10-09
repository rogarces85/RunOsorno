import { z } from "zod";
import { requireAuth } from "@/lib/auth/guards";
import type { Role } from "@/lib/auth/role";
import type { PermissionUser } from "@/lib/permissions";

export type ActionError = { ok: false; error: string };

export type ActionResult<T = null> = { ok: true; data: T } | ActionError;

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error = "No autorizado"): ActionError => ({
  ok: false,
  error,
});

export const INVALID_INPUT = "Datos inválidos";

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
    return fail(INVALID_INPUT);
  }
  const data = await handler(parsed.data, {
    id: user.id,
    role: user.role,
  });
  return ok(data);
}
