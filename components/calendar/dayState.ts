import type { PlanItem } from "@/lib/services/plan.service";

export type CalendarDayState =
  | "completed"
  | "partial"
  | "not_done"
  | "planned"
  | "in_progress"
  | "rest";

/**
 * Metadatos de cada estado del día.
 *
 * Se guarda solo la **familia de color**, no las clases: el punto del
 * calendario y el badge del panel se pintarían de forma distinta y con
 * requisitos de contraste distintos, así que se derivan aquí y no en cada uso.
 *
 * - El **punto** va con `color: var(--tblr-<color>)` y su forma la decide el
 *   estado (Fase 48, tarea 48.2): el color por sí solo no puede ser el único
 *   indicio.
 * - El **badge** va con `bg-<color>-lt` + `text-<color>-ink`. Con el color puro
 *   de Tabler el texto se quedaba en 2,48:1 en verde o 1,97:1 en amarillo,
 *   muy por debajo del 4,5:1 que pide WCAG AA.
 */
export const DAY_STATE_META: Record<
  CalendarDayState,
  { label: string; color: string }
> = {
  completed: { label: "Completada", color: "success" },
  partial: { label: "Parcial", color: "warning" },
  not_done: { label: "No realizada", color: "danger" },
  planned: { label: "Planificada", color: "primary" },
  in_progress: { label: "Hoy / en curso", color: "info" },
  rest: { label: "Descanso", color: "secondary" },
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
