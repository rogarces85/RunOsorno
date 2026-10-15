"use client";

import { DAY_STATE_META, type CalendarDayState } from "./dayState";
import { formatPercent } from "@/lib/i18n/format";

function complianceClass(done: number, total: number): string {
  const pct = Math.round((done / total) * 100);
  if (pct >= 80) return "bg-success";
  if (pct >= 50) return "bg-warning";
  return "bg-danger";
}

export function CalendarDay({
  dateISO,
  dayNumber,
  isToday,
  isSelected,
  state,
  sessionLabel,
  compliance,
  onClick,
}: {
  dateISO: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  state: CalendarDayState;
  sessionLabel?: string;
  compliance?: { done: number; total: number };
  onClick?: () => void;
}) {
  const meta = DAY_STATE_META[state];
  const showCompliance = compliance !== undefined && compliance.total > 0;
  const pct = showCompliance
    ? Math.round((compliance.done / compliance.total) * 100)
    : 0;

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
      {showCompliance && (
        <span
          className={`calendar-day-compliance badge ${complianceClass(compliance.done, compliance.total)}`}
          data-testid="day-compliance"
          data-pct={pct}
          title={`Cumplimiento: ${compliance.done}/${compliance.total}`}
        >
          {formatPercent(pct)}
        </span>
      )}
      {sessionLabel && (
        <span className="calendar-day-session">{sessionLabel}</span>
      )}
    </button>
  );
}
