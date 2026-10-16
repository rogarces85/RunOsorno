import Link from "next/link";
import { SESSION_STATUS_META, type SessionStatus } from "@/lib/config/constants";
import { formatDayShort } from "@/lib/i18n/format";
import { parseISO } from "@/lib/metrics/utils";
import type { PlanItem } from "@/lib/services/plan.service";

/**
 * Resumen semanal del atleta en su dashboard (Fase 30).
 * Lista las sesiones de la semana con su estado y conteo por estado.
 */
export function AthleteWeekSummary({
  items,
  today,
}: {
  items: PlanItem[];
  today: string;
}) {
  const counts: Record<SessionStatus, number> = {
    planned: 0,
    in_progress: 0,
    completed: 0,
    partial: 0,
    not_done: 0,
  };
  for (const item of items) {
    counts[item.status] += 1;
  }

  return (
    <div className="card h-100">
      <div className="card-header">
        <h2 className="card-title">Resumen de la semana</h2>
      </div>
      <div className="card-body">
        <div className="mb-3 d-flex flex-wrap gap-2">
          <span className="badge bg-secondary-lt text-secondary-ink">
            Planificadas: {counts.planned + counts.in_progress}
          </span>
          <span className="badge bg-success-lt text-success-ink">
            Completadas: {counts.completed}
          </span>
          <span className="badge bg-warning-lt text-warning-ink">
            Parciales: {counts.partial}
          </span>
          <span className="badge bg-danger-lt text-danger-ink">
            No realizadas: {counts.not_done}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="text-secondary">
            Tu coach aún no planificó sesiones para esta semana.
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {items.map((item) => {
              const meta = SESSION_STATUS_META[item.status as SessionStatus];
              return (
                <div key={item.id} className="list-group-item px-0">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <strong className="text-capitalize">
                        {formatDayShort(parseISO(item.sessionDate))}
                        {item.sessionDate === today ? " (hoy)" : ""}
                      </strong>
                      <div className="text-secondary small">
                        {item.template?.name ?? "Sesión"}
                        {item.template?.sessionType
                          ? ` · ${item.template.sessionType}`
                          : ""}
                      </div>
                    </div>
                    <span
                      className={`badge bg-${meta.color}-lt text-${meta.color}-ink`}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link href="/athlete/calendar" className="btn btn-outline-secondary btn-sm mt-3">
          Ver calendario completo
        </Link>
      </div>
    </div>
  );
}
