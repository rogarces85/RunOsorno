"use client";

import { useEffect } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import {
  createOfficialTemplateAction,
  updateOfficialTemplateAction,
} from "@/lib/actions/template.actions";
import { applyServerErrors } from "@/lib/utils/form";
import type { ActionError } from "@/lib/actions/base";
import { Alert } from "@/components/ui/Alert";
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
              <label className="form-label" htmlFor="official-name">
                Nombre de la plantilla
              </label>
              <input
                id="official-name"
                type="text"
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? "official-name-error" : undefined
                }
                placeholder="Ej: Series 8×200m"
                {...register("name")}
              />
              {errors.name && (
                <div id="official-name-error" className="invalid-feedback">
                  {errors.name.message}
                </div>
              )}
            </div>
            <div className="col-md-5">
              <label className="form-label" htmlFor="official-session-type">
                Tipo de sesión
              </label>
              <input
                id="official-session-type"
                type="text"
                list="official-session-type-options"
                className={`form-control ${errors.sessionType ? "is-invalid" : ""}`}
                aria-invalid={!!errors.sessionType}
                aria-describedby={
                  errors.sessionType
                    ? "official-session-type-options-error"
                    : undefined
                }
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
              {errors.sessionType && (
                <div
                  id="official-session-type-options-error"
                  className="invalid-feedback d-block"
                >
                  {errors.sessionType.message}
                </div>
              )}
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
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => append({ title: "", type: "custom", content: "" })}
            >
              <IconPlus size={16} stroke={1.75} className="me-1" />
              Añadir sección
            </button>
          </div>

          {structureMessage && (
            <div className="alert alert-danger" role="alert">
              {structureMessage}
            </div>
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
          <button
            type="button"
            className="btn btn-link link-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Guardando…"
              : template
                ? "Guardar cambios"
                : "Crear plantilla"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
