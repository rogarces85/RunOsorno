"use client";

import { useEffect } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createGroupAction,
  updateGroupAction,
} from "@/lib/actions/group.actions";
import {
  createGroupSchema,
  type CreateGroupInput,
} from "@/lib/validations/group.schemas";
import { applyServerErrors } from "@/lib/utils/form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export type GroupFormNotice = {
  type: "success" | "danger";
  message: string;
};

export function GroupForm({
  open,
  group,
  onClose,
  onSaved,
}: {
  open: boolean;
  group: { id: string; name: string; description: string | null } | null;
  onClose: () => void;
  onSaved: (notice: GroupFormNotice) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "", description: "" },
  });

  // El error de negocio del servidor vive en `root.server`: `reset()` lo
  // limpia al reabrir el modal, sin estado adicional.
  const serverError = errors.root?.server?.message;

  useEffect(() => {
    if (open) {
      reset({ name: group?.name ?? "", description: group?.description ?? "" });
    }
  }, [open, group, reset]);

  const onSubmit = async (data: CreateGroupInput) => {
    clearErrors();
    const result = group
      ? await updateGroupAction(group.id, data)
      : await createGroupAction(data);
    if (result.ok) {
      onSaved({
        type: "success",
        message: group ? "Grupo actualizado" : "Grupo creado",
      });
      onClose();
      return;
    }
    applyServerErrors(setError, result.fieldErrors);
    setError("root.server", { message: result.error });
  };

  if (!open) {
    return null;
  }

  return (
    <ModalShell
      onClose={onClose}
      busy={isSubmitting}
      titleId="group-form-title"
      dialogTestId="group-form"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="modal-header">
          <h2 className="modal-title h5" id="group-form-title">
            {group ? "Editar grupo" : "Nuevo grupo"}
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
            <Alert variant="danger" className="mb-3" testId="group-form-error">
              {serverError}
            </Alert>
          )}
          <Field
            id="group-name"
            label="Nombre"
            error={errors.name?.message}
            className="mb-3"
          >
            <input
              id="group-name"
              type="text"
              className={`form-control ${errors.name ? "is-invalid" : ""}`}
              placeholder="Ej: Escuela de Running Osorno"
              {...register("name")}
            />
          </Field>
          <Field
            id="group-description"
            label="Descripción"
            error={errors.description?.message}
            className="mb-3"
          >
            <textarea
              id="group-description"
              className={`form-control ${errors.description ? "is-invalid" : ""}`}
              rows={3}
              placeholder="Opcional"
              {...register("description")}
            />
          </Field>
          <div className="mb-0 text-secondary small">
            El logo del grupo se podrá subir en una fase posterior.
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
