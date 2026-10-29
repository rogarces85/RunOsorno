"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BIcon } from "@/components/ui/BIcon";
import {
  markAllAsReadAction,
  markAsReadAction,
} from "@/lib/actions/notification.actions";
import { formatDateTimeShort } from "@/lib/i18n/format";

export type BellNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  href: string;
};

function formatWhen(iso: string): string {
  // Sin el año a propósito: en la campanita casi todo es de los últimos días y
  // el año solo estorba. La zona horaria sí es obligatoria (Fase 46).
  return formatDateTimeShort(iso);
}

export function NotificationBell({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: BellNotification[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const primerItemRef = useRef<HTMLButtonElement>(null);

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

  /**
   * `Escape` cierra el desplegable y devuelve el foco a la campanita (Fase 48,
   * tareas 48.4 y 48.6).
   *
   * Antes solo se cerraba con el ratón: se cerraba al hacer clic fuera, que con
   * un lector de pantalla o con teclado no existe. Y al cerrarlo el foco se
   * perdía en el cuerpo del documento, de modo que quien abría la lista con la
   * tecla Enter tenía que recorrer toda la página para volver.
   */
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

  /** Al abrir, el foco entra en la lista y no se queda en la campanita. */
  useEffect(() => {
    if (open) {
      primerItemRef.current?.focus();
    }
  }, [open]);

  const openItem = async (item: BellNotification) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      if (!item.isRead) {
        await markAsReadAction({ id: item.id });
      }
      setOpen(false);
      router.push(item.href);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await markAllAsReadAction();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nav-item dropdown" ref={containerRef}>
      {/*
        `aria-label` con el número dentro y sin paréntesis (Fase 48, 48.6).
        El contador es texto visible del botón, y la regla "Label in Name"
        (WCAG 2.5.3) pide que lo que se ve esté en el nombre accesible: antes
        decía "Notificaciones (5 sin leer)" y el "5" de la esquina no estaba,
        así que un lector de pantalla oía un número que no era el que veía.
        También se dice "5 sin leer" en vez de solo "5", que es más útil.
      */}
      <button
        type="button"
        ref={botonRef}
        className="nav-link nav-link-icon"
        title="Notificaciones"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : "Notificaciones"
        }
        data-testid="notification-bell"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <BIcon name="bell" size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="badge notification-badge text-bg-danger"
            data-testid="notification-badge"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="dropdown-menu dropdown-menu-end show"
          data-testid="notification-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            left: "auto",
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          <div className="dropdown-header pe-auto d-flex align-items-center justify-content-between">
            <span>Notificaciones</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-link p-0"
                data-testid="mark-all-read"
                onClick={markAll}
              >
                <BIcon name="envelope-open" size={16} className="me-1" aria-hidden />
                Marcar todas como leídas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div
              className="dropdown-item text-secondary"
              data-testid="notification-empty"
            >
              No tienes notificaciones.
            </div>
          ) : (
            items.map((item, index) => (
              <button
                key={item.id}
                ref={index === 0 ? primerItemRef : undefined}
                type="button"
                className={`dropdown-item${item.isRead ? "" : " active"}`}
                data-testid="notification-item"
                onClick={() => openItem(item)}
              >
                <div className="d-flex align-items-start gap-2">
                  {!item.isRead && (
                    <span
                      className="rounded-circle bg-primary mt-1"
                      style={{ width: 8, height: 8, flexShrink: 0 }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex-grow-1">
                    <div className="fw-medium">{item.title}</div>
                    <div className="small text-secondary">{item.message}</div>
                    <div className="small text-secondary mt-1">
                      {formatWhen(item.createdAt)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
          <div className="dropdown-divider" />
          <Link
            href="/notifications"
            className="dropdown-item text-center"
            data-testid="notifications-all-link"
            onClick={() => setOpen(false)}
          >
            <BIcon name="check" size={16} className="me-1" aria-hidden />
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
