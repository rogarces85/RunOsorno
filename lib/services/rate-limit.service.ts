import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";
import {
  inicioVentana,
  rateLimitKey,
  type RateLimitStore,
} from "@/lib/security/rate-limit";

/**
 * Persistencia del rate limiting del login (Fase 45, tarea 45.5).
 *
 * Suma un intento de forma atómica con `INSERT ... ON DUPLICATE KEY UPDATE`, en
 * vez de leer y luego escribir: si dos peticiones llegan a la vez, leer-contar-
 * escribir dejaría pasar un intento de más en cada carrera.
 */

const VIGENCIA_MS = 60 * 60 * 1000;

export const storeRateLimitDb: RateLimitStore = {
  async contar(ip: string, ahora: number): Promise<number> {
    const key = rateLimitKey(ip, ahora);
    const expira = new Date(ahora + VIGENCIA_MS);

    await db
      .insert(loginAttempts)
      .values({ key, ip, attempts: 1, expiresAt: expira })
      .onDuplicateKeyUpdate({
        set: {
          attempts: sql`${loginAttempts.attempts} + 1`,
          expiresAt: expira,
        },
      });

    const [fila] = await db
      .select({ attempts: loginAttempts.attempts })
      .from(loginAttempts)
      .where(
        and(eq(loginAttempts.key, key), gt(loginAttempts.expiresAt, new Date(ahora))),
      )
      .limit(1);

    return fila?.attempts ?? 1;
  },
};

/**
 * Borra los intentos de una IP al iniciar sesión correctamente.
 *
 * Sin esto, un usuario que se equivoca cinco veces de verdad queda bloqueado
 * aunque escriba bien su contraseña a continuación.
 */
export async function limpiarIntentos(ip: string, ahora = Date.now()): Promise<void> {
  const key = rateLimitKey(ip, ahora);
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}

/** Purga las ventanas ya vencidas. Se puede llamar sin crontask. */
export async function purgarIntentosVencidos(ahora = Date.now()): Promise<void> {
  await db.delete(loginAttempts).where(sql`${loginAttempts.expiresAt} <= ${new Date(ahora)}`);
}

/** Inicio de la ventana en curso, reexportado para los tests. */
export { inicioVentana };