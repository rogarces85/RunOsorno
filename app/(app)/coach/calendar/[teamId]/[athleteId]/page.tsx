import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { canManageTeam, canPlanFor } from "@/lib/permissions";
import { getMonthFeedback } from "@/lib/services/feedback.service";
import {
  getMonthPlan,
  getTeamMonthCompliance,
} from "@/lib/services/plan.service";
import { getTeamAthletes } from "@/lib/services/team.service";
import { getTemplatesByCoach } from "@/lib/services/template.service";
import { CoachCalendar } from "@/components/coach/CoachCalendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClassName } from "@/components/ui/Button";

export const instant = false;

function resolveMonth(value: string | string[] | undefined): string {
  if (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CoachAthleteCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string; athleteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { teamId, athleteId } = await params;
  const { user } = await requireRole("coach");
  const [manage, plan] = await Promise.all([
    canManageTeam(user, teamId),
    canPlanFor(user, athleteId),
  ]);
  if (!manage || !plan) {
    notFound();
  }

  const athletesResult = await getTeamAthletes(teamId, user.id);
  const athlete = athletesResult.ok
    ? athletesResult.data.find((row) => row.athleteId === athleteId)
    : undefined;
  if (!athlete) {
    notFound();
  }

  const month = resolveMonth((await searchParams).month);
  const year = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));

  const [items, compliance, templateList, messages] = await Promise.all([
    getMonthPlan(athleteId, year, monthNum),
    getTeamMonthCompliance(teamId, year, monthNum),
    getTemplatesByCoach(user.id),
    getMonthFeedback(athleteId, year, monthNum),
  ]);

  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <Link
            href={`/coach/calendar?team=${teamId}`}
            className={buttonClassName({ variant: "ghost", size: "sm" })}
          >
            ← Atletas
          </Link>
        </div>
        <PageHeader
          title={`Calendario — ${athlete.name}`}
          description="Plan de entrenamiento · click en un día para ver detalle o asignar plantilla"
        />
      </div>
      <div className="col-12">
        <CoachCalendar
          teamId={teamId}
          athleteId={athleteId}
          items={items}
          month={month}
          compliance={compliance}
          templates={templateList.map(({ id, name, sessionType }) => ({
            id,
            name,
            sessionType,
          }))}
          messages={messages}
          athletes={
            athletesResult.ok
              ? athletesResult.data.map((row) => ({
                  athleteId: row.athleteId,
                  name: row.name,
                }))
              : []
          }
        />
      </div>
    </div>
  );
}
