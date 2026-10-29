import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { BIcon } from "@/components/ui/BIcon";
import { Button, buttonClassName } from "@/components/ui/Button";

/**
 * Estado vacío (tarea 38.1).
 *
 * Se usa dentro de un `.card-body` o como bloque suelto. La acción es
 * opcional porque no todos los vacíos son "algo falta crear": a veces el
 * listado está vacío porque los filtros no arrojan resultados, y ahí la
 * acción correcta es cambiar el filtro, no crear un registro.
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionVariant = "primary",
  compact = false,
  children,
}: {
  /** Nombre del icono de Bootstrap Icons (sin el prefijo `bi bi-`). */
  icon?: string;
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
        className={buttonClassName({
          variant:
            actionVariant === "outline-primary" ? "secondary" : "primary",
        })}
        data-testid="empty-state-action"
      >
        {actionLabel}
      </Link>
    ) : onAction ? (
      <Button
        variant={actionVariant === "outline-primary" ? "secondary" : "primary"}
        testId="empty-state-action"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    ) : null
  ) : null;

  return (
    <div
      className={`app-empty-state text-center ${
        compact ? "app-empty-state-compact py-2" : "py-4"
      }`}
      data-testid="empty-state"
    >
      <span className="app-empty-state-icon" aria-hidden>
        <BIcon name={icon} size={22} aria-hidden />
      </span>
      <p
        className="empty-state-title app-empty-state-title mb-1"
        data-testid="empty-state-title"
      >
        {title}
      </p>
      {description && (
        <p className="empty-state-description app-empty-state-description text-secondary mb-0">
          {description}
        </p>
      )}
      {children}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
