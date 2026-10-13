import Link from "next/link";
import { AthleteWeekSummary } from "@/components/dashboard/AthleteWeekSummary";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { SESSION_STATUS_META, type SessionStatus } from "@/lib/config/constants";
import { requireRole } from "@/lib/auth/guards";
import { parseISO, todayISO, weekStartOfISO } from "@/lib/metrics/utils";
import { getMonthPlan, getWeekPlan } from "@/lib/services/plan.service";
import { getAthleteMetrics } from "@/lib/services/metric.service";
import { formatDateChile } from "@/lib/utils/date";

export const instant = false;

function monthRange(today: string): { year: number; month: number; from: string; to: string } {
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

  const todaySession = monthItems.find((item) => item.sessionDate === today) ?? null;
  const metrics = metricsResult.ok ? metricsResult.data : null;

  const todayMeta = todaySession
    ? SESSION_STATUS_META[todaySession.status as SessionStatus]
    : null;

  return (
    <div className="row">
      <div className="col-12">
        <h2 className="page-title mb-3">Hola, {user.name.split(" ")[0]}</h2>

        {!metricsResult.ok ? (
          <div className="alert alert-danger" role="alert">
            {metricsResult.error}
          </div>
        ) : null}

        <div className="row">
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">
                <h3 className="card-title">Tu sesión de hoy</h3>
                {todayMeta ? (
                  <span
                    className={`badge bg-${todayMeta.color}-lt text-${todayMeta.color} ms-auto`}
                  >
                    {todayMeta.label}
                  </span>
                ) : null}
              </div>
              <div className="card-body">
                {todaySession ? (
                  <>
                    <div className="h2 mb-1">
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
                    <Link href="/athlete/calendar" className="btn btn-primary btn-sm">
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
                    <Link href="/athlete/calendar" className="btn btn-outline-secondary btn-sm">
                      Ver calendario
                    </Link>
                  </>
                )}
              </div>
            </div>
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
              value: metrics ? `${metrics.compliance.percent}%` : "—",
              sub: metrics
                ? `${metrics.compliance.completed} de ${metrics.compliance.total} sesiones`
                : "Sin datos",
            },
            {
              key: "streak",
              label: "Racha actual",
              value: metrics ? `${metrics.streak} d` : "—",
              sub: "Días consecutivos completados",
              tone: metrics && metrics.streak >= 3 ? "success" : "default",
            },
            {
              key: "km",
              label: "Distancia del mes",
              value: metrics ? `${metrics.totals.km} km` : "—",
            },
            {
              key: "minutes",
              label: "Tiempo del mes",
              value: metrics ? `${metrics.totals.minutes} min` : "—",
            },
          ]}
        />

        {metrics && metrics.totals.sessions === 0 ? (
          <div className="alert alert-secondary" role="alert">
            Aún no tienes sesiones este mes. Tu coach publicará tu plan pronto.
          </div>
        ) : null}

        <div className="mt-2">
          <Link href="/athlete/metrics" className="btn btn-outline-secondary btn-sm">
            Ver mis métricas completas
          </Link>
        </div>
      </div>
    </div>
  );
}
