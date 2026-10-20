import type { GroupMetrics } from "@/lib/services/metric.service";
import { formatNumber, formatPercent } from "@/lib/i18n/format";
import { Badge, complianceTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";

type GroupMetricsPanelProps = {
  metrics: GroupMetrics;
};

export function GroupMetricsPanel({ metrics }: GroupMetricsPanelProps) {
  const { teams, coaches } = metrics;

  return (
    <>
      <Card title="Comparativa de teams" className="mb-3" bodyClassName="p-0">
        <Table label="Comparativa de teams del grupo" stackOnMobile>
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
                  <td data-label="Team">
                    <strong>{team.teamName}</strong>
                  </td>
                  <td data-label="Coach">{team.coachName}</td>
                  <td className="text-end" data-label="Cumplimiento">
                    <Badge tone={complianceTone(team.compliance)}>
                      {formatPercent(team.compliance)}
                    </Badge>
                  </td>
                  <td className="text-end app-numeric" data-label="Sesiones">
                    {team.sessions}
                  </td>
                  <td className="text-end app-numeric" data-label="Completadas">
                    {team.completed}
                  </td>
                  <td className="text-end app-numeric" data-label="Km">
                    {formatNumber(team.km, { maximumFractionDigits: 1 })}
                  </td>
                  <td className="text-end" data-label="Alertas">
                    {team.alerts > 0 ? (
                      <Badge tone="danger">{team.alerts}</Badge>
                    ) : (
                      <span className="text-secondary">0</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>

      <Card title="Cumplimiento por coach" className="mb-3" bodyClassName="p-0">
        <Table label="Cumplimiento por coach" stackOnMobile>
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
                  <td data-label="Coach">
                    <strong>{coach.coachName}</strong>
                  </td>
                  <td className="text-end app-numeric" data-label="Teams">
                    {coach.teams}
                  </td>
                  <td className="text-end" data-label="Cumplimiento">
                    <Badge tone={complianceTone(coach.compliance)}>
                      {coach.compliance}%
                    </Badge>
                  </td>
                  <td className="text-end app-numeric" data-label="Sesiones">
                    {coach.sessions}
                  </td>
                  <td className="text-end app-numeric" data-label="Completadas">
                    {coach.completed}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
