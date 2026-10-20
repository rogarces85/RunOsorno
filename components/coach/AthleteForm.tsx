"use client";

import { useEffect } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAthleteAction,
  updateAthleteProfileAction,
} from "@/lib/actions/athlete.actions";
import {
  createAthleteSchema,
  type CreateAthleteFormInput,
} from "@/lib/validations/athlete.schemas";
import type { AthleteListItem } from "@/lib/services/athlete.service";
import { applyServerErrors } from "@/lib/utils/form";
import type { ActionError } from "@/lib/actions/base";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export type AthleteFormNotice = {
  type: "success" | "danger";
  message: string;
  tempPassword?: string;
};

export type EditableAthlete = Pick<AthleteListItem, "id" | "name" | "email"> & {
  profile: {
    birthDate: string | null;
    weightKg: string | null;
    heightCm: string | null;
    maxHr: number | null;
    restingHr: number | null;
  } | null;
};

export function AthleteForm({
  open,
  athlete,
  teams,
  onClose,
  onSaved,
}: {
  open: boolean;
  athlete: EditableAthlete | null;
  teams: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (notice: AthleteFormNotice) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CreateAthleteFormInput>({
    resolver: zodResolver(createAthleteSchema),
    defaultValues: {
      name: "",
      email: "",
      teamId: "",
      birthDate: "",
      weightKg: "",
      heightCm: "",
      maxHr: "",
      restingHr: "",
    },
  });

  // El error de negocio del servidor vive en `root.server`: `reset()` lo
  // limpia al reabrir el modal, sin estado adicional.
  const serverError = errors.root?.server?.message;

  useEffect(() => {
    if (open) {
      reset({
        name: athlete?.name ?? "",
        email: athlete?.email ?? "",
        teamId: teams[0]?.id ?? "",
        birthDate: athlete?.profile?.birthDate ?? "",
        weightKg: athlete?.profile?.weightKg ?? "",
        heightCm: athlete?.profile?.heightCm ?? "",
        maxHr: athlete?.profile?.maxHr ?? "",
        restingHr: athlete?.profile?.restingHr ?? "",
      });
    }
  }, [open, athlete, teams, reset]);

  const onSubmit = async (data: CreateAthleteFormInput) => {
    clearErrors();
    const handleFailure = (result: ActionError) => {
      applyServerErrors(setError, result.fieldErrors);
      setError("root.server", { message: result.error });
    };

    if (athlete) {
      const result = await updateAthleteProfileAction({
        athleteId: athlete.id,
        name: data.name,
        birthDate: data.birthDate,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        maxHr: data.maxHr,
        restingHr: data.restingHr,
      });
      if (result.ok) {
        onSaved({ type: "success", message: "Atleta actualizado" });
        onClose();
      } else {
        handleFailure(result);
      }
      return;
    }

    const result = await createAthleteAction(data);
    if (result.ok) {
      onSaved({
        type: "success",
        message: `Atleta "${result.data.name}" creado`,
        tempPassword: result.data.tempPassword,
      });
      onClose();
    } else {
      handleFailure(result);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <ModalShell
      onClose={onClose}
      busy={isSubmitting}
      titleId="athlete-form-title"
      dialogTestId="athlete-form"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="modal-header">
          <h2 className="modal-title h5" id="athlete-form-title">
            {athlete ? "Editar atleta" : "Nuevo atleta"}
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
              testId="athlete-form-error"
            >
              {serverError}
            </Alert>
          )}
          <Field
            id="athlete-name"
            label="Nombre"
            error={errors.name?.message}
            className="mb-3"
          >
            <input
              id="athlete-name"
              type="text"
              className={`form-control ${errors.name ? "is-invalid" : ""}`}
              {...register("name")}
            />
          </Field>
          {!athlete && (
            <>
              <Field
                id="athlete-email"
                label="Email"
                error={errors.email?.message}
                className="mb-3"
              >
                <input
                  id="athlete-email"
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  {...register("email")}
                />
              </Field>
              <Field
                id="athlete-team"
                label="Team"
                error={errors.teamId?.message}
                className="mb-3"
              >
                <select
                  id="athlete-team"
                  className={`form-select ${errors.teamId ? "is-invalid" : ""}`}
                  {...register("teamId")}
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <div className="row g-3">
            <div className="col-sm-6">
              <Field
                id="athlete-birthdate"
                label="Fecha de nacimiento"
                error={errors.birthDate?.message}
              >
                <input
                  id="athlete-birthdate"
                  type="date"
                  className="form-control"
                  {...register("birthDate")}
                />
              </Field>
            </div>
            <div className="col-sm-6">
              <Field
                id="athlete-weight"
                label="Peso (kg)"
                error={errors.weightKg?.message}
              >
                <input
                  id="athlete-weight"
                  type="number"
                  step="0.1"
                  className={`form-control ${errors.weightKg ? "is-invalid" : ""}`}
                  {...register("weightKg")}
                />
              </Field>
            </div>
            <div className="col-sm-6">
              <Field
                id="athlete-height"
                label="Altura (cm)"
                error={errors.heightCm?.message}
              >
                <input
                  id="athlete-height"
                  type="number"
                  step="0.1"
                  className={`form-control ${errors.heightCm ? "is-invalid" : ""}`}
                  {...register("heightCm")}
                />
              </Field>
            </div>
            <div className="col-sm-6">
              <Field
                id="athlete-maxhr"
                label="FC máxima"
                error={errors.maxHr?.message}
              >
                <input
                  id="athlete-maxhr"
                  type="number"
                  className={`form-control ${errors.maxHr ? "is-invalid" : ""}`}
                  {...register("maxHr")}
                />
              </Field>
            </div>
            <div className="col-sm-6">
              <Field
                id="athlete-restinghr"
                label="FC reposo"
                error={errors.restingHr?.message}
              >
                <input
                  id="athlete-restinghr"
                  type="number"
                  className={`form-control ${errors.restingHr ? "is-invalid" : ""}`}
                  {...register("restingHr")}
                />
              </Field>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || (!athlete && teams.length === 0)}
          >
            {isSubmitting ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
