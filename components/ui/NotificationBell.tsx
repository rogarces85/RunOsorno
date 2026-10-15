"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBell, IconCheck, IconMailOpened } from "@tabler/icons-react";
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
      <button
        type="button"
        className="nav-link nav-link-icon"
        title="Notificaciones"
        aria-label={
          unreadCount > 0
            ? `Notificaciones (${unreadCount} sin leer)`
            : "Notificaciones"
        }
        data-testid="notification-bell"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <IconBell size={20} stroke={1.75} />
        {unreadCount > 0 && (
          <span
            className="badge notification-badge text-bg-danger"
            data-testid="notification-badge"
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
                <IconMailOpened size={16} stroke={1.75} className="me-1" />
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
            items.map((item) => (
              <button
                key={item.id}
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
            <IconCheck size={16} stroke={1.75} className="me-1" />
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
