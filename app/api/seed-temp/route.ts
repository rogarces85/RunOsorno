import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/security/hashing";
import { main as seedDemo } from "@/db/seed-demo";

/**
 * RUTA TEMPORAL — siembra de datos en la base de producción.
 *
 * Existe solo para esta operación y **se borra en cuanto termina**. Va
 * protegida por un secreto (`TEMP_SEED_TOKEN`) que se carga como secreto del
 * Worker, no como variable de entorno: sin ese secreto la ruta devuelve 403.
 *
 * Hace dos cosas:
 *
 *   1. Restablece la contraseña del administrador a la del proyecto
 *      (`Admin1234!`), que es la que documentan `docs/roadmap.md` y
 *      `docs/entorno-local.md`.
 *   2. Ejecuta el seed de demostración (`db/seed-demo.ts`): 1 grupo, 2
 *      coaches + 1 director técnico, 3 teams, 5 atletas, 8 semanas de
 *      planificaciones con registros variados, feedback y notificaciones.
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

  const resumen: string[] = [];

  // 1) Contraseña del administrador.
  const [admin] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, "admin@runosorno.cl"))
    .limit(1);
  if (admin) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(CLAVE_ADMIN) })
      .where(eq(users.id, admin.id));
    resumen.push(`admin ${admin.email}: contrasena restablecida`);
  } else {
    resumen.push("admin: NO existe (no se toco nada)");
  }

  // 2) Datos de demostración.
  await seedDemo();
  resumen.push("seed DEMO ejecutado");

  // 3) Conteo final de usuarios, para confirmar.
  const todos = await db.select({ email: users.email, role: users.role }).from(users);
  resumen.push(`usuarios en la base: ${todos.length}`);

  return Response.json(
    { ok: true, resumen, usuarios: todos.map((u) => `${u.role}: ${u.email}`) },
    { status: 200 },
  );
}
