import Link from "next/link";
import {
  SESSION_STATUS_META,
  type SessionStatus,
} from "@/lib/config/constants";
import { formatDayShort } from "@/lib/i18n/format";
import { parseISO } from "@/lib/metrics/utils";
import type { PlanItem } from "@/lib/services/plan.service";
import { Badge, badgeToneFromColor } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClassName } from "@/components/ui/Button";

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
    <Card title="Resumen de la semana" className="h-100">
      <div className="mb-3 d-flex flex-wrap gap-2">
        <Badge tone="neutral" dot={false}>
          Planificadas: {counts.planned + counts.in_progress}
        </Badge>
        <Badge tone="success" dot={false}>
          Completadas: {counts.completed}
        </Badge>
        <Badge tone="warning" dot={false}>
          Parciales: {counts.partial}
        </Badge>
        <Badge tone="danger" dot={false}>
          No realizadas: {counts.not_done}
        </Badge>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Semana sin planificar"
          description="Tu coach aún no planificó sesiones para esta semana."
          compact
        />
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
                  <Badge tone={badgeToneFromColor(meta.color)}>
                    {meta.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/athlete/calendar"
        className={buttonClassName({
          variant: "secondary",
          size: "sm",
          className: "mt-3",
        })}
      >
        Ver calendario completo
      </Link>
    </Card>
  );
}
