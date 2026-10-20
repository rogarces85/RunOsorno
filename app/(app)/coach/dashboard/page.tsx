import Link from "next/link";
import { notFound } from "next/navigation";
import { CoachTodaySessions } from "@/components/dashboard/CoachTodaySessions";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";
import { canManageTeam } from "@/lib/permissions";
import { getTeamTodaySessions } from "@/lib/services/dashboard.service";
import { getTeamMetrics } from "@/lib/services/metric.service";
import { getTeamsByCoach } from "@/lib/services/team.service";

export const instant = false;

export default async function CoachDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireRole("coach");
  const params = await searchParams;
  const teams = await getTeamsByCoach(user.id);

  if (teams.length === 0) {
    return (
      <div className="row">
        <div className="col-12">
          <PageHeader title="Dashboard" />
          <div className="card">
            <div className="card-body">
              <EmptyState
                title="Sin teams todavía"
                description="Primero crea un team para ver tu dashboard."
                actionLabel="Ir a mis teams"
                actionHref="/coach/teams"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const teamId =
    typeof params.team === "string" &&
    teams.some((team) => team.id === params.team)
      ? params.team
      : teams[0].id;
  const selected = teams.find((team) => team.id === teamId) ?? teams[0];

  const allowed = await canManageTeam({ id: user.id, role: "coach" }, teamId);
  if (!allowed) {
    notFound();
  }

  const [metricsResult, todaySessions] = await Promise.all([
    getTeamMetrics(teamId, { kind: "season" }),
    getTeamTodaySessions(teamId, user.id),
  ]);

  if (!metricsResult.ok) {
    return (
      <div className="row">
        <div className="col-12">
          <PageHeader title="Dashboard" />
          <Alert variant="danger">{metricsResult.error}</Alert>
        </div>
      </div>
    );
  }

  const metrics = metricsResult.data;
  const totals = metrics.athletes.reduce(
    (sum, athlete) => ({
      sessions: sum.sessions + athlete.sessions,
      completed: sum.completed + athlete.completed,
    }),
    { sessions: 0, completed: 0 },
  );
  const compliancePercent =
    totals.sessions === 0
      ? 0
      : Math.round((totals.completed / totals.sessions) * 100);

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Dashboard"
          description={`Resumen de ${selected.name}`}
          actions={
            <>
              <Link
                href={`/coach/calendar?team=${teamId}`}
                className={buttonClassName({ size: "sm" })}
              >
                Planificar en calendario
              </Link>
              <Link
                href={`/coach/metrics?team=${teamId}`}
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                })}
              >
                Ver métricas
              </Link>
            </>
          }
        />

        {teams.length > 1 ? (
          <div className="mb-3">
            <div className="btn-group" role="group" aria-label="Team">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/coach/dashboard?team=${team.id}`}
                  className={`btn btn-sm ${
                    team.id === teamId
                      ? "btn-secondary"
                      : "btn-outline-secondary"
                  }`}
                >
                  {team.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <StatsCards
          items={[
            {
              key: "compliance",
              label: "Cumplimiento del team",
              value: `${compliancePercent}%`,
              sub: `${totals.completed} de ${totals.sessions} sesiones (temporada)`,
              tone:
                compliancePercent >= 80
                  ? "success"
                  : compliancePercent >= 50
                    ? "warning"
                    : "danger",
            },
            {
              key: "athletes",
              label: "Atletas",
              value: metrics.athletes.length,
              href: "/coach/athletes",
            },
            {
              key: "today",
              label: "Sesiones de hoy",
              value: todaySessions.length,
              tone: todaySessions.length > 0 ? "primary" : "default",
            },
            {
              key: "alerts",
              label: "Alertas activas",
              value: metrics.alerts.length,
              tone: metrics.alerts.length > 0 ? "danger" : "default",
              sub:
                metrics.alerts.length > 0 ? "Revisa a tus atletas" : undefined,
            },
          ]}
        />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <CoachTodaySessions sessions={todaySessions} teamId={teamId} />
          </div>
          <div className="col-lg-6 mb-3">
            <Card title="Alertas" className="h-100">
              {metrics.alerts.length === 0 ? (
                <Alert variant="success" className="mb-0">
                  Sin alertas activas en este team.
                </Alert>
              ) : (
                <div className="list-group list-group-flush">
                  {metrics.alerts.slice(0, 6).map((alert, index) => (
                    <div
                      key={`${alert.athleteId}-${alert.kind}-${index}`}
                      className="list-group-item px-0"
                    >
                      <strong>{alert.athleteName}</strong>
                      <div className="text-secondary small">
                        {alert.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {metrics.alerts.length > 6 ? (
                <Link
                  href={`/coach/metrics?team=${teamId}`}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                    className: "mt-3",
                  })}
                >
                  Ver todas en métricas
                </Link>
              ) : null}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
