import type { AthleteMetrics } from "@/lib/services/metric.service";
import { formatPercent } from "@/lib/i18n/format";
import { formatDistance } from "@/lib/utils/format";

type AthleteMetricsPanelProps = {
  metrics: AthleteMetrics;
};

function formatNullable(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function AthleteMetricsPanel({ metrics }: AthleteMetricsPanelProps) {
  const {
    compliance,
    weeklyLoad,
    streak,
    distribution,
    vo2max,
    thresholdHr,
    avgRpe,
    plannedRpe,
    hrZones,
  } = metrics;
  const distEntries = Object.entries(distribution).filter(
    ([, percent]) => percent > 0,
  );
  const rpeDelta =
    avgRpe !== null && plannedRpe !== null
      ? Math.round((avgRpe - plannedRpe) * 10) / 10
      : null;

  return (
    <>
      {hrZones === null ? (
        <div className="alert alert-warning" role="alert">
          Datos insuficientes. Completa tu perfil con FC máx y FC reposo.
        </div>
      ) : null}

      <div className="row mb-3">
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Cumplimiento</div>
              <div className="h1 mb-0">{formatPercent(compliance.percent)}</div>
              <div className="text-secondary small">
                {compliance.completed} de {compliance.total} sesiones
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Carga semanal</div>
              <div className="h1 mb-0">{formatDistance(weeklyLoad.km)}</div>
              <div className="text-secondary small">
                {weeklyLoad.minutes} min · TSS {formatNullable(weeklyLoad.tss)} ·
                TRIMP {formatNullable(weeklyLoad.trimp)}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Racha</div>
              <div className="h1 mb-0">{streak}</div>
              <div className="text-secondary small">días consecutivos</div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Distribución</div>
              {distEntries.length === 0 ? (
                <div className="text-secondary">—</div>
              ) : (
                <div className="d-flex flex-wrap gap-1">
                  {distEntries.map(([type, percent]) => (
                    <span key={type} className="badge bg-blue-lt text-blue">
                      {type} {percent}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">VO2máx estimado</div>
              <div className="h2 mb-0">
                {vo2max === null ? "—" : Math.round(vo2max * 10) / 10}
              </div>
              <div className="text-secondary small">ml/kg/min</div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">FC de umbral</div>
              <div className="h2 mb-0">{formatNullable(thresholdHr)}</div>
              <div className="text-secondary small">
                {thresholdHr === null ? "sin datos de FC" : "lpm estimados"}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">RPE medio vs planificado</div>
              <div className="h2 mb-0">
                {formatNullable(avgRpe)}{" "}
                <span className="text-secondary h4">/ {formatNullable(plannedRpe)}</span>
              </div>
              {rpeDelta === null ? (
                <div className="text-secondary small">real / planificado</div>
              ) : rpeDelta > 0 ? (
                <span className="badge bg-red-lt text-red">
                  +{rpeDelta} sobre objetivo
                </span>
              ) : rpeDelta < 0 ? (
                <span className="badge bg-blue-lt text-blue">
                  {rpeDelta} bajo objetivo
                </span>
              ) : (
                <span className="badge bg-green-lt text-green">
                  en objetivo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {hrZones !== null ? (
        <div className="row mb-3">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Zonas de FC (Karvonen)</h3>
              </div>
              <div className="table-responsive">
                <table className="table table-vcenter table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Zona</th>
                      <th className="text-end">Desde</th>
                      <th className="text-end">Hasta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hrZones.map((zone) => (
                      <tr key={zone.zone}>
                        <td>Zona {zone.zone}</td>
                        <td className="text-end">{zone.from} lpm</td>
                        <td className="text-end">{zone.to} lpm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
