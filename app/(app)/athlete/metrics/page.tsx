import { ExportButton } from "@/components/export/ExportButton";
import { AthleteMetricsPanel } from "@/components/metrics/AthleteMetricsPanel";
import { ComplianceChart } from "@/components/metrics/ComplianceChart";
import { LoadChart } from "@/components/metrics/LoadChart";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { ProgressChart } from "@/components/metrics/ProgressChart";
import { TypeDistributionChart } from "@/components/metrics/TypeDistributionChart";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth/guards";
import { formatDate } from "@/lib/i18n/format";
import { formatDistance, formatDuration } from "@/lib/utils/format";
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
          <Alert variant="danger">{result.error}</Alert>
        </div>
      </div>
    );
  }
  const metrics = result.data;

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title="Mis métricas"
          description={`${formatDate(metrics.period.from)} → ${formatDate(metrics.period.to)} · ${formatDistance(metrics.totals.km)} · ${formatDuration(metrics.totals.minutes)}`}
          actions={
            <>
              <PeriodSelector basePath="/athlete/metrics" current={period} />
              <ExportButton
                target={{
                  kind: "athlete",
                  athleteId: user.id,
                  formats: ["pdf", "xlsx"],
                }}
                period={period}
                size="sm"
              />
            </>
          }
        />

        <AthleteMetricsPanel metrics={metrics} />

        <div className="row">
          <div className="col-lg-6 mb-3">
            <Card title="Progresión semanal" className="h-100">
              <ProgressChart points={metrics.progression} />
            </Card>
          </div>
          <div className="col-lg-6 mb-3">
            <Card title="Carga semanal (km + minutos)" className="h-100">
              <LoadChart points={metrics.progression} />
            </Card>
          </div>
          <div className="col-lg-6 mb-3">
            <Card title="Distribución por tipo" className="h-100">
              <TypeDistributionChart distribution={metrics.distribution} />
            </Card>
          </div>
          <div className="col-lg-6 mb-3">
            <Card title="Cumplimiento" className="h-100">
              <ComplianceChart
                completed={metrics.compliance.completed}
                total={metrics.compliance.total}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
