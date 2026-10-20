"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignSessionAction } from "@/lib/actions/plan.actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export type TemplateOption = {
  id: string;
  name: string;
  sessionType: string;
};

export function AssignTemplateForm({
  athleteId,
  dateISO,
  occupied,
  templates,
  onDone,
}: {
  athleteId: string;
  dateISO: string;
  occupied: boolean;
  templates: TemplateOption[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (replace: boolean) => {
    if (!templateId) {
      setError("Selecciona una plantilla");
      return;
    }
    setPending(true);
    setError(null);
    const result = await assignSessionAction({
      athleteId,
      templateId,
      date: dateISO,
      ...(replace ? { replace: true } : {}),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data.needsConfirm && !replace) {
      setConfirming(true);
      return;
    }
    router.refresh();
    onDone?.();
  };

  return (
    <div className="mt-3 pt-3 border-top" data-testid="assign-form">
      <h6 className="mb-2">
        {occupied ? "Reemplazar sesión" : "Asignar plantilla"}
      </h6>
      {templates.length === 0 ? (
        <p className="mb-0 text-secondary small">
          No tienes plantillas disponibles.
        </p>
      ) : (
        <>
          <select
            className="form-select form-select-sm"
            aria-label="Plantilla"
            value={templateId}
            onChange={(event) => {
              setTemplateId(event.target.value);
              if (error) setError(null);
            }}
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tpl.sessionType})
              </option>
            ))}
          </select>
          {error && <div className="text-danger small mt-1">{error}</div>}
          {confirming ? (
            <Alert
              variant="warning"
              className="py-2 mt-2 mb-0"
              testId="assign-confirm"
            >
              <div className="small mb-2">
                Ya hay una sesión ese día. ¿Reemplazar la plantilla existente?
              </div>
              <div className="btn-list">
                <Button
                  variant="danger"
                  size="sm"
                  loading={pending}
                  onClick={() => submit(true)}
                >
                  {pending ? "Reemplazando…" : "Reemplazar"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                >
                  Cancelar
                </Button>
              </div>
            </Alert>
          ) : (
            <Button
              size="sm"
              className="mt-2"
              loading={pending}
              onClick={() => submit(false)}
            >
              {pending ? "Asignando…" : "Asignar"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
