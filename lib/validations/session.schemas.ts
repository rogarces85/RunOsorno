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

export const notDoneSchema = z
  .object({
    assignmentId: z.uuid("ID de sesión inválido"),
    reason: z.enum(DEFAULT_NOT_DONE_REASONS),
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

export type RecordSessionInput = z.infer<typeof recordSessionSchema>;
export type NotDoneInput = z.infer<typeof notDoneSchema>;
