import { NextResponse, type NextRequest } from "next/server";
import { lucia } from "@/lib/auth";
import { dashboardPath } from "@/lib/auth/role";

/**
 * Rutas alcanzables sin sesión.
 *
 * Es una lista explícita y no un prefijo a propósito: un `startsWith("/")` mal escrito
 * abriría el sistema completo. Todo lo que no esté aquí sigue exigiendo sesión.
 */
const RUTAS_PUBLICAS = new Set(["/", "/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionId = request.cookies.get(lucia.sessionCookieName)?.value;

  const { session, user } = sessionId
    ? await lucia.validateSession(sessionId)
    : { session: null, user: null };

  const publica = RUTAS_PUBLICAS.has(pathname);

  if (!session || !user) {
    if (publica) {
      return NextResponse.next();
    }
    const url = new URL("/login", request.url);
    if (sessionId) {
      url.searchParams.set("expired", "1");
    }
    const response = NextResponse.redirect(url);
    if (sessionId) {
      const blankCookie = lucia.createBlankSessionCookie();
      response.cookies.set(
        blankCookie.name,
        blankCookie.value,
        blankCookie.attributes,
      );
    }
    return response;
  }

  // Con sesión, la portada y el login llevan al tablero del rol.
  const response = publica
    ? NextResponse.redirect(new URL(dashboardPath(user.role), request.url))
    : NextResponse.next();

  if (session.fresh) {
    const cookie = lucia.createSessionCookie(session.id);
    response.cookies.set(cookie.name, cookie.value, cookie.attributes);
  }
  return response;
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
};
