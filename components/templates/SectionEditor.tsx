"use client";

import { IconArrowDown, IconArrowUp, IconTrash } from "@tabler/icons-react";
import { SECTION_TYPE_LABELS, SECTION_TYPES } from "@/lib/config/constants";
import type { UseFormRegister } from "react-hook-form";
import type { TemplateInput } from "@/lib/validations/template.schemas";

type SectionErrors = {
  title?: { message?: string };
  type?: { message?: string };
  content?: { message?: string };
};

export function SectionEditor({
  index,
  isLast,
  register,
  errors,
  onMove,
  onRemove,
}: {
  index: number;
  isLast: boolean;
  register: UseFormRegister<TemplateInput>;
  errors: SectionErrors | undefined;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="card-title mb-0">Sección {index + 1}</h2>
        <div className="btn-list">
          <button
            type="button"
            className="btn btn-sm btn-ghost-secondary"
            title="Mover arriba"
            aria-label="Mover sección arriba"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
          >
            <IconArrowUp size={16} stroke={1.75} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost-secondary"
            title="Mover abajo"
            aria-label="Mover sección abajo"
            disabled={isLast}
            onClick={() => onMove(index, 1)}
          >
            <IconArrowDown size={16} stroke={1.75} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost-danger"
            title="Eliminar sección"
            aria-label="Eliminar sección"
            onClick={() => onRemove(index)}
          >
            <IconTrash size={16} stroke={1.75} />
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label" htmlFor={`section-title-${index}`}>
              Título
            </label>
            <input
              id={`section-title-${index}`}
              type="text"
              className={`form-control ${errors?.title ? "is-invalid" : ""}`}
              aria-invalid={!!errors?.title}
              aria-describedby={
                errors?.title ? `section-title-${index}-error` : undefined
              }
              placeholder="Ej: Calentamiento, 6×400m, Enfriamiento…"
              {...register(`structure.${index}.title`)}
            />
            {errors?.title && (
              <div
                id={`section-title-${index}-error`}
                className="invalid-feedback"
              >
                {errors.title.message}
              </div>
            )}
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor={`section-type-${index}`}>
              Tipo
            </label>
            <select
              id={`section-type-${index}`}
              className={`form-select ${errors?.type ? "is-invalid" : ""}`}
              aria-invalid={!!errors?.type}
              aria-describedby={
                errors?.type ? `section-type-${index}-error` : undefined
              }
              {...register(`structure.${index}.type`)}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SECTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            {errors?.type && (
              <div
                id={`section-type-${index}-error`}
                className="invalid-feedback"
              >
                {errors.type.message}
              </div>
            )}
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor={`section-content-${index}`}>
              Contenido
            </label>
            <textarea
              id={`section-content-${index}`}
              rows={3}
              className={`form-control ${errors?.content ? "is-invalid" : ""}`}
              aria-invalid={!!errors?.content}
              aria-describedby={
                errors?.content ? `section-content-${index}-error` : undefined
              }
              placeholder="Describe la sección: repeticiones, distancias, ritmos, FC, descansos…"
              {...register(`structure.${index}.content`)}
            />
            {errors?.content && (
              <div
                id={`section-content-${index}-error`}
                className="invalid-feedback"
              >
                {errors.content.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
