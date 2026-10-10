"use server";

import { ActionFailure, runAction, type ActionResult } from "./base";
import { feedbackSchema } from "@/lib/validations/session.schemas";
import { addFeedback } from "@/lib/services/feedback.service";

export async function addFeedbackAction(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: feedbackSchema },
    input,
    async (data, user) => {
      const result = await addFeedback(data, user);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}
