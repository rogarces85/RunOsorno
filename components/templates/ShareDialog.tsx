"use client";

import { useState, type FormEvent } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { shareTemplateAction } from "@/lib/actions/template.actions";
import type { GroupBasic } from "@/lib/services/group.service";

export function ShareDialog({
  template,
  groups,
  onClose,
  onShared,
}: {
  template: { id: string; name: string };
  groups: GroupBasic[];
  onClose: () => void;
  onShared: (message: string) => void;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(() => groups[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!groupId) {
      setError("Selecciona un grupo");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await shareTemplateAction({
      templateId: template.id,
      groupId,
    });
    setBusy(false);
    if (result.ok) {
      onShared(`Plantilla "${template.name}" compartida con el grupo`);
      onClose();
      router.refresh();
      return;
    }
    setError(result.error);
  };

  return (
    <ModalShell
      onClose={onClose}
      busy={busy}
      titleId="share-dialog-title"
      dialogTestId="share-dialog"
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-header">
          <h2 className="modal-title h5" id="share-dialog-title">
            Compartir plantilla
          </h2>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={busy}
          />
        </div>
        <div className="modal-body">
          {error && <Alert variant="danger">{error}</Alert>}
          {groups.length === 0 ? (
            <p className="text-secondary mb-0">
              No perteneces a ningún grupo todavía. Únete a un grupo para poder
              compartir plantillas.
            </p>
          ) : (
            <>
              <p className="mb-2">
                Los coaches del grupo podrán ver y clonar{" "}
                <strong>{template.name}</strong> (no editarla).
              </p>
              <label className="form-label" htmlFor="share-group">
                Grupo
              </label>
              <select
                id="share-group"
                className="form-select"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                disabled={busy}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          {groups.length > 0 && (
            <Button type="submit" loading={busy}>
              {busy ? "Compartiendo…" : "Compartir"}
            </Button>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
