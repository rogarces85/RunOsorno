import type { SVGProps } from "react";

/**
 * Icono de Bootstrap Icons (https://icons.getbootstrap.com/).
 *
 * Renderiza un `<i class="bi bi-<name>">` con las clases de tamaño y utilidad
 * que reciba. Los iconos son decorativos por defecto (`aria-hidden`), salvo que
 * el llamador pase `aria-label` o `title`.
 *
 * Uso: `<BIcon name="house" size={20} className="me-2" />`
 *
 * Equivalencia rápida con los nombres de Tabler que usábamos:
 *   alert-triangle → exclamation-triangle
 *   alert-circle   → exclamation-circle
 *   arrow-down     → chevron-down
 *   arrow-up       → chevron-up
 *   bell           → bell
 *   bell-off       → bell-off
 *   checks         → check-all
 *   check          → check
 *   chevron-left   → chevron-left
 *   chevron-right  → chevron-right
 *   copy           → copy
 *   device-floppy  → save
 *   download       → download
 *   edit           → pencil
 *   filter         → filter
 *   grip-vertical  → grip-vertical
 *   home           → house
 *   inbox          → inbox
 *   mail-opened    → envelope-open
 *   menu-2         → list
 *   moon           → moon
 *   plus           → plus
 *   run            → person-running
 *   search         → search
 *   send           → send
 *   settings       → gear
 *   speakerphone   → telephone-outbound
 *   sun            → sun
 *   template       → layout-template
 *   trophy         → trophy
 *   user-star      → person-star
 *   users          → people
 *   x              → x
 *   calendar       → calendar
 *   chart-bar      → bar-chart
 *   building-community → building
 *   file-text      → file-earmark-text
 *   photo          → image
 *   trash          → trash
 *   user-check     → person-check
 *   user-x         → person-x
 *   logout         → box-arrow-right
 *   school         → building
 *   arrow-left     → arrow-left
 *   arrow-right    → arrow-right
 */
export function BIcon({
  name,
  size,
  className = "",
  ariaHidden = true,
  ...rest
}: {
  /** Nombre del icono de Bootstrap Icons (sin el prefijo `bi bi-`). */
  name: string;
  /** Tamaño en px (equivalente al `size` de Tabler). Se aplica como `font-size`. */
  size?: number;
  /** Clases CSS adicionales (color, márgenes…). */
  className?: string;
  /** Si se oculta para lectores de pantalla. */
  ariaHidden?: boolean;
} & Omit<SVGProps<SVGSVGElement>, "ref">) {
  const style = size ? { fontSize: size, lineHeight: 1, ...(rest.style as object | undefined) } : undefined;
  const { style: _ignored, ...iconRest } = rest as { style?: object; [key: string]: unknown };
  return (
    <i
      className={`bi bi-${name} ${className}`.trim()}
      style={style}
      aria-hidden={ariaHidden ? true : undefined}
      {...iconRest}
    />
  );
}
