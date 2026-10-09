"use client";

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
    <>
      <div
        className="modal modal-blur fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
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
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show d-block" />
    </>
  );
}
