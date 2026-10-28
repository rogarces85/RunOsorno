"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BIcon } from "@/components/ui/BIcon";
import { logout } from "@/lib/actions/auth.actions";
import type { Role } from "@/lib/auth/role";
import { Avatar } from "@/components/ui/Avatar";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  coach: "Entrenador",
  athlete: "Atleta",
};

/**
 * Menú de usuario del header: avatar con punto de presencia ("en línea"),
 * nombre y rol del usuario, Mi perfil y Cerrar sesión.
 *
 * El desplegable replica el patrón de `NotificationBell` (estado React,
 * cierre por clic fuera y `Escape` con devolución del foco) porque este
 * proyecto no carga el bundle de Bootstrap JS: no hay `data-bs-toggle`.
 * El logout sigue siendo la server action original (`AGENTS.md`, Fase 43)
 * metida en su propio `<form action={logout}>` dentro del menú.
 */
export function UserMenu({
  userId,
  name,
  role,
  avatarKey,
}: {
  userId: string;
  name: string;
  role: Role;
  avatarKey?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const primerItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        botonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      primerItemRef.current?.focus();
    }
  }, [open]);

  return (
    <div className="nav-item dropdown" ref={containerRef}>
      <button
        type="button"
        ref={botonRef}
        className="nav-link app-user-menu-button"
        data-testid="user-menu-button"
        title="Mi cuenta"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="app-user-avatar">
          <Avatar userId={userId} name={name} avatarKey={avatarKey} size="sm" />
          <span className="app-presence-dot" aria-hidden="true" />
          <span className="visually-hidden">En línea</span>
        </span>
        <span className="app-user-menu-id d-none d-md-flex flex-column">
          <span className="app-user-menu-name">{name}</span>
          <span className="app-user-menu-role">{ROLE_LABELS[role]}</span>
        </span>
      </button>
      {open ? (
        <div
          className="dropdown-menu dropdown-menu-end show"
          data-testid="user-menu-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            left: "auto",
            minWidth: 230,
          }}
        >
          <div className="dropdown-header pe-auto">
            <div className="fw-medium text-truncate">{name}</div>
            <div className="small text-secondary">{ROLE_LABELS[role]}</div>
          </div>
          <div className="dropdown-divider" />
          <Link
            href="/profile"
            ref={primerItemRef}
            className="dropdown-item"
            data-testid="user-menu-profile"
            onClick={() => setOpen(false)}
          >
            <BIcon name="person" size={16} className="me-2" aria-hidden />
            Mi perfil
          </Link>
          <div className="dropdown-divider" />
          <form action={logout}>
            <button
              type="submit"
              className="dropdown-item"
              data-testid="user-menu-logout"
            >
              {/* Sin `onClick` que cierre el menú: desmontar el `<form>`
                  cancelaría la server action antes de navegar a /login. */}
              <BIcon name="box-arrow-right" size={16} className="me-2" aria-hidden />
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
