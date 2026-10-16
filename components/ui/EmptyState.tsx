import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { IconInbox } from "@tabler/icons-react";

/**
 * Estado vacío de Tabler (tarea 38.1).
 *
 * Se usa dentro de un `.card-body` o como bloque suelto. La acción es
 * opcional porque no todos los vacíos son "algo falta crear": a veces el
 * listado está vacío porque los filtros no arrojan resultados, y ahí la
 * acción correcta es cambiar el filtro, no crear un registro.
 */
export function EmptyState({
  icon: Icon = IconInbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionVariant = "primary",
  compact = false,
  children,
}: {
  icon?: ComponentType<{ size?: number; stroke?: number; className?: string }>;
  /** Mensaje principal. */
  title: string;
  /** Explicación orientativa de qué hacer a continuación. */
  description?: string;
  actionLabel?: string;
  /** Renderiza la acción como `Link` (navegación real). */
  actionHref?: string;
  /** Renderiza la acción como `button` (acción en el servidor). */
  onAction?: () => void;
  actionVariant?: "primary" | "outline-primary";
  /** Versión reducida para dentro de tablas o modales. */
  compact?: boolean;
  children?: ReactNode;
}) {
  const action = actionLabel ? (
    actionHref ? (
      <Link
        href={actionHref}
        className={`btn btn-${actionVariant}`}
        data-testid="empty-state-action"
      >
        {actionLabel}
      </Link>
    ) : onAction ? (
      <button
        type="button"
        className={`btn btn-${actionVariant}`}
        data-testid="empty-state-action"
        onClick={onAction}
      >
        {actionLabel}
      </button>
    ) : null
  ) : null;

  return (
    <div
      className={`text-center ${compact ? "py-2" : "py-4"}`}
      data-testid="empty-state"
    >
      <div className="mb-3">
        <span className="avatar avatar-md bg-secondary-lt text-secondary-ink">
          <Icon size={24} stroke={1.5} />
        </span>
      </div>
      <p className="empty-state-title mb-1" data-testid="empty-state-title">
        {title}
      </p>
      {description && (
        <p className="empty-state-description text-secondary mb-0">
          {description}
        </p>
      )}
      {children}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
