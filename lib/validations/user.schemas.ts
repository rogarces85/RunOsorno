import { z } from "zod";

export const createCoachSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre (mínimo 2 caracteres)")
    .max(100, "Máximo 100 caracteres"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Ingresa el email")
    .pipe(z.email("Email inválido")),
});

export const updateCoachSchema = createCoachSchema;

export const coachIdSchema = z.uuid("ID inválido");

export type CreateCoachInput = z.infer<typeof createCoachSchema>;
export type UpdateCoachInput = z.infer<typeof updateCoachSchema>;
