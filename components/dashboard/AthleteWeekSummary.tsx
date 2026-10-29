import Link from "next/link";
import {
  DAY_STATE_META,
  resolveDayState,
  type CalendarDayState,
} from "@/components/calendar/dayState";
import { type SessionStatus } from "@/lib/config/constants";
import { formatWeekdayShort, formatDayOfMonth } from "@/lib/i18n/format";
import { parseISO, shiftDaysISO, weekStartOfISO } from "@/lib/metrics/utils";
import type { PlanItem } from "@/lib/services/plan.service";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Resumen semanal del atleta en su dashboard (Fase 30; tira de la Fase 49).
 *
 * Una tira de 7 bloques, como la vista mensual pero apretada: cada bloque
 * lleva el día, el número y el estado de la sesión con el mismo lenguaje del
 * calendario —`resolveDayState` y las formas por `[data-state]`— para que
 * aprender uno sea aprender el otro. El color nunca es el único indicio: el
 * nombre de la sesión (o el rótulo del estado) va impreso debajo.
 *
 * La tira entera es un enlace al calendario, que es donde se registra la
 * sesión y se abre el detalle del día.
 */
export function AthleteWeekSummary({
  items,
  today,
}: {
  items: PlanItem[];
  today: string;
}) {
  const counts: Record<SessionStatus, number> = {
    planned: 0,
    in_progress: 0,
    completed: 0,
    partial: 0,
    not_done: 0,
  };
  for (const item of items) {
    counts[item.status] += 1;
  }

  const weekStart = weekStartOfISO(today);
  const porFecha = new Map(items.map((item) => [item.sessionDate, item]));
  const dias = Array.from({ length: 7 }, (_, index) => {
    const iso = shiftDaysISO(weekStart, index);
    const item = porFecha.get(iso) ?? null;
    const state: CalendarDayState = resolveDayState(item, iso, today);
    return {
      iso,
      fecha: parseISO(iso),
      item,
      state,
      meta: DAY_STATE_META[state],
    };
  });

  return (
    <Card title="Resumen de la semana" className="h-100">
      <div className="mb-3 d-flex flex-wrap gap-2">
        <Badge tone="neutral" dot={false}>
          Planificadas: {counts.planned + counts.in_progress}
        </Badge>
        <Badge tone="success" dot={false}>
          Completadas: {counts.completed}
        </Badge>
        <Badge tone="warning" dot={false}>
          Parciales: {counts.partial}
        </Badge>
        <Badge tone="danger" dot={false}>
          No realizadas: {counts.not_done}
        </Badge>
      </div>

      {items.length === 0 ? (
        <>
          <div className="weekstrip" aria-hidden>
            {dias.map((dia) => (
              <span
                key={dia.iso}
                className={`weekstrip-day weekstrip-day--muted${
                  dia.iso === today ? " is-today" : ""
                }`}
                data-state={dia.state}
              >
                <span className="weekstrip-weekday">
                  {formatWeekdayShort(dia.fecha)}
                </span>
                <span className="weekstrip-number app-numeric">
                  {formatDayOfMonth(dia.fecha)}
                </span>
              </span>
            ))}
          </div>
          <EmptyState
            title="Semana sin planificar"
            description="Tu coach aún no planificó sesiones para esta semana."
            compact
          />
        </>
      ) : (
        <Link href="/athlete/calendar" className="weekstrip text-decoration-none">
          <span className="visually-hidden">
            Ver la semana completa en el calendario
          </span>
          {dias.map((dia) => (
            <span
              key={dia.iso}
              className={`weekstrip-day${dia.iso === today ? " is-today" : ""}`}
              data-state={dia.state}
            >
              <span className="weekstrip-weekday">
                {formatWeekdayShort(dia.fecha)}
              </span>
              <span className="weekstrip-number app-numeric">
                {formatDayOfMonth(dia.fecha)}
              </span>
              {/*
                La forma del punto la pone el CSS según `data-state` (Fase 48,
                48.2): el color no puede ser el único indicio. El nombre de la
                sesión —o el rótulo del estado cuando está vacía— es lo que se
                lee.
              */}
              <span
                className="weekstrip-badge calendar-day-badge"
                style={{ color: `var(--bs-${dia.meta.color})` }}
                title={dia.meta.label}
                aria-hidden
              />
              <span className="weekstrip-label">
                {dia.item?.template?.name ?? dia.meta.label}
              </span>
            </span>
          ))}
        </Link>
      )}
    </Card>
  );
}
