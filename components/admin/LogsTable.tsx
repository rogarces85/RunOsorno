import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { AuditLogRow } from "@/lib/services/audit-query.service";
import { auditLogsToQuery } from "@/lib/validations/audit.schemas";
import { formatDateTime } from "@/lib/i18n/format";

type Props = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: Parameters<typeof auditLogsToQuery>[0];
};

const ACTION_LABELS: Record<string, string> = {
  coach_created: "Coach creado",
  coach_updated: "Coach actualizado",
  coach_deactivated: "Coach desactivado",
  coach_reactivated: "Coach reactivado",
  coach_deleted: "Coach eliminado",
  password_reset: "Contraseña reseteada",
  invitation_resent: "Invitación reenviada",
  group_created: "Grupo creado",
  group_updated: "Grupo actualizado",
  group_deleted: "Grupo eliminado",
  request_sent: "Solicitud enviada",
  request_approved: "Solicitud aprobada",
  request_rejected: "Solicitud rechazada",
  director_toggled: "Director técnico cambiado",
  announcement_sent: "Anuncio enviado",
  team_created: "Team creado",
  team_updated: "Team actualizado",
  team_deleted: "Team eliminado",
  athlete_created: "Atleta creado",
  athlete_profile_updated: "Perfil de atleta actualizado",
  athlete_transferred: "Atleta trasladado",
  athlete_assigned: "Atleta asignado",
  athlete_removed: "Atleta quitado",
  template_created: "Plantilla creada",
  template_updated: "Plantilla actualizada",
  template_deleted: "Plantilla eliminada",
  template_cloned: "Plantilla clonada",
  template_shared: "Plantilla compartida",
  template_unshared: "Plantilla retirada",
  official_template_created: "Plantilla oficial creada",
  official_template_updated: "Plantilla oficial actualizada",
  official_template_deleted: "Plantilla oficial eliminada",
  session_assigned: "Sesión asignada",
  session_removed: "Sesión eliminada",
  session_recorded: "Sesión registrada",
  week_copied: "Semana copiada",
  week_generated: "Semana generada",
  email_failed: "Fallo al enviar email",
  data_exported: "Datos exportados",
  settings_updated: "Configuración actualizada",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatDetails(details: unknown): string {
  if (details === null || details === undefined) {
    return "—";
  }
  if (typeof details === "string") {
    return details;
  }
  const entries = Object.entries(details as Record<string, unknown>);
  if (entries.length === 0) {
    return "—";
  }
  return entries
    .map(([key, value]) => {
      const text =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      return text ? `${key}: ${text}` : "";
    })
    .filter(Boolean)
    .join(" · ");
}

/**
 * Tabla de logs de auditoría (tareas 35.4 y 35.5).
 * Columnas: fecha, usuario, acción, entidad, detalles e IP.
 */
export function LogsTable({ rows, total, page, totalPages, filters }: Props) {
  const from = total === 0 ? 0 : (page - 1) * rows.length + 1;
  const to = from + rows.length - 1;

  const pageLink = (target: number) =>
    `/admin/logs?${auditLogsToQuery(filters, target)}`;

  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex align-items-center">
          <h3 className="card-title">Historial de acciones</h3>
          <span className="text-secondary ms-auto">
            {total === 0
              ? "Sin resultados"
              : `${from}-${to} de ${total} registro${total === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-vcenter card-table">
          <thead>
            <tr>
              <th style={{ width: "9rem" }}>Fecha</th>
              <th style={{ width: "12rem" }}>Usuario</th>
              <th style={{ width: "13rem" }}>Acción</th>
              <th style={{ width: "8rem" }}>Entidad</th>
              <th>Detalles</th>
              <th style={{ width: "10rem" }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-secondary text-center py-4">
                  No hay registros que coincidan con los filtros.
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id}>
                <td className="text-secondary">
                  {formatDateTime(row.createdAt)}
                </td>
                <td>
                  {row.userName ? (
                    <>
                      <div>{row.userName}</div>
                      <div className="text-secondary small">{row.userEmail}</div>
                    </>
                  ) : (
                    <span className="text-secondary">
                      {row.userId ? "Usuario eliminado" : "Sistema"}
                    </span>
                  )}
                </td>
                <td>
                  <span className="badge bg-secondary-lt">
                    {actionLabel(row.action)}
                  </span>
                  <div className="text-secondary small">{row.action}</div>
                </td>
                <td>
                  <div>{row.entityType}</div>
                  {row.entityId && (
                    <div
                      className="text-secondary small text-truncate"
                      style={{ maxWidth: "9rem" }}
                      title={row.entityId}
                    >
                      {row.entityId}
                    </div>
                  )}
                </td>
                <td className="text-secondary small">
                  {formatDetails(row.details)}
                </td>
                <td className="text-secondary">{row.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="card-footer d-flex align-items-center">
          <span className="text-secondary">
            Página {page} de {totalPages}
          </span>
          <div className="btn-group ms-auto">
            {page > 1 && (
              <Link
                href={pageLink(page - 1)}
                className="btn btn-sm"
                aria-label="Página anterior"
              >
                <IconChevronLeft size={16} stroke={1.75} />
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageLink(page + 1)}
                className="btn btn-sm"
                aria-label="Página siguiente"
              >
                Siguiente
                <IconChevronRight size={16} stroke={1.75} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
