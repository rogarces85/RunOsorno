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
 * Usa la familia `text-*-ink`, que sí alcanza 4,5:1 sobre el tinte. La versión
 * anterior (`bg-green-lt text-green`) quedaba en 2,48:1 y axe la reportaba.
 */
export function complianceBadgeClass(percent: number): string {
  if (percent >= 80) {
    return "badge app-badge bg-success-lt text-success-ink";
  }
  if (percent >= 50) {
    return "badge app-badge bg-warning-lt text-warning-ink";
  }
  return "badge app-badge bg-danger-lt text-danger-ink";
}
