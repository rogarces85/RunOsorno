/**
 * Verificación de contraste de los tokens del sistema visual (Fase A, tarea 8.1).
 *
 * Abre el inicio de sesión —público, sin credenciales— y comprueba, en tema claro y
 * oscuro:
 *
 * 1. Que cada token `--app-*` declarado en claro exista también en oscuro.
 * 2. Que cada par texto/fondo declarado en `design.md` §2 alcance su mínimo: 4,5:1
 *    para texto normal, 3:1 para bordes de control y anillo de foco.
 * 3. Que los badges de estado (`text-bg-*`) sigan alcanzando 4,5:1.
 *
 * Los colores se leen del navegador y se componen sobre su fondo con un `<canvas>`:
 * los tintes de Bootstrap/AdminLTE son `color-mix(...)`, así que el valor computado tiene
 * alfa y compararlo "a ojo" daría un ratio falso.
 *
 * Uso:
 *   npx tsx scripts/verify-tokens.ts
 *   BASE_URL=http://localhost:3000 npx tsx scripts/verify-tokens.ts
 */

import { chromium, type Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

type Par = {
  nombre: string;
  frente: string;
  fondo: string;
  minimo: number;
  /** Token cuyo color se usa como frente (en vez de una clase). */
  varFrente?: string;
  varFondo?: string;
  /** Clase de badge: se mide texto contra su propio tinte. */
  badge?: string;
};

/** Pares declarados en `design.md` §2 y §8. */
const PARES: Par[] = [
  { nombre: "texto principal sobre lienzo", varFrente: "--app-ink", varFondo: "--app-canvas", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "texto principal sobre superficie", varFrente: "--app-ink", varFondo: "--app-surface", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "texto secundario sobre lienzo", varFrente: "--app-ink-2", varFondo: "--app-canvas", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "texto terciario sobre lienzo", varFrente: "--app-ink-3", varFondo: "--app-canvas", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "texto terciario sobre superficie", varFrente: "--app-ink-3", varFondo: "--app-surface", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "acento como texto sobre superficie", varFrente: "--app-accent", varFondo: "--app-surface", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "texto del botón primario", varFrente: "--app-accent-on", varFondo: "--app-accent", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "acento sobre tinte de ítem activo", varFrente: "--app-accent", varFondo: "--app-accent-soft", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "texto del botón de peligro", varFrente: "--app-danger-on", varFondo: "--app-danger", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "borde de control sobre superficie", varFrente: "--app-border-strong", varFondo: "--app-surface", frente: "", fondo: "", minimo: 3 },
  { nombre: "borde de control sobre lienzo", varFrente: "--app-border-strong", varFondo: "--app-canvas", frente: "", fondo: "", minimo: 3 },
  { nombre: "anillo de foco sobre lienzo", varFrente: "--app-accent", varFondo: "--app-canvas", frente: "", fondo: "", minimo: 3 },
  { nombre: "azul de marca sobre lienzo (gráficos)", varFrente: "--app-brand", varFondo: "--app-canvas", frente: "", fondo: "", minimo: 3 },
  { nombre: "badge primario", badge: "text-bg-primary", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "badge de éxito", badge: "text-bg-success", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "badge de aviso", badge: "text-bg-warning", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "badge de peligro", badge: "text-bg-danger", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "badge informativo", badge: "text-bg-info", frente: "", fondo: "", minimo: 4.5 },
  { nombre: "badge neutro", badge: "text-bg-secondary", frente: "", fondo: "", minimo: 4.5 },
];

/** `rgb(r g b)` / `color(...)` → [r, g, b] componiendo sobre `fondo` con canvas. */
async function componer(page: Page, color: string, fondo: string): Promise<number[]> {
  return page.evaluate(
    ([c, f]) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("sin contexto 2d");
      ctx.fillStyle = f;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    },
    [color, fondo] as const,
  );
}

function luminancia([r, g, b]: number[]): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function ratio(a: number[], b: number[]): number {
  const [claro, oscuro] =
    luminancia(a) > luminancia(b)
      ? [luminancia(a), luminancia(b)]
      : [luminancia(b), luminancia(a)];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Resuelve un token a un color computado y su lista de tokens `--app-*`. */
async function leerTokens(page: Page, tema: "light" | "dark") {
  return page.evaluate((t) => {
    document.documentElement.setAttribute("data-bs-theme", t);
    document.documentElement.style.colorScheme = t;
    const style = getComputedStyle(document.documentElement);
    const nombres: string[] = [];
    for (const prop of Array.from(style)) {
      if (prop.startsWith("--app-")) nombres.push(prop);
    }
    // Sin funciones internas: esbuild les añade un ayudante `__name` que no existe
    // en el navegador y la evaluación falla.
    const colores: Record<string, string> = {};
    for (const nombre of nombres) {
      const el = document.createElement("div");
      el.style.color = `var(${nombre})`;
      document.body.appendChild(el);
      colores[nombre] = getComputedStyle(el).color;
      el.remove();
    }
    return { nombres: nombres.sort(), colores };
  }, tema);
}

/** Mide un badge ya renderizado: su texto contra su propio tinte. */
async function medirBadge(page: Page, clase: string, superficie: string) {
  return page.evaluate(
    ([cls, sup]) => {
      const el = document.createElement("span");
      el.className = `badge ${cls}`;
      el.textContent = "77%";
      document.body.appendChild(el);
      const s = getComputedStyle(el);
      const res = { color: s.color, background: s.backgroundColor || sup };
      el.remove();
      return res;
    },
    [clase, superficie] as const,
  );
}

async function main() {
  console.log(`Verificando tokens en ${BASE}\n`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: "es-CL" });
  const page = await ctx.newPage();

  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  } catch (error) {
    console.error(`FALLO: no se pudo abrir ${BASE}/login (${String(error)})`);
    await browser.close();
    process.exit(1);
  }

  let fallos = 0;
  let comprobaciones = 0;

  const claro = await leerTokens(page, "light");
  const oscuro = await leerTokens(page, "dark");

  // 1. Paridad de tokens entre temas.
  const faltanEnOscuro = claro.nombres.filter((n) => !oscuro.nombres.includes(n));
  const sobranEnOscuro = oscuro.nombres.filter((n) => !claro.nombres.includes(n));
  comprobaciones += 1;
  if (faltanEnOscuro.length > 0 || sobranEnOscuro.length > 0) {
    fallos += 1;
    console.log(
      `  FALLO paridad de tokens — faltan en oscuro: ${faltanEnOscuro.join(", ") || "ninguno"};` +
        ` sobran: ${sobranEnOscuro.join(", ") || "ninguno"}`,
    );
  } else {
    console.log(
      `  OK    paridad de tokens — ${claro.nombres.length} tokens declarados en ambos temas`,
    );
  }

  // 2. Pares declarados, en cada tema.
  for (const tema of ["light", "dark"] as const) {
    const tokens = tema === "light" ? claro : oscuro;
    await leerTokens(page, tema);
    const fondoBase = tokens.colores["--app-surface"] ?? "white";

    for (const par of PARES) {
      comprobaciones += 1;
      let frente: number[];
      let fondo: number[];

      if (par.badge) {
        const medido = await medirBadge(page, par.badge, fondoBase);
        fondo = await componer(page, medido.background, fondoBase);
        frente = await componer(page, medido.color, `rgb(${fondo.join(" ")})`);
      } else {
        const f = tokens.colores[par.varFrente ?? ""];
        const b = tokens.colores[par.varFondo ?? ""];
        if (!f || !b) {
          fallos += 1;
          console.log(`  FALLO ${par.nombre} [${tema}] — token inexistente`);
          continue;
        }
        fondo = await componer(page, b, "white");
        frente = await componer(page, f, `rgb(${fondo.join(" ")})`);
      }

      const r = ratio(frente, fondo);
      const ok = r >= par.minimo;
      if (!ok) fallos += 1;
      console.log(
        `  ${ok ? "OK   " : "FALLO"} ${par.nombre} [${tema}] — ${r.toFixed(2)}:1 (mínimo ${par.minimo}:1)`,
      );
    }
  }

  await browser.close();

  console.log(`\n${comprobaciones - fallos}/${comprobaciones} comprobaciones OK`);
  if (fallos > 0) {
    console.log("\nFALLO: hay pares de tokens por debajo del contraste mínimo.");
    process.exit(1);
  }
  console.log("\nOK: todos los tokens cumplen el contraste declarado en ambos temas.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
