import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/lib/security/hashing";

export async function authenticate(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return { ok: false as const };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword || !user.isActive) {
    return { ok: false as const };
  }

  // Migración transparente: si el hash es bcrypt heredado (o tiene unas
  // iteraciones antiguas), se reescribe a PBKDF2 en el primer login correcto.
  // Solo cuesta una escritura, y deja de hacer bcrypt interpretado en CPU.
  if (needsRehash(user.passwordHash)) {
    const nuevoHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash: nuevoHash })
      .where(eq(users.id, user.id));
  }

  return { ok: true as const, user };
}
