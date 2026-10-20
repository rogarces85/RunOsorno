import type { ReactNode } from "react";

export type AlertVariant =
  "success" | "danger" | "warning" | "info" | "secondary";

/**
 * Wrapper del `alert` de Tabler (tarea 38.3). Centraliza el marcado
 * (`role`, `alert-dismissible`, botón de cerrar) que antes estaba repetido
 * componente a componente con clases escritas a mano.
 */
export function Alert({
  variant,
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  className = "",
  testId,
  role,
}: {
  variant: AlertVariant;
  title?: string;
  children?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode;
  className?: string;
  testId?: string;
  role?: "alert" | "status";
}) {
  const classes = [
    "alert",
    "app-alert",
    `alert-${variant}`,
    dismissible ? "alert-dismissible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role={role ?? "alert"}
      data-testid={testId ?? "alert"}
    >
      {title && <h3 className="alert-title h4">{title}</h3>}
      {children && (
        <div className={title ? "text-secondary" : undefined}>
          {icon && <span className="me-1">{icon}</span>}
          {children}
        </div>
      )}
      {dismissible && (
        <button
          type="button"
          className="btn-close"
          aria-label="Cerrar"
          data-testid="alert-dismiss"
          onClick={onDismiss}
        />
      )}
    </div>
  );
}
