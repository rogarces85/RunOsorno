"use client";

import { useState } from "react";
import { IconMoon, IconSun } from "@tabler/icons-react";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  themeCookieValue,
  type Theme,
} from "@/lib/ui/theme";

/**
 * Control de tema claro/oscuro (Fase A, tarea 3.2).
 *
 * El tema inicial lo renderiza el servidor desde la cookie, así que al cargar no hay
 * destello. Este control solo cambia el atributo y vuelve a escribir la cookie: no
 * recarga, no navega y no necesita Server Action.
 *
 * Accesibilidad: es un botón de icono con el nombre en un `visually-hidden` (nunca un
 * `aria-label` que reescriba texto visible, WCAG 2.5.3) y `aria-pressed` para que el
 * lector anuncie el estado: pulsado = tema oscuro.
 */
export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-bs-theme", next);
    document.cookie = `${THEME_COOKIE}=${themeCookieValue(next)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  }

  const label = theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      className="btn btn-ghost-secondary app-theme-toggle"
      onClick={toggle}
      aria-pressed={theme === "dark"}
    >
      {theme === "dark" ? (
        <IconSun size={18} stroke={1.75} aria-hidden="true" />
      ) : (
        <IconMoon size={18} stroke={1.75} aria-hidden="true" />
      )}
      <span className="visually-hidden">{label}</span>
    </button>
  );
}
