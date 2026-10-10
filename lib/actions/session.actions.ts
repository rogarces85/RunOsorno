"use server";

import { ActionFailure, runAction, type ActionResult } from "./base";
import {
  notDoneSchema,
  recordSessionSchema,
} from "@/lib/validations/session.schemas";
import {
  markNotDone,
  recordSession,
  type RecordResult,
} from "@/lib/services/session.service";

export async function recordSessionAction(
  input: unknown,
): Promise<ActionResult<RecordResult>> {
  return runAction(
    { schema: recordSessionSchema, role: "athlete" },
    input,
    async (data, user) => {
      const result = await recordSession(data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function markNotDoneAction(
  input: unknown,
): Promise<ActionResult<RecordResult>> {
  return runAction(
    { schema: notDoneSchema, role: "athlete" },
    input,
    async (data, user) => {
      const result = await markNotDone(
        {
          assignmentId: data.assignmentId,
          reason: data.reason,
          customReason: data.customReason,
        },
        user.id,
      );
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}
