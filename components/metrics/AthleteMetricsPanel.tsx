import type { AthleteMetrics } from "@/lib/services/metric.service";

type AthleteMetricsPanelProps = {
  metrics: AthleteMetrics;
};

function formatNullable(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function AthleteMetricsPanel({ metrics }: AthleteMetricsPanelProps) {
  const { compliance, weeklyLoad, streak, distribution, vo2max, avgRpe } =
    metrics;
  const distEntries = Object.entries(distribution).filter(
    ([, percent]) => percent > 0,
  );

  return (
    <>
      <div className="row mb-3">
        <div className="col-md-6 col-xl-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-secondary mb-1">Cumplimiento</div>
              <div className="h1 mb-0">{compliance.percent}%</div>
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
              <div className="h1 mb-0">{weeklyLoad.km} km</div>
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
              <div className="text-secondary mb-1">RPE medio</div>
              <div className="h2 mb-0">{formatNullable(avgRpe)}</div>
              <div className="text-secondary small">sobre 10</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
