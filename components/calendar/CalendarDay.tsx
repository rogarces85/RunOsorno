"use client";

import { memo } from "react";
import { DAY_STATE_META, type CalendarDayState } from "./dayState";
import { formatPercent } from "@/lib/i18n/format";

function complianceClass(done: number, total: number): string {
  const pct = Math.round((done / total) * 100);
  if (pct >= 80) return "bg-success";
  if (pct >= 50) return "bg-warning";
  return "bg-danger";
}

/**
 * Un día del calendario.
 *
 * Va envuelto en `memo` (Fase 47, tarea 47.8) porque el calendario tiene entre
 * 28 y 42 celdas y se repinta entero en cuanto cambia algo: seleccionar un día,
 * abrir el panel, recibir un `router.refresh()` tras guardar el registro.
 * Sin `memo`, cada una de esas pantallas re-renderizaba los ~31 días aunque
 * 30 de ellos no hubieran cambiado.
 *
 * `memo` solo sirve si las props son estables, y aquí lo son por construcción:
 * `dateISO`, `dayNumber`, `state` y `sessionLabel` son primitivos o cadenas,
 * `compliance` viene del objeto del servidor (misma referencia mientras no
 * cambie el mes) y `onSelect` es un único callback creado con `useCallback` en
 * `MonthCalendar`, no una flecha nueva por día. Por eso `onSelect` recibe solo
 * la fecha: el ítem lo resuelve el calendario, no cada celda.
 */
export const CalendarDay = memo(function CalendarDay({
  dateISO,
  dayNumber,
  isToday,
  isSelected,
  state,
  sessionLabel,
  compliance,
  onSelect,
}: {
  dateISO: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  state: CalendarDayState;
  sessionLabel?: string;
  compliance?: { done: number; total: number };
  /** Callback estable; la celda no necesita saber qué sesión tiene. */
  onSelect?: (dateISO: string) => void;
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
      onClick={onSelect ? () => onSelect(dateISO) : undefined}
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
});
