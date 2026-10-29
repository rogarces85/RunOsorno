import Link from "next/link";
import { BIcon } from "@/components/ui/BIcon";
import type { AuditLogRow } from "@/lib/services/audit-query.service";
import { auditLogsToQuery } from "@/lib/validations/audit.schemas";
import { formatDateTime } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { buttonClassName } from "@/components/ui/Button";

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
  avatars_cleaned: "Avatares huérfanos limpiados",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatDetails(details: unknown): string {
  if (details === null || details === undefined) {
    return "—";
  }
  if (typeof details === "string") {
    // Muchos registros guardan el detalle como JSON serializado; mostrarlo tal
    // cual llenaba la celda de llaves y comillas.
    const texto = details.trim();
    if (texto.startsWith("{") && texto.endsWith("}")) {
      try {
        return formatDetails(JSON.parse(texto));
      } catch {
        return texto;
      }
    }
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
    <Card
      title="Historial de acciones"
      bodyClassName="p-0"
      actions={
        <span className="text-secondary">
          {total === 0
            ? "Sin resultados"
            : `${from}-${to} de ${total} registro${total === 1 ? "" : "s"}`}
        </span>
      }
      footer={
        totalPages > 1 ? (
          <div className="d-flex align-items-center w-100">
            <span className="text-secondary">
              Página {page} de {totalPages}
            </span>
            <div className="btn-group ms-auto">
              {page > 1 && (
                <Link
                  href={pageLink(page - 1)}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                  })}
                  aria-label="Página anterior"
                >
                  <BIcon name="chevron-left" size={16} aria-hidden />
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={pageLink(page + 1)}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                  })}
                  aria-label="Página siguiente"
                >
                  Siguiente
                  <BIcon name="chevron-right" size={16} aria-hidden />
                </Link>
              )}
            </div>
          </div>
        ) : undefined
      }
    >
      <Table label="Logs de auditoría" stackOnMobile>
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

          {rows.map((row) => {
            const detalle = formatDetails(row.details);
            return (
              <tr key={row.id}>
                <td
                  className="text-secondary app-table-nowrap"
                  data-label="Fecha"
                >
                  {formatDateTime(row.createdAt)}
                </td>
                <td data-label="Usuario">
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
                <td data-label="Acción">
                  <Badge tone="neutral">{actionLabel(row.action)}</Badge>
                  <div className="text-secondary small">{row.action}</div>
                </td>
                <td data-label="Entidad">
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
                <td className="text-secondary small" data-label="Detalles">
                  <span className="app-table-clamp" title={detalle}>
                    {detalle}
                  </span>
                </td>
                <td
                  className="text-secondary app-table-nowrap"
                  data-label="IP"
                >
                  {row.ipAddress ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
