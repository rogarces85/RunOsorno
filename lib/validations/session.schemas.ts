import { z } from "zod";
import { DEFAULT_NOT_DONE_REASONS } from "@/lib/config/constants";
export const feedbackSchema = z.object({
  assignmentId: z.string().min(1),
  message: z
    .string()
    .trim()
    .min(1, "Escribe un mensaje")
    .max(2000, "Máximo 2000 caracteres"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const recordSessionSchema = z
  .object({
    assignmentId: z.uuid("ID de sesión inválido"),
    distanceKm: z
      .number()
      .min(0.01, "La distancia debe ser mayor a 0")
      .max(1000, "Distancia máxima 1000 km")
      .optional(),
    durationMinutes: z
      .number()
      .int("El tiempo debe ser un número entero")
      .min(1, "El tiempo debe ser mayor a 0")
      .max(1440, "Máximo 1440 minutos")
      .optional(),
    rpe: z
      .number()
      .int("El RPE debe ser un número entero")
      .min(1, "El RPE debe estar entre 1 y 10")
      .max(10, "El RPE debe estar entre 1 y 10")
      .optional(),
    comments: z
      .string()
      .trim()
      .max(2000, "Máximo 2000 caracteres")
      .optional(),
    status: z.enum(["completed", "partial"]),
  })
  .superRefine((data, ctx) => {
    if (data.status === "completed") {
      if (data.distanceKm === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["distanceKm"],
          message: "La distancia y el tiempo son requeridos",
        });
      }
      if (data.durationMinutes === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["durationMinutes"],
          message: "La distancia y el tiempo son requeridos",
        });
      }
      return;
    }
    if (
      data.distanceKm === undefined &&
      data.durationMinutes === undefined &&
      data.rpe === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Indica al menos un dato del entrenamiento",
      });
    }
  });

/**
 * Motivo de "no realizada".
 *
 * El schema base solo valida el formato. La lista de motivos válidos se
 * comprueba en el servicio contra la configuración (Fase 34), porque el
 * admin puede agregar motivos desde la interfaz y el enum fijo impediría
 * usar los nuevos.
 */
export const notDoneReasonFieldSchema = z
  .string()
  .trim()
  .min(2, "Motivo inválido")
  .max(40, "Motivo demasiado largo")
  .regex(
    /^[a-z0-9_]+$/,
    "El motivo debe usar solo minúsculas, números y guion bajo",
  );

export const notDoneSchema = z
  .object({
    assignmentId: z.uuid("ID de sesión inválido"),
    reason: notDoneReasonFieldSchema,
    customReason: z
      .string()
      .trim()
      .max(500, "Máximo 500 caracteres")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason === "otro" && !data.customReason) {
      ctx.addIssue({
        code: "custom",
        path: ["customReason"],
        message: "Describe el motivo",
      });
    }
  });

/** Motivos aceptados si la configuración no está disponible (fallback). */
export const FALLBACK_NOT_DONE_REASONS = [...DEFAULT_NOT_DONE_REASONS];

export type RecordSessionInput = z.infer<typeof recordSessionSchema>;
export type NotDoneInput = z.infer<typeof notDoneSchema>;
