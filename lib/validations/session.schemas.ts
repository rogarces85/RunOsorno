import { z } from "zod";

export const feedbackSchema = z.object({
  assignmentId: z.string().min(1),
  message: z
    .string()
    .trim()
    .min(1, "Escribe un mensaje")
    .max(2000, "Máximo 2000 caracteres"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
