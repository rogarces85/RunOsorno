"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Contenedor de los modales de la app (Fase 48, tarea 48.4).
 *
 * Antes cada modal repetía el mismo marcado de Tabler y **ninguno** hacía tres
 * cosas básicas:
 *
 * 1. **No se cerraba con `Escape`.** El panel de detalle de sesión, los
 *    formularios de alta y los diálogos de confirmación solo se cerraban con el
 *    ratón. Para quien navega con teclado, abrirlos era una trampa: había que
 *    llegar con el ratón hasta el botón "Cerrar".
 * 2. **El foco no entraba en el diálogo.** Se quedaba en el elemento que lo
 *    abrió, que queda por detrás del fondo oscurecido, así que la siguiente
 *    pulsación de `Tab` empezaba a recorrer la página de nuevo.
 * 3. **El foco no volvía al cerrarse.** Abrir y cerrar un modal dejaba el foco
 *    perdido en el `<body>`.
 *
 * Este componente resuelve las tres y además:
 *
 * - ** atrapa el foco** dentro del diálogo mientras está abierto: con `Tab` en
 *   el último elemento vuelve al primero, y con `Shift+Tab` en el primero
 *   salta al último. Sin esto se puede tabular al contenido que hay detrás,
 *   que sigue siendo visible para un lector de pantalla.
 * - **Enlaza el diálogo con su título** por `aria-labelledby`, así que al
 *   abrirlo se anuncia qué es, no solo "diálogo".
 * - Se **restaura el foco** al elemento que lo abrió.
 *
 * No usa el JavaScript de Bootstrap: el proyecto no lo carga (nota de la Fase
 * 39), y sus modales se controlan con estado de React.
 */

/** Selector de todo lo que puede recibir foco dentro de un diálogo. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function ModalShell({
  children,
  onClose,
  titleId,
  title,
  busy = false,
  className = "modal-dialog modal-dialog-centered",
  dialogTestId,
}: {
  children: ReactNode;
  /** Se llama con `Escape` y con el botón de cerrar. */
  onClose: () => void;
  /** `id` del `<h* class="modal-title">` de dentro. */
  titleId?: string;
  /** Nombre accesible si no hay título enlazado. */
  title?: string;
  /** Mientras hay una operación en curso, `Escape` no cierra. */
  busy?: boolean;
  className?: string;
  dialogTestId?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Foco dentro al abrir y de vuelta al elemento de origen al cerrar.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const primero = dialog.querySelector<HTMLElement>(FOCUSABLE);
      (primero ?? dialog).focus();
    }
    return () => {
      // Si el elemento de origen ya no existe (navegación), no se hace nada.
      if (anterior && document.contains(anterior)) {
        anterior.focus();
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) {
          onClose();
        }
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }
      const focuses = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focuses.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const primero = focuses[0];
      const ultimo = focuses[focuses.length - 1];
      const activo = document.activeElement;
      if (event.shiftKey && (activo === primero || activo === dialog)) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && activo === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, busy]);

  return (
    <>
      <div
        ref={dialogRef}
        className="modal modal-blur fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={titleId ? undefined : title}
        data-testid={dialogTestId}
      >
        <div className={className} role="document">
          <div className="modal-content">{children}</div>
        </div>
      </div>
      <div className="modal-backdrop fade show d-block" />
    </>
  );
}
