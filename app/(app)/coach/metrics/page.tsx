import Link from "next/link";
import { notFound } from "next/navigation";
import { ExportButton } from "@/components/export/ExportButton";
import { AthleteComplianceChart } from "@/components/metrics/AthleteComplianceChart";
import { ComplianceChart } from "@/components/metrics/ComplianceChart";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { TeamMetricsPanel } from "@/components/metrics/TeamMetricsPanel";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { formatDate } from "@/lib/i18n/format";
import { canManageTeam } from "@/lib/permissions";
import { getTeamMetrics } from "@/lib/services/metric.service";
import { getTeamsByCoach } from "@/lib/services/team.service";
import {
  periodFromSearchParams,
  periodToQuery,
} from "@/lib/validations/metric.schemas";

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
          <PageHeader title="Métricas del team" />
          <div className="card">
            <div className="card-body">
              <EmptyState
                title="Sin teams todavía"
                description="Primero crea un team para ver sus métricas."
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
  const result = await getTeamMetrics(teamId, period);
  if (!result.ok) {
    return (
      <div className="row">
        <div className="col-12">
          <Alert variant="danger">{result.error}</Alert>
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
        <PageHeader
          title={`Métricas de ${selected.name}`}
          description={`${formatDate(metrics.period.from)} → ${formatDate(metrics.period.to)}`}
          actions={
            <>
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
            </>
          }
        />

        {teams.length > 1 ? (
          <div className="mb-3">
            <div className="btn-group" role="group" aria-label="Team">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/coach/metrics?${periodToQuery(period)}&team=${team.id}`}
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

        <TeamMetricsPanel metrics={metrics} />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <Card title="Cumplimiento del team" className="h-100">
              <ComplianceChart
                completed={totals.completed}
                total={totals.sessions}
              />
            </Card>
          </div>
          <div className="col-lg-6 mb-3">
            <Card title="Cumplimiento por atleta" className="h-100">
              <AthleteComplianceChart
                athletes={metrics.athletes.map((athlete) => ({
                  name: athlete.name,
                  compliance: athlete.compliance,
                }))}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
