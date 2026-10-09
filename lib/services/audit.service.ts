import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function logAudit(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details,
    ipAddress: params.ipAddress,
  });
}
