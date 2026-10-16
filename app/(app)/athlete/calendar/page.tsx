import { AthleteCalendar } from "@/components/athlete/AthleteCalendar";
import { requireRole } from "@/lib/auth/guards";
import { getMonthFeedback } from "@/lib/services/feedback.service";
import { getMonthPlan } from "@/lib/services/plan.service";
import { getNotDoneReasons, getEditWindowHours } from "@/lib/services/settings.service";

export const instant = false;

function resolveMonth(value: string | string[] | undefined): string {
  if (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AthleteCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireRole("athlete");
  const month = resolveMonth((await searchParams).month);
  const year = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));
  const [items, messages, reasons, editWindowHours] = await Promise.all([
    getMonthPlan(user.id, year, monthNum),
    getMonthFeedback(user.id, year, monthNum),
    getNotDoneReasons(),
    getEditWindowHours(),
  ]);

  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <h1 className="page-title mb-0">Calendario</h1>
          <div className="text-secondary">
            {user.name} — tu plan de entrenamiento
          </div>
        </div>
        <AthleteCalendar
          items={items}
          month={month}
          messages={messages}
          reasons={reasons}
          editWindowHours={editWindowHours}
        />
      </div>
    </div>
  );
}
