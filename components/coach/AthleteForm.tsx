"use client";

import { useEffect } from "react";
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
        onSaved({ type: "danger", message: result.error });
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
                  {athlete ? "Editar atleta" : "Nuevo atleta"}
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
                  <label className="form-label" htmlFor="athlete-name">
                    Nombre
                  </label>
                  <input
                    id="athlete-name"
                    type="text"
                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                    {...register("name")}
                  />
                  {errors.name && (
                    <div className="invalid-feedback">
                      {errors.name.message}
                    </div>
                  )}
                </div>
                {!athlete && (
                  <>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="athlete-email">
                        Email
                      </label>
                      <input
                        id="athlete-email"
                        type="email"
                        className={`form-control ${errors.email ? "is-invalid" : ""}`}
                        {...register("email")}
                      />
                      {errors.email && (
                        <div className="invalid-feedback">
                          {errors.email.message}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="form-label" htmlFor="athlete-team">
                        Team
                      </label>
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
                      {errors.teamId && (
                        <div className="invalid-feedback">
                          {errors.teamId.message}
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="athlete-birthdate">
                      Fecha de nacimiento
                    </label>
                    <input
                      id="athlete-birthdate"
                      type="date"
                      className="form-control"
                      {...register("birthDate")}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="athlete-weight">
                      Peso (kg)
                    </label>
                    <input
                      id="athlete-weight"
                      type="number"
                      step="0.1"
                      className={`form-control ${errors.weightKg ? "is-invalid" : ""}`}
                      {...register("weightKg")}
                    />
                    {errors.weightKg && (
                      <div className="invalid-feedback">
                        {errors.weightKg.message}
                      </div>
                    )}
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="athlete-height">
                      Altura (cm)
                    </label>
                    <input
                      id="athlete-height"
                      type="number"
                      step="0.1"
                      className={`form-control ${errors.heightCm ? "is-invalid" : ""}`}
                      {...register("heightCm")}
                    />
                    {errors.heightCm && (
                      <div className="invalid-feedback">
                        {errors.heightCm.message}
                      </div>
                    )}
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="athlete-maxhr">
                      FC máxima
                    </label>
                    <input
                      id="athlete-maxhr"
                      type="number"
                      className={`form-control ${errors.maxHr ? "is-invalid" : ""}`}
                      {...register("maxHr")}
                    />
                    {errors.maxHr && (
                      <div className="invalid-feedback">
                        {errors.maxHr.message}
                      </div>
                    )}
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="athlete-restinghr">
                      FC reposo
                    </label>
                    <input
                      id="athlete-restinghr"
                      type="number"
                      className={`form-control ${errors.restingHr ? "is-invalid" : ""}`}
                      {...register("restingHr")}
                    />
                    {errors.restingHr && (
                      <div className="invalid-feedback">
                        {errors.restingHr.message}
                      </div>
                    )}
                  </div>
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
                  disabled={isSubmitting || (!athlete && teams.length === 0)}
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
