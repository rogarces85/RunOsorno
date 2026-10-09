import { z } from "zod";

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre (mínimo 2 caracteres)")
    .max(100, "Máximo 100 caracteres"),
});

export const teamIdSchema = z.uuid("ID inválido");

export const teamTargetSchema = z.object({
  teamId: z.uuid("ID inválido"),
  athleteId: z.uuid("ID inválido"),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
