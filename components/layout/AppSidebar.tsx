"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/lib/auth/role";
import { BIcon } from "@/components/ui/BIcon";
import { Logo } from "./Logo";
import { useNav } from "./NavProvider";
import { navForRole, type NavItem } from "./nav";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar de la aplicación, con menú según rol (Fases 31 y 39).
 *
 * El marcado es el de AdminLTE 4 y no es decorativo: su hoja de estilos coloca
 * este `<aside>` dentro de la rejilla de `.app-wrapper` mediante
 * `grid-area: lte-app-sidebar`, y espera tres niveles —
 * `.app-sidebar` → `.sidebar-brand` + `.sidebar-wrapper` → `nav.sidebar-menu`.
 * Si falta cualquiera de ellos, el menú pierde su celda de rejilla y los
 * enlaces acaban pintados como una franja horizontal sobre el contenido.
 *
 * El rol y la condición de Director Técnico se resuelven en el layout (RSC)
 * y se pasan como props serializables. El estado de apertura vive en
 * `NavProvider`, compartido con el botón hamburguesa del header.
 *
 * Por debajo de `lg` se comporta como off-canvas (desliza desde la izquierda
 * sobre un fondo oscurecido, con `Escape` para cerrar); desde `lg` es la
 * columna fija de siempre. Ese comportamiento está en `components.css`.
 */
export function AppSidebar({
  role,
  isDirector,
}: {
  role: Role;
  isDirector: boolean;
}) {
  const { open, close } = useNav();
  const pathname = usePathname();
  const sections = navForRole(role, isDirector);

  // Cambiar de página debe dejar el menú cerrado en mobile, también cuando la
  // navegación viene del historial del navegador y no de un click en un link.
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      <aside
        className={`app-sidebar${open ? " is-open" : ""}`}
        data-testid="app-sidebar"
        data-open={open ? "true" : "false"}
        id="app-sidebar"
        aria-label="Menú de navegación"
      >
        <div className="sidebar-brand">
          <Link
            href="/"
            className="brand-link"
            prefetch={false}
            onClick={close}
          >
            {/* `mark` y no el logo por defecto: `wordmark` ya trae el texto
                "RunOsorno Training" dentro de la imagen y aquí AdminLTE añade
                su propio `.brand-text`, así que se solaparían. */}
            <Logo variant="mark" />
            <span className="brand-text fw-light">RunOsorno</span>
          </Link>
        </div>
        <div className="sidebar-wrapper">
          <nav className="mt-2" aria-label="Secciones">
            {sections.map((section) => (
              <ul key={section.key} className="nav sidebar-menu flex-column">
                {section.header ? (
                  <li className="nav-header">{section.header}</li>
                ) : null}
                {section.items.map((item: NavItem) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href} className="nav-item">
                      <Link
                        className={`nav-link${active ? " active" : ""}`}
                        href={item.href}
                        // Sin prefetch: al abrir una página, Next pedía de golpe
                        // todas las rutas del menú (10 renders SSR en paralelo).
                        // El Worker no sostiene esa ráfaga y Cloudflare cortaba
                        // algunas con 503 "exceeded CPU". La navegación sigue
                        // siendo RSC, solo deja de calentar rutas por adelantado.
                        prefetch={false}
                        aria-current={active ? "page" : undefined}
                        onClick={close}
                      >
                        <span className="nav-icon">
                          <BIcon name={item.icon} size={20} />
                        </span>
                        <p>{item.label}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </nav>
        </div>
      </aside>
      {/* Solo se monta en mobile; el CSS lo oculta desde `lg`. */}
      {open ? (
        <div
          className="app-sidebar-backdrop d-lg-none"
          data-testid="app-sidebar-backdrop"
          aria-hidden
          onClick={close}
        />
      ) : null}
    </>
  );
}
