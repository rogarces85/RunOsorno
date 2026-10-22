import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/security/hashing";

/**
 * Banco de pruebas de CPU (temporal, para el diagnóstico de M1).
 *
 * El tail de Cloudflare mide el CPU de cada petición, así que esta ruta
 * sirve para aislar las tres partes caras del login:
 *
 *   ?modo=vacio   solo la machinery de Next (sin base ni KDF)
 *   ?modo=db      una consulta a MySQL por Hyperdrive
 *   ?modo=kdf     una derivación PBKDF2 (100 000 iteraciones)
 *   ?modo=dbkdf   las dos
 *   ?modo=siete   siete consultas, como hace el login
 *
 * Se borra cuando el diagnóstico esté cerrado.
 *
 * Sin `export const dynamic`: con `cacheComponents` activado, Next 16 rechaza
 * ese config de segmento ("Route segment config 'dynamic' is not compatible
 * with nextConfig.cacheComponents"). La ruta lee la query, así que es
 * dinámica de todas formas.
 */
export async function GET(request: Request) {
  const modo = new URL(request.url).searchParams.get("modo") ?? "vacio";
  const t0 = Date.now();

  if (modo === "db" || modo === "dbkdf") {
    await db.execute(sql`SELECT 1`);
  }
  if (modo === "siete") {
    for (let i = 0; i < 7; i++) {
      await db.execute(sql`SELECT ${i}`);
    }
  }
  if (modo === "kdf" || modo === "dbkdf") {
    await verifyPassword("Admin1234!", DUMMY_PASSWORD_HASH);
  }

  return NextResponse.json({ ok: true, modo, ms: Date.now() - t0 });
}
