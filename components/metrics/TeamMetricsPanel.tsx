import type { AthleteAlert } from "@/lib/metrics/alerts";
import type { TeamMetrics } from "@/lib/services/metric.service";
import { formatNumber, formatPercent } from "@/lib/i18n/format";
import { formatDistance } from "@/lib/utils/format";
import { complianceBadgeClass } from "./chartColors";

type TeamMetricsPanelProps = {
  metrics: TeamMetrics;
};

const ALERT_LABELS: Record<AthleteAlert["kind"], { label: string; badge: string }> = {
  no_logging: { label: "Sin registrar", badge: "bg-yellow-lt text-yellow-ink" },
  load_drop: { label: "Caída de carga", badge: "bg-red-lt text-red-ink" },
  high_rpe: { label: "RPE alto", badge: "bg-orange-lt text-orange-ink" },
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
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Cumplimiento alto</div>
              <div className="h1 mb-0 text-green">{buckets.high}</div>
              <div className="text-secondary small">
                &gt;80% · {bucketPct(buckets.high, total)} del team
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Cumplimiento medio</div>
              <div className="h1 mb-0 text-yellow">{buckets.medium}</div>
              <div className="text-secondary small">
                50–80% · {bucketPct(buckets.medium, total)} del team
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Cumplimiento bajo</div>
              <div className="h1 mb-0 text-red">{buckets.low}</div>
              <div className="text-secondary small">
                &lt;50% · {bucketPct(buckets.low, total)} del team
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Sin plan</div>
              <div className="h1 mb-0">{buckets.withoutPlan}</div>
              <div className="text-secondary small">
                sin sesiones · {bucketPct(buckets.withoutPlan, total)} del team
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h2 className="card-title">Carga media del team</h2>
            </div>
            <div className="card-body">
              <div className="h1 mb-0">{formatDistance(averageLoadKm)}</div>
              <div className="text-secondary small">
                promedio por atleta en el periodo
              </div>
              <div className="table-responsive mt-3">
                <table className="table table-vcenter table-sm">
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
                          <td>{athlete.name}</td>
                          <td className="text-end">
                            <span
                              className={complianceBadgeClass(athlete.compliance)}
                            >
                              {athlete.compliance}%
                            </span>
                          </td>
                          <td className="text-end">
                            {athlete.completed}/{athlete.sessions}
                          </td>
                          <td className="text-end">{formatNumber(athlete.km, { maximumFractionDigits: 1 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h2 className="card-title">Alertas</h2>
            </div>
            <div className="card-body">
              {alerts.length === 0 ? (
                <div className="alert alert-success mb-0" role="alert">
                  Sin alertas activas en este team.
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {alerts.map((alert, index) => (
                    <div
                      key={`${alert.athleteId}-${alert.kind}-${index}`}
                      className="list-group-item px-0"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span className={ALERT_LABELS[alert.kind].badge}>
                          {ALERT_LABELS[alert.kind].label}
                        </span>
                        <strong>{alert.athleteName}</strong>
                      </div>
                      <div className="text-secondary small">{alert.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
