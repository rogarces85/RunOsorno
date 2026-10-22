import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/security/hashing";

/**
 * RUTA TEMPORAL — restablece la contraseña del administrador de producción.
 *
 * Existe solo para esta operación y **se borra en cuanto termina**. Va
 * protegida por un secreto (`TEMP_SEED_TOKEN`) cargado como secreto del
 * Worker, no como variable de entorno: sin ese secreto devuelve 403.
 *
 * Por qué una ruta y no el script: el script necesita el `DATABASE_URL` de
 * producción con su contraseña, que no está en el repositorio. La ruta usa el
 * binding `HYPERDRIVE` del Worker, que ya la tiene. Es el mismo camino que
 * recomienda `docs/recuperar-acceso-aiven.md`.
 */

const CLAVE_ADMIN = "Admin1234!";

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const secreto = process.env.TEMP_SEED_TOKEN;
  const recibido = request.headers.get("x-token") ?? "";
  if (!secreto || !igual(recibido, secreto)) {
    return new Response("no autorizado", { status: 403 });
  }

  const admins = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, "admin"));

  const hash = await hashPassword(CLAVE_ADMIN);
  for (const admin of admins) {
    await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.id, admin.id));
  }

  const total = await db.select({ email: users.email, role: users.role }).from(users);

  return Response.json({
    ok: true,
    admins: admins.map((a) => a.email),
    usuarios: total.map((u) => `${u.role}: ${u.email}`),
  });
}
