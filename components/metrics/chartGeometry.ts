/**
 * Geometría común de las gráficas de métricas (Fase 47, tarea 47.6).
 *
 * Antes estas gráficas las dibujaba `recharts`. Se quitó porque costaba ~387 KB
 * de JavaScript en el bundle del cliente y porque **no se pintaban en el
 * servidor**: el HTML que llegaba al navegador no tenía ningún `<svg>`, así que
 * las gráficas aparecían recién después de hidratar. `DonutChart` (Fase 39) ya
 * había resuelto el mismo problema para los anillos; aquí se aplica a las que
 * quedaban.
 *
 * El truco que evita repetir el problema del `ResponsiveContainer`:
 *
 * - El SVG lleva `viewBox` con `preserveAspectRatio="none"`, así que se estira
 *   al ancho del contenedor y la escala vertical nunca se deforma. Por eso los
 *   trazos usan `vector-effect="non-scaling-stroke"`.
 * - **Ningún texto vive dentro del SVG.** Las etiquetas de los ejes son HTML,
 *   positioned con porcentajes sobre la misma caja, así que se leen siempre a
 *   12 px de verdad y se adaptan a cualquier ancho. Si el texto estuviera en el
 *   SVG, en un móvil de 375 px se vería a la mitad de tamaño.
 *
 * Todo son funciones puras sobre números: se prueban en `tests/unit`.
 */

export type Scale = {
  /** Cota superior del eje, redondeada a un número "bonito". */
  max: number;
  /** Marcas del eje, de 0 a `max` inclusive. */
  ticks: number[];
};

/**
 * Elige una cota superior y las marcas del eje para un valor máximo dado.
 *
 * Sin esto, con un máximo de 37 km el eje llegaría a 37 y las líneas de la
 * grilla quedarían en 6, 12, 18… Se redondea a 1, 2 o 5 por potencia de diez.
 */
export function niceScale(
  value: number,
  tickCount = 4,
): Scale {
  if (!Number.isFinite(value) || value <= 0) {
    return { max: tickCount, ticks: range(0, tickCount) };
  }
  const rough = value / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;
  const max = step * tickCount;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i += 1) {
    ticks.push(round(step * i));
  }
  return { max, ticks };
}

function range(from: number, to: number): number[] {
  const values: number[] = [];
  for (let i = from; i <= to; i += 1) {
    values.push(i);
  }
  return values;
}

/** Quita el error de coma flotante de multiplicar decimales. */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Traza de una polilínea, en formato de atributo `d` de un `<path>`.
 *
 * Devuelve `d` y no `points` a propósito: `<polyline>` espera pares de
 * coordenadas ("x,y x,y") y no acepta un `M … L …`. Pasarle la cadena del path
 * deja el atributo con basura, el navegador lo avisa por consola
 * ("<polyline> attribute points: Expected number") y la línea no se dibuja.
 *
 * `points` viene en coordenadas del `viewBox`; quien llama decide el ancho de
 * banda y la altura.
 */
export function linePath(points: { x: number; y: number }[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

/**
 * Elige qué etiquetas del eje horizontal se dibujan, para que no se pisen.
 *
 * Con doce semanas en un móvil hay 25 px por banda y una etiqueta mide unos
 * 34: si se dibujaran todas, se solaparían. Se limita a `maxLabels` repartidas
 * de forma uniforme, y siempre se incluyen la primera y la última, que son las
 * que marcan los límites del periodo.
 */
export function sampleLabels<T>(items: T[], maxLabels: number): number[] {
  if (items.length <= maxLabels) {
    return items.map((_, index) => index);
  }
  const indices = new Set<number>([0, items.length - 1]);
  const step = (items.length - 1) / (maxLabels - 1);
  for (let i = 0; i < maxLabels; i += 1) {
    indices.add(Math.round(i * step));
  }
  return [...indices].sort((a, b) => a - b);
}
