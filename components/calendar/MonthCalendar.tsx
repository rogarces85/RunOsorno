"use client";

import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { PlanItem } from "@/lib/services/plan.service";
import { toISODate } from "@/lib/utils/date";
import { formatSessionType } from "@/lib/utils/format";
import { CalendarDay } from "./CalendarDay";
import { resolveDayState } from "./dayState";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

export function MonthCalendar({
  items,
  selectedDate,
  onDayClick,
}: {
  items: PlanItem[];
  selectedDate?: string | null;
  onDayClick?: (dateISO: string, item: PlanItem | null) => void;
}) {
  const today = toISODate(new Date());
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const itemsByDate = new Map(
    items.map((item) => [item.sessionDate, item] as const),
  );
  const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const goPrev = () =>
    setView((current) =>
      current.month === 0
        ? { year: current.year - 1, month: 11 }
        : { year: current.year, month: current.month - 1 },
    );
  const goNext = () =>
    setView((current) =>
      current.month === 11
        ? { year: current.year + 1, month: 0 }
        : { year: current.year, month: current.month + 1 },
    );

  const title = monthLabel(view.year, view.month);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title" data-testid="calendar-month-label">
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </h3>
        <div className="btn-list">
          <button
            type="button"
            className="btn btn-sm btn-ghost-secondary"
            aria-label="Mes anterior"
            title="Mes anterior"
            onClick={goPrev}
          >
            <IconChevronLeft size={18} stroke={1.75} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost-secondary"
            aria-label="Mes siguiente"
            title="Mes siguiente"
            onClick={goNext}
          >
            <IconChevronRight size={18} stroke={1.75} />
          </button>
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
            return (
              <CalendarDay
                key={cell}
                dateISO={dateISO}
                dayNumber={dayNumber}
                isToday={dateISO === today}
                isSelected={dateISO === (selectedDate ?? null)}
                state={state}
                sessionLabel={
                  item?.template ? formatSessionType(item.template.sessionType) : undefined
                }
                onClick={() => onDayClick?.(dateISO, item)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
