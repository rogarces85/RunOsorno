/**
 * Paleta de las gráficas (Fase C, tarea 7.2).
 *
 * No se comprueba una copia de los valores: se lee `app/styles/tokens.css`, que es la
 * fuente de verdad, y se valida lo que de verdad importa: que haya cinco series por
 * tema, que no se repitan y que cada una se distinga del lienzo y de la superficie
 * (WCAG 1.4.11 pide 3:1 para elementos gráficos).
 *
 * Si alguien cambia un token y rompe el contraste, esta prueba falla y dice cuál.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHART_COLORS,
  colorForIndex,
  complianceBadgeClass,
} from "@/components/metrics/chartColors";

const CSS = readFileSync(join(process.cwd(), "app/styles/tokens.css"), "utf8");

/** Devuelve el contenido del bloque que empieza en `selector`. */
function bloque(selector: string): string {
  const inicio = CSS.indexOf(selector);
  if (inicio === -1) throw new Error(`No se encontró el bloque ${selector}`);
  const abre = CSS.indexOf("{", inicio);
  let nivel = 0;
  for (let i = abre; i < CSS.length; i += 1) {
    if (CSS[i] === "{") nivel += 1;
    if (CSS[i] === "}") {
      nivel -= 1;
      if (nivel === 0) return CSS.slice(abre + 1, i);
    }
  }
  throw new Error(`Bloque sin cerrar: ${selector}`);
}

function token(contenido: string, nombre: string): string {
  const match = contenido.match(new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Token sin color hexadecimal: ${nombre}`);
  return match[1]!.toLowerCase();
}

function serie(contenido: string): string[] {
  return [1, 2, 3, 4, 5].map((n) => token(contenido, `--app-chart-${n}`));
}

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canales.map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] =
    luminancia(a) > luminancia(b)
      ? [luminancia(a), luminancia(b)]
      : [luminancia(b), luminancia(a)];
  return (claro + 0.05) / (oscuro + 0.05);
}

const CLARO = bloque(":root");
const OSCURO = bloque('[data-bs-theme="dark"]');

describe("paleta de gráficas", () => {
  it("declara cinco series distintas en cada tema", () => {
    for (const [tema, contenido] of [
      ["claro", CLARO],
      ["oscuro", OSCURO],
    ] as const) {
      const colores = serie(contenido);
      expect(colores, tema).toHaveLength(5);
      expect(new Set(colores).size, `${tema}: series repetidas`).toBe(5);
    }
  });

  it("cada serie se distingue del lienzo y de la superficie (3:1)", () => {
    const fondos = {
      claro: [token(CLARO, "--app-canvas"), token(CLARO, "--app-surface")],
      oscuro: [token(OSCURO, "--app-canvas"), token(OSCURO, "--app-surface")],
    };
    const series = { claro: serie(CLARO), oscuro: serie(OSCURO) };

    for (const tema of ["claro", "oscuro"] as const) {
      for (const [indice, color] of series[tema].entries()) {
        for (const fondo of fondos[tema]) {
          const ratio = contraste(color, fondo);
          expect(
            ratio,
            `${tema}: serie ${indice + 1} (${color}) sobre ${fondo} = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("el componente consume los tokens y no hex sueltos", () => {
    expect(CHART_COLORS).toHaveLength(5);
    expect(new Set(CHART_COLORS).size).toBe(5);
    for (const color of CHART_COLORS) {
      expect(color).toMatch(/^var\(--app-chart-[1-5]\)$/);
    }
  });

  it("colorForIndex recorre la paleta en ciclo", () => {
    expect(colorForIndex(0)).toBe("var(--app-chart-1)");
    expect(colorForIndex(4)).toBe("var(--app-chart-5)");
    expect(colorForIndex(5)).toBe("var(--app-chart-1)");
  });

  it("el badge de cumplimiento usa la familia de contraste", () => {
    expect(complianceBadgeClass(90)).toContain("text-success-ink");
    expect(complianceBadgeClass(60)).toContain("text-warning-ink");
    expect(complianceBadgeClass(10)).toContain("text-danger-ink");
    for (const porcentaje of [0, 49, 50, 79, 80, 100]) {
      expect(complianceBadgeClass(porcentaje)).not.toMatch(/text-(green|yellow|red)\b/);
    }
  });
});
