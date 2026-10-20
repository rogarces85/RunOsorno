"use client";

import { IconArrowDown, IconArrowUp, IconTrash } from "@tabler/icons-react";
import { SECTION_TYPE_LABELS, SECTION_TYPES } from "@/lib/config/constants";
import type { UseFormRegister } from "react-hook-form";
import type { TemplateInput } from "@/lib/validations/template.schemas";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

type SectionErrors = {
  title?: { message?: string };
  type?: { message?: string };
  content?: { message?: string };
};

/**
 * Editor de una sección de la plantilla.
 *
 * Los tres campos pasan por `Field`, de modo que el error visible y el anuncio
 * al lector de pantalla salen del mismo sitio. Los botones de reordenar y
 * eliminar son solo icono: su nombre accesible es el `aria-label`, porque no
 * hay texto visible que pueda quedar desalineado.
 */
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
    <Card
      className="mb-3"
      title={`Sección ${index + 1}`}
      level={2}
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Mover sección arriba"
            title="Mover arriba"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
          >
            <IconArrowUp size={16} stroke={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Mover sección abajo"
            title="Mover abajo"
            disabled={isLast}
            onClick={() => onMove(index, 1)}
          >
            <IconArrowDown size={16} stroke={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Eliminar sección"
            title="Eliminar sección"
            onClick={() => onRemove(index)}
          >
            <IconTrash size={16} stroke={1.75} />
          </Button>
        </>
      }
    >
      <div className="row g-3">
        <div className="col-md-8">
          <Field
            id={`section-title-${index}`}
            label="Título"
            error={errors?.title?.message}
          >
            <input
              id={`section-title-${index}`}
              type="text"
              className={`form-control ${errors?.title ? "is-invalid" : ""}`}
              placeholder="Ej: Calentamiento, 6×400m, Enfriamiento…"
              {...register(`structure.${index}.title`)}
            />
          </Field>
        </div>
        <div className="col-md-4">
          <Field
            id={`section-type-${index}`}
            label="Tipo"
            error={errors?.type?.message}
          >
            <select
              id={`section-type-${index}`}
              className={`form-select ${errors?.type ? "is-invalid" : ""}`}
              {...register(`structure.${index}.type`)}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SECTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="col-12">
          <Field
            id={`section-content-${index}`}
            label="Contenido"
            error={errors?.content?.message}
          >
            <textarea
              id={`section-content-${index}`}
              rows={3}
              className={`form-control ${errors?.content ? "is-invalid" : ""}`}
              placeholder="Describe la sección: repeticiones, distancias, ritmos, FC, descansos…"
              {...register(`structure.${index}.content`)}
            />
          </Field>
        </div>
      </div>
    </Card>
  );
}
