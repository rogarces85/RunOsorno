"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/auth/role";
import { navForRole, type NavItem } from "./nav";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar de la aplicación, con menú según rol (Fase 31).
 * El rol y la condición de Director Técnico se resuelven en el layout (RSC)
 * y se pasan como props serializables.
 */
export function AppSidebar({
  role,
  isDirector,
}: {
  role: Role;
  isDirector: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sections = navForRole(role, isDirector);

  return (
    <aside className="navbar navbar-vertical navbar-expand-lg d-print-none">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          aria-expanded={open}
          aria-controls="sidebar-menu"
          aria-label="Alternar menú de navegación"
          onClick={() => setOpen(!open)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div
          id="sidebar-menu"
          className={`collapse navbar-collapse${open ? " show" : ""}`}
        >
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
                      onClick={() => setOpen(false)}
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
  );
}
