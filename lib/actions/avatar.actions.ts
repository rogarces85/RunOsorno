"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionFailure, ok, runAction } from "@/lib/actions/base";
import { confirmUpload, deleteAvatar } from "@/lib/services/avatar.service";

const confirmAvatarSchema = z.object({
  key: z.string().min(1).max(255),
});

export async function confirmAvatarAction(input: unknown) {
  return runAction(
    { schema: confirmAvatarSchema },
    input,
    async (data, user) => {
      const result = await confirmUpload(user, data.key);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      revalidatePath("/", "layout");
      return ok(null);
    },
  );
}

export async function deleteAvatarAction(input: unknown) {
  return runAction({ schema: z.object({}) }, input, async (_data, user) => {
    const result = await deleteAvatar(user);
    if (!result.ok) {
      throw new ActionFailure(result.error);
    }
    revalidatePath("/", "layout");
    return ok(null);
  });
}
