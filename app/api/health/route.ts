import { NextResponse } from "next/server";

/**
 * Chequeo de salud ligero (sin base de datos ni sesión).
 *
 * El middleware (`proxy.ts`) excluye `/api` de su `matcher`, así que esta ruta
 * es pública y barata: sirve para health checks y para calentar el isolate con
 * un cron o un ping externo. No toca Hyperdrive a propósito: debe responder
 * aunque la base no esté disponible.
 */
export function GET() {
  return NextResponse.json({ ok: true });
}
