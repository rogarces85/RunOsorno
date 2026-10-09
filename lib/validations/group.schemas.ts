import { z } from "zod";

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre (mínimo 2 caracteres)")
    .max(100, "Máximo 100 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export const updateGroupSchema = createGroupSchema;

export const groupIdSchema = z.uuid("ID inválido");

export const groupTargetSchema = z.object({
  groupId: z.uuid("ID inválido"),
  userId: z.uuid("ID inválido"),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
