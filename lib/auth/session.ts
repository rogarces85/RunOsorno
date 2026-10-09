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
