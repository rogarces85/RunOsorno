"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowLeft, IconPlus } from "@tabler/icons-react";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/lib/actions/template.actions";
import {
  SESSION_TYPE_LABELS,
  SECTION_TYPE_LABELS,
} from "@/lib/config/constants";
import {
  templateSchema,
  type TemplateInput,
} from "@/lib/validations/template.schemas";
import { SectionEditor } from "./SectionEditor";
import { applyServerErrors } from "@/lib/utils/form";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

export const FREE_SESSION_TYPES = [
  "Test/Control",
  "Fuerza",
  "Cross-training",
  "Umbral",
  "Cuesta",
];

export function defaultSections(): TemplateInput["structure"] {
  return [
    {
      title: "Calentamiento",
      type: "warmup",
      content: "10-15 min de trote suave + movilidad articular.",
    },
    {
      title: "Entrenamiento específico",
      type: "main",
      content: "",
    },
    {
      title: "Enfriamiento",
      type: "cooldown",
      content: "10-15 min de trote suave + estiramientos.",
    },
  ];
}

export type TemplateEditorInitial = {
  name: string;
  sessionType: string;
  structure: TemplateInput["structure"];
};

export function TemplateEditor({
  templateId,
  initial,
}: {
  templateId?: string;
  initial?: TemplateEditorInitial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(templateId);

  const {
    register,
    handleSubmit,
    control,
    setError: setFieldError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: initial
      ? { ...initial, structure: initial.structure }
      : { name: "", sessionType: "", structure: defaultSections() },
  });

  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "structure",
  });

  const onSubmit = async (data: TemplateInput) => {
    setError(null);
    clearErrors();
    const payload: TemplateInput = {
      name: data.name,
      sessionType: data.sessionType,
      structure: data.structure.map((section, index) => ({
        ...section,
        order: index,
      })),
    };
    const result = templateId
      ? await updateTemplateAction(templateId, payload)
      : await createTemplateAction(payload);
    if (result.ok) {
      router.push("/coach/templates");
      router.refresh();
      return;
    }
    applyServerErrors(setFieldError, result.fieldErrors);
    setError(result.error);
  };

  const structureMessage =
    errors.structure?.message ?? errors.structure?.root?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-3">
        <Link href="/coach/templates" className="link-secondary">
          <IconArrowLeft
            size={16}
            stroke={1.75}
            className="me-1 align-text-bottom"
          />
          Volver a la biblioteca
        </Link>
      </div>

      {error && (
        <Alert variant="danger" testId="template-editor-error">
          {error}
        </Alert>
      )}

      <Card className="mb-3">
        <div className="row g-3">
          <div className="col-md-7">
            <Field
              id="template-name"
              label="Nombre de la plantilla"
              error={errors.name?.message}
            >
              <input
                id="template-name"
                type="text"
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                placeholder="Ej: Series 6×400m con recuperación"
                {...register("name")}
              />
            </Field>
          </div>
          <div className="col-md-5">
            <Field
              id="template-session-type"
              label="Tipo de sesión"
              error={errors.sessionType?.message}
              hint="Elige un tipo base o escribe uno libre (Test/Control, Fuerza, Cross-training…)."
            >
              <input
                id="template-session-type"
                type="text"
                list="session-type-options"
                className={`form-control ${errors.sessionType ? "is-invalid" : ""}`}
                placeholder="Ej: Series, Tempo, Test/Control…"
                {...register("sessionType")}
              />
              <datalist id="session-type-options">
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
      </Card>

      <div className="d-flex justify-content-between align-items-center mb-2">
        {/* `<h2>` y no `<h3>` (Fase 48): dentro de la página, que ya tiene su
            `<h1>`, este bloque es una sección de primer nivel. */}
        <h2 className="h3 mb-0">
          Estructura de la sesión
          <span className="text-secondary fs-5 fw-normal ms-2">
            ({fields.length} seccione{fields.length === 1 ? "" : "s"})
          </span>
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            append({
              title: "",
              type: "custom",
              content: "",
            })
          }
        >
          <IconPlus size={16} stroke={1.75} className="me-1" />
          Añadir sección
        </Button>
      </div>

      {structureMessage && <Alert variant="danger">{structureMessage}</Alert>}

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

      <p className="text-secondary small">
        Secciones sugeridas: {Object.values(SECTION_TYPE_LABELS).join(" · ")}.
        Puedes reordenarlas, omitir o añadir las que quieras.
      </p>

      <div className="d-flex justify-content-end gap-2">
        <Link
          href="/coach/templates"
          className={buttonClassName({ variant: "ghost" })}
        >
          Cancelar
        </Link>
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear plantilla"}
        </Button>
      </div>
    </form>
  );
}
