"use server";

import { ActionFailure, runAction, type ActionResult } from "./base";
import {
  coachIdSchema,
  createCoachSchema,
  updateCoachSchema,
} from "@/lib/validations/user.schemas";
import {
  createCoach,
  deactivateCoach,
  deleteCoach,
  reactivateCoach,
  resetPassword,
  resendInvitation,
  updateCoach,
} from "@/lib/services/user.service";
import { getClientIp } from "@/lib/utils/request";

export type CoachCreated = {
  coach: { id: string; name: string; email: string };
  tempPassword: string;
};

export async function createCoachAction(
  input: unknown,
): Promise<ActionResult<CoachCreated>> {
  return runAction(
    { schema: createCoachSchema, role: "admin" },
    input,
    async (data, user) => {
      const result = await createCoach(data, user.id, await getClientIp());
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function updateCoachAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string; name: string; email: string }>> {
  return runAction(
    { schema: updateCoachSchema, role: "admin" },
    input,
    async (data, user) => {
      const result = await updateCoach(id, data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function deactivateCoachAction(
  id: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: coachIdSchema, role: "admin" },
    id,
    async (coachId, user) => {
      const result = await deactivateCoach(coachId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function reactivateCoachAction(
  id: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: coachIdSchema, role: "admin" },
    id,
    async (coachId, user) => {
      const result = await reactivateCoach(coachId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function deleteCoachAction(
  id: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: coachIdSchema, role: "admin" },
    id,
    async (coachId, user) => {
      const result = await deleteCoach(coachId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function resetPasswordAction(
  id: string,
): Promise<ActionResult<{ tempPassword: string }>> {
  return runAction(
    { schema: coachIdSchema, role: "admin" },
    id,
    async (coachId, user) => {
      const result = await resetPassword(coachId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function resendInvitationAction(
  id: string,
): Promise<ActionResult<{ tempPassword: string }>> {
  return runAction(
    { schema: coachIdSchema, role: "admin" },
    id,
    async (coachId, user) => {
      const result = await resendInvitation(coachId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}
