import { z } from "zod";

const optionalNumber = (min: number, max: number) =>
  z.union([z.coerce.number().min(min).max(max), z.literal("")]).optional();

export const createAthleteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre (mínimo 2 caracteres)")
    .max(100, "Máximo 100 caracteres"),
  email: z.email("Email inválido"),
  teamId: z.uuid("ID inválido"),
  birthDate: z.union([z.iso.date("Fecha inválida"), z.literal("")]).optional(),
  weightKg: optionalNumber(20, 300),
  heightCm: optionalNumber(100, 250),
  maxHr: optionalNumber(100, 230),
  restingHr: optionalNumber(30, 120),
});

export const updateAthleteProfileSchema = z.object({
  athleteId: z.uuid("ID inválido"),
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre (mínimo 2 caracteres)")
    .max(100, "Máximo 100 caracteres")
    .optional(),
  birthDate: z.union([z.iso.date("Fecha inválida"), z.literal("")]).optional(),
  weightKg: optionalNumber(20, 300),
  heightCm: optionalNumber(100, 250),
  maxHr: optionalNumber(100, 230),
  restingHr: optionalNumber(30, 120),
});

export const transferAthleteSchema = z
  .object({
    athleteId: z.uuid("ID inválido"),
    fromTeamId: z.uuid("ID inválido"),
    toTeamId: z.uuid("ID inválido"),
  })
  .refine((data) => data.fromTeamId !== data.toTeamId, {
    message: "Elige un team de destino distinto",
    path: ["toTeamId"],
  });

export const athleteIdSchema = z.uuid("ID inválido");

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type CreateAthleteFormInput = z.input<typeof createAthleteSchema>;
export type UpdateAthleteProfileInput = z.infer<
  typeof updateAthleteProfileSchema
>;
export type TransferAthleteInput = z.infer<typeof transferAthleteSchema>;
