import {
  Children,
  cloneElement,
  type ReactElement,
  type ReactNode,
} from "react";

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
 * - `layout="stacked"` (por defecto): etiqueta arriba; input, select o textarea.
 * - `layout="choice"`: checkbox o radio con la etiqueta al lado. Con `toggle`, el
 *   checkbox se dibuja como interruptor (`form-switch`).
 *
 * El primer hijo es el control; los demás (un `<datalist>`, por ejemplo) se
 * renderizan sin tocar.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  layout = "stacked",
  toggle = false,
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
  /**
   * `stacked` (por defecto) para input, select y textarea; `choice` para
   * checkbox y radio, donde la etiqueta va al lado del control.
   */
  layout?: "stacked" | "choice";
  /** Con `layout="choice"`, renderiza el control como interruptor. */
  toggle?: boolean;
  /** Debe ser el control en sí: `input`, `select` o `textarea`. */
  children: ReactNode;
  className?: string;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  // El primer hijo es el control; el resto (por ejemplo un `<datalist>` que
  // acompaña a un input con sugerencias) se renderiza tal cual. Clonar un array
  // completo rompía en tiempo de ejecución.
  const [control, ...rest] = Children.toArray(children);
  const stateProps = {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };

  if (layout === "choice") {
    return (
      <div className={`app-field app-field-choice ${className}`.trim()}>
        <div className={toggle ? "form-check form-switch" : "form-check"}>
          {cloneElement(
            control as ReactElement<Record<string, unknown>>,
            stateProps,
          )}
          <label className="form-check-label" htmlFor={id}>
            {label}
          </label>
        </div>
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

  return (
    <div className={`app-field ${className}`.trim()}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="app-field-required"> (obligatorio)</span>
        ) : null}
      </label>
      {cloneElement(
        control as ReactElement<Record<string, unknown>>,
        stateProps,
      )}
      {rest}
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
