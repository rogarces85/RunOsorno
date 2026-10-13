"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { IconCheck, IconDeviceFloppy, IconX } from "@tabler/icons-react";
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

type Notice = { type: "success" | "danger"; message: string } | null;

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <div className="form-hint">{hint}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

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
              <IconCheck size={16} />
            ) : (
              <IconX size={16} />
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

      <button type="submit" className="btn btn-primary" disabled={isPending}>
        <IconDeviceFloppy size={16} stroke={1.75} className="me-1" />
        {isPending ? "Guardando…" : "Guardar límites"}
      </button>
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
              <IconCheck size={16} />
            ) : (
              <IconX size={16} />
            )
          }
        >
          {notice.message}
        </Alert>
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="emailFrom">
          Remitente de emails
        </label>
        <input
          id="emailFrom"
          type="text"
          className={`form-control ${errors.emailFrom ? "is-invalid" : ""}`}
          placeholder="RunOsorno <no-reply@runosorno.cl>"
          {...register("emailFrom")}
        />
        {errors.emailFrom ? (
          <div className="invalid-feedback d-block">
            {errors.emailFrom.message}
          </div>
        ) : (
          <div className="form-hint">
            Debe incluir el nombre y el correo entre angled brackets:
            <code>RunOsorno &lt;no-reply@runosorno.cl&gt;</code>
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-primary" disabled={isPending}>
        <IconDeviceFloppy size={16} stroke={1.75} className="me-1" />
        {isPending ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}
