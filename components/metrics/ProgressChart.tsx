import { CHART_COLORS } from "./chartColors";
import { niceScale, linePath, sampleLabels } from "./chartGeometry";
import {
  BAND_WIDTH,
  bandPosition,
  ChartFrame,
  PLOT_HEIGHT,
  toAxisTicks,
} from "./ChartFrame";

type ProgressChartProps = {
  points: { week: string; km: number }[];
};

/**
 * Volumen semanal en kilómetros (Fase 27; sin `recharts` desde la Fase 47).
 *
 * Componente de servidor: la línea se pinta en el HTML de la respuesta, sin
 * esperar a que JavaScript se descargue y ejecute.
 */
export function ProgressChart({ points }: ProgressChartProps) {
  if (points.length === 0) {
    return (
      <div className="text-secondary text-center py-4">
        Sin datos de progresión en el periodo.
      </div>
    );
  }

  const scale = niceScale(Math.max(...points.map((point) => point.km)));
  const toY = (value: number) => PLOT_HEIGHT - (value / scale.max) * PLOT_HEIGHT;
  const traza = linePath(
    points.map((point, index) => ({
      x: index * BAND_WIDTH + BAND_WIDTH / 2,
      y: toY(point.km),
    })),
  );

  return (
    <ChartFrame
      testId="progress-chart"
      bandCount={points.length}
      yTicks={toAxisTicks(scale.ticks)}
      yAxisLabel="km"
      xLabels={sampleLabels(points, 5).map((index) => ({
        position: bandPosition(index, points.length),
        label: points[index].week.slice(5),
        title: points[index].week,
      }))}
      ariaLabel={`Volumen semanal en kilómetros: ${points
        .map((point) => `${point.week}: ${point.km} km`)
        .join(", ")}`}
    >
      {scale.ticks.map((tick) => (
        <line
          key={tick}
          x1={0}
          x2={points.length * BAND_WIDTH}
          y1={toY(tick)}
          y2={toY(tick)}
          className="metric-chart-grid"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path
        d={traza}
        fill="none"
        stroke={CHART_COLORS[0]}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        data-testid="progress-line"
      />
      {/*
        Zona sensible de cada semana para el tooltip.

        Antes había un `<circle>` por punto, como el `dot` que usaba recharts.
        Con `preserveAspectRatio="none"` un círculo se deforma en elipse, porque
        la escala horizontal y la vertical no son la misma: quedaban como
        puntitos deformados. En su lugar hay un `<rect>` transparente que cubre
        toda la banda: no se deforma en lo que se ve y, de paso, el área donde
        aparece el tooltip es mucho más grande que un punto de 3 px.
      */}
      {points.map((point, index) => (
        <rect
          key={point.week}
          x={index * BAND_WIDTH}
          y={0}
          width={BAND_WIDTH}
          height={PLOT_HEIGHT}
          fill="transparent"
          data-testid="progress-hit"
        >
          <title>{`${point.week}: ${point.km} km`}</title>
        </rect>
      ))}
    </ChartFrame>
  );
}
