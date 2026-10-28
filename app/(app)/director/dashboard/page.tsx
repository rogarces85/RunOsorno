import Link from "next/link";
import { BIcon } from "@/components/ui/BIcon";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { GroupMetricsPanel } from "@/components/metrics/GroupMetricsPanel";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";
import { isDirector } from "@/lib/permissions";
import { getMyGroups } from "@/lib/services/group.service";
import { getGroupMetrics } from "@/lib/services/metric.service";
import {
  periodFromSearchParams,
  periodToQuery,
  type MetricsPeriod,
} from "@/lib/validations/metric.schemas";

export const instant = false;

export default async function DirectorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireRole("coach");
  const params = await searchParams;
  const period = periodFromSearchParams(params);
  const groups = await getMyGroups(user.id);

  if (groups.length === 0) {
    return (
      <div className="row">
        <div className="col-12">
          <PageHeader title="Dashboard Director Técnico" />
          <div className="card">
            <div className="card-body">
              <EmptyState
                title="Sin grupos todavía"
                description="No perteneces a ningún grupo todavía."
                actionLabel="Ver grupos disponibles"
                actionHref="/coach/groups"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupId =
    typeof params.group === "string" &&
    groups.some((group) => group.id === params.group)
      ? params.group
      : groups[0].id;
  const selected = groups.find((group) => group.id === groupId) ?? groups[0];

  const director = await isDirector({ id: user.id, role: "coach" }, groupId);

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Dashboard Director Técnico"
          description={`Resumen de ${selected.name}`}
          actions={
            <PeriodSelector
              basePath="/director/dashboard"
              current={period}
              extra={{ group: groupId }}
            />
          }
        />

        {groups.length > 1 ? (
          <div className="mb-3">
            <div className="btn-group" role="group" aria-label="Grupo">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/director/dashboard?${periodToQuery(period)}&group=${group.id}`}
                  className={`btn btn-sm ${
                    group.id === groupId
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                >
                  {group.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {!director ? (
          <Alert variant="warning">
            Necesitas ser Director Técnico del grupo para ver el resumen. Pide
            al administrador que te asigne el rol.
          </Alert>
        ) : (
          <DirectorSummary groupId={groupId} period={period} />
        )}
      </div>
    </div>
  );
}

async function DirectorSummary({
  groupId,
  period,
}: {
  groupId: string;
  period: MetricsPeriod;
}) {
  const result = await getGroupMetrics(groupId, period);
  if (!result.ok) {
    return <Alert variant="danger">{result.error}</Alert>;
  }
  const metrics = result.data;

  const totals = metrics.teams.reduce(
    (sum, team) => ({
      sessions: sum.sessions + team.sessions,
      completed: sum.completed + team.completed,
      alerts: sum.alerts + team.alerts,
    }),
    { sessions: 0, completed: 0, alerts: 0 },
  );
  const compliancePercent =
    totals.sessions === 0
      ? 0
      : Math.round((totals.completed / totals.sessions) * 100);

  return (
    <>
      <StatsCards
        items={[
          {
            key: "teams",
            label: "Teams del grupo",
            value: metrics.teams.length,
            href: `/director/teams?group=${groupId}`,
            stamp: { icon: <BIcon name="people-fill" aria-hidden />, variant: "primary" },
          },
          {
            key: "coaches",
            label: "Coaches",
            value: metrics.coaches.length,
            stamp: { icon: <BIcon name="people" aria-hidden />, variant: "info" },
          },
          {
            key: "compliance",
            label: "Cumplimiento del grupo",
            value: `${compliancePercent}%`,
            sub: `${totals.completed} de ${totals.sessions} sesiones`,
            tone:
              compliancePercent >= 80
                ? "success"
                : compliancePercent >= 50
                  ? "warning"
                  : "danger",
            stamp: { icon: <BIcon name="speedometer2" aria-hidden />, variant: "success" },
          },
          {
            key: "alerts",
            label: "Alertas activas",
            value: totals.alerts,
            tone: totals.alerts > 0 ? "danger" : "default",
            stamp: { icon: <BIcon name="exclamation-triangle" aria-hidden />, variant: "danger" },
          },
        ]}
      />

      <GroupMetricsPanel metrics={metrics} />

      <div className="mt-2">
        <Link
          href={`/director/teams?${periodToQuery(period)}&group=${groupId}`}
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          Ver comparativa detallada
        </Link>
      </div>
    </>
  );
}
