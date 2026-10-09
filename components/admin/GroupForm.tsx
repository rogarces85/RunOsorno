"use client";

import { useEffect } from "react";
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
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ name: group?.name ?? "", description: group?.description ?? "" });
    }
  }, [open, group, reset]);

  const onSubmit = async (data: CreateGroupInput) => {
    if (group) {
      const result = await updateGroupAction(group.id, data);
      if (result.ok) {
        onSaved({ type: "success", message: "Grupo actualizado" });
        onClose();
      } else {
        onSaved({ type: "danger", message: result.error });
      }
      return;
    }
    const result = await createGroupAction(data);
    if (result.ok) {
      onSaved({ type: "success", message: "Grupo creado" });
      onClose();
    } else {
      onSaved({ type: "danger", message: result.error });
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="modal modal-blur fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="modal-header">
                <h5 className="modal-title">
                  {group ? "Editar grupo" : "Nuevo grupo"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cerrar"
                  onClick={onClose}
                  disabled={isSubmitting}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label" htmlFor="group-name">
                    Nombre
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                    placeholder="Ej: Escuela de Running Osorno"
                    {...register("name")}
                  />
                  {errors.name && (
                    <div className="invalid-feedback">
                      {errors.name.message}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="group-description">
                    Descripción
                  </label>
                  <textarea
                    id="group-description"
                    className={`form-control ${errors.description ? "is-invalid" : ""}`}
                    rows={3}
                    placeholder="Opcional"
                    {...register("description")}
                  />
                  {errors.description && (
                    <div className="invalid-feedback">
                      {errors.description.message}
                    </div>
                  )}
                </div>
                <div className="mb-0 text-secondary small">
                  El logo del grupo se podrá subir en una fase posterior.
                </div>
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
                  {isSubmitting ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show d-block" />
    </>
  );
}
