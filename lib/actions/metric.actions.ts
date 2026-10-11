"use server";

import {
  getAthleteMetrics,
  getGroupMetrics,
  getTeamMetrics,
  type AthleteMetrics,
  type GroupMetrics,
  type TeamMetrics,
} from "@/lib/services/metric.service";
import {
  canManageTeam,
  canViewAthlete,
  isGroupMember,
} from "@/lib/permissions";
import {
  athleteMetricsInputSchema,
  groupMetricsInputSchema,
  teamMetricsInputSchema,
} from "@/lib/validations/metric.schemas";
import { ActionFailure, runAction, type ActionResult } from "./base";

export async function getAthleteMetricsAction(
  input: unknown,
): Promise<ActionResult<AthleteMetrics>> {
  return runAction(
    { schema: athleteMetricsInputSchema },
    input,
    async (data, user) => {
      if (!(await canViewAthlete(user, data.athleteId))) {
        throw new ActionFailure("No puedes ver las métricas de este atleta");
      }
      const result = await getAthleteMetrics(data.athleteId, data.period);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function getTeamMetricsAction(
  input: unknown,
): Promise<ActionResult<TeamMetrics>> {
  return runAction(
    { schema: teamMetricsInputSchema },
    input,
    async (data, user) => {
      if (
        user.role !== "admin" &&
        !(await canManageTeam(user, data.teamId))
      ) {
        throw new ActionFailure("No tienes permiso para ver este team");
      }
      const result = await getTeamMetrics(data.teamId, data.period);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function getGroupMetricsAction(
  input: unknown,
): Promise<ActionResult<GroupMetrics>> {
  return runAction(
    { schema: groupMetricsInputSchema },
    input,
    async (data, user) => {
      if (!(await isGroupMember(user, data.groupId))) {
        throw new ActionFailure("No tienes permiso para ver este grupo");
      }
      const result = await getGroupMetrics(data.groupId, data.period);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}
