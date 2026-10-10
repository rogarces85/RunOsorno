"use server";

import { ActionFailure, runAction, type ActionResult } from "./base";
import {
  assignmentIdSchema,
  assignSessionSchema,
  bulkAssignSchema,
  copyWeekSchema,
  generateWeekSchema,
} from "@/lib/validations/plan.schemas";
import {
  assignSession,
  assignSessionReplace,
  bulkAssign,
  copyPreviousWeek,
  generateWeek,
  removeAssignment,
} from "@/lib/services/plan.service";

export async function assignSessionAction(
  input: unknown,
): Promise<ActionResult<{ assignmentId: string; needsConfirm: boolean }>> {
  return runAction(
    { schema: assignSessionSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = data.replace
        ? await assignSessionReplace(
            data.athleteId,
            data.templateId,
            data.date,
            user.id,
          )
        : await assignSession(
            data.athleteId,
            data.templateId,
            data.date,
            user.id,
          );
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function bulkAssignAction(
  input: unknown,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  return runAction(
    { schema: bulkAssignSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await bulkAssign(
        data.athleteIds,
        data.templateId,
        data.date,
        user.id,
      );
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function removeAssignmentAction(
  assignmentId: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: assignmentIdSchema, role: "coach" },
    assignmentId,
    async (id, user) => {
      const result = await removeAssignment(id, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function copyPreviousWeekAction(
  input: unknown,
): Promise<ActionResult<{ copied: number; skipped: number }>> {
  return runAction(
    { schema: copyWeekSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await copyPreviousWeek(
        data.athleteId,
        data.weekStart,
        user.id,
      );
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function generateWeekAction(
  input: unknown,
): Promise<ActionResult<{ created: number }>> {
  return runAction(
    { schema: generateWeekSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await generateWeek(
        data.athleteId,
        data.weekStart,
        data.pattern,
        user.id,
      );
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}
