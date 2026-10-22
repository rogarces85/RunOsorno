import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";

/**
 * Rutas alcanzables sin sesión.
 *
 * Es una lista explícita y no un prefijo a propósito: un `startsWith("/")` mal escrito
 * abriría el sistema completo. Todo lo que no esté aquí sigue exigiendo sesión.
 */
const RUTAS_PUBLICAS = new Set(["/", "/login"]);

/**
 * Middleware (proxy) de RunOsorno.
 *
 * **Aquí no se toca la base de datos, a propósito.** Antes este middleware
 * validaba la sesión contra MySQL en cada petición, y eso costs:
 *
 *   - una conexión MySQL (handshake TLS included) por petición, que se
 *     sumaba a la que abre el render de la página: dos por request.
 *   - el bundle del middleware arrastraba `drizzle-orm` y `mysql2` al runtime
 *     de Node de Cloudflare (6,9 MB), que se parsea entero en cada arranque en
 *     frio. En el plan Free, con 10 ms de CPU por petición, ese arranque ya
 *     consume el presupuesto solo.
 *
 * Ahora el middleware solo mira si la cookie existe. La validación real está
 * donde ya se hacía de todas formas:
 *
 *   - Rutas de la app: `requireAuth()` en `app/(app)/layout.tsx`, que valida
 *     la sesión y redirige a `/login` (o a `/login?expired=1`) si no vale.
 *   - Rutas públicas: el layout público manda al tablero del rol si la sesión
 *     es válida.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const publica = RUTAS_PUBLICAS.has(pathname);

  if (!sessionId) {
    if (publica) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Con cookie de sesión se deja pasar: quien valida es el layout de la
  // destino (app o público), que ya sabe qué hacer con una sesión inválida.
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
};
