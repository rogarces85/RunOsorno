"use client";

import type { ReactNode } from "react";
import { SECTION_TYPE_LABELS } from "@/lib/config/constants";
import type { FeedbackMessage } from "@/lib/services/feedback.service";
import type { PlanItem } from "@/lib/services/plan.service";
import { formatDateChile, toISODate } from "@/lib/utils/date";
import {
  formatDistance,
  formatDuration,
  formatRpe,
  formatSessionType,
} from "@/lib/utils/format";
import { ModalShell } from "@/components/ui/ModalShell";
import { Badge, badgeToneFromColor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FeedbackForm } from "./FeedbackForm";
import { FeedbackThread } from "./FeedbackThread";
import { DAY_STATE_META, resolveDayState } from "./dayState";

/**
 * Panel de detalle de una sesión (Fases 17, 18, 21).
 *
 * `Escape` para cerrar y la gestión del foco vienen de `ModalShell` (Fase 48,
 * tarea 48.4). Los encabezados están en el orden `h2` (el diálogo) → `h3` (la
 * plantilla) → `h4` (las secciones) porque el panel es contenido de primer
 * nivel aunque se muestre dentro de la página.
 */
export function SessionDetailPanel({
  open,
  dateISO,
  item,
  messages,
  extra,
  recordForm,
  onClose,
}: {
  open: boolean;
  dateISO: string | null;
  item: PlanItem | null;
  messages?: FeedbackMessage[];
  extra?: ReactNode;
  recordForm?: ReactNode;
  onClose: () => void;
}) {
  if (!open || !dateISO) {
    return null;
  }

  const today = toISODate(new Date());
  const state = resolveDayState(item, dateISO, today);
  const meta = DAY_STATE_META[state];
  const displayDate = formatDateChile(new Date(`${dateISO}T12:00:00`));

  return (
    <ModalShell
      onClose={onClose}
      titleId="session-detail-title"
      title="Detalle de sesión"
      dialogTestId="session-detail-dialog"
    >
      <div className="modal-header">
        <h2
          className="modal-title h5"
          id="session-detail-title"
          data-testid="session-detail-date"
        >
          {displayDate}
        </h2>
        <button
          type="button"
          className="btn-close"
          aria-label="Cerrar"
          onClick={onClose}
        />
      </div>
      <div className="modal-body">
        <div className="mb-3 d-flex align-items-center gap-2">
          <span data-testid="session-detail-state">
            <Badge tone={badgeToneFromColor(meta.color)}>{meta.label}</Badge>
          </span>
          {item?.template && (
            <span className="text-secondary">
              {formatSessionType(item.template.sessionType)}
            </span>
          )}
        </div>

        {item?.template ? (
          <>
            <h3 className="h4 mb-2">{item.template.name}</h3>
            {item.template.structure.length > 0 && (
              <ol className="mb-0 ps-3">
                {item.template.structure.map((section) => (
                  <li key={section.id} className="mb-2">
                    <span className="fw-medium">
                      {section.title}
                      <span className="text-secondary fw-normal ms-1">
                        ({SECTION_TYPE_LABELS[section.type]})
                      </span>
                    </span>
                    <div className="text-secondary small">
                      {section.content}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <p className="mb-0 text-secondary" data-testid="session-detail-rest">
            Descanso — sin sesión planificada.
          </p>
        )}

        {item?.record && (
          <div
            className="mt-3 pt-3 border-top"
            data-testid="session-detail-record"
          >
            <h4 className="h6 mb-2">Registro</h4>
            {item.record.notDoneReason ? (
              <p className="mb-0 text-danger">
                No realizada: {item.record.notDoneReason}
                {item.record.customReason
                  ? ` — ${item.record.customReason}`
                  : ""}
              </p>
            ) : (
              <>
                <div className="row g-2 mb-0">
                  <div className="col-auto" data-testid="record-distance">
                    <span className="text-secondary small d-block">
                      Distancia
                    </span>
                    <span className="fw-medium">
                      {formatDistance(item.record.distanceKm)}
                    </span>
                  </div>
                  <div className="col-auto" data-testid="record-duration">
                    <span className="text-secondary small d-block">Tiempo</span>
                    <span className="fw-medium">
                      {formatDuration(item.record.durationMinutes)}
                    </span>
                  </div>
                  <div className="col-auto" data-testid="record-rpe">
                    <span className="text-secondary small d-block">RPE</span>
                    <span className="fw-medium">
                      {formatRpe(item.record.rpe)}
                    </span>
                  </div>
                </div>
                {item.record.comments && (
                  <p
                    className="mb-0 mt-2 text-secondary"
                    data-testid="record-comments"
                  >
                    {item.record.comments}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {extra}

        {recordForm}

        {item && (
          <>
            <FeedbackThread messages={messages ?? []} />
            <FeedbackForm assignmentId={item.id} />
          </>
        )}
      </div>
      <div className="modal-footer">
        <Button onClick={onClose}>Cerrar</Button>
      </div>
    </ModalShell>
  );
}
