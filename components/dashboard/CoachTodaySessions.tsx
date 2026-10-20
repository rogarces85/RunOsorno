import Link from "next/link";
import {
  SESSION_STATUS_META,
  type SessionStatus,
} from "@/lib/config/constants";
import type { TeamTodaySession } from "@/lib/services/dashboard.service";
import { Badge, badgeToneFromColor } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClassName } from "@/components/ui/Button";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Tarjeta "Sesiones de hoy" del dashboard del coach (Fase 30).
 * Lista las sesiones planificadas para hoy en el team seleccionado.
 */
export function CoachTodaySessions({
  sessions,
  teamId,
}: {
  sessions: TeamTodaySession[];
  teamId: string;
}) {
  return (
    <Card
      title="Sesiones de hoy"
      className="h-100"
      actions={
        sessions.length > 0 ? (
          <Badge tone="primary">{sessions.length}</Badge>
        ) : null
      }
    >
      {sessions.length === 0 ? (
        <EmptyState
          title="Sin sesiones para hoy"
          description="No hay sesiones planificadas para hoy en este team."
          compact
        />
      ) : (
        <div className="list-group list-group-flush">
          {sessions.map((session) => {
            const meta = SESSION_STATUS_META[session.status as SessionStatus];
            return (
              <div key={session.assignmentId} className="list-group-item px-0">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <strong>{session.athleteName}</strong>
                    <div className="text-secondary small">
                      {session.templateName ?? "Sesión"}
                      {session.sessionType
                        ? ` · ${capitalize(session.sessionType)}`
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
        href={`/coach/calendar?team=${teamId}`}
        className={buttonClassName({
          variant: "secondary",
          size: "sm",
          className: "mt-3",
        })}
      >
        Ir al calendario
      </Link>
    </Card>
  );
}
