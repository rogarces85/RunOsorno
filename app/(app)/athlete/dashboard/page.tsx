import Link from "next/link";
import { BIcon } from "@/components/ui/BIcon";
import { AthleteWeekSummary } from "@/components/dashboard/AthleteWeekSummary";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Alert } from "@/components/ui/Alert";
import { Badge, badgeToneFromColor } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { formatNumber, formatPercent } from "@/lib/i18n/format";
import {
  SESSION_STATUS_META,
  type SessionStatus,
} from "@/lib/config/constants";
import { requireRole } from "@/lib/auth/guards";
import { parseISO, todayISO, weekStartOfISO } from "@/lib/metrics/utils";
import { getMonthPlan, getWeekPlan } from "@/lib/services/plan.service";
import { getAthleteMetrics } from "@/lib/services/metric.service";
import { formatDateChile } from "@/lib/utils/date";

export const instant = false;

function monthRange(today: string): {
  year: number;
  month: number;
  from: string;
  to: string;
} {
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

export default async function AthleteDashboardPage() {
  const { user } = await requireRole("athlete");
  const today = todayISO();
  const { year, month, from, to } = monthRange(today);

  const [weekItems, monthItems, metricsResult] = await Promise.all([
    getWeekPlan(user.id, weekStartOfISO(today)),
    getMonthPlan(user.id, year, month),
    getAthleteMetrics(user.id, { kind: "custom", from, to }),
  ]);

  const todaySession =
    monthItems.find((item) => item.sessionDate === today) ?? null;
  const metrics = metricsResult.ok ? metricsResult.data : null;

  const todayMeta = todaySession
    ? SESSION_STATUS_META[todaySession.status as SessionStatus]
    : null;

  return (
    <div className="row">
      <div className="col-12">
        <PageHeader
          title={`Hola, ${user.name.split(" ")[0]}`}
          description="Tu sesión de hoy y el resumen de la semana."
        />

        {!metricsResult.ok ? (
          <Alert variant="danger">{metricsResult.error}</Alert>
        ) : null}

        <div className="row">
          <div className="col-lg-6 mb-3">
            <Card
              title="Tu sesión de hoy"
              className="h-100"
              actions={
                todayMeta ? (
                  <Badge tone={badgeToneFromColor(todayMeta.color)}>
                    {todayMeta.label}
                  </Badge>
                ) : null
              }
            >
              {todaySession ? (
                <>
                  <div className="app-card-lead mb-1">
                    {todaySession.template?.name ?? "Sesión"}
                  </div>
                  <div className="text-secondary mb-3">
                    {formatDateChile(parseISO(today))}
                    {todaySession.template?.sessionType
                      ? ` · ${todaySession.template.sessionType}`
                      : ""}
                  </div>
                  {todaySession.record ? (
                    <div className="text-secondary mb-3">
                      {todaySession.record.distanceKm
                        ? `${todaySession.record.distanceKm} km · `
                        : ""}
                      {todaySession.record.durationMinutes
                        ? `${todaySession.record.durationMinutes} min · `
                        : ""}
                      {todaySession.record.rpe
                        ? `RPE ${todaySession.record.rpe}`
                        : "Sin RPE"}
                    </div>
                  ) : null}
                  <Link
                    href="/athlete/calendar"
                    className={buttonClassName({ size: "sm" })}
                  >
                    {todaySession.record
                      ? "Ver detalle"
                      : "Registrar la sesión"}
                  </Link>
                </>
              ) : (
                <>
                  <div className="text-secondary mb-3">
                    Hoy no tienes sesión planificada. ¡Día de descanso!
                  </div>
                  <Link
                    href="/athlete/calendar"
                    className={buttonClassName({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Ver calendario
                  </Link>
                </>
              )}
            </Card>
          </div>
          <div className="col-lg-6 mb-3">
            <AthleteWeekSummary items={weekItems} today={today} />
          </div>
        </div>

        <StatsCards
          items={[
            {
              key: "compliance",
              label: "Cumplimiento del mes",
              value: metrics ? formatPercent(metrics.compliance.percent) : "—",
              sub: metrics
                ? `${metrics.compliance.completed} de ${metrics.compliance.total} sesiones`
                : "Sin datos",
              stamp: { icon: <BIcon name="activity" aria-hidden />, variant: "primary" },
            },
            {
              key: "streak",
              label: "Racha actual",
              value: metrics ? `${metrics.streak} d` : "—",
              sub: "Días consecutivos completados",
              tone: metrics && metrics.streak >= 3 ? "success" : "default",
              stamp: { icon: <BIcon name="trophy" aria-hidden />, variant: "success" },
            },
            {
              key: "km",
              label: "Distancia del mes",
              value: metrics ? `${formatNumber(metrics.totals.km)} km` : "—",
              stamp: { icon: <BIcon name="map" aria-hidden />, variant: "info" },
            },
            {
              key: "minutes",
              label: "Tiempo del mes",
              value: metrics
                ? `${formatNumber(metrics.totals.minutes, { maximumFractionDigits: 0 })} min`
                : "—",
              stamp: { icon: <BIcon name="stopwatch" aria-hidden />, variant: "warning" },
            },
          ]}
        />

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
