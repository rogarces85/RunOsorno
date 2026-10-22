import { NextResponse } from "next/server";
import { dashboardPath } from "@/lib/auth/role";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations/auth.schemas";
import { intentarLogin } from "@/lib/services/login.service";

/**
 * `POST /api/login`: el login de verdad, como formulario.
 *
 * Es la misma operación que la acción de servidor, pero como **ruta**: así el
 * formulario funciona aunque el JavaScript no haya cargado (o tarde en
 * cargar) y, sobre todo, sin que la contraseña llegue nunca a la URL.
 *
 * Responde con un 303 (no un 307) porque tras un POST el destino es siempre
 * un GET: con 307 el navegador reenviaría el POST al tablero.
 *
 * Vive en `app/api/` porque Next no admite un `route.ts` y un `page.tsx` en la
 * misma ruta (`/login` ya es la página).
 */
export async function POST(request: Request) {
  const formulario = await request.formData();
  const email = String(formulario.get("email") ?? "");
  const password = String(formulario.get("password") ?? "");

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return NextResponse.redirect(
      new URL("/login?error=formato", request.url),
      303,
    );
  }

  const resultado = await intentarLogin(parsed.data.email, parsed.data.password);

  if (!resultado.ok) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", resultado.error);
    if (resultado.minutos !== undefined) {
      url.searchParams.set("minutos", String(resultado.minutos));
    }
    return NextResponse.redirect(url, 303);
  }

  await createSession(resultado.user.id);
  return NextResponse.redirect(
    new URL(dashboardPath(resultado.user.role), request.url),
    303,
  );
}
