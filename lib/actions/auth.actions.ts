"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { dashboardPath } from "@/lib/auth/role";
import {
  clearSessionCookie,
  createSession,
  getSessionId,
  invalidateSession,
} from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authenticate } from "@/lib/services/auth.service";
import { pruneOldSessions } from "@/lib/services/profile.service";
import { loginSchema } from "@/lib/validations/auth.schemas";

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Revisa los datos del formulario" };
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return { error: "Email o contraseña incorrectos" };
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, result.user.id));

  // Recorta las sesiones viejas del usuario antes de crear la nueva, para
  // que la tabla `sessions` no crezca sin control.
  await pruneOldSessions(result.user.id);

  await createSession(result.user.id);
  redirect(dashboardPath(result.user.role));
}

export async function logout(): Promise<void> {
  const sessionId = await getSessionId();
  if (sessionId) {
    await invalidateSession(sessionId);
  }
  await clearSessionCookie();
  redirect("/login");
}
