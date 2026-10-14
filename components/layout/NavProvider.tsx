"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Ancho mínimo en el que el sidebar deja de ser off-canvas (breakpoint `lg` de Tabler). */
const DESKTOP_QUERY = "(min-width: 992px)";

type NavContextValue = {
  /** Sidebar desplegado en pantallas donde funciona como off-canvas. */
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const NavContext = createContext<NavContextValue | null>(null);

/**
 * Estado compartido del menú lateral (Fase 39).
 *
 * Antes el botón hamburguesa vivía dentro del propio `<aside>`, que en
 * pantallas chicas queda oculto tras `navbar-expand-lg`: el resultado era una
 * franja fija de 56 px sobre el header y un menú que se abría encima del
 * contenido sin fondo ni cierre con Escape. El botón ahora está en el header
 * y ambos lados leen este estado.
 *
 * Se monta en el layout de `(app)`, así que envuelve también a los Server
 * Components hijos: el contexto solo lo consumen los componentes cliente.
 */
export function NavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  // Al pasar a desktop el sidebar se muestra siempre: si el menú quedó
  // abierto en mobile, cerrarlo para no arrastrar el estado al resize.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Escape cierra el menú, como cualquier panel modal.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Con el menú abierto en mobile la página de fondo no debe seguir
  // desplazándose. La clase solo se aplica en el rango donde el sidebar es
  // off-canvas; en desktop el evento `change` de la media query lo cierra.
  useEffect(() => {
    if (!open) {
      return;
    }
    document.body.classList.add("app-nav-open");
    return () => document.body.classList.remove("app-nav-open");
  }, [open]);

  const value = useMemo(() => ({ open, toggle, close }), [open, toggle, close]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const value = useContext(NavContext);
  if (!value) {
    throw new Error("useNav debe usarse dentro de <NavProvider>");
  }
  return value;
}
