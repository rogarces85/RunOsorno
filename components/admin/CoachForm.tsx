"use client";

import { useEffect } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCoachAction,
  updateCoachAction,
} from "@/lib/actions/user.actions";
import {
  createCoachSchema,
  type CreateCoachInput,
} from "@/lib/validations/user.schemas";
import { applyServerErrors } from "@/lib/utils/form";
import { Alert } from "@/components/ui/Alert";

export type CoachFormNotice = {
  type: "success" | "danger";
  message: string;
  tempPassword?: string;
};

export function CoachForm({
  open,
  coach,
  onClose,
  onSaved,
}: {
  open: boolean;
  coach: { id: string; name: string; email: string } | null;
  onClose: () => void;
  onSaved: (notice: CoachFormNotice) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateCoachInput>({
    resolver: zodResolver(createCoachSchema),
    defaultValues: { name: "", email: "" },
  });

  // El error de negocio del servidor vive en `root.server`: así `reset()`
  // lo limpia al reabrir el modal, sin necesidad de un estado aparte.
  const serverError = errors.root?.server?.message;

  useEffect(() => {
    if (open) {
      reset({ name: coach?.name ?? "", email: coach?.email ?? "" });
    }
  }, [open, coach, reset]);

  const onSubmit = async (data: CreateCoachInput) => {
    clearErrors();
    // Los errores se muestran dentro del propio modal: el Alert del listado
    // queda detrás del backdrop y el usuario no lo vería (tarea 38.7).
    if (coach) {
      const result = await updateCoachAction(coach.id, data);
      if (result.ok) {
        onSaved({ type: "success", message: "Coach actualizado" });
        onClose();
        return;
      }
      applyServerErrors(setError, result.fieldErrors);
      setError("root.server", { message: result.error });
      return;
    }
    const result = await createCoachAction(data);
    if (result.ok) {
      onSaved({
        type: "success",
        message: "Coach creado",
        tempPassword: result.data.tempPassword,
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
      titleId="coach-form-title"
      dialogTestId="coach-form"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="modal-header">
          <h2 className="modal-title h5" id="coach-form-title">
            {coach ? "Editar coach" : "Nuevo coach"}
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
            <Alert variant="danger" className="mb-3" testId="coach-form-error">
              {serverError}
            </Alert>
          )}
          <div className="mb-3">
            <label className="form-label" htmlFor="coach-name">
              Nombre
            </label>
            <input
              id="coach-name"
              type="text"
              className={`form-control ${errors.name ? "is-invalid" : ""}`}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "coach-name-error" : undefined}
              placeholder="Nombre completo"
              {...register("name")}
            />
            {errors.name && (
              <div id="coach-name-error" className="invalid-feedback">
                {errors.name.message}
              </div>
            )}
          </div>
          <div className="mb-0">
            <label className="form-label" htmlFor="coach-email">
              Email
            </label>
            <input
              id="coach-email"
              type="email"
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "coach-email-error" : undefined}
              placeholder="coach@email.cl"
              autoComplete="off"
              {...register("email")}
            />
            {errors.email && (
              <div id="coach-email-error" className="invalid-feedback">
                {errors.email.message}
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
    </ModalShell>
  );
}
