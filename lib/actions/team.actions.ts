"use server";

import { ActionFailure, runAction, type ActionResult } from "./base";
import {
  createTeamSchema,
  teamIdSchema,
  teamTargetSchema,
  updateTeamSchema,
} from "@/lib/validations/team.schemas";
import {
  assignAthlete,
  createTeam,
  deleteTeam,
  removeAthlete,
  updateTeam,
} from "@/lib/services/team.service";

export async function createTeamAction(
  input: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  return runAction(
    { schema: createTeamSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await createTeam(user.id, data);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function updateTeamAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  return runAction(
    { schema: updateTeamSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await updateTeam(id, data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function deleteTeamAction(
  id: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: teamIdSchema, role: "coach" },
    id,
    async (teamId, user) => {
      const result = await deleteTeam(teamId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function assignAthleteAction(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: teamTargetSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await assignAthlete(data.teamId, data.athleteId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function removeAthleteAction(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: teamTargetSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await removeAthlete(data.teamId, data.athleteId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}
