import type { PlanItem } from "@/lib/services/plan.service";

export type CalendarDayState =
  | "completed"
  | "partial"
  | "not_done"
  | "planned"
  | "in_progress"
  | "rest";

export const DAY_STATE_META: Record<
  CalendarDayState,
  { label: string; badgeClass: string }
> = {
  completed: { label: "Completada", badgeClass: "bg-success" },
  partial: { label: "Parcial", badgeClass: "bg-warning" },
  not_done: { label: "No realizada", badgeClass: "bg-danger" },
  planned: { label: "Planificada", badgeClass: "bg-primary" },
  in_progress: { label: "Hoy / en curso", badgeClass: "bg-info" },
  rest: { label: "Descanso", badgeClass: "bg-secondary" },
};

export function resolveDayState(
  item: PlanItem | null | undefined,
  dateISO: string,
  todayISO: string,
): CalendarDayState {
  if (!item) {
    return "rest";
  }
  switch (item.status) {
    case "completed":
      return "completed";
    case "partial":
      return "partial";
    case "not_done":
      return "not_done";
    case "in_progress":
      return "in_progress";
    case "planned":
    default:
      return dateISO === todayISO ? "in_progress" : "planned";
  }
}
