"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  markAllAsReadAction,
  markAsReadAction,
} from "@/lib/actions/notification.actions";

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  href: string;
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function NotificationCenter({
  rows,
  filter,
}: {
  rows: NotificationRow[];
  filter: "all" | "unread";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const openRow = async (row: NotificationRow) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      if (!row.isRead) {
        await markAsReadAction({ id: row.id });
      }
      router.push(row.href);
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
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <ul className="nav nav-pills" data-testid="notification-filters">
          <li className="nav-item">
            <Link
              href="/notifications"
              className={`nav-link${filter === "all" ? " active" : ""}`}
              data-testid="filter-all"
            >
              Todas
            </Link>
          </li>
          <li className="nav-item">
            <Link
              href="/notifications?filter=unread"
              className={`nav-link${filter === "unread" ? " active" : ""}`}
              data-testid="filter-unread"
            >
              No leídas
            </Link>
          </li>
        </ul>
        {rows.some((row) => !row.isRead) && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            data-testid="mark-all-read"
            disabled={busy}
            onClick={markAll}
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div
          className="alert alert-secondary"
          data-testid="notifications-empty"
        >
          {filter === "unread"
            ? "No tienes notificaciones sin leer."
            : "No tienes notificaciones."}
        </div>
      ) : (
        <div className="list-group" data-testid="notification-list">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`list-group-item list-group-item-action${row.isRead ? "" : " active"}`}
              data-testid="notification-row"
              onClick={() => openRow(row)}
            >
              <div className="d-flex w-100 align-items-start justify-content-between gap-2">
                <div>
                  <div className="fw-bold">{row.title}</div>
                  <div className="small">{row.message}</div>
                </div>
                <small className="text-nowrap">{formatWhen(row.createdAt)}</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
