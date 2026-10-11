import Link from "next/link";
import { GroupMetricsPanel } from "@/components/metrics/GroupMetricsPanel";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { requireRole } from "@/lib/auth/guards";
import { isDirector } from "@/lib/permissions";
import { getMyGroups } from "@/lib/services/group.service";
import { getGroupMetrics } from "@/lib/services/metric.service";
import { periodFromSearchParams, periodToQuery } from "@/lib/validations/metric.schemas";

export const instant = false;

export default async function DirectorTeamsPage({
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
          <h2 className="page-title">Comparativa del grupo</h2>
          <div className="card">
            <div className="card-body text-secondary text-center py-4">
              No perteneces a ningún grupo todavía.{" "}
              <Link href="/coach/groups">Ver grupos disponibles</Link>
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
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="page-title mb-1">Comparativa de {selected.name}</h2>
            <div className="text-secondary">Equipos y coaches del grupo</div>
          </div>
          <PeriodSelector
            basePath="/director/teams"
            current={period}
            extra={{ group: groupId }}
          />
        </div>

        {groups.length > 1 ? (
          <div className="mb-3">
            <div className="btn-group" role="group" aria-label="Grupo">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/director/teams?${periodToQuery(period)}&group=${group.id}`}
                  className={`btn btn-sm ${
                    group.id === groupId
                      ? "btn-secondary"
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
          <div className="alert alert-warning" role="alert">
            Necesitas ser Director Técnico del grupo para ver la comparativa de
            teams. Pide al administrador que te asigne el rol.
          </div>
        ) : (
          <DirectorContent groupId={groupId} period={period} />
        )}
      </div>
    </div>
  );
}

async function DirectorContent({
  groupId,
  period,
}: {
  groupId: string;
  period: Parameters<typeof getGroupMetrics>[1];
}) {
  const result = await getGroupMetrics(groupId, period);
  if (!result.ok) {
    return (
      <div className="alert alert-danger" role="alert">
        {result.error}
      </div>
    );
  }
  return <GroupMetricsPanel metrics={result.data} />;
}
