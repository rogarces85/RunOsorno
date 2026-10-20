import type { ReactNode } from "react";

export type BadgeTone =
  "neutral" | "primary" | "success" | "warning" | "danger" | "info";

/**
 * Clases por tono (Fase C, tarea 5.5).
 *
 * El texto usa la familia `text-*-ink` del proyecto: las utilidades de color de
 * Tabler no llegan a 4,5:1 sobre los fondos `-lt`, y el tono se refuerza además con
 * un punto de color, de modo que el estado no se comunica solo con color.
 */
const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-secondary-lt text-secondary-ink",
  primary: "bg-primary-lt text-primary-ink",
  success: "bg-success-lt text-success-ink",
  warning: "bg-warning-lt text-warning-ink",
  danger: "bg-danger-lt text-danger-ink",
  info: "bg-info-lt text-info-ink",
};

/**
 * Equivalencia entre los colores heredados de Tabler (`green`, `yellow`, `red`…) y
 * los tonos del sistema. Permite migrar un badge sin cambiar el dato que lo origina:
 * `SESSION_STATUS_META` sigue devolviendo un color y aquí se traduce.
 */
const LEGACY_COLOR_TONE: Record<string, BadgeTone> = {
  secondary: "neutral",
  blue: "primary",
  azure: "info",
  cyan: "info",
  indigo: "primary",
  purple: "info",
  green: "success",
  lime: "success",
  teal: "success",
  yellow: "warning",
  orange: "warning",
  red: "danger",
  pink: "danger",
};

export function badgeToneFromColor(color: string | undefined): BadgeTone {
  return (color && LEGACY_COLOR_TONE[color]) || "neutral";
}

/**
 * Tono de un porcentaje de cumplimiento (≥80 alto, ≥50 medio, resto bajo). Se
 * comparte para que el mismo dato no cambie de color según la pantalla.
 */
export function complianceTone(percent: number): BadgeTone {
  if (percent >= 80) {
    return "success";
  }
  if (percent >= 50) {
    return "warning";
  }
  return "danger";
}

/**
 * Etiqueta de estado.
 *
 * El texto es la señal principal; el punto es decorativo (`aria-hidden`). Se debe
 * usar en lugar de las utilidades de color crudas de Tabler (`text-green`,
 * `bg-green-lt text-green`), que no cumplen contraste.
 */
export function Badge({
  tone = "neutral",
  children,
  dot = true,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  /** Punto de color decorativo; el texto siempre acompaña. */
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={`badge app-badge ${TONE_CLASS[tone]} ${className}`.trim()}>
      {dot ? <span className="app-badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
