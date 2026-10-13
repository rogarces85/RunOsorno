import { compare, hash } from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { lucia } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import type { ServiceResult } from "@/lib/services/athlete.service";
import { logAudit } from "@/lib/services/audit.service";

/**
 * Gestión del perfil del usuario (Fase 37).
 *
 * Al cambiar la contraseña se invalidan TODAS las sesiones del usuario
 * menos la actual (decisión explícita del proyecto): si alguien robó la
 * contraseña, cambiarla debe expulsarlo también.
 */

/** Número de bcrypt: 12 es el mínimo recomendado hoy por OWASP. */
const BCRYPT_ROUNDS = 12;

/** Cuántas sesiones se conservan tras el cambio de contraseña. */
const MAX_ACTIVE_SESSIONS = 5;

/**
 * Elimina las sesiones del usuario salvo la indicada.
 *
 * Se usa `ne` sobre el id para no borrar la sesión desde la que se está
 * haciendo el cambio; si no se pasara `currentSessionId`, se cerrarían
 * todas y el usuario perdería el acceso inmediatamente.
 */
export async function revokeOtherSessions(
  userId: string,
  currentSessionId: string,
): Promise<number> {
  // Se cuenta antes de borrar: el driver de MySQL no expone affectedRows de
  // forma tipada en el resultado del delete.
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)),
    );

  await db
    .delete(sessions)
    .where(
      and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)),
    );

  return total;
}

/**
 * Mantiene como máximo `MAX_ACTIVE_SESSIONS` sesiones por usuario,
 * descartando las más antiguas.
 *
 * Sin este límite, cada login suma una fila en `sessions` y la tabla
 * crece sin control (y `validateSession` tiene que recorrerlas todas).
 */
export async function pruneOldSessions(userId: string): Promise<void> {
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(sessions.expiresAt);

  if (rows.length <= MAX_ACTIVE_SESSIONS) {
    return;
  }
  const toRemove = rows.slice(0, rows.length - MAX_ACTIVE_SESSIONS);
  for (const row of toRemove) {
    await lucia.invalidateSession(row.id);
  }
}

/**
 * Cambia la contraseña del usuario.
 *
 * - Verifica que la contraseña actual sea correcta (para confirmar que es
 *   el titular de la cuenta y no alguien con la sesión abierta).
 * - Actualiza el hash con bcrypt a 12 rondas.
 * - Revoca todas las sesiones salvo la actual.
 * - Limpia `must_change_password`, que era lo que forzó el cambio al crear
 *   la cuenta.
 */
export async function changePassword(
  userId: string,
  currentSessionId: string,
  input: {
    currentPassword: string;
    newPassword: string;
  },
): Promise<ServiceResult<{ revokedSessions: number }>> {
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  const currentMatches = await compare(input.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return { ok: false, error: "La contraseña actual no es correcta" };
  }

  const passwordHash = await hash(input.newPassword, BCRYPT_ROUNDS);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false })
    .where(eq(users.id, userId));

  // Se conservan la sesión actual y se cae el resto.
  const revokedSessions = await revokeOtherSessions(userId, currentSessionId);

  await logAudit({
    userId,
    action: "password_changed",
    entityType: "user",
    entityId: userId,
    details: { revokedSessions },
  });

  return { ok: true, data: { revokedSessions } };
}

/** Actualiza los datos personales (solo el nombre; el email no se edita). */
export async function updateProfile(
  userId: string,
  input: { name: string },
): Promise<ServiceResult<null>> {
  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  if (user.name !== input.name) {
    await db.update(users).set({ name: input.name }).where(eq(users.id, userId));
    await logAudit({
      userId,
      action: "profile_updated",
      entityType: "user",
      entityId: userId,
      details: { previousName: user.name, name: input.name },
    });
  }

  return { ok: true, data: null };
}

/** Datos del perfil para la página de configuración. */
export async function getProfile(userId: string): Promise<ServiceResult<{
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}>> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    return { ok: false, error: "Usuario no encontrado" };
  }
  return {
    ok: true,
    data: {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  };
}
