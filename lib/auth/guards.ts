import { redirect } from "next/navigation";
import { lucia } from "./index";
import { dashboardPath, type Role } from "./role";
import { getSessionId, refrescarCookieDeSesion } from "./session";

export async function requireAuth() {
  const sessionId = await getSessionId();
  if (!sessionId) {
    redirect("/login");
  }
  const { session, user } = await lucia.validateSession(sessionId);
  if (!session || !user) {
    redirect("/login?expired=1");
  }
  // Lucia renueva la sesion y marca `fresh`: la cookie se reemite con la nueva
  // expiracion. Lo hacia el middleware; ahora lo hace quien valida.
  if (session.fresh) {
    await refrescarCookieDeSesion(session.id);
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
