import type { ReactNode } from "react";
import { formatNumber } from "@/lib/i18n/format";

/**
 * Marco de las gráficas de métricas (Fase 47, tarea 47.6).
 *
 * Separación deliberada entre lo que se estira y lo que se lee:
 *
 * - El **SVG** lleva `preserveAspectRatio="none"`: se estira al ancho del
 *   contenedor y la escala vertical no se deforma. Por eso los trazos usan
 *   `vector-effect="non-scaling-stroke"`, que los mantiene de 2 px aunque el SVG
 *   se escale.
 * - Las **etiquetas son HTML**, colocadas con porcentajes sobre la misma caja.
 *   Si estuvieran dentro del SVG, en un móvil se leerían a la mitad de tamaño,
 *   que es el problema que `DonutChart` ya resolvió en la Fase 39.
 *
 * Es un componente de servidor: no necesita JavaScript para pintarse, así que
 * la gráfica está en el HTML desde la primera respuesta.
 */

/** Altura en unidades del `viewBox`. La real la fija el CSS. */
export const PLOT_HEIGHT = 200;

/** Ancho de banda de una categoría, en unidades del `viewBox`. */
export const BAND_WIDTH = 100;

export type AxisTick = {
  /** Valor numérico (define la posición vertical). */
  value: number;
  /** Texto que se muestra. */
  label: string;
};

export function ChartFrame({
  bandCount,
  yTicks,
  yTicksRight,
  yAxisLabel,
  xLabels,
  children,
  ariaLabel,
  testId,
}: {
  bandCount: number;
  yTicks: AxisTick[];
  /** Eje derecho opcional (para la segunda serie de `LoadChart`). */
  yTicksRight?: AxisTick[];
  yAxisLabel?: string;
  /** Etiquetas del eje horizontal, con su posición ya calculada en 0..1. */
  xLabels: { position: number; label: string; title?: string }[];
  children: ReactNode;
  ariaLabel: string;
  testId: string;
}) {
  return (
    <figure className="metric-chart" data-testid={testId}>
      <div className="metric-chart-body">
        {yAxisLabel ? (
          <span className="metric-chart-unit">{yAxisLabel}</span>
        ) : null}
        <div className="metric-chart-axis metric-chart-axis--y">
          {[...yTicks].reverse().map((tick) => (
            <span
              key={tick.value}
              className="metric-chart-tick"
              style={{ bottom: `${(tick.value / yMax(yTicks)) * 100}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
        <div className="metric-chart-plot">
          <svg
            viewBox={`0 0 ${Math.max(1, bandCount) * BAND_WIDTH} ${PLOT_HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={ariaLabel}
            data-testid={`${testId}-svg`}
          >
            {children}
          </svg>
        </div>
        {yTicksRight ? (
          <div className="metric-chart-axis metric-chart-axis--y metric-chart-axis--right">
            {[...yTicksRight].reverse().map((tick) => (
              <span
                key={tick.value}
                className="metric-chart-tick"
                style={{ bottom: `${(tick.value / yMax(yTicksRight)) * 100}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="metric-chart-axis metric-chart-axis--x">
        {xLabels.map((entry, index) => (
          <span
            key={`${entry.label}-${index}`}
            className="metric-chart-tick metric-chart-tick--x"
            style={{ left: `${entry.position * 100}%` }}
            title={entry.title}
          >
            {entry.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

function yMax(ticks: AxisTick[]): number {
  return ticks.length > 0 ? ticks[ticks.length - 1].value : 1;
}

/** Convierte valores a las marcas del eje, con separador de miles chileno. */
export function toAxisTicks(values: number[]): AxisTick[] {
  return values.map((value) => ({
    value,
    label: formatNumber(value, { maximumFractionDigits: 1 }),
  }));
}

/** Posición horizontal de una banda, como fracción 0..1 del ancho. */
export function bandPosition(index: number, bandCount: number): number {
  return (index + 0.5) / bandCount;
}
