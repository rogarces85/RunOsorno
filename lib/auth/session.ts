import { cookies } from "next/headers";
import { lucia } from "./index";

export async function createSession(userId: string) {
  const session = await lucia.createSession(userId, {});
  const cookie = lucia.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.attributes);
  return session;
}

export async function validateSession(sessionId: string) {
  return lucia.validateSession(sessionId);
}

/**
 * Reemite la cookie de sesión cuando Lucia la renovó.
 *
 * Antes lo hacía el middleware (que corría en el runtime de Node) y por eso
 * arrastraba el cliente MySQL al bundle del middleware. Ahora lo hace quien
 * valida la sesión: el layout de la app o el layout público.
 */
export async function refrescarCookieDeSesion(sessionId: string) {
  const cookie = lucia.createSessionCookie(sessionId);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.attributes);
}

/**
 * Usuario de la petición, si hay una sesión válida.
 *
 * Devuelve `null` en vez de redirigir: lo usan las rutas públicas, que con
 * sesión mandan al tablero del rol pero sin ella se muestran tal cual.
 */
export async function usuarioSiHaySesion() {
  const sessionId = await getSessionId();
  if (!sessionId) return null;
  const { session, user } = await lucia.validateSession(sessionId);
  if (!session || !user) return null;
  if (session.fresh) await refrescarCookieDeSesion(session.id);
  return user;
}

export async function invalidateSession(sessionId: string) {
  await lucia.invalidateSession(sessionId);
}

export async function clearSessionCookie() {
  const cookie = lucia.createBlankSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.attributes);
}

export async function getSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get(lucia.sessionCookieName)?.value ?? null;
}
