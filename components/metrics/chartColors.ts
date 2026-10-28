/**
 * Colores de las gráficas (Fase C, tarea 7.1).
 *
 * Antes eran ocho hex fijos (`#206bc4`, `#f59f00`…) que no cambiaban con el tema: en
 * oscuro las series quedaban sobre un fondo casi negro con el mismo tono que en claro.
 * Ahora se resuelven con tokens CSS (`--app-chart-1…5`), así que el mismo SVG se ve
 * correcto en los dos temas sin pasar el tema por props ni recalcular en cliente.
 *
 * La paleta y su contraste están declarados en `app/styles/tokens.css` y se validan en
 * `tests/unit/chart-colors.test.ts` y `scripts/verify-tokens.ts`.
 */

/** Cinco series. La leyenda y la etiqueta de valor siguen siendo la señal principal. */
export const CHART_COLORS = [
  "var(--app-chart-1)",
  "var(--app-chart-2)",
  "var(--app-chart-3)",
  "var(--app-chart-4)",
  "var(--app-chart-5)",
] as const;

export function colorForIndex(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}

/**
 * Clases del badge de cumplimiento.
 *
 * Usa las clases `text-bg-*` de Bootstrap/AdminLTE, que generan un fondo con
 * tinte y texto con contraste adecuado (4,5:1) sobre ambos temas.
 */
export function complianceBadgeClass(percent: number): string {
  if (percent >= 80) {
    return "badge app-badge text-bg-success";
  }
  if (percent >= 50) {
    return "badge app-badge text-bg-warning";
  }
  return "badge app-badge text-bg-danger";
}
