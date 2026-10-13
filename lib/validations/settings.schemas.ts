import { z } from "zod";
import {
  BASE_SESSION_TYPES,
  DEFAULT_NOT_DONE_REASONS,
} from "@/lib/config/constants";

/**
 * Esquemas de validación de la configuración global (Fase 34).
 *
 * Cada tipo de setting tiene su propio esquema para evitar que un valor
 * con la forma equivocada llegue a la tabla `settings` (que es JSON libre).
 */

/** Claves editables desde la interfaz de administración. */
export const SETTING_KEYS = [
  "max_teams_per_coach",
  "max_athletes_per_team",
  "edit_window_hours",
  "alert_no_record_days",
  "not_done_reasons",
  "base_session_types",
  "email_from",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/** Identificador interno de un motivo (sin acentos ni espacios). */
const reasonIdSchema = z
  .string()
  .trim()
  .min(2, "El motivo debe tener al menos 2 caracteres")
  .max(40, "Máximo 40 caracteres")
  .regex(
    /^[a-z0-9_]+$/,
    "Usa solo minúsculas, números y guion bajo (ej: lesion, baja_medica)",
  );

/** Un motivo editable: identificador + etiqueta visible. */
export const notDoneReasonSchema = z.object({
  id: reasonIdSchema,
  label: z
    .string()
    .trim()
    .min(2, "La etiqueta debe tener al menos 2 caracteres")
    .max(60, "Máximo 60 caracteres"),
});

export const notDoneReasonsSchema = z
  .array(notDoneReasonSchema)
  .min(1, "Debe existir al menos un motivo")
  .max(20, "Máximo 20 motivos")
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    { message: "No puede haber motivos duplicados" },
  );

/** Un tipo de sesión base editable. */
export const baseSessionTypeSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2, "El tipo debe tener al menos 2 caracteres")
    .max(40, "Máximo 40 caracteres")
    .regex(
      /^[a-z0-9_]+$/,
      "Usa solo minúsculas, números y guion bajo (ej: series, fondo_largo)",
    ),
  label: z
    .string()
    .trim()
    .min(2, "La etiqueta debe tener al menos 2 caracteres")
    .max(60, "Máximo 60 caracteres"),
});

export const baseSessionTypesSchema = z
  .array(baseSessionTypeSchema)
  .min(1, "Debe existir al menos un tipo de sesión")
  .max(30, "Máximo 30 tipos")
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
    message: "No puede haber tipos duplicados",
  });

/** Límites numéricos: enteros dentro de rangos razonables. */
const positiveInt = (min: number, max: number) =>
  z
    .number({ error: "Debe ser un número" })
    .int("Debe ser un número entero")
    .min(min, `Mínimo ${min}`)
    .max(max, `Máximo ${max}`);

export const limitsSettingsSchema = z.object({
  maxTeamsPerCoach: positiveInt(1, 500),
  maxAthletesPerTeam: positiveInt(1, 1000),
  editWindowHours: positiveInt(1, 24 * 30),
  alertNoRecordDays: positiveInt(1, 90),
});
export type LimitsSettings = z.infer<typeof limitsSettingsSchema>;

export const emailFromSchema = z
  .string()
  .trim()
  .min(3, "El remitente es obligatorio")
  .max(200, "Máximo 200 caracteres")
  .refine(
    (value) => /.+@.+\..+/.test(value),
    "Usa el formato: Nombre <correo@dominio.cl>",
  );

export const emailSettingsSchema = z.object({
  emailFrom: emailFromSchema,
});
export type EmailSettings = z.infer<typeof emailSettingsSchema>;

/** Acción: guardar un grupo completo de settings. */
export const updateLimitsSchema = z.object({
  maxTeamsPerCoach: positiveInt(1, 500),
  maxAthletesPerTeam: positiveInt(1, 1000),
  editWindowHours: positiveInt(1, 24 * 30),
  alertNoRecordDays: positiveInt(1, 90),
});

export const updateNotDoneReasonsSchema = z.object({
  reasons: notDoneReasonsSchema,
});

export const updateBaseSessionTypesSchema = z.object({
  types: baseSessionTypesSchema,
});

export const updateEmailSchema = z.object({
  emailFrom: emailFromSchema,
});

export type UpdateNotDoneReasonsInput = z.infer<
  typeof updateNotDoneReasonsSchema
>;
export type UpdateBaseSessionTypesInput = z.infer<
  typeof updateBaseSessionTypesSchema
>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;

/** Convierte las constantes por defecto al formato editable {id,label}. */
export function defaultNotDoneReasons(): { id: string; label: string }[] {
  const labels: Record<string, string> = {
    lesion: "Lesión",
    trabajo: "Trabajo",
    enfermedad: "Enfermedad",
    personal: "Personal",
    otro: "Otro",
  };
  return DEFAULT_NOT_DONE_REASONS.map((id) => ({
    id,
    label: labels[id] ?? id,
  }));
}

export function defaultBaseSessionTypes(): { id: string; label: string }[] {
  const labels: Record<string, string> = {
    series: "Series",
    intervalos: "Intervalos",
    fondos: "Fondos",
    tempo: "Tempo",
    recuperacion: "Recuperación",
    descanso: "Descanso",
  };
  return BASE_SESSION_TYPES.map((id) => ({ id, label: labels[id] ?? id }));
}
