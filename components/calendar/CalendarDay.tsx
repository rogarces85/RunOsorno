"use client";

import { memo } from "react";
import { DAY_STATE_META, type CalendarDayState } from "./dayState";
import { formatPercent } from "@/lib/i18n/format";

function complianceClass(done: number, total: number): string {
  const pct = Math.round((done / total) * 100);
  // Fondo `-lt` con texto `-ink`, no color sólido (Fase 48, tarea 48.2). Un
  // badge sólido sobre verde no llega a 4,5:1 con texto blanco ni con texto
  // gris: el gris salía en 1,72:1 y el blanco en 2,7:1. El punto de la celda
  // ya lleva el color del estado, así que aquí solo hace falta que se lea.
  if (pct >= 80) return "bg-success-lt text-success-ink";
  if (pct >= 50) return "bg-warning-lt text-warning-ink";
  return "bg-danger-lt text-danger-ink";
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

  /*
   * Nombre accesible del día (Fase 48, tarea 48.3).
   *
   * El día **no** lleva `aria-label`. Antes sí lo llevaba
   * (`"2026-10-01: Completada"`), y el resultado era peor de lo que parecía:
   * la celda muestra el número, el tipo de sesión y el porcentaje, y el nombre
   * accesible no contenía nada de eso. Con 42 celdas, axe marcaba las 42.
   *
   * El truco está en que el texto visible de un `<button>` **ya es** su nombre
   * accesible. La regla "Label in Name" (WCAG 2.5.3) pide que el texto visible
   * esté contenido en ese nombre, y si el nombre se construye a partir del
   * contenido, se cumple siempre. El estado —un punto de color, que es
   * justamente lo que no se lee con un lector de pantalla— se añade como texto
   * oculto visualmente. Así el nombre suena "1, Tempo, Completada": el "1" que
   * se ve, lo que se lee y el estado que solo estaba en el color.
   */
  return (
    <button
      type="button"
      className={`calendar-day${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
      data-date={dateISO}
      data-state={state}
      aria-current={isToday ? "date" : undefined}
      onClick={onSelect ? () => onSelect(dateISO) : undefined}
    >
      <span className="calendar-day-number">{dayNumber}</span>
      <span className="visually-hidden">, {meta.label}</span>
      {/*
        El punto lleva el color en línea y la forma la pone el CSS según
        `data-state`: el color no puede ser el único indicio (Fase 48, 48.2).
      */}
      <span
        className="calendar-day-badge"
        style={{ color: `var(--tblr-${meta.color})` }}
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
