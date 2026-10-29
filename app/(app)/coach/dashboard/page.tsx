import Link from "next/link";
import { notFound } from "next/navigation";
import { BIcon } from "@/components/ui/BIcon";
import { CoachTodaySessions } from "@/components/dashboard/CoachTodaySessions";
import { DashboardStatsCard } from "@/components/dashboard/DashboardStatsCard";
import { SeriesGraphSmall } from "@/components/dashboard/SeriesGraphSmall";
import { ProgressBarDashboard } from "@/components/dashboard/ProgressBarDashboard";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/guards";
import { canManageTeam } from "@/lib/permissions";
import { getTeamTodaySessions } from "@/lib/services/dashboard.service";
import { getTeamMetrics } from "@/lib/services/metric.service";
import { getTeamsByCoach } from "@/lib/services/team.service";

export const instant = false;

export default async function CoachDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireRole("coach");
  const params = await searchParams;
  const teams = await getTeamsByCoach(user.id);

  if (teams.length === 0) {
    return null;
  }

  const teamId =
    typeof params.team === "string" && teams.some((team) => team.id === params.team)
      ? params.team
      : teams[0].id;
  const selected = teams.find((team) => team.id === teamId) ?? teams[0];

  const allowed = await canManageTeam({ id: user.id, role: "coach" }, teamId);
  if (!allowed) {
    notFound();
  }

  const [metricsResult, todaySessions] = await Promise.all([
    getTeamMetrics(teamId, { kind: "season" }),
    getTeamTodaySessions(teamId, user.id),
  ]);

  if (!metricsResult.ok) {
    return null;
  }

  const metrics = metricsResult.data;
  const totals = metrics.athletes.reduce(
    (sum, athlete) => ({
      sessions: sum.sessions + athlete.sessions,
      completed: sum.completed + athlete.completed,
    }),
    { sessions: 0, completed: 0 },
  );
  const compliancePercent =
    totals.sessions === 0 ? 0 : Math.round((totals.completed / totals.sessions) * 100);

  return null;
}