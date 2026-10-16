"use client";

import { ModalShell } from "@/components/ui/ModalShell";

/**
 * Diálogo de confirmación para acciones destructivas (Fase 38).
 *
 * `Escape`, foco dentro y vuelta al origen vienen de `ModalShell` (Fase 48,
 * tarea 48.4).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <ModalShell
      onClose={onCancel}
      busy={busy}
      titleId="confirm-dialog-title"
      dialogTestId="confirm-dialog"
    >
      <div className="modal-header">
        <h2 className="modal-title h5" id="confirm-dialog-title">
          {title}
        </h2>
        <button
          type="button"
          className="btn-close"
          aria-label="Cerrar"
          onClick={onCancel}
          disabled={busy}
        />
      </div>
      <div className="modal-body">
        <p className="mb-0">{message}</p>
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-link link-secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Procesando…" : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
