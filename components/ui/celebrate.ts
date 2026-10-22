"use client";

/**
 * Confeti de celebración (camino B del plan de UI).
 *
 * El componente nativo de Tabler (`data-bs-toggle="confetti"`) necesita el
 * bundle de Bootstrap JS que este proyecto no carga: aquí es el equivalente
 * propio, canvas nativo y cero dependencias, con la misma API "dispara y
 * listo": `celebrate()` tras un guardado exitoso.
 *
 * - Los colores se leen de los tokens del tema activo (`--app-*` en el
 *   `:root`), así que se adapta a claro/oscuro sin hardcodear hex.
 * - Con `prefers-reduced-motion: reduce` no hace nada: celebrar no puede
 *   costar una crisis vestibular.
 * - El canvas se ensambla imperativo (fuera del árbol de React) y se
 *   autodestruye: sobrevive al `router.refresh()` del formulario que lo
 *   dispara sin dejar suciedad en el DOM.
 */

type Chip = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Ángulo actual y velocidad angular (radianes). */
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
};

const FALLBACK = ["#1675df", "#1c762a", "#925d00", "#9b36b4", "#2d6ca1"];

const TOKENS = [
  "--app-brand",
  "--app-success",
  "--app-warning",
  "--app-purple",
  "--app-info",
  "--app-accent",
];

/** Cuánto dura la animación como máximo; con este techo el canvas siempre
 * sale del DOM aunque quede alguna astilla en órbita (red de seguridad). */
const MAX_MS = 3200;

function themeColors(): string[] {
  const styles = getComputedStyle(document.documentElement);
  const leidos = TOKENS.map((token) =>
    styles.getPropertyValue(token).trim(),
  ).filter((value) => /^#[0-9a-f]{3,8}$/i.test(value));
  return leidos.length > 0 ? leidos : FALLBACK;
}

function createCanvas(
  w: number,
  h: number,
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement("canvas");
  canvas.className = "app-confetti";
  canvas.setAttribute("aria-hidden", "true");
  // Arriba de los modales de Tabler (z-index ~1050), por debajo de nada más.
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:3000;";
  // Escala del device pixel ratio: sin ella las astillas se ven borrosas en
  // pantallas retina.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("sin contexto 2d");
  }
  ctx.scale(dpr, dpr);
  return { canvas, ctx };
}

function spawn(count: number, colors: string[], w: number, h: number): Chip[] {
  const chips: Chip[] = [];
  for (let i = 0; i < count; i += 1) {
    // Fuente chafante desde el centro inferior: de vuelta del formulario,
    // la celebración nace donde estaba el botón de guardar.
    const x = w / 2 + (Math.random() - 0.5) * w * 0.18;
    chips.push({
      x,
      y: h + 12,
      vx: (Math.random() - 0.5) * 5.5,
      vy: -(6.5 + Math.random() * 6),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.25,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 5,
      color: colors[i % colors.length],
    });
  }
  return chips;
}

export type CelebrateIntensity = "full" | "soft";

/**
 * Dispara una ráfaga de confeti. `soft` = la mitad de astillas, para
 * registros parciales; `full` (por defecto) = vía libre.
 */
export function celebrate(intensity: CelebrateIntensity = "full"): void {
  if (typeof window === "undefined") {
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const colors = themeColors();
  const count = intensity === "full" ? 140 : 60;
  const chips = spawn(count, colors, w, h);

  const { canvas, ctx } = createCanvas(w, h);
  const startedAt = performance.now();

  const step = () => {
    ctx.clearRect(0, 0, w, h);
    for (let i = chips.length - 1; i >= 0; i -= 1) {
      const chip = chips[i];
      chip.vy += 0.16; // gravedad
      chip.vx *= 0.992; // fricción del aire
      chip.x += chip.vx;
      chip.y += chip.vy;
      chip.rot += chip.vr;

      ctx.save();
      ctx.translate(chip.x, chip.y);
      ctx.rotate(chip.rot);
      ctx.fillStyle = chip.color;
      ctx.fillRect(-chip.w / 2, -chip.h / 2, chip.w, chip.h);
      ctx.restore();

      // Fuera de pantalla: la astilla muere y se saca de la lista.
      if (chip.y > h + 60) {
        chips.splice(i, 1);
      }
    }
    const elapsed = performance.now() - startedAt;
    if (chips.length > 0 && elapsed < MAX_MS) {
      requestAnimationFrame(step);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(step);
}
