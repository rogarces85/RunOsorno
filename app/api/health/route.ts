import { NextResponse } from "next/server";

/**
 * Chequeo de salud ligero (sin base de datos ni sesión).
 *
 * No hay middleware en el proyecto (la protección vive en los layouts), así
 * que esta ruta es pública por diseño: sirve para health checks y para calentar
 * el isolate con un cron o un ping externo. No toca Hyperdrive a propósito: debe
 * responder aunque la base no esté disponible.
 */
export function GET() {
  return NextResponse.json({ ok: true });
}
