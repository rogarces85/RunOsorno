"use server";

import { ActionFailure, runAction, type ActionResult } from "./base";
import {
  createAthleteSchema,
  transferAthleteSchema,
  updateAthleteProfileSchema,
} from "@/lib/validations/athlete.schemas";
import {
  createAthlete,
  transferAthlete,
  updateAthleteProfile,
} from "@/lib/services/athlete.service";

export async function createAthleteAction(input: unknown): Promise<
  ActionResult<{
    id: string;
    name: string;
    email: string;
    tempPassword: string;
  }>
> {
  return runAction(
    { schema: createAthleteSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await createAthlete(user.id, data);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function updateAthleteProfileAction(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: updateAthleteProfileSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await updateAthleteProfile(data.athleteId, data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function transferAthleteAction(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: transferAthleteSchema, role: "admin" },
    input,
    async (data, user) => {
      const result = await transferAthlete(data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}
