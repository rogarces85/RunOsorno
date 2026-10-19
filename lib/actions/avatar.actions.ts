"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionFailure, ok, runAction } from "@/lib/actions/base";
import {
  cleanupOrphanAvatars,
  confirmUpload,
  deleteAvatar,
} from "@/lib/services/avatar.service";
import { logAudit } from "@/lib/services/audit.service";

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

/**
 * Limpieza de avatares huérfanos (mantenimiento del admin).
 *
 * Son objetos del bucket que ya no referencia ningún usuario: quedan cuando se
 * borra una cuenta o cuando una subida se confirma a medias. No se ejecuta
 * sola: la lanza el admin desde Configuración.
 */
export async function cleanupOrphanAvatarsAction(input: unknown) {
  return runAction(
    { schema: z.object({}), role: "admin" },
    input,
    async (_data, user) => {
      const result = await cleanupOrphanAvatars();
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      await logAudit({
        userId: user.id,
        action: "avatars_cleaned",
        entityType: "avatar",
        details: result.data,
      });
      return result.data;
    },
  );
}
