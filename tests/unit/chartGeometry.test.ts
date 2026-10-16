import { describe, expect, it } from "vitest";
import {
  BAND_WIDTH,
  bandPosition,
  toAxisTicks,
} from "@/components/metrics/ChartFrame";
import {
  linePath,
  niceScale,
  sampleLabels,
} from "@/components/metrics/chartGeometry";

/**
 * Fase 47 (tarea 47.6): las gráficas de métricas son SVG propio, sin librería
 * externa, así que su geometría son funciones puras y se prueban aquí.
 *
 * Lo que más importa no es el dibujo sino que **la línea llegue al SVG**: con
 * `<polyline points>` y un `M … L …` en vez de pares de coordenadas, el
 * navegador avisa por consola y no dibuja nada. La página se ve bien y la
 * gráfica no está.
 */

describe("niceScale (47.6)", () => {
  it("elige una cota superior bonita con marcas iguales", () => {
    const { max, ticks } = niceScale(37);
    expect(max).toBe(40);
    expect(ticks).toEqual([0, 10, 20, 30, 40]);
  });

  it("subió el máximo del eje en vez de ajustarse al dato", () => {
    // Un eje que llega justo a 37 pondría las líneas de la grilla en 6, 12,
    // 18... En cambio redondea a 40 y las reparte de diez en diez.
    expect(niceScale(37).ticks).toEqual([0, 10, 20, 30, 40]);
    expect(niceScale(37).max).toBeGreaterThanOrEqual(37);
  });

  it("redondea a 1, 2 o 5 por potencia de diez", () => {
    expect(niceScale(7).ticks).toEqual([0, 2, 4, 6, 8]);
    expect(niceScale(180).ticks).toEqual([0, 50, 100, 150, 200]);
    // Con un máximo de 1200 el paso "bonito" más pequeño que cubre el dato con
    // cuatro marcas es 500 (1.200 / 4 = 300, y 300 no es una marca legible), así
    // que el eje llega a 2.000. Sobra espacio, pero las marcas sí se leen.
    expect(niceScale(1200).ticks).toEqual([0, 500, 1000, 1500, 2000]);
  });

  it("el eje siempre cubre el dato", () => {
    for (const valor of [1, 7, 37, 99, 180, 1200, 99999]) {
      expect(niceScale(valor).max).toBeGreaterThanOrEqual(valor);
    }
  });

  it("no se rompe con cero, negativos o NaN", () => {
    for (const valor of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { max, ticks } = niceScale(valor);
      expect(max).toBeGreaterThan(0);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBe(max);
    }
  });

  it("respeta el número de marcas pedido", () => {
    expect(niceScale(100, 5).ticks).toHaveLength(6);
    expect(niceScale(100, 2).ticks).toHaveLength(3);
  });
});

describe("linePath (47.6)", () => {
  it("arma un atributo d con un M y un L por punto", () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 100, y: 20 },
        { x: 200, y: 0 },
      ]),
    ).toBe("M 0 10 L 100 20 L 200 0");
  });

  it("un solo punto es solo el M", () => {
    expect(linePath([{ x: 50, y: 5 }])).toBe("M 50 5");
  });

  it("una lista vacía no rompe el atributo", () => {
    expect(linePath([])).toBe("");
  });

  it("NO devuelve un formato válido para el atributo points de un polyline", () => {
    // Es el error que se cometió: `<polyline points="M 0 10 L 100 20">`.
    // `<polyline>` quiere "x,y x,y". Por eso el componente usa `<path d=…>`.
    const comoPoints = linePath([
      { x: 0, y: 10 },
      { x: 100, y: 20 },
    ]);
    expect(comoPoints).not.toMatch(/^\s*[\d.,\s-]+$/);
    expect(comoPoints.startsWith("M ")).toBe(true);
  });
});

describe("sampleLabels (47.6)", () => {
  it("con pocas semanas las muestra todas", () => {
    expect(sampleLabels([0, 1, 2], 5)).toEqual([0, 1, 2]);
  });

  it("con muchas, limita y siempre incluye la primera y la última", () => {
    const indices = sampleLabels(Array.from({ length: 12 }, (_, i) => i), 5);
    expect(indices.length).toBeLessThanOrEqual(5);
    expect(indices).toContain(0);
    expect(indices).toContain(11);
  });

  it("los índices salen ordenados y sin repetir", () => {
    const indices = sampleLabels(Array.from({ length: 12 }, (_, i) => i), 4);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
    expect(new Set(indices).size).toBe(indices.length);
  });
});

describe("bandPosition (47.6)", () => {
  it("coloca la primera y la última banda en los extremos con margen", () => {
    expect(bandPosition(0, 4)).toBeCloseTo(0.125);
    expect(bandPosition(3, 4)).toBeCloseTo(0.875);
  });

  it("el ancho de banda coincide con la posición", () => {
    // La etiqueta se posiciona con `left: position * 100%`, así que la
    // distancia entre dos bandas tiene que ser 1/BAND_WIDTH del ancho.
    expect(BAND_WIDTH).toBe(100);
    expect(bandPosition(1, 4) - bandPosition(0, 4)).toBeCloseTo(0.25);
  });
});

describe("toAxisTicks (47.6)", () => {
  it("usa el formato numérico chileno", () => {
    expect(toAxisTicks([0, 1000, 2500])).toEqual([
      { value: 0, label: "0" },
      { value: 1000, label: "1.000" },
      { value: 2500, label: "2.500" },
    ]);
  });
});
