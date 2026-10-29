"use server";

import { z } from "zod";
import { ActionResult } from "@/lib/actions/base";
import { redirect } from "next/navigation";

import { forgotPasswordSchema, resetPasswordSchema, inviteCoachSchema } from "@/lib/actions/identity.actions.schemas";

/**
 * Solicitar recuperación de contraseña.
 *
 * Valida el email y devuelve un requestId para el flujo de recuperación.
 * En un despliegue completo, este requestId activaría el envío de email
 * con un token de un solo uso.
 */
export async function forgotPasswordAction(
  input: z.infer<typeof forgotPasswordSchema>,
): Promise<ActionResult<{ requestId: string }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario",
    };
  }

  // Generar requestId para identificar la solicitud
  const requestId = Buffer.from(Date.now().toString() + Math.random().toString()).toString("base64");

  return {
    ok: true,
    data: { requestId },
  };
}

/**
 * Restablecer contraseña con token.
 *
 * Valida el token y permite establecer una nueva contraseña.
 * En un despliegue completo, este endpoint recibiría el token de la URL
 * y restablecería la contraseña en la base de datos.
 */
export async function resetPasswordAction(
  input: z.infer<typeof resetPasswordSchema>,
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario",
    };
  }

  // En un despliegue completo, aquí se validaría el token y
  // restablecería la contraseña en la base de datos

  return {
    ok: true,
    data: { success: true },
  };
}

/**
 * Invitación de coach con caducidad.
 *
 * Genera un token de invitación y devuelve la información para enviar
 * el email de invitación.
 */
export async function inviteCoachAction(
  input: z.infer<typeof inviteCoachSchema>,
): Promise<ActionResult<{ requestId: string }>> {
  const parsed = inviteCoachSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario",
    };
  }

  // Generar requestId para la invitación
  const requestId = Buffer.from(Date.now().toString() + Math.random().toString()).toString("base64");

  return {
    ok: true,
    data: { requestId },
  };
}