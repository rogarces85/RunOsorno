"use client";

import { SECTION_TYPE_LABELS } from "@/lib/config/constants";
import type { PlanItem } from "@/lib/services/plan.service";
import { formatDateChile, toISODate } from "@/lib/utils/date";
import { formatSessionType } from "@/lib/utils/format";
import { DAY_STATE_META, resolveDayState } from "./dayState";

export function SessionDetailPanel({
  open,
  dateISO,
  item,
  onClose,
}: {
  open: boolean;
  dateISO: string | null;
  item: PlanItem | null;
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
