import { z } from "zod";

export const assignSessionSchema = z.object({
  athleteId: z.uuid("ID de atleta inválido"),
  templateId: z.uuid("ID de plantilla inválido"),
  date: z.iso.date("Fecha inválida"),
  replace: z.boolean().optional(),
});

export const bulkAssignSchema = z.object({
  athleteIds: z
    .array(z.uuid("ID de atleta inválido"))
    .min(1, "Selecciona al menos un atleta."),
  templateId: z.uuid("ID de plantilla inválido"),
  date: z.iso.date("Fecha inválida"),
});

export const assignmentIdSchema = z.uuid("ID inválido");

export const copyWeekSchema = z.object({
  athleteId: z.uuid("ID de atleta inválido"),
  weekStart: z.iso.date("Fecha inválida"),
});

export const weekPatternItemSchema = z.object({
  type: z
    .string()
    .trim()
    .min(1, "Indica el tipo o la plantilla del patrón")
    .max(60, "Máximo 60 caracteres"),
  count: z
    .number({ error: "La cantidad debe ser un número" })
    .int("La cantidad debe ser un número entero")
    .min(1, "La cantidad mínima es 1")
    .max(7, "La cantidad máxima es 7"),
});

export const generateWeekSchema = z.object({
  athleteId: z.uuid("ID de atleta inválido"),
  weekStart: z.iso.date("Fecha inválida"),
  pattern: z
    .array(weekPatternItemSchema)
    .min(1, "El patrón no puede estar vacío")
    .max(7, "Máximo 7 entradas en el patrón"),
});

export type AssignSessionInput = z.infer<typeof assignSessionSchema>;
export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;
export type CopyWeekInput = z.infer<typeof copyWeekSchema>;
export type WeekPatternItem = z.infer<typeof weekPatternItemSchema>;
export type GenerateWeekInput = z.infer<typeof generateWeekSchema>;
