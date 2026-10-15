export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isSameWeek(a: Date, b: Date): boolean {
  return getWeekStart(a).getTime() === getWeekStart(b).getTime();
}

import { formatDate, formatDateTime } from "@/lib/i18n/format";

/**
 * Fechas en formato chileno, siempre en hora de Santiago.
 *
 * El formateo real vive en `lib/i18n/format` (Fase 46); estas funciones se
 * mantienen porque son la API que usa casi toda la app y porque el nombre
 * `formatDateChile` documenta la zona horaria en la propia llamada.
 */
export function formatDateChile(date: Date): string {
  return formatDate(date);
}

/** `15/10/2026, 21:30` en hora de Chile. */
export function formatDateTimeChile(date: Date): string {
  return formatDateTime(date);
}
