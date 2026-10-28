"use client";

import { BIcon } from "@/components/ui/BIcon";
import { useNav } from "./NavProvider";

/**
 * Botón hamburguesa del menú lateral (Fase 39).
 *
 * Solo aparece por debajo del breakpoint `lg`: desde ahí el sidebar ya es una
 * columna fija. Vive en el header porque el `<aside>` está oculto en mobile,
 * que es justo donde hace falta para abrirlo.
 *
 * No lleva `.navbar-toggler`: el header usa `navbar-expand` (el patrón de
 * AdminLTE 4), y Bootstrap oculta `.navbar-toggler` con esa clase en todos los
 * anchos, no solo en `lg`. Con `.nav-link` hereda el alto y el color de los
 * demás controles del header y sigue visible en móvil.
 */
export function NavToggle() {
  const { open, toggle } = useNav();

  return (
    <button
      type="button"
      className="nav-link d-lg-none me-2"
      aria-controls="app-sidebar"
      aria-expanded={open}
      aria-label={
        open ? "Cerrar menú de navegación" : "Abrir menú de navegación"
      }
      data-testid="nav-toggle"
      onClick={toggle}
    >
      <BIcon name="list" size={22} />
    </button>
  );
}
