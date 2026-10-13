import { NextResponse } from "next/server";
import { getSessionId, validateSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { exportData, type ExportRequest } from "@/lib/services/export.service";
import { exportDataSchema } from "@/lib/validations/export.schemas";

/**
 * Descarga de archivos exportados (Fase 33).
 *
 * Los archivos se generan en memoria y se devuelven como respuesta binaria,
 * sin escribir nada en disco (compatible con el filesystem efímero de
 * Cloudflare). El POST devuelve el archivo directamente.
 */
export async function POST(request: Request): Promise<Response> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { session, user } = await validateSession(sessionId);
  if (!session || !user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const parsed = exportDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros de exportación inválidos" },
      { status: 400 },
    );
  }

  // El rol se toma de la sesión, nunca del cuerpo de la petición.
  const [row] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
  }

  const result = await exportData(parsed.data as ExportRequest, {
    id: row.id,
    role: row.role,
  });

  if (!result.ok) {
    const isNoData = result.error.includes("No hay datos");
    return NextResponse.json({ error: result.error }, {
      status: isNoData ? 404 : 403,
    });
  }

  const { filename, contentType, data } = result.data;

  return new NextResponse(data as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(data.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
