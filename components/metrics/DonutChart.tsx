export type DonutSlice = {
  name: string;
  value: number;
  color: string;
};

type Arc = {
  slice: DonutSlice;
  path: string;
};

/**
 * Sistema de coordenadas polares con el ángulo 0 arriba y el sentido horario,
 * como espera cualquier lectura de una gráfica de reparto.
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): { x: number; y: number } {
  const radian = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radian),
    y: cy + radius * Math.sin(radian),
  };
}

/**
 * Sector anular entre dos ángulos (grados). Si el sector cierra el círculo
 * completo se dibuja en dos mitades: un arco de 0° a 360° es degenerado en SVG
 * porque termina donde empieza.
 */
function annularSector(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const full = endAngle - startAngle >= 359.999;
  const sweep = full ? 180 : endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;

  const half = (from: number, to: number): string => {
    const outerStart = polarToCartesian(cx, cy, outerRadius, from);
    const outerEnd = polarToCartesian(cx, cy, outerRadius, to);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, to);
    const innerStart = polarToCartesian(cx, cy, innerRadius, from);
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  };

  return full
    ? `${half(startAngle, startAngle + 180)} ${half(startAngle + 180, startAngle + 360)}`
    : half(startAngle, endAngle);
}

/**
 * Gráfica de anillo (donut) responsive (Fase 39).
 *
 * Sustituye a los `PieChart` de recharts que se usaban en las métricas. Con
 * `ResponsiveContainer`, la versión 3.10.1 suma el `outerRadius` del `Pie` al
 * offset izquierdo del gráfico polar, así que `cx="50%"` cae en
 * `ancho/2 + radio` y el anillo se dibuja medio fuera del SVG: en la práctica
 * no se veía nada, en ningún ancho de pantalla (medido: con un contenedor de
 * 317 px el centro quedaba en x=243). Compensarlo con `margin.left` negativo
 * tampoco da un centro estable, porque el offset vertical también se mueve.
 *
 * Aquí el SVG es propio y usa un `viewBox` fijo, así que el centro es siempre
 * el centro geométrico y el tamaño se adapta al contenedor sin depender de
 * medidas internas de la librería. Además es un componente de servidor: no
 * necesita JavaScript para pintarse.
 */
export function DonutChart({
  slices,
  formatValue,
  emptyMessage,
  centerLabel,
  size = 200,
  thickness = 46,
}: {
  slices: DonutSlice[];
  formatValue: (slice: DonutSlice) => string;
  emptyMessage: string;
  centerLabel?: string;
  size?: number;
  thickness?: number;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (slices.length === 0 || total <= 0) {
    return (
      <div className="text-secondary text-center py-4">{emptyMessage}</div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius - thickness;

  const arcs: Arc[] = [];
  let cursor = 0;
  for (const slice of slices) {
    const sweep = (slice.value / total) * 360;
    if (sweep > 0) {
      arcs.push({
        slice,
        path: annularSector(
          cx,
          cy,
          innerRadius,
          outerRadius,
          cursor,
          cursor + sweep,
        ),
      });
    }
    cursor += sweep;
  }

  const summary = slices
    .map((slice) => `${slice.name}: ${formatValue(slice)}`)
    .join(", ");

  return (
    <div className="donut-chart" data-testid="donut-chart">
      <div className="donut-chart-figure">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          height="100%"
          role="img"
          aria-label={summary}
        >
          {arcs.map((arc) => (
            <path
              key={arc.slice.name}
              d={arc.path}
              fill={arc.slice.color}
              data-testid="donut-slice"
            >
              <title>{`${arc.slice.name}: ${formatValue(arc.slice)}`}</title>
            </path>
          ))}
        </svg>
        {centerLabel ? (
          <div className="donut-chart-center" aria-hidden>
            {centerLabel}
          </div>
        ) : null}
      </div>
      <ul className="donut-chart-legend">
        {slices.map((slice) => (
          <li key={slice.name} className="donut-chart-legend-item">
            <span
              className="donut-chart-swatch"
              style={{ backgroundColor: slice.color }}
              aria-hidden
            />
            <span className="donut-chart-legend-label">{slice.name}</span>
            <span className="donut-chart-legend-value">
              {formatValue(slice)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
