"use server";

import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  getSessionId,
  invalidateSession,
} from "@/lib/auth/session";

/**
 * Cierre de sesión.
 *
 * El **inicio** de sesión no vive aquí: es la ruta `POST /login`
 * (`app/(auth)/login/route.ts`), que funciona también sin JavaScript, no
 * manda la contraseña en la URL y permite reintentar cuando Cloudflare corta
 * la petición por límite de CPU. La lógica compartida está en
 * `lib/services/login.service.ts`.
 */
export async function logout(): Promise<void> {
  const sessionId = await getSessionId();
  if (sessionId) {
    await invalidateSession(sessionId);
  }
  await clearSessionCookie();
  redirect("/login");
}
