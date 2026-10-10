"use client";

import { DAY_STATE_META, type CalendarDayState } from "./dayState";

export function CalendarDay({
  dateISO,
  dayNumber,
  isToday,
  isSelected,
  state,
  sessionLabel,
  onClick,
}: {
  dateISO: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  state: CalendarDayState;
  sessionLabel?: string;
  onClick?: () => void;
}) {
  const meta = DAY_STATE_META[state];

  return (
    <button
      type="button"
      className={`calendar-day${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
      data-date={dateISO}
      data-state={state}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${dateISO}: ${meta.label}`}
      onClick={onClick}
    >
      <span className="calendar-day-number">{dayNumber}</span>
      <span
        className={`calendar-day-badge ${meta.badgeClass}`}
        title={meta.label}
      />
      {sessionLabel && (
        <span className="calendar-day-session">{sessionLabel}</span>
      )}
    </button>
  );
}
