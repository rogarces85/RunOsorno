import { AthleteMetricsPanel } from "@/components/metrics/AthleteMetricsPanel";
import { ComplianceChart } from "@/components/metrics/ComplianceChart";
import { LoadChart } from "@/components/metrics/LoadChart";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { ProgressChart } from "@/components/metrics/ProgressChart";
import { TypeDistributionChart } from "@/components/metrics/TypeDistributionChart";
import { requireRole } from "@/lib/auth/guards";
import { getAthleteMetrics } from "@/lib/services/metric.service";
import { periodFromSearchParams } from "@/lib/validations/metric.schemas";

export const instant = false;

export default async function AthleteMetricsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireRole("athlete");
  const period = periodFromSearchParams(await searchParams);
  const result = await getAthleteMetrics(user.id, period);

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

  return (
    <div className="row">
      <div className="col-12">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="page-title mb-1">Mis métricas</h2>
            <div className="text-secondary">
              {metrics.period.from} → {metrics.period.to} · {metrics.totals.km}{" "}
              km · {metrics.totals.minutes} min
            </div>
          </div>
          <PeriodSelector basePath="/athlete/metrics" current={period} />
        </div>

        <AthleteMetricsPanel metrics={metrics} />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Progresión semanal</h3>
              </div>
              <div className="card-body">
                <ProgressChart points={metrics.progression} />
              </div>
            </div>
          </div>
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Carga semanal (km + minutos)</h3>
              </div>
              <div className="card-body">
                <LoadChart points={metrics.progression} />
              </div>
            </div>
          </div>
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Distribución por tipo</h3>
              </div>
              <div className="card-body">
                <TypeDistributionChart distribution={metrics.distribution} />
              </div>
            </div>
          </div>
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Cumplimiento</h3>
              </div>
              <div className="card-body">
                <ComplianceChart
                  completed={metrics.compliance.completed}
                  total={metrics.compliance.total}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
