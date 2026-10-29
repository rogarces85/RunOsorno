import { z } from "zod";

/**
 * Solicitar recuperación de contraseña.
 *
 * El email se normaliza (minúsculas, sin espacios). No hay requisitos de
 * formato complejo porque el email ya es validado por zod.email() más abajo.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Ingresa tu email").pipe(z.email("Email inválido")),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Restablecer contraseña con token.
 *
 * El token se espera en el cuerpo del formulario (viene de la URL
 * /auth/reset-password?token=xxx pasada al form).
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100, "Máximo 100 caracteres"),
  confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
})
.refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Invitación de coach con caducidad.
 *
 * El inviter debe ser un usuario con rol admin o director técnico.
 */
export const inviteCoachSchema = z.object({
  inviterId: z.string().uuid("ID de invitor inválido"),
  inviterName: z.string().min(1, "Nombre del invitor requerido"),
  invitedEmail: z.string().trim().email("Email inválido"),
  teamId: z.string().uuid("ID de team inválido"),
  role: z.enum(["admin", "director"], "Rol inválido - solo admin o director pueden invitar coaches"),
});

export type InviteCoachInput = z.infer<typeof inviteCoachSchema>;