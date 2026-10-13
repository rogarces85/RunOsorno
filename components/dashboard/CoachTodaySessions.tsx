import Link from "next/link";
import { SESSION_STATUS_META, type SessionStatus } from "@/lib/config/constants";
import type { TeamTodaySession } from "@/lib/services/dashboard.service";

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
    <div className="card h-100">
      <div className="card-header">
        <h3 className="card-title">Sesiones de hoy</h3>
        {sessions.length > 0 ? (
          <span className="badge bg-blue-lt text-blue ms-auto">
            {sessions.length}
          </span>
        ) : null}
      </div>
      <div className="card-body">
        {sessions.length === 0 ? (
          <div className="text-secondary">
            No hay sesiones planificadas para hoy en este team.
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {sessions.map((session) => {
              const meta = SESSION_STATUS_META[session.status as SessionStatus];
              return (
                <div
                  key={session.assignmentId}
                  className="list-group-item px-0"
                >
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
                    <span
                      className={`badge bg-${meta.color}-lt text-${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Link
          href={`/coach/calendar?team=${teamId}`}
          className="btn btn-outline-secondary btn-sm mt-3"
        >
          Ir al calendario
        </Link>
      </div>
    </div>
  );
}
