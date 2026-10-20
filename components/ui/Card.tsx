import type { ReactNode } from "react";

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
 */
export function Card({
  title,
  label,
  actions,
  children,
  footer,
  interactive = false,
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
  level?: 2 | 3 | 4;
  className?: string;
  bodyClassName?: string;
}) {
  const Heading = `h${level}` as "h2" | "h3" | "h4";

  return (
    <section
      className={[
        "card",
        "app-card",
        interactive ? "app-card-interactive" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
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
