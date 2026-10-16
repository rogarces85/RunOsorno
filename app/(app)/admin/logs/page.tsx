import Link from "next/link";
import { LogsFilters } from "@/components/admin/LogsFilters";
import { LogsTable } from "@/components/admin/LogsTable";
import { requireRole } from "@/lib/auth/guards";
import {
  getAuditActions,
  getAuditEntityTypes,
  getAuditUsers,
  getLogs,
} from "@/lib/services/audit-query.service";
import { auditLogsFromSearchParams } from "@/lib/validations/audit.schemas";

export const instant = false;

/**
 * Logs de auditoría (Fase 35).
 *
 * Solo accesible para el administrador. Los filtros viven en la URL para
 * que el historial filtrado se pueda compartir y recargar.
 */
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin");
  const { filters, page } = auditLogsFromSearchParams(await searchParams);

  const [result, actions, entityTypes, users] = await Promise.all([
    getLogs(filters, page),
    getAuditActions(),
    getAuditEntityTypes(),
    getAuditUsers(),
  ]);

  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <Link href="/admin/dashboard" className="link-secondary">
            ← Volver al dashboard
          </Link>
        </div>

        <h1 className="page-title mb-1">Logs de auditoría</h1>
        <p className="text-secondary">
          Registro de las acciones críticas de la plataforma: quién hizo qué,
          cuándo y desde qué dirección IP.
        </p>

        <LogsFilters
          actions={actions}
          entityTypes={entityTypes}
          users={users}
          current={filters}
        />

        <LogsTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          totalPages={result.totalPages}
          filters={filters}
        />
      </div>
    </div>
  );
}
