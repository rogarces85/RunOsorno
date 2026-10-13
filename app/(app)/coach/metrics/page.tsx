import Link from "next/link";
import { notFound } from "next/navigation";
import { ExportButton } from "@/components/export/ExportButton";
import { AthleteComplianceChart } from "@/components/metrics/AthleteComplianceChart";
import { ComplianceChart } from "@/components/metrics/ComplianceChart";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { TeamMetricsPanel } from "@/components/metrics/TeamMetricsPanel";
import { requireRole } from "@/lib/auth/guards";
import { canManageTeam } from "@/lib/permissions";
import { getTeamMetrics } from "@/lib/services/metric.service";
import { getTeamsByCoach } from "@/lib/services/team.service";
import { periodFromSearchParams, periodToQuery } from "@/lib/validations/metric.schemas";

export const instant = false;

export default async function CoachMetricsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireRole("coach");
  const params = await searchParams;
  const period = periodFromSearchParams(params);
  const teams = await getTeamsByCoach(user.id);

  if (teams.length === 0) {
    return (
      <div className="row">
        <div className="col-12">
          <h2 className="page-title">Métricas del team</h2>
          <div className="card">
            <div className="card-body text-secondary text-center py-4">
              Primero crea un team para ver sus métricas.{" "}
              <Link href="/coach/teams">Ir a mis teams</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const teamId =
    typeof params.team === "string" && teams.some((team) => team.id === params.team)
      ? params.team
      : teams[0].id;
  const selected = teams.find((team) => team.id === teamId) ?? teams[0];

  const allowed = await canManageTeam({ id: user.id, role: "coach" }, teamId);
  if (!allowed) {
    notFound();
  }
  const result = await getTeamMetrics(teamId, period);
  if (!result.ok) {
    return (
      <div className="row">
        <div className="col-12">
          <div className="alert alert-danger" role="alert">
            {result.error}
          </div>
        </div>
      </div>
    );
  }
  const metrics = result.data;
  const totals = metrics.athletes.reduce(
    (sum, athlete) => ({
      sessions: sum.sessions + athlete.sessions,
      completed: sum.completed + athlete.completed,
    }),
    { sessions: 0, completed: 0 },
  );

  return (
    <div className="row">
      <div className="col-12">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="page-title mb-1">Métricas de {selected.name}</h2>
            <div className="text-secondary">
              {metrics.period.from} → {metrics.period.to}
            </div>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <PeriodSelector
              basePath="/coach/metrics"
              current={period}
              extra={{ team: teamId }}
            />
            <ExportButton
              target={{ kind: "team", teamId }}
              period={period}
              size="sm"
            />
          </div>
        </div>

        {teams.length > 1 ? (
          <div className="mb-3">
            <div className="btn-group" role="group" aria-label="Team">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/coach/metrics?${periodToQuery(period)}&team=${team.id}`}
                  className={`btn btn-sm ${
                    team.id === teamId ? "btn-secondary" : "btn-outline-secondary"
                  }`}
                >
                  {team.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <TeamMetricsPanel metrics={metrics} />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Cumplimiento del team</h3>
              </div>
              <div className="card-body">
                <ComplianceChart
                  completed={totals.completed}
                  total={totals.sessions}
                />
              </div>
            </div>
          </div>
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Cumplimiento por atleta</h3>
              </div>
              <div className="card-body">
                <AthleteComplianceChart
                  athletes={metrics.athletes.map((athlete) => ({
                    name: athlete.name,
                    compliance: athlete.compliance,
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
