"use server";

import { z } from "zod";
import { ActionFailure, runAction, type ActionResult } from "./base";
import { markAsReadSchema } from "@/lib/validations/notification.schemas";
import {
  markAllAsRead,
  markAsRead,
} from "@/lib/services/notification.service";

export async function markAsReadAction(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: markAsReadSchema },
    input,
    async (data, user) => {
      const found = await markAsRead(data.id, user.id);
      if (!found) {
        throw new ActionFailure("Notificación no encontrada");
      }
      return null;
    },
  );
}

export async function markAllAsReadAction(): Promise<ActionResult<null>> {
  return runAction(
    { schema: z.object({}) },
    {},
    async (_data, user) => {
      await markAllAsRead(user.id);
      return null;
    },
  );
}
