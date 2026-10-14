"use client";

import { IconMenu2 } from "@tabler/icons-react";
import { useNav } from "./NavProvider";

/**
 * Botón hamburguesa del menú lateral (Fase 39).
 *
 * Solo aparece por debajo del breakpoint `lg`: desde ahí el sidebar ya es una
 * columna fija. Vive en el header porque el `<aside>` está oculto en mobile,
 * que es justo donde hace falta para abrirlo.
 */
export function NavToggle() {
  const { open, toggle } = useNav();

  return (
    <button
      type="button"
      className="navbar-toggler nav-link-icon me-2 d-lg-none"
      aria-controls="app-sidebar"
      aria-expanded={open}
      aria-label={
        open ? "Cerrar menú de navegación" : "Abrir menú de navegación"
      }
      data-testid="nav-toggle"
      onClick={toggle}
    >
      <IconMenu2 size={22} stroke={1.75} />
    </button>
  );
}
