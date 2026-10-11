import { z } from "zod";

export const markAsReadSchema = z.object({
  id: z.uuid("ID de notificación inválido"),
});

export const markAllAsReadSchema = z.object({});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
