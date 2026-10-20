import type { ReactNode } from "react";

/**
 * Cabecera de página (Fase B, tarea 4.4).
 *
 * Unifica lo que hoy cada pantalla resolvía a su manera: un solo `h1`, una
 * descripción opcional y las acciones alineadas a la derecha, separadas del contenido
 * por una línea de 1 px. En móvil las acciones bajan bajo el título en lugar de
 * apretarse a su lado.
 *
 * Debe haber un único `PageHeader` por pantalla: es el `h1` de la página, y las
 * tarjetas usan niveles inferiores.
 */
export function PageHeader({
  title,
  description,
  actions,
  className = "",
}: {
  title: ReactNode;
  /** Una frase que explique qué se hace en la pantalla, no una repetición del título. */
  description?: string;
  /** Botones o enlaces, ya renderizados por el llamador. */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`app-page-header ${className}`.trim()}>
      <div className="app-page-header-text">
        <h1 className="page-title mb-0">{title}</h1>
        {description ? (
          <p className="app-page-header-description mb-0">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="app-page-header-actions">{actions}</div> : null}
    </header>
  );
}
