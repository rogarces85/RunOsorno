"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";

/**
 * Celda que acepta soltar una plantilla encima (Fase 19).
 *
 * **No** lleva `memo`, a diferencia de `CalendarDay`. Su `children` es un
 * elemento que el padre crea en cada render, así que la referencia siempre
 * cambia y `memo` no cortaría nada: daría la impresión de estar optimizado sin
 * estarlo. El trabajo real de pintar la celda está en `CalendarDay`, que sí va
 * memoizado y es el que genera el DOM (Fase 47, tarea 47.8).
 *
 * El resaltado `is-over` sale del propio `useDroppable`, que solo cambia cuando
 * el día bajo el cursor es otro; no hay estado de React en medio.
 *
 * `data-droppable` lo usan las pruebas E2E para localizar las celdas del
 * calendario del coach y elegir un día libre.
 */
export function DroppableDay({
  dateISO,
  children,
}: {
  dateISO: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateISO });
  return (
    <div
      ref={setNodeRef}
      className={`calendar-droppable${isOver ? " is-over" : ""}`}
      data-droppable={dateISO}
    >
      {children}
    </div>
  );
}
