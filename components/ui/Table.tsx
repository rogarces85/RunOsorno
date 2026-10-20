import type { ReactNode } from "react";

/**
 * Tabla del sistema visual (Fase C, tarea 5.4).
 *
 * Envuelve la tabla en su contenedor con scroll propio, que necesita `tabIndex={0}`,
 * `role="region"` y un nombre para poder desplazarse sin ratón (Fase 48). Las cabeceras
 * van en versalitas y las cifras se alinean a la derecha con `.app-numeric`.
 *
 * En móvil, las tablas que se migran a esta pieza usan la clase `app-table-stack` en
 * el `<tbody>` para convertirse en tarjetas de pares etiqueta-valor: la etiqueta sale
 * de `data-label` en cada celda.
 *
 * `label` es obligatorio: un contenedor con scroll sin nombre no es navegable con
 * lector de pantalla.
 */
export function Table({
  label,
  children,
  className = "",
  stackOnMobile = false,
}: {
  /** Nombre accesible de la región desplazable, por ejemplo «Listado de coaches». */
  label: string;
  children: ReactNode;
  className?: string;
  /** Activa el patrón de tarjetas en móvil (`data-label` en cada `td`). */
  stackOnMobile?: boolean;
}) {
  return (
    <div
      className="table-responsive app-table-wrapper"
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table
        className={[
          "table",
          "app-table",
          stackOnMobile ? "app-table-stack" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </table>
    </div>
  );
}
