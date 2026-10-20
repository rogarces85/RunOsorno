"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { bulkAssignAction } from "@/lib/actions/plan.actions";
import type { TemplateOption } from "./AssignTemplateForm";

function todayISO(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function MultiAssignDialog({
  open,
  athletes,
  templates,
  onClose,
}: {
  open: boolean;
  athletes: { athleteId: string; name: string }[];
  templates: TemplateOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return null;
  }

  const toggle = (athleteId: string) => {
    setSelected((current) =>
      current.includes(athleteId)
        ? current.filter((id) => id !== athleteId)
        : [...current, athleteId],
    );
    if (error) setError(null);
  };

  const submit = async () => {
    if (selected.length === 0) {
      setError("Selecciona al menos un atleta.");
      return;
    }
    if (!templateId) {
      setError("Selecciona una plantilla");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await bulkAssignAction({
      athleteIds: selected,
      templateId,
      date,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  };

  return (
    <ModalShell
      onClose={onClose}
      busy={busy}
      titleId="multi-assign-title"
      dialogTestId="multi-assign"
    >
      <div className="modal-header">
        <h2 className="modal-title h5" id="multi-assign-title">
          Multi-asignación
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
        <div className="mb-3">
          <label className="form-label" htmlFor="ma-date">
            Fecha
          </label>
          <input
            id="ma-date"
            type="date"
            className="form-control"
            data-testid="ma-date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="ma-template">
            Plantilla
          </label>
          <select
            id="ma-template"
            className="form-select"
            data-testid="ma-template"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.sessionType})
              </option>
            ))}
          </select>
        </div>
        <div className="mb-1 fw-medium">Atletas</div>
        <div className="list-group mb-2" data-testid="ma-athletes">
          {athletes.length === 0 ? (
            <div className="list-group-item text-secondary">
              Sin atletas en el team.
            </div>
          ) : (
            athletes.map((athlete) => (
              <label
                key={athlete.athleteId}
                className="list-group-item list-group-item-action d-flex align-items-center gap-2"
              >
                <input
                  type="checkbox"
                  className="form-check-input"
                  data-testid={`ma-athlete`}
                  checked={selected.includes(athlete.athleteId)}
                  onChange={() => toggle(athlete.athleteId)}
                />
                <span>{athlete.name}</span>
              </label>
            ))
          )}
        </div>
        {error && (
          <div className="text-danger small" data-testid="ma-error">
            {error}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button
          onClick={submit}
          disabled={busy}
          loading={busy}
          testId="ma-submit"
        >
          {busy ? "Asignando…" : "Asignar a seleccionados"}
        </Button>
      </div>
    </ModalShell>
  );
}
