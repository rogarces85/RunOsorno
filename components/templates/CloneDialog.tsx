"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cloneTemplateAction } from "@/lib/actions/template.actions";

export function CloneDialog({
  template,
  onClose,
}: {
  template: { id: string; name: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(() => `${template.name} (copia)`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Ingresa un nombre (mínimo 2 caracteres)");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await cloneTemplateAction({
      templateId: template.id,
      newName: trimmed,
    });
    setBusy(false);
    if (result.ok) {
      onClose();
      router.push(`/coach/templates/${result.data.id}`);
      router.refresh();
      return;
    }
    setError(result.error);
  };

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
            <form onSubmit={submit} noValidate>
              <div className="modal-header">
                <h5 className="modal-title">Clonar plantilla</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cerrar"
                  onClick={onClose}
                  disabled={busy}
                />
              </div>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <label className="form-label" htmlFor="clone-name">
                  Nombre de la copia
                </label>
                <input
                  id="clone-name"
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={busy}
                  autoFocus
                />
                <div className="form-hint">
                  La copia será tu plantilla privada y podrás editarla.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-link link-secondary"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy}
                >
                  {busy ? "Clonando…" : "Clonar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show d-block" />
    </>
  );
}
