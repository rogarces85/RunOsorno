import { BIcon } from "@/components/ui/BIcon";

/**
 * `SeriesGraphSmall` - Gráfica pequeña de series de entrenamiento.
 *
 * Muestra una serie de puntos (día/valor) usando los colores `--app-chart-1`
 * a través de `--app-chart-5` del sistema tokens. Cada serie obtiene un color
 * distinto automáticamente; si no hay suficientes series, se reutiliza el
 * patrón de forma ordenada.
 *
 * Para modo oscuro se usan `--app-chart-1-soft` a `--app-chart-5-soft` como
 * relleno/overlay. El trazo siempre usa `--app-chart-ink` (mismo que `--bs-primary`).
 *
 * API:
 * - `dataset`: array de `{ name, data: [{x: string, y: number}], color?: string }`
 * - `height`: altura fija (default 120px)
 * - `showTooltip`: si true, muestra un elemento indicativo al pasar el mouse
 */
export interface SeriesGraphSmallDatasetItem {
  name: string;
  data: { x: string; y: number }[];
  color?: string; // hex o token --app-chart-N
}

/** SeriesGraphSmall props */
export interface SeriesGraphSmallProps {
  /** ID del team o contexto (para tooltip/legend) */
  teamId?: string;
  /** Datos de las series a graficar */
  dataset: SeriesGraphSmallDatasetItem[];
  /** Altura fija en px (default 120) */
  height?: number;
  /** Mostrar indicador al pasar el mouse */
  showTooltip?: boolean;
}

/** Ancho de la gráfica (fijo por ahora) */
const GRAPH_WIDTH = 260;

/** --- Componente --- */
export function SeriesGraphSmall({
  teamId,
  dataset,
  height = 120,
  showTooltip = false,
}: SeriesGraphSmallProps) {
  if (!dataset || dataset.length === 0) {
    return null;
  }

  // Determinar color por serie (cíclico por si hay más de 5)
  const getColor = (i: number) => {
    const colors = [
      "--app-chart-1",
      "--app-chart-2",
      "--app-chart-3",
      "--app-chart-4",
      "--app-chart-5",
    ];
    return colors[i % colors.length];
  };

  // Determinar color de relleno modo oscuro
  const getFill = (i: number) => {
    const softColors = [
      "--app-chart-1-soft",
      "--app-chart-2-soft",
      "--app-chart-3-soft",
      "--app-chart-4-soft",
      "--app-chart-5-soft",
    ];
    return softColors[i % softColors.length];
  };

  const seriesHTML = dataset.map((series, sIdx) => {
    const pointStyles = series.data
      .map((dp) => {
        const stroke = `var(${getColor(sIdx)})`;
        const fill = `var(${getFill(sIdx)})`;
        return `points="${dp.x} ${dp.y}" style="stroke: ${stroke}; fill: ${fill}; stroke-width: 2; fill-opacity: 0.3;"`;
      })
      .join(" ");

    const legendClass = `series-color${sIdx > 0 ? ` series-color-${sIdx}` : ""}`;

    return (
      <div key={sIdx} className="series-item">
        <svg
          width={GRAPH_WIDTH}
          height={height}
          viewBox="0 0 GRAPH_WIDTH height"
          style={{ color: "var(--app-chart-ink)" }}
        >
          <polyline
            points={pointStyles}
            style={{ stroke: `var(${getColor(sIdx)})`, fill: `var(${getFill(sIdx)})`, strokeWidth: 2, fillOpacity: 0.3 }}
          />
        </svg>
        <span className={legendClass}>
          <BIcon name="calendar-event" size={12} aria-hidden />
          {series.name}
        </span>
      </div>
    );
  });

  return (
    <div
      style={{
        height: `${height}px`,
        width: "100%",
      }}
    >
      <div className="graph-container">
        {seriesHTML}
      </div>
      {showTooltip && (
        <div className="graph-tooltip">
          Pasa el mouse sobre una serie para ver detalles
        </div>
      )}
    </div>
  );
}