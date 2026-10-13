import { z } from "zod";

/**
 * Esquemas de los filtros de la página de logs (Fase 35).
 *
 * Todo llega por query string, así que se validan como texto: las fechas
 * se comprueban con el calendario real (no solo el formato) para no
 * aceptar "2026-02-31".
 */

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) {
      return true;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    // Rechaza fechas que "existen" en formato pero no en el calendario.
    const [year, month, day] = value.split("-").map(Number);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }, "Fecha inválida");

export const auditLogsSearchSchema = z
  .object({
    from: optionalIsoDate,
    to: optionalIsoDate,
    userId: z.uuid("Usuario inválido").optional(),
    action: z.string().trim().max(100).optional(),
    entityType: z.string().trim().max(50).optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).max(10_000).optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "La fecha inicial debe ser anterior a la final",
    path: ["from"],
  })
  .refine((value) => !value.page || value.page <= 10_000, {
    message: "Página fuera de rango",
    path: ["page"],
  });

export type AuditLogsSearch = z.infer<typeof auditLogsSearchSchema>;

/** Lee y normaliza los search params de la página de logs. */
export function auditLogsFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): { filters: Omit<AuditLogsSearch, "page">; page: number } {
  const single = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const raw = {
    from: single("from"),
    to: single("to"),
    userId: single("userId"),
    action: single("action"),
    entityType: single("entityType"),
    search: single("search"),
    page: single("page"),
  };

  const parsed = auditLogsSearchSchema.safeParse(raw);
  if (!parsed.success) {
    return { filters: {}, page: 1 };
  }

  const { page, ...filters } = parsed.data;
  return {
    filters: {
      ...filters,
      from: filters.from || undefined,
      to: filters.to || undefined,
      userId: filters.userId || undefined,
      action: filters.action || undefined,
      entityType: filters.entityType || undefined,
      search: filters.search || undefined,
    },
    page: page ?? 1,
  };
}

/** Construye el query string preservando los filtros activos. */
export function auditLogsToQuery(
  filters: Partial<AuditLogsSearch>,
  page = 1,
): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.search) params.set("search", filters.search);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}
