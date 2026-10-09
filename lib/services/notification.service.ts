import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function notify(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  } catch (error) {
    console.error("[notification] falló al crear notificación:", error);
  }
}
