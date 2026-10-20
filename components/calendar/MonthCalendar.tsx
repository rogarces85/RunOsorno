"use client";

import { useCallback, useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { PlanItem } from "@/lib/services/plan.service";
import { formatMonthYear, formatWeekdays } from "@/lib/i18n/format";
import { toISODate } from "@/lib/utils/date";
import { formatSessionType } from "@/lib/utils/format";
import { CalendarDay } from "./CalendarDay";
import { DroppableDay } from "./DroppableDay";
import { Button } from "@/components/ui/Button";
import { resolveDayState } from "./dayState";

// Las abreviaturas de día vienen de `Intl` (Fase 46): "lun", "mar", "mié"...
// en el locale activo, en vez de una lista escrita a mano que se queda
// desincronizada del calendario en cuanto se agrega un idioma.
const WEEKDAYS = formatWeekdays();

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function monthLabel(year: number, month: number): string {
  return formatMonthYear(year, month);
}

function parseMonth(value: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return { year: Number(match[1]), month: month - 1 };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function MonthCalendar({
  items,
  month,
  mode = "athlete",
  compliance,
  selectedDate,
  onMonthChange,
  onDayClick,
}: {
  items: PlanItem[];
  month?: string;
  mode?: "athlete" | "coach";
  compliance?: Record<string, { done: number; total: number }>;
  selectedDate?: string | null;
  onMonthChange?: (monthISO: string) => void;
  onDayClick?: (dateISO: string, item: PlanItem | null) => void;
}) {
  const today = toISODate(new Date());
  const [internalView, setInternalView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const controlled = month !== undefined;
  const view = controlled ? parseMonth(month) : internalView;

  // El índice fecha → sesión se memoriza (Fase 47, tarea 47.8). Antes se
  // reconstruía en cada render, aunque `items` no hubiera cambiado.
  const itemsByDate = useMemo(
    () => new Map(items.map((item) => [item.sessionDate, item] as const)),
    [items],
  );

  // Un único callback para las 28-42 celdas. Antes cada `CalendarDay` recibía
  // una flecha nueva en cada render, lo que anulaba el `memo` del componente:
  // la prop `onClick` cambiaba siempre y React repintaba todos los días.
  const handleDayClick = useCallback(
    (dateISO: string) => {
      onDayClick?.(dateISO, itemsByDate.get(dateISO) ?? null);
    },
    [onDayClick, itemsByDate],
  );

  const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const goPrev = () => {
    const next =
      view.month === 0
        ? { year: view.year - 1, month: 11 }
        : { year: view.year, month: view.month - 1 };
    if (controlled) {
      onMonthChange?.(`${next.year}-${pad(next.month + 1)}`);
    } else {
      setInternalView(next);
    }
  };
  const goNext = () => {
    const next =
      view.month === 11
        ? { year: view.year + 1, month: 0 }
        : { year: view.year, month: view.month + 1 };
    if (controlled) {
      onMonthChange?.(`${next.year}-${pad(next.month + 1)}`);
    } else {
      setInternalView(next);
    }
  };

  const title = monthLabel(view.year, view.month);

  return (
    <div className="card" data-mode={mode}>
      <div className="card-header">
        <h2 className="card-title" data-testid="calendar-month-label">
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </h2>
        <div className="btn-list">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Mes anterior"
            title="Mes anterior"
            onClick={goPrev}
          >
            <IconChevronLeft size={18} stroke={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Mes siguiente"
            title="Mes siguiente"
            onClick={goNext}
          >
            <IconChevronRight size={18} stroke={1.75} />
          </Button>
        </div>
      </div>
      <div className="card-body">
        <div className="calendar-weekdays">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: cellCount }, (_, cell) => {
            const dayNumber = cell - firstWeekday + 1;
            if (dayNumber < 1 || dayNumber > daysInMonth) {
              return (
                <div key={cell} className="calendar-cell-empty" aria-hidden />
              );
            }
            const dateISO = `${view.year}-${pad(view.month + 1)}-${pad(dayNumber)}`;
            const item = itemsByDate.get(dateISO) ?? null;
            const state = resolveDayState(item, dateISO, today);
            const day = (
              <CalendarDay
                dateISO={dateISO}
                dayNumber={dayNumber}
                isToday={dateISO === today}
                isSelected={dateISO === (selectedDate ?? null)}
                state={state}
                sessionLabel={
                  item?.template
                    ? formatSessionType(item.template.sessionType)
                    : undefined
                }
                compliance={compliance?.[dateISO]}
                onSelect={handleDayClick}
              />
            );
            if (mode === "coach") {
              return (
                <DroppableDay key={cell} dateISO={dateISO}>
                  {day}
                </DroppableDay>
              );
            }
            return (
              <div key={cell} className="calendar-cell">
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
