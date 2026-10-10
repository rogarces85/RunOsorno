"use client";

import type { ReactNode } from "react";
import { SECTION_TYPE_LABELS } from "@/lib/config/constants";
import type { FeedbackMessage } from "@/lib/services/feedback.service";
import type { PlanItem } from "@/lib/services/plan.service";
import { formatDateChile, toISODate } from "@/lib/utils/date";
import { formatDistance, formatDuration, formatRpe, formatSessionType } from "@/lib/utils/format";
import { FeedbackForm } from "./FeedbackForm";
import { FeedbackThread } from "./FeedbackThread";
import { DAY_STATE_META, resolveDayState } from "./dayState";

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
    <>
      <div
        className="modal modal-blur fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de sesión"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" data-testid="session-detail-date">
                {displayDate}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">
              <div className="mb-3 d-flex align-items-center gap-2">
                <span className={`badge ${meta.badgeClass}`} data-testid="session-detail-state">
                  {meta.label}
                </span>
                {item?.template && (
                  <span className="text-secondary">
                    {formatSessionType(item.template.sessionType)}
                  </span>
                )}
              </div>

              {item?.template ? (
                <>
                  <h4 className="mb-2">{item.template.name}</h4>
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
                  <h6 className="mb-2">Registro</h6>
                  {item.record.notDoneReason ? (
                    <p className="mb-0 text-danger">
                      No realizada: {item.record.notDoneReason}
                      {item.record.customReason ? ` — ${item.record.customReason}` : ""}
                    </p>
                  ) : (
                    <>
                      <div className="row g-2 mb-0">
                        <div className="col-auto" data-testid="record-distance">
                          <span className="text-secondary small d-block">Distancia</span>
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
                          <span className="fw-medium">{formatRpe(item.record.rpe)}</span>
                        </div>
                      </div>
                      {item.record.comments && (
                        <p className="mb-0 mt-2 text-secondary" data-testid="record-comments">
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show d-block" />
    </>
  );
}
