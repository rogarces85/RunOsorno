"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { BIcon } from "@/components/ui/BIcon";
import {
  updateEmailAction,
  updateLimitsAction,
} from "@/lib/actions/settings.actions";
import {
  updateEmailSchema,
  updateLimitsSchema,
  type LimitsSettings,
} from "@/lib/validations/settings.schemas";
import type { EmailSettings } from "@/lib/services/settings.service";
import { applyServerErrors } from "@/lib/utils/form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Notice = { type: "success" | "danger"; message: string } | null;

/** Tab "Límites" (tarea 34.5). */
export function LimitsForm({ initial }: { initial: LimitsSettings }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LimitsSettings>({
    resolver: zodResolver(updateLimitsSchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit((values) => {
    setNotice(null);
    clearErrors();
    startTransition(async () => {
      const result = await updateLimitsAction(values);
      if (result.ok) {
        setNotice({ type: "success", message: "Límites actualizados" });
        reset(values);
      } else {
        applyServerErrors(setError, result.fieldErrors);
        setNotice({
          type: "danger",
          message: result.error ?? "No se pudieron guardar los límites",
        });
      }
      // No se llama router.refresh(): los datos ya están en el estado del
      // formulario y refrescar devolvería al usuario al primer tab.
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {notice && (
        <Alert
          variant={notice.type}
          icon={
            notice.type === "success" ? (
              <BIcon name="check" size={16} aria-hidden />
            ) : (
              <BIcon name="x" size={16} aria-hidden />
            )
          }
        >
          {notice.message}
        </Alert>
      )}

      <div className="row">
        <div className="col-md-6">
          <Field
            id="maxTeamsPerCoach"
            label="Máximo de equipos por coach"
            hint="Límite de teams que puede crear cada coach."
            error={errors.maxTeamsPerCoach?.message}
          >
            <input
              id="maxTeamsPerCoach"
              type="number"
              className={`form-control ${errors.maxTeamsPerCoach ? "is-invalid" : ""}`}
              {...register("maxTeamsPerCoach", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <div className="col-md-6">
          <Field
            id="maxAthletesPerTeam"
            label="Máximo de atletas por equipo"
            hint="Se aplica al asignar atletas a un team."
            error={errors.maxAthletesPerTeam?.message}
          >
            <input
              id="maxAthletesPerTeam"
              type="number"
              className={`form-control ${errors.maxAthletesPerTeam ? "is-invalid" : ""}`}
              {...register("maxAthletesPerTeam", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <div className="col-md-6">
          <Field
            id="editWindowHours"
            label="Ventana de edición (horas)"
            hint="Tiempo que el atleta tiene para editar un registro."
            error={errors.editWindowHours?.message}
          >
            <input
              id="editWindowHours"
              type="number"
              className={`form-control ${errors.editWindowHours ? "is-invalid" : ""}`}
              {...register("editWindowHours", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <div className="col-md-6">
          <Field
            id="alertNoRecordDays"
            label="Alerta sin registrar (días)"
            hint="Días sin registrar una sesión para generar alerta."
            error={errors.alertNoRecordDays?.message}
          >
            <input
              id="alertNoRecordDays"
              type="number"
              className={`form-control ${errors.alertNoRecordDays ? "is-invalid" : ""}`}
              {...register("alertNoRecordDays", { valueAsNumber: true })}
            />
          </Field>
        </div>
      </div>

      <Button type="submit" loading={isPending}>
        <BIcon name="save" size={16} className="me-1" aria-hidden />
        {isPending ? "Guardando…" : "Guardar límites"}
      </Button>
    </form>
  );
}

/** Tab "Email" (tarea 34.8). */
export function EmailForm({ initial }: { initial: EmailSettings }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EmailSettings>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit((values) => {
    setNotice(null);
    clearErrors();
    startTransition(async () => {
      const result = await updateEmailAction(values);
      if (result.ok) {
        setNotice({ type: "success", message: "Configuración guardada" });
        reset(values);
      } else {
        applyServerErrors(setError, result.fieldErrors);
        setNotice({
          type: "danger",
          message: result.error ?? "No se pudo guardar la configuración",
        });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {notice && (
        <Alert
          variant={notice.type}
          icon={
            notice.type === "success" ? (
              <BIcon name="check" size={16} aria-hidden />
            ) : (
              <BIcon name="x" size={16} aria-hidden />
            )
          }
        >
          {notice.message}
        </Alert>
      )}

      <Field
        id="emailFrom"
        label="Remitente de emails"
        error={errors.emailFrom?.message}
        hint="Debe incluir el nombre y el correo entre angled brackets: RunOsorno <no-reply@runosorno.online>"
      >
        <input
          id="emailFrom"
          type="text"
          className={`form-control ${errors.emailFrom ? "is-invalid" : ""}`}
          placeholder="RunOsorno <no-reply@runosorno.online>"
          {...register("emailFrom")}
        />
      </Field>

      <Button type="submit" loading={isPending}>
        <BIcon name="save" size={16} className="me-1" aria-hidden />
        {isPending ? "Guardando…" : "Guardar configuración"}
      </Button>
    </form>
  );
}
