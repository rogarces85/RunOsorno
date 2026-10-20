import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

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
