import type { AthleteAlert } from "@/lib/metrics/alerts";
import type { TeamMetrics } from "@/lib/services/metric.service";
import { formatNumber, formatPercent } from "@/lib/i18n/format";
import { formatDistance } from "@/lib/utils/format";
import { Alert } from "@/components/ui/Alert";
import { Badge, complianceTone, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";

type TeamMetricsPanelProps = {
  metrics: TeamMetrics;
};

const ALERT_LABELS: Record<
  AthleteAlert["kind"],
  { label: string; tone: BadgeTone }
> = {
  no_logging: { label: "Sin registrar", tone: "warning" },
  load_drop: { label: "Caída de carga", tone: "danger" },
  high_rpe: { label: "RPE alto", tone: "warning" },
};

function bucketPct(count: number, total: number): string {
  if (total === 0) {
    return "0%";
  }
  return formatPercent((count / total) * 100);
}

export function TeamMetricsPanel({ metrics }: TeamMetricsPanelProps) {
  const { athletes, buckets, averageLoadKm, alerts } = metrics;
  const total = athletes.length;

  return (
    <>
      <div className="row mb-3">
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">Cumplimiento alto</div>
            <div className="h1 mb-0 app-numeric text-success-emphasis">
              {buckets.high}
            </div>
            <div className="text-secondary small">
              &gt;80% · {bucketPct(buckets.high, total)} del team
            </div>
          </Card>
        </div>
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">Cumplimiento medio</div>
            <div className="h1 mb-0 app-numeric text-warning-emphasis">
              {buckets.medium}
            </div>
            <div className="text-secondary small">
              50–80% · {bucketPct(buckets.medium, total)} del team
            </div>
          </Card>
        </div>
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">Cumplimiento bajo</div>
            <div className="h1 mb-0 app-numeric text-danger-emphasis">
              {buckets.low}
            </div>
            <div className="text-secondary small">
              &lt;50% · {bucketPct(buckets.low, total)} del team
            </div>
          </Card>
        </div>
        <div className="col-md-6 col-xl-3">
          <Card className="h-100">
            <div className="text-secondary mb-1">Sin plan</div>
            <div className="h1 mb-0 app-numeric">{buckets.withoutPlan}</div>
            <div className="text-secondary small">
              sin sesiones · {bucketPct(buckets.withoutPlan, total)} del team
            </div>
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6 mb-3">
          <Card title="Carga media del team" className="h-100">
            <div className="h1 mb-0 app-numeric">
              {formatDistance(averageLoadKm)}
            </div>
            <div className="text-secondary small">
              promedio por atleta en el periodo
            </div>
            <Table label="Carga por atleta" className="mt-3" stackOnMobile>
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th className="text-end">Cumplimiento</th>
                  <th className="text-end">Sesiones</th>
                  <th className="text-end">Km</th>
                </tr>
              </thead>
              <tbody>
                {athletes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-secondary text-center">
                      Sin atletas en este team.
                    </td>
                  </tr>
                ) : (
                  athletes.map((athlete) => (
                    <tr key={athlete.athleteId}>
                      <td data-label="Atleta">{athlete.name}</td>
                      <td className="text-end" data-label="Cumplimiento">
                        <Badge tone={complianceTone(athlete.compliance)}>
                          {athlete.compliance}%
                        </Badge>
                      </td>
                      <td
                        className="text-end app-numeric"
                        data-label="Sesiones"
                      >
                        {athlete.completed}/{athlete.sessions}
                      </td>
                      <td className="text-end app-numeric" data-label="Km">
                        {formatNumber(athlete.km, { maximumFractionDigits: 1 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card>
        </div>
        <div className="col-lg-6 mb-3">
          <Card title="Alertas" className="h-100">
            {alerts.length === 0 ? (
              <Alert variant="success" className="mb-0">
                Sin alertas activas en este team.
              </Alert>
            ) : (
              <div className="list-group list-group-flush">
                {alerts.map((alert, index) => (
                  <div
                    key={`${alert.athleteId}-${alert.kind}-${index}`}
                    className="list-group-item px-0"
                  >
                    <div className="d-flex align-items-center gap-2">
                      <Badge tone={ALERT_LABELS[alert.kind].tone}>
                        {ALERT_LABELS[alert.kind].label}
                      </Badge>
                      <strong>{alert.athleteName}</strong>
                    </div>
                    <div className="text-secondary small">{alert.message}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
