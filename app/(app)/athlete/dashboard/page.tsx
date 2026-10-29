import Link from "next/link";
import { BIcon } from "@/components/ui/BIcon";
import { DashboardStatsCard } from "@/components/dashboard/DashboardStatsCard";
import { SeriesGraphSmall } from "@/components/dashboard/SeriesGraphSmall";
import { ProgressBarDashboard } from "@/components/dashboard/ProgressBarDashboard";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";
import { todayISO, parseISO, weekStartOfISO } from "@/lib/metrics/utils";
import { getMonthPlan, getWeekPlan } from "@/lib/services/plan.service";
import { getAthleteMetrics } from "@/lib/services/metric.service";
import { formatNumber, formatPercent } from "@/lib/i18n/format";
import { formatDateChile } from "@/lib/utils/date";
import { SESSION_STATUS_META } from "@/lib/config/constants";
import { AthleteWeekSummary } from "@/components/dashboard/AthleteWeekSummary";

export const instant = false;

export default async function AthleteDashboardPage() {
  const { user } = await requireRole("athlete");
  const today = todayISO();
  const { year, month, from, to } = monthRange(today);

  const [weekItems, monthItems, metricsResult] = await Promise.all([
    getWeekPlan(user.id, weekStartOfISO(today)),
    getMonthPlan(user.id, year, month),
    getAthleteMetrics(user.id, { kind: "custom", from, to }),
  ]);

  const todaySession = monthItems.find(
    (item) => item.sessionDate === today
  ) ?? null;
  const metrics = metricsResult.ok ? metricsResult.data : null;

  // Build compliance percent from metrics
  const compliancePercent = metrics
    ? Math.round((metrics.compliance.completed / metrics.compliance.total) * 100)
    : 0;

  // Get today's session status meta, safely
  let todayMeta = null;
  if (todaySession?.status) {
    todayMeta = SESSION_STATUS_META[todaySession.status as keyof typeof SESSION_STATUS_META];
  }

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader title={`Hola, ${user.name.split(" ")[0]}`} description="Tu sesión de hoy y el resumen de la semana." />

        {/* Metrics error state */}
        {metricsResult.ok === false ? (
          <Alert variant="danger">{metricsResult.error}</Alert>
        ) : null}

        <div className="row">
          <div className="col-lg-4 mb-3">
            <DashboardStatsCard
              items={[
                {
                  key: "compliance",
                  label: "Cumplimiento del mes",
                  value: `${compliancePercent}%`,
                  sub: `${metrics?.compliance?.completed ?? 0} de ${metrics?.compliance?.total ?? 0} sesiones`,
                  tone: compliancePercent >= 80 ? "success" : compliancePercent >= 50 ? "warning" : "danger",
                  variant: "elevated",
                  icon: <BIcon name="check-circle" aria-hidden />,
                },
                {
                  key: "km",
                  label: "Distancia del mes",
                  value: metrics ? `${formatNumber(metrics.totals.km)} km` : "—",
                  tone: "info",
                  variant: "outlined",
                  icon: <BIcon name="map" aria-hidden />,
                },
                {
                  key: "minutes",
                  label: "Tiempo del mes",
                  value: metrics
                    ? `${formatNumber(metrics.totals.minutes, { maximumFractionDigits: 0 })} min`
                    : "—",
                  tone: "warning",
                  variant: "outlined",
                  icon: <BIcon name="stopwatch" aria-hidden />,
                },
              ]}
            />
          </div>

          <div className="col-lg-4 mb-3">
            <ProgressBarDashboard
              value={compliancePercent}
              label="Cumplimiento del mes"
              variant={compliancePercent >= 80 ? "success" : compliancePercent >= 50 ? "warning" : "danger"}
            />
          </div>

          <div className="col-lg-4 mb-3">
            <SeriesGraphSmall
              teamId={user.id}
              dataset={[]}
            />
          </div>
        </div>

        {/* Today's session card */}
        <Card title="Tu sesión de hoy" className="h-100">
          <div className="app-card-lead mb-1">
            {todaySession?.template?.name ?? "Sesión"}
          </div>
          <div className="text-secondary mb-3">
            {formatDateChile(parseISO(today))}
            {todaySession?.template?.sessionType
              ? ` · ${todaySession?.template?.sessionType}`
              : ""}
          </div>
          {todaySession?.record ? (
            <div className="text-secondary mb-3">
              {todaySession?.record.distanceKm
                ? `${todaySession?.record.distanceKm} km · `
                : ""}
              {todaySession?.record.durationMinutes
                ? `${todaySession?.record.durationMinutes} min · `
                : ""}
              {todaySession?.record.rpe
                ? `RPE ${todaySession?.record.rpe}`
                : "Sin RPE"}
            </div>
          ) : null}
          <Link
            href="/athlete/calendar"
            className={buttonClassName({ size: "sm" })}
          >
            {todaySession?.record
              ? "Ver detalle"
              : "Registrar la sesión"}
          </Link>
        </Card>

        <AthleteWeekSummary items={weekItems} today={today} />

        {metrics && metrics.totals.sessions === 0 ? (
          <Alert variant="secondary">
            Aún no tienes sesiones este mes. Tu coach publicará tu plan pronto.
          </Alert>
        ) : null}

        <div className="mt-2">
          <Link
            href="/athlete/metrics"
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Ver mis métricas completas
          </Link>
        </div>
      </div>
    </div>
  );
}

function monthRange(today: string) {
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    year,
    month,
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}