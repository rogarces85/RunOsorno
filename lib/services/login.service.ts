import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "@/lib/services/auth.service";
import { pruneOldSessions } from "@/lib/services/profile.service";
import {
  limpiarIntentos,
  storeRateLimitDb,
} from "@/lib/services/rate-limit.service";
import { ipDeRequest, registrarIntento } from "@/lib/security/rate-limit";
import type { Role } from "@/lib/auth/role";

/**
 * Intento de inicio de sesión, sin efectos de respuesta.
 *
 * La lógica vive aquí para que la puedan usar las dos entradas del login:
 *
 *   - la **ruta** `POST /login` (lo que usa el formulario), que es la que
 *     funciona incluso sin JavaScript y la que permite reintentar cuando
 *     Cloudflare corta la petición por límite de CPU.
 *   - la **acción de servidor**, que es la vía que usa React cuando la página
 *     ya está hidratada.
 *
 * Antes de esto, el formulario no declaraba `action` ni `method`: si el
 * usuario pulsaba antes de que hidratara, el navegador hacía un GET nativo y
 * **la contraseña acababa en la URL** (y en los registros del servidor).
 */
export type LoginError = "formato" | "invalido" | "demasiados";

export type LoginResultado =
  | { ok: true; user: { id: string; role: Role } }
  | { ok: false; error: LoginError; minutos?: number };

export async function intentarLogin(
  email: string,
  password: string,
): Promise<LoginResultado> {
  // Se cuenta el intento antes de validar la contraseña, no después: si solo se
  // contara al fallar, un atacante que llegue al límite vería cómo se le
  // desbloquea la cuenta y podría dosificar el login para quedarse con la
  // última tentativa sin límite.
  const limite = await registrarIntento(storeRateLimitDb);
  if (!limite.ok) {
    return { ok: false, error: "demasiados", minutos: limite.minutos };
  }

  const result = await authenticate(email, password);
  if (!result.ok) {
    return { ok: false, error: "invalido" };
  }

  // Login correcto: se borran los intentos de esta IP para no castigar a
  // alguien que simplemente se equivocó varias veces.
  await limpiarIntentos(await ipDeRequest());
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, result.user.id));

  // Recorta las sesiones viejas del usuario antes de crear la nueva, para
  // que la tabla `sessions` no crezca sin control.
  await pruneOldSessions(result.user.id);

  return { ok: true, user: result.user };
}

/** Mensaje que ve el usuario, en los dos caminos del login. */
export function mensajeDeError(error: LoginError, minutos?: number): string {
  switch (error) {
    case "formato":
      return "Revisa los datos del formulario";
    case "demasiados":
      return `Demasiados intentos. Vuelve a probar en ${minutos ?? 1} minuto(s).`;
    case "invalido":
    default:
      return "Email o contraseña incorrectos";
  }
}
