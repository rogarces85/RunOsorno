import type { ReactNode } from "react";
import Link from "next/link";

type StampVariant = "primary" | "success" | "info" | "warning" | "danger";

/**
 * Tarjeta del sistema visual (Fase C, tarea 5.3).
 *
 * Fondo de superficie, borde de 1 px y radio de 12 px; sin sombra por defecto. La
 * sombra aparece solo en la variante `interactive` (tarjetas que llevan a otra
 * pantalla), para que la elevación signifique algo.
 *
 * El título es un encabezado real (`h2` por defecto) y puede bajarse de nivel con
 * `level` cuando la tarjeta ya vive dentro de una sección con su propio `h2`, de modo
 * que nunca se rompa el orden de encabezados.
 *
 * Variantes nuevas:
 * - `href`: la tarjeta entera es un enlace (`<a class="card card-link card-link-pop">`
 *   del patrón Tabler); junto con `app-card-interactive` da la elevación al hover.
 * - `stamp`: marca de agua circular deportiva (`card-stamp` de Tabler) detrás del
 *   contenido; el ícono es decorativo siempre (`aria-hidden`).
 */
export function Card({
  title,
  label,
  actions,
  children,
  footer,
  interactive = false,
  stamp,
  href,
  level = 2,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  /** Rótulo pequeño sobre el título (texto secundario en versalitas). */
  label?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  interactive?: boolean;
  stamp?: { icon: ReactNode; variant?: StampVariant };
  href?: string;
  level?: 2 | 3 | 4;
  className?: string;
  bodyClassName?: string;
}) {
  const Heading = `h${level}` as "h2" | "h3" | "h4";

  const classes = [
    "card",
    "app-card",
    // La tarjeta-enlace es interactiva por definición y pide las utilidades
    // de Tabler para el "pop" del hover.
    interactive || href ? "app-card-interactive" : "",
    href ? "card-link card-link-pop" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const stampMark =
    stamp != null ? (
      <div
        className={`card-stamp card-stamp-${stamp.variant ?? "primary"}`}
        aria-hidden
      >
        <span className="card-stamp-icon">{stamp.icon}</span>
      </div>
    ) : null;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {stampMark}
        <div className="card-body app-card-body">
          {children}
        </div>
      </Link>
    );
  }

  return (
    <section className={classes}>
      {stampMark}
      {label || title || actions ? (
        <div className="card-header app-card-header">
          <div className="app-card-heading">
            {label ? <div className="app-label">{label}</div> : null}
            {title ? <Heading className="app-card-title mb-0">{title}</Heading> : null}
          </div>
          {actions ? <div className="app-card-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`card-body app-card-body ${bodyClassName}`.trim()}>
        {children}
      </div>
      {footer ? <div className="card-footer app-card-footer">{footer}</div> : null}
    </section>
  );
}
