import { and, count, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";

/**
 * Consulta de los logs de auditoría (Fase 35).
 *
 * Solo lectura: los logs se escriben desde `audit.service.ts` y nunca se
 * editan ni se borran desde la aplicación, para que el historial sea
 * confiable.
 */

export type AuditFilters = {
  from?: string;
  to?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  search?: string;
};

export type AuditLogRow = {
  id: string;
  createdAt: Date;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
};

export type AuditPage = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const DEFAULT_PAGE_SIZE = 50;

/** Convierte "YYYY-MM-DD" a Date para comparar con la columna timestamp. */
function toStartOfDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toEndOfDay(iso: string): Date {
  return new Date(`${iso}T23:59:59.999`);
}

function buildConditions(filters: AuditFilters) {
  const conditions = [];

  if (filters.from) {
    conditions.push(gte(auditLogs.createdAt, toStartOfDay(filters.from)));
  }
  if (filters.to) {
    conditions.push(lte(auditLogs.createdAt, toEndOfDay(filters.to)));
  }
  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        sql`${auditLogs.action} like ${term}`,
        sql`${auditLogs.entityType} like ${term}`,
        sql`${auditLogs.entityId} like ${term}`,
        sql`${auditLogs.details} like ${term}`,
        sql`cast(${auditLogs.ipAddress} as char) like ${term}`,
      ),
    );
  }

  return conditions;
}

/**
 * Devuelve una página de logs junto con el total de coincidencias.
 * El left join con `users` conserva los logs cuyo usuario ya no existe
 * (por ejemplo, tras eliminar un coach).
 */
export async function getLogs(
  filters: AuditFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<AuditPage> {
  const conditions = buildConditions(filters);
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(auditLogs)
      .where(where),
  ]);

  const total = totalRow?.value ?? 0;

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Acciones distintas registradas, para poblar el filtro por tipo. */
export async function getAuditActions(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs)
    .orderBy(auditLogs.action);
  return rows.map((row) => row.action);
}

/** Tipos de entidad distintos registrados. */
export async function getAuditEntityTypes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ entityType: auditLogs.entityType })
    .from(auditLogs)
    .orderBy(auditLogs.entityType);
  return rows.map((row) => row.entityType);
}

/** Usuarios que aparecen en los logs, para el filtro por usuario. */
export async function getAuditUsers(): Promise<
  { id: string; name: string; email: string }[]
> {
  const rows = await db
    .selectDistinct({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(users.name);
  return rows;
}
