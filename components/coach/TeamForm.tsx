"use client";

import { useEffect } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTeamAction, updateTeamAction } from "@/lib/actions/team.actions";
import {
  createTeamSchema,
  type CreateTeamInput,
} from "@/lib/validations/team.schemas";
import { applyServerErrors } from "@/lib/utils/form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

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
    <ModalShell
      onClose={onClose}
      busy={isSubmitting}
      titleId="team-form-title"
      dialogTestId="team-form"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="modal-header">
          <h2 className="modal-title h5" id="team-form-title">
            {team ? "Renombrar team" : "Nuevo team"}
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
            <Alert variant="danger" className="mb-3" testId="team-form-error">
              {serverError}
            </Alert>
          )}
          <Field
            id="team-name"
            label="Nombre"
            error={errors.name?.message}
            hint={
              !team
                ? `Si lo dejas vacío, el nombre será tu apellido (${defaultNameHint}).`
                : undefined
            }
          >
            <input
              id="team-name"
              type="text"
              className={`form-control ${errors.name ? "is-invalid" : ""}`}
              placeholder={
                team ? team.name : `Dejar vacío para usar “${defaultNameHint}”`
              }
              {...register("name")}
            />
          </Field>
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
