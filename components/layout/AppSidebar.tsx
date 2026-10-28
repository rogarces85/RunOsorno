"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/lib/auth/role";
import { Logo } from "./Logo";
import { useNav } from "./NavProvider";
import { navForRole, type NavItem } from "./nav";
import { BIcon } from "@/components/ui/BIcon";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar de la aplicación, con menú según rol (Fases 31 y 39).
 *
 * Estructura de AdminLTE:
 * - .app-sidebar : contenedor principal del sidebar
 * - .sidebar-brand : marca del sidebar (logo + nombre)
 * - .sidebar-wrapper : contenedor del menú
 * - .nav.sidebar-menu : menú de navegación vertical
 * - .nav-link : cada ítem del menú
 * - .nav-link-icon : contenedor del ícono
 *
 * El rol y la condición de Director Técnico se resuelven en el layout (RSC)
 * y se pasan como props serializables. El estado de apertura vive en
 * NavProvider, compartido con el botón hamburguesa del header.
 *
 * Por debajo de lg se comporta como off-canvas (desliza desde la izquierda
 * sobre un fondo oscurecido, con Escape para cerrar); desde lg es la
 * columna fija de siempre. Ese comportamiento está en globals.css.
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
        {/*begin::Sidebar Brand-->
        <div className="sidebar-brand">
          <a href="/" className="brand-link" prefetch={false} onClick={close}>
            <span className="brand-text fw-light">RunOsorno Training</span>
          </a>
        </div>
        {/*end::Sidebar Brand-->
        {/*begin::Sidebar Wrapper-->
        <div className="sidebar-wrapper">
          <nav class="mt-2">
            {/*begin::Sidebar Menu-->
            <ul className="nav sidebar-menu flex-column">
              {sections.map((section) => (
                <ul key={section.key} className="nav sidebar-menu flex-column">
                  {section.header ? (
                    <li className="nav-item">
                      <span className="nav-header">
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
                          prefetch={false}
                          aria-current={active ? "page" : undefined}
                          onClick={close}
                        >
                          <span className="nav-icon">
                            <BIcon name={item.icon} size={20} />
                          </span>
                          <span className="nav-text">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ))}
            {/*end::Sidebar Menu-->
            </nav>
          </div>
          {/*end::Sidebar Wrapper-->
        </aside>
        {/*end::Sidebar-->
        {/* Solo se monta en mobile; el CSS lo oculta desde lg. */}
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
  );
}
