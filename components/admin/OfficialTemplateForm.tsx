"use client";

import { useEffect } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BIcon } from "@/components/ui/BIcon";
import {
  createOfficialTemplateAction,
  updateOfficialTemplateAction,
} from "@/lib/actions/template.actions";
import { applyServerErrors } from "@/lib/utils/form";
import type { ActionError } from "@/lib/actions/base";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  SESSION_TYPE_LABELS,
  SECTION_TYPE_LABELS,
} from "@/lib/config/constants";
import type { OfficialTemplateListItem } from "@/lib/services/template.service";
import {
  templateSchema,
  type TemplateInput,
} from "@/lib/validations/template.schemas";
import { SectionEditor } from "@/components/templates/SectionEditor";
import {
  FREE_SESSION_TYPES,
  defaultSections,
} from "@/components/templates/TemplateEditor";

export type OfficialFormNotice = {
  type: "success" | "danger";
  message: string;
};

export function OfficialTemplateForm({
  open,
  template,
  onClose,
  onSaved,
}: {
  open: boolean;
  template: OfficialTemplateListItem | null;
  onClose: () => void;
  onSaved: (notice: OfficialFormNotice) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", sessionType: "", structure: defaultSections() },
  });

  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "structure",
  });

  // El error de negocio del servidor vive en `root.server`: `reset()` lo
  // limpia al reabrir el modal, sin estado adicional.
  const serverError = errors.root?.server?.message;

  useEffect(() => {
    if (open) {
      reset(
        template
          ? {
              name: template.name,
              sessionType: template.sessionType,
              structure: template.structure.map((section) => ({
                id: section.id,
                title: section.title,
                type: section.type,
                content: section.content,
              })),
            }
          : { name: "", sessionType: "", structure: defaultSections() },
      );
    }
  }, [open, template, reset]);

  const onSubmit = async (data: TemplateInput) => {
    clearErrors();
    const payload: TemplateInput = {
      name: data.name,
      sessionType: data.sessionType,
      structure: data.structure.map((section, index) => ({
        ...section,
        order: index,
      })),
    };
    const handleFailure = (result: ActionError) => {
      applyServerErrors(setError, result.fieldErrors);
      setError("root.server", { message: result.error });
    };
    if (template) {
      const result = await updateOfficialTemplateAction(template.id, payload);
      if (result.ok) {
        onSaved({ type: "success", message: "Plantilla oficial actualizada" });
        onClose();
      } else {
        handleFailure(result);
      }
      return;
    }
    const result = await createOfficialTemplateAction(payload);
    if (result.ok) {
      onSaved({ type: "success", message: "Plantilla oficial creada" });
      onClose();
    } else {
      handleFailure(result);
    }
  };

  if (!open) {
    return null;
  }

  const structureMessage =
    errors.structure?.message ?? errors.structure?.root?.message;

  return (
    <ModalShell
      onClose={onClose}
      busy={isSubmitting}
      titleId="official-template-form-title"
      dialogTestId="official-template-form"
      className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="modal-header">
          <h2 className="modal-title h5" id="official-template-form-title">
            {template ? "Editar plantilla oficial" : "Nueva plantilla oficial"}
          </h2>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={isSubmitting}
          />
        </div>
        <div className="modal-body">
          {serverError && (
            <Alert
              variant="danger"
              className="mb-3"
              testId="official-template-form-error"
            >
              {serverError}
            </Alert>
          )}
          <div className="row g-3 mb-3">
            <div className="col-md-7">
              <Field
                id="official-name"
                label="Nombre de la plantilla"
                error={errors.name?.message}
              >
                <input
                  id="official-name"
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  placeholder="Ej: Series 8×200m"
                  {...register("name")}
                />
              </Field>
            </div>
            <div className="col-md-5">
              <Field
                id="official-session-type"
                label="Tipo de sesión"
                error={errors.sessionType?.message}
                hint="Puedes elegir uno de la lista o escribir el tuyo."
              >
                <input
                  id="official-session-type"
                  type="text"
                  list="official-session-type-options"
                  className={`form-control ${errors.sessionType ? "is-invalid" : ""}`}
                  placeholder="Ej: Series, Tempo, Test/Control…"
                  {...register("sessionType")}
                />
                <datalist id="official-session-type-options">
                  {Object.values(SESSION_TYPE_LABELS).map((label) => (
                    <option key={label} value={label} />
                  ))}
                  {FREE_SESSION_TYPES.map((label) => (
                    <option key={label} value={label} />
                  ))}
                </datalist>
              </Field>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">
              Estructura de la sesión
              <span className="text-secondary fs-6 fw-normal ms-2">
                ({fields.length} seccione
                {fields.length === 1 ? "" : "s"})
              </span>
            </h5>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => append({ title: "", type: "custom", content: "" })}
            >
              <BIcon name="plus" size={16} className="me-1" aria-hidden />
              Añadir sección
            </Button>
          </div>

          {structureMessage && (
            <Alert variant="danger">{structureMessage}</Alert>
          )}

          {fields.map((field, index) => (
            <SectionEditor
              key={field.id}
              index={index}
              isLast={index === fields.length - 1}
              register={register}
              errors={errors.structure?.[index]}
              onMove={(targetIndex, direction) => {
                const to = targetIndex + direction;
                if (to >= 0 && to < fields.length) {
                  swap(targetIndex, to);
                }
              }}
              onRemove={remove}
            />
          ))}

          <p className="text-secondary small mb-0">
            Secciones sugeridas:{" "}
            {Object.values(SECTION_TYPE_LABELS).join(" · ")}.
          </p>
        </div>
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting
              ? "Guardando…"
              : template
                ? "Guardar cambios"
                : "Crear plantilla"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
