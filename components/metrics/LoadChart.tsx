import { CHART_COLORS } from "./chartColors";
import { niceScale, linePath, sampleLabels } from "./chartGeometry";
import {
  BAND_WIDTH,
  bandPosition,
  ChartFrame,
  PLOT_HEIGHT,
  toAxisTicks,
} from "./ChartFrame";
import { EmptyState } from "@/components/ui/EmptyState";

type LoadChartProps = {
  points: { week: string; km: number; minutes: number }[];
};

/**
 * Carga semanal: kilómetros en barras y minutos en línea, con dos ejes.
 *
 * Se conservan los dos ejes de la versión con `recharts` (Fase 27) porque
 * minutos y kilómetros no comparten escala: 10 km y 60 min conviven mal en un
 * mismo eje. Componente de servidor desde la Fase 47.
 */
export function LoadChart({ points }: LoadChartProps) {
  if (
    points.length === 0 ||
    points.every((point) => point.km === 0 && point.minutes === 0)
  ) {
    return (
      <EmptyState
        title="Sin carga registrada"
        description="No hay kilómetros ni minutos registrados en el periodo seleccionado."
        compact
      />
    );
  }

  const kmScale = niceScale(Math.max(...points.map((point) => point.km)));
  const minutesScale = niceScale(
    Math.max(...points.map((point) => point.minutes)),
  );
  const toKmY = (value: number) =>
    PLOT_HEIGHT - (value / kmScale.max) * PLOT_HEIGHT;
  const toMinutesY = (value: number) =>
    PLOT_HEIGHT - (value / minutesScale.max) * PLOT_HEIGHT;

  const traza = linePath(
    points.map((point, index) => ({
      x: index * BAND_WIDTH + BAND_WIDTH / 2,
      y: toMinutesY(point.minutes),
    })),
  );

  return (
    <ChartFrame
      testId="load-chart"
      bandCount={points.length}
      yTicks={toAxisTicks(kmScale.ticks)}
      yTicksRight={toAxisTicks(minutesScale.ticks)}
      yAxisLabel="km / min"
      xLabels={sampleLabels(points, 5).map((index) => ({
        position: bandPosition(index, points.length),
        label: points[index].week.slice(5),
        title: points[index].week,
      }))}
      ariaLabel={`Carga semanal: ${points
        .map(
          (point) =>
            `${point.week}: ${point.km} km en ${point.minutes} minutos`,
        )
        .join(", ")}`}
    >
      {kmScale.ticks.map((tick) => (
        <line
          key={tick}
          x1={0}
          x2={points.length * BAND_WIDTH}
          y1={toKmY(tick)}
          y2={toKmY(tick)}
          className="metric-chart-grid"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {points.map((point, index) => (
        <rect
          key={point.week}
          x={index * BAND_WIDTH + 15}
          y={toKmY(point.km)}
          width={BAND_WIDTH - 30}
          height={PLOT_HEIGHT - toKmY(point.km)}
          rx={4}
          fill={CHART_COLORS[0]}
          className="chart-bar"
          data-testid="load-bar"
        >
          <title>{`${point.week}: ${point.km} km`}</title>
        </rect>
      ))}
      <path
        d={traza}
        fill="none"
        stroke={CHART_COLORS[1]}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="chart-line"
        pathLength={1}
        data-testid="load-line"
      />
      {/*
        Zonas sensibles de cada semana. Son rectángulos y no círculos por lo
        mismo que en `ProgressChart`: con `preserveAspectRatio="none"` un
        círculo se convierte en elipse. Cada una lleva el tooltip de las dos
        series de esa semana.
      */}
      {points.map((point, index) => (
        <rect
          key={point.week}
          x={index * BAND_WIDTH}
          y={0}
          width={BAND_WIDTH}
          height={PLOT_HEIGHT}
          fill="transparent"
          data-testid="load-hit"
        >
          <title>{`${point.week}: ${point.km} km en ${point.minutes} min`}</title>
        </rect>
      ))}
    </ChartFrame>
  );
}
