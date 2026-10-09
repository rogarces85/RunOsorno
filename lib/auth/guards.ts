import { redirect } from "next/navigation";
import { lucia } from "./index";
import { dashboardPath, type Role } from "./role";
import { getSessionId } from "./session";

export async function requireAuth() {
  const sessionId = await getSessionId();
  if (!sessionId) {
    redirect("/login");
  }
  const { session, user } = await lucia.validateSession(sessionId);
  if (!session || !user) {
    redirect("/login?expired=1");
  }
  return { session, user };
}

export async function requireRole(role: Role) {
  const { session, user } = await requireAuth();
  if (user.role !== role) {
    redirect(dashboardPath(user.role));
  }
  return { session, user };
}
