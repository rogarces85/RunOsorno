import { cloneElement, type ReactElement, type ReactNode } from "react";

/**
 * Campo de formulario con etiqueta, ayuda y error (Fase C, tarea 5.2).
 *
 * El control lo escribe el llamador (con su `register` de react-hook-form), así que
 * aquí solo se le enganchan los atributos de estado con `cloneElement`: si no, el
 * error se vería en rojo pero no se anunciaría al lector de pantalla (WCAG 3.3.1).
 *
 * El `id` del control debe ser el mismo que recibe este componente: se usa para el
 * `htmlFor` de la etiqueta y para construir `id` de ayuda y de error.
 *
 * Para casillas y conmutadores (donde la etiqueta va al lado del control) no se usa
 * este componente: ahí el `<label>` envuelve al control.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  children,
  className = "",
}: {
  /** Identificador del control; debe coincidir con su `id`. */
  id: string;
  label: string;
  /** Texto de ayuda bajo el control. Se oculta si hay error. */
  hint?: string;
  /** Mensaje de error; activa `aria-invalid` y `aria-describedby`. */
  error?: string;
  /** Marca visual de obligatorio (el `required` real lo pone el control). */
  required?: boolean;
  /** Debe ser el control en sí: `input`, `select` o `textarea`. */
  children: ReactNode;
  className?: string;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={`app-field ${className}`.trim()}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required ? <span className="app-field-required"> (obligatorio)</span> : null}
      </label>
      {cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && !error ? (
        <div className="form-hint" id={hintId}>
          {hint}
        </div>
      ) : null}
      {error ? (
        <div className="invalid-feedback d-block" id={errorId}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
