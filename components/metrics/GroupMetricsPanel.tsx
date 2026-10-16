import type { GroupMetrics } from "@/lib/services/metric.service";
import { complianceBadgeClass } from "./chartColors";
import { formatNumber, formatPercent } from "@/lib/i18n/format";

type GroupMetricsPanelProps = {
  metrics: GroupMetrics;
};

export function GroupMetricsPanel({ metrics }: GroupMetricsPanelProps) {
  const { teams, coaches } = metrics;

  return (
    <>
      <div className="card mb-3">
        <div className="card-header">
          <h2 className="card-title">Comparativa de teams</h2>
        </div>
        <div className="table-responsive">
          <table className="table table-vcenter table-hover">
            <thead>
              <tr>
                <th>Team</th>
                <th>Coach</th>
                <th className="text-end">Cumplimiento</th>
                <th className="text-end">Sesiones</th>
                <th className="text-end">Completadas</th>
                <th className="text-end">Km</th>
                <th className="text-end">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-secondary text-center">
                    Sin teams en el grupo.
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.teamId}>
                    <td>
                      <strong>{team.teamName}</strong>
                    </td>
                    <td>{team.coachName}</td>
                    <td className="text-end">
                      <span className={complianceBadgeClass(team.compliance)}>
                        {formatPercent(team.compliance)}
                      </span>
                    </td>
                    <td className="text-end">{team.sessions}</td>
                    <td className="text-end">{team.completed}</td>
                    <td className="text-end">{formatNumber(team.km, { maximumFractionDigits: 1 })}</td>
                    <td className="text-end">
                      {team.alerts > 0 ? (
                        <span className="badge bg-red-lt text-red-ink">
                          {team.alerts}
                        </span>
                      ) : (
                        <span className="text-secondary">0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">
          <h2 className="card-title">Cumplimiento por coach</h2>
        </div>
        <div className="table-responsive">
          <table className="table table-vcenter table-hover">
            <thead>
              <tr>
                <th>Coach</th>
                <th className="text-end">Teams</th>
                <th className="text-end">Cumplimiento</th>
                <th className="text-end">Sesiones</th>
                <th className="text-end">Completadas</th>
              </tr>
            </thead>
            <tbody>
              {coaches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-secondary text-center">
                    Sin coaches en el grupo.
                  </td>
                </tr>
              ) : (
                coaches.map((coach) => (
                  <tr key={coach.coachId}>
                    <td>
                      <strong>{coach.coachName}</strong>
                    </td>
                    <td className="text-end">{coach.teams}</td>
                    <td className="text-end">
                      <span
                        className={complianceBadgeClass(coach.compliance)}
                      >
                        {coach.compliance}%
                      </span>
                    </td>
                    <td className="text-end">{coach.sessions}</td>
                    <td className="text-end">{coach.completed}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
