import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Clases de botón del sistema visual (Fase C, tarea 5.1).
 *
 * Se exportan aparte para que un `<Link>` o un `<a>` pueda verse igual que un botón
 * sin envolverlo en un `<button>` inválido dentro de un formulario.
 */
export function buttonClassName({
  variant = "primary",
  size = "md",
  iconOnly = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
} = {}): string {
  return [
    "btn",
    "app-btn",
    `app-btn-${variant}`,
    `app-btn-${size}`,
    iconOnly ? "app-btn-icon" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Botón del sistema visual.
 *
 * Estados definidos en `globals.css`: hover, active, `focus-visible` con anillo de
 * 2 px y desplazamiento de 2 px, `disabled` atenuado y `loading` con `aria-busy`
 * (el texto sigue visible para que el nombre accesible no cambie mientras guarda).
 *
 * Accesibilidad: si el botón es solo icono, el llamador debe pasar el nombre dentro
 * de un `<span className="visually-hidden">`, nunca un `aria-label` que reescriba
 * texto visible.
 */
export function Button({
  variant = "primary",
  size = "md",
  iconOnly = false,
  loading = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, iconOnly, className })}
    >
      {loading ? (
        <span className="spinner-border spinner-border-sm app-btn-spinner" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
