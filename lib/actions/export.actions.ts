"use server";

import { requireAuth } from "@/lib/auth/guards";
import { exportData, type ExportRequest } from "@/lib/services/export.service";
import { exportDataSchema } from "@/lib/validations/export.schemas";

export type ExportState = {
  ok: boolean;
  error: string | null;
};

/**
 * Valida la solicitud de exportación y devuelve el archivo generado en
 * memoria. El componente lo convierte en descarga en el navegador.
 */
export async function exportDataAction(
  input: unknown,
): Promise<{
  ok: boolean;
  error: string | null;
  filename: string | null;
  contentType: string | null;
  data: number[] | null;
}> {
  const { user } = await requireAuth();

  const parsed = exportDataSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Parámetros de exportación inválidos",
      filename: null,
      contentType: null,
      data: null,
    };
  }

  const result = await exportData(parsed.data as ExportRequest, {
    id: user.id,
    role: user.role,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      filename: null,
      contentType: null,
      data: null,
    };
  }

  return {
    ok: true,
    error: null,
    filename: result.data.filename,
    contentType: result.data.contentType,
    // Los Server Actions serializan a JSON: ArrayBuffer no sobrevive, así que
    // se pasan los bytes como array de números.
    data: Array.from(result.data.data),
  };
}
