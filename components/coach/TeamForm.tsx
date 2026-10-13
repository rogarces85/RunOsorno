"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTeamAction, updateTeamAction } from "@/lib/actions/team.actions";
import {
  createTeamSchema,
  type CreateTeamInput,
} from "@/lib/validations/team.schemas";
import { applyServerErrors } from "@/lib/utils/form";
import { Alert } from "@/components/ui/Alert";

export type TeamFormNotice = {
  type: "success" | "danger";
  message: string;
};

export function TeamForm({
  open,
  team,
  defaultNameHint,
  onClose,
  onSaved,
}: {
  open: boolean;
  team: { id: string; name: string } | null;
  defaultNameHint: string;
  onClose: () => void;
  onSaved: (notice: TeamFormNotice) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "" },
  });

  // El error de negocio del servidor vive en `root.server`: `reset()` lo
  // limpia al reabrir el modal, sin estado adicional.
  const serverError = errors.root?.server?.message;

  useEffect(() => {
    if (open) {
      reset({ name: team?.name ?? "" });
    }
  }, [open, team, reset]);

  const onSubmit = async (data: CreateTeamInput) => {
    clearErrors();
    const result = team
      ? await updateTeamAction(team.id, {
          name: data.name?.trim() || team.name,
        })
      : await createTeamAction(data);
    if (result.ok) {
      onSaved({
        type: "success",
        message: team
          ? "Team actualizado"
          : `Team "${result.data.name}" creado`,
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
                  {team ? "Renombrar team" : "Nuevo team"}
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
                {serverError && (
                  <Alert
                    variant="danger"
                    className="mb-3"
                    testId="team-form-error"
                  >
                    {serverError}
                  </Alert>
                )}
                <div className="mb-0">
                  <label className="form-label" htmlFor="team-name">
                    Nombre
                  </label>
                  <input
                    id="team-name"
                    type="text"
                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                    placeholder={
                      team
                        ? team.name
                        : `Dejar vacío para usar “${defaultNameHint}”`
                    }
                    {...register("name")}
                  />
                  {errors.name && (
                    <div className="invalid-feedback">
                      {errors.name.message}
                    </div>
                  )}
                  {!team && (
                    <div className="form-hint">
                      Si lo dejas vacío, el nombre será tu apellido (
                      {defaultNameHint}).
                    </div>
                  )}
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
