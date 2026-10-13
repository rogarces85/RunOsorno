import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Ingresa tu email")
    .pipe(z.email("Email inválido")),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Cambio de contraseña desde el perfil (Fase 37).
 *
 * Se exige la contraseña actual para confirmar que es el titular de la
 * cuenta, y la nueva debe cumplir un mínimo razonable. La confirmación se
 * compara con `refine` porque Zod no tiene un "igual a" entre campos.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(100, "Máximo 100 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "La nueva contraseña debe ser distinta de la actual",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Edición de los datos personales (tarea 37.2).
 * El email NO se edita desde aquí: cambiarlo afectaría al login y a los
 * registros ya enviados, así que solo el nombre.
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
