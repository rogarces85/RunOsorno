"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/lib/auth/role";
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
 * El rol y la condición de Director Técnico se resuelven en el layout (RSC)
 * y se pasan como props serializables. El estado de apertura vive en
 * `NavProvider`, compartido con el botón hamburguesa del header.
 *
 * Por debajo de `lg` se comporta como off-canvas (desliza desde la izquierda
 * sobre un fondo oscurecido, con `Escape` para cerrar); desde `lg` es la
 * columna fija de siempre. Ese comportamiento está en `globals.css`.
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
        className={`navbar navbar-vertical navbar-expand-lg app-sidebar${open ? " is-open" : ""}`}
        data-testid="app-sidebar"
        data-open={open ? "true" : "false"}
        id="app-sidebar"
        aria-label="Menú de navegación"
      >
        <div className="container-fluid">
          <div className={`collapse navbar-collapse${open ? " show" : ""}`}>
            {sections.map((section) => (
              <ul key={section.key} className="navbar-nav pt-lg-3">
                {section.header ? (
                  <li className="nav-item">
                    <span className="nav-link text-secondary small text-uppercase fw-bold">
                      {section.header}
                    </span>
                  </li>
                ) : null}
                {section.items.map((item: NavItem) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href} className="nav-item">
                      <Link
                        className={`nav-link${active ? " active" : ""}`}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={close}
                      >
                        <span className="nav-link-icon">
                          <item.icon size={20} stroke={1.75} />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
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