import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupMembers,
  groupRequests,
  groups,
  teamMembers,
  teams,
  templates,
  users,
} from "@/lib/db/schema";
import type {
  CreateGroupInput,
  UpdateGroupInput,
} from "@/lib/validations/group.schemas";
import { logAudit } from "./audit.service";
import { notify } from "./notification.service";

export type ServiceResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

export type GroupBasic = {
  id: string;
  name: string;
  description: string | null;
};

export type GroupListItem = GroupBasic & {
  coachesCount: number;
  teamsCount: number;
  athletesCount: number;
};

export type GroupMemberItem = {
  userId: string;
  name: string;
  email: string;
  isDirector: boolean;
};

export type PendingRequestItem = {
  id: string;
  groupId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  coachEmail: string;
  requestedAt: Date;
};

function normalizeDescription(description: string | null | undefined) {
  return description ? description : null;
}

async function findGroup(id: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, id))
    .limit(1);
  return group;
}

export async function createGroup(
  input: CreateGroupInput,
  actorId: string,
): Promise<ServiceResult<GroupBasic>> {
  const id = crypto.randomUUID();
  await db.insert(groups).values({
    id,
    name: input.name,
    description: normalizeDescription(input.description),
  });

  await logAudit({
    userId: actorId,
    action: "group_created",
    entityType: "group",
    entityId: id,
    details: { name: input.name },
  });

  return {
    ok: true,
    data: {
      id,
      name: input.name,
      description: normalizeDescription(input.description),
    },
  };
}

export async function updateGroup(
  id: string,
  input: UpdateGroupInput,
  actorId: string,
): Promise<ServiceResult<GroupBasic>> {
  const group = await findGroup(id);
  if (!group) {
    return { ok: false, error: "Grupo no encontrado" };
  }

  const description = normalizeDescription(input.description);
  await db
    .update(groups)
    .set({ name: input.name, description })
    .where(eq(groups.id, id));

  await logAudit({
    userId: actorId,
    action: "group_updated",
    entityType: "group",
    entityId: id,
    details: { name: input.name },
  });

  return { ok: true, data: { id, name: input.name, description } };
}

export async function deleteGroup(
  id: string,
  actorId: string,
): Promise<ServiceResult<null>> {
  const group = await findGroup(id);
  if (!group) {
    return { ok: false, error: "Grupo no encontrado" };
  }

  const [membersRow] = await db
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, id));
  if (membersRow.value > 0) {
    return {
      ok: false,
      error: "El grupo tiene coaches miembros. Quítalos antes de eliminarlo.",
    };
  }

  const [sharedRow] = await db
    .select({ value: count() })
    .from(templates)
    .where(eq(templates.groupId, id));
  if (sharedRow.value > 0) {
    return {
      ok: false,
      error:
        "El grupo tiene plantillas compartidas. Descompártelas antes de eliminarlo.",
    };
  }

  await db.delete(groupRequests).where(eq(groupRequests.groupId, id));
  await db.delete(groups).where(eq(groups.id, id));

  await logAudit({
    userId: actorId,
    action: "group_deleted",
    entityType: "group",
    entityId: id,
    details: { name: group.name },
  });

  return { ok: true, data: null };
}

export async function getGroups(): Promise<GroupListItem[]> {
  const groupRows = await db.select().from(groups).orderBy(groups.name);
  if (groupRows.length === 0) {
    return [];
  }

  const groupIds = groupRows.map((group) => group.id);
  const memberRows = await db
    .select({ groupId: groupMembers.groupId, userId: groupMembers.userId })
    .from(groupMembers)
    .where(inArray(groupMembers.groupId, groupIds));

  const coachIds = [...new Set(memberRows.map((row) => row.userId))];
  const teamRows =
    coachIds.length > 0
      ? await db
          .select({ id: teams.id, coachId: teams.coachId })
          .from(teams)
          .where(inArray(teams.coachId, coachIds))
      : [];

  const teamIds = teamRows.map((team) => team.id);
  const athleteRows =
    teamIds.length > 0
      ? await db
          .select({
            teamId: teamMembers.teamId,
            athleteId: teamMembers.athleteId,
          })
          .from(teamMembers)
          .where(inArray(teamMembers.teamId, teamIds))
      : [];

  return groupRows.map((group) => {
    const memberCoachIds = new Set(
      memberRows
        .filter((row) => row.groupId === group.id)
        .map((row) => row.userId),
    );
    const groupTeamIds = new Set(
      teamRows
        .filter((team) => memberCoachIds.has(team.coachId))
        .map((team) => team.id),
    );
    const athleteIds = new Set(
      athleteRows
        .filter((row) => groupTeamIds.has(row.teamId))
        .map((row) => row.athleteId),
    );
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      coachesCount: memberCoachIds.size,
      teamsCount: groupTeamIds.size,
      athletesCount: athleteIds.size,
    };
  });
}

export async function getGroupById(id: string): Promise<GroupBasic | null> {
  const group = await findGroup(id);
  return group
    ? { id: group.id, name: group.name, description: group.description }
    : null;
}

export async function getGroupMembers(
  groupId: string,
): Promise<GroupMemberItem[]> {
  const rows = await db
    .select({
      userId: groupMembers.userId,
      name: users.name,
      email: users.email,
      isDirector: groupMembers.isDirector,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(users.name);

  return rows;
}

export async function requestJoin(
  groupId: string,
  coachId: string,
): Promise<ServiceResult<{ requestId: string }>> {
  const group = await findGroup(groupId);
  if (!group) {
    return { ok: false, error: "Grupo no encontrado" };
  }

  const [existing] = await db
    .select()
    .from(groupRequests)
    .where(
      and(
        eq(groupRequests.groupId, groupId),
        eq(groupRequests.coachId, coachId),
      ),
    )
    .limit(1);

  if (existing && existing.status !== "rejected") {
    return {
      ok: false,
      error: "Ya tienes una solicitud pendiente o aprobada",
    };
  }

  if (existing) {
    await db
      .update(groupRequests)
      .set({
        status: "pending",
        requestedAt: new Date(),
        resolvedAt: null,
        resolvedBy: null,
      })
      .where(eq(groupRequests.id, existing.id));
    await logAudit({
      userId: coachId,
      action: "join_requested",
      entityType: "group_request",
      entityId: existing.id,
      details: { groupId, groupName: group.name },
    });
    return { ok: true, data: { requestId: existing.id } };
  }

  const requestId = crypto.randomUUID();
  await db.insert(groupRequests).values({
    id: requestId,
    groupId,
    coachId,
    status: "pending",
  });

  await logAudit({
    userId: coachId,
    action: "join_requested",
    entityType: "group_request",
    entityId: requestId,
    details: { groupId, groupName: group.name },
  });

  return { ok: true, data: { requestId } };
}

export async function approveRequest(
  requestId: string,
  adminId: string,
): Promise<ServiceResult<null>> {
  const [request] = await db
    .select()
    .from(groupRequests)
    .where(eq(groupRequests.id, requestId))
    .limit(1);
  if (!request || request.status !== "pending") {
    return { ok: false, error: "Solicitud no encontrada o ya resuelta" };
  }

  const [group] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, request.groupId))
    .limit(1);
  const groupName = group?.name ?? "el grupo";

  const [existingMembership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, request.groupId),
        eq(groupMembers.userId, request.coachId),
      ),
    )
    .limit(1);
  if (!existingMembership) {
    await db.insert(groupMembers).values({
      groupId: request.groupId,
      userId: request.coachId,
      isDirector: false,
    });
  }

  await db
    .update(groupRequests)
    .set({ status: "approved", resolvedAt: new Date(), resolvedBy: adminId })
    .where(eq(groupRequests.id, requestId));

  await notify({
    userId: request.coachId,
    type: "join_request_approved",
    title: "Solicitud aprobada",
    message: `Tu solicitud al grupo "${groupName}" fue aprobada. Ya eres miembro del grupo.`,
    entityType: "group",
    entityId: request.groupId,
  });

  await logAudit({
    userId: adminId,
    action: "join_approved",
    entityType: "group_request",
    entityId: requestId,
    details: { groupId: request.groupId, coachId: request.coachId },
  });

  return { ok: true, data: null };
}

export async function rejectRequest(
  requestId: string,
  adminId: string,
): Promise<ServiceResult<null>> {
  const [request] = await db
    .select()
    .from(groupRequests)
    .where(eq(groupRequests.id, requestId))
    .limit(1);
  if (!request || request.status !== "pending") {
    return { ok: false, error: "Solicitud no encontrada o ya resuelta" };
  }

  const [group] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, request.groupId))
    .limit(1);
  const groupName = group?.name ?? "el grupo";

  await db
    .update(groupRequests)
    .set({ status: "rejected", resolvedAt: new Date(), resolvedBy: adminId })
    .where(eq(groupRequests.id, requestId));

  await notify({
    userId: request.coachId,
    type: "join_request_rejected",
    title: "Solicitud rechazada",
    message: `Tu solicitud al grupo "${groupName}" fue rechazada.`,
    entityType: "group",
    entityId: request.groupId,
  });

  await logAudit({
    userId: adminId,
    action: "join_rejected",
    entityType: "group_request",
    entityId: requestId,
    details: { groupId: request.groupId, coachId: request.coachId },
  });

  return { ok: true, data: null };
}

export async function toggleDirector(
  groupId: string,
  userId: string,
  actorId: string,
): Promise<ServiceResult<{ isDirector: boolean }>> {
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    )
    .limit(1);
  if (!membership) {
    return { ok: false, error: "El coach no es miembro del grupo" };
  }

  const isDirector = !membership.isDirector;
  await db
    .update(groupMembers)
    .set({ isDirector })
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    );

  await logAudit({
    userId: actorId,
    action: "director_toggled",
    entityType: "group_member",
    entityId: `${groupId}:${userId}`,
    details: { groupId, userId, isDirector },
  });

  return { ok: true, data: { isDirector } };
}

export async function getPendingRequests(
  groupId?: string,
): Promise<PendingRequestItem[]> {
  const conditions = [eq(groupRequests.status, "pending")];
  if (groupId) {
    conditions.push(eq(groupRequests.groupId, groupId));
  }

  const rows = await db
    .select({
      id: groupRequests.id,
      groupId: groupRequests.groupId,
      groupName: groups.name,
      coachId: groupRequests.coachId,
      coachName: users.name,
      coachEmail: users.email,
      requestedAt: groupRequests.requestedAt,
    })
    .from(groupRequests)
    .innerJoin(groups, eq(groupRequests.groupId, groups.id))
    .innerJoin(users, eq(groupRequests.coachId, users.id))
    .where(and(...conditions))
    .orderBy(groupRequests.requestedAt);

  return rows;
}

export async function getAvailableGroups(
  coachId: string,
): Promise<GroupBasic[]> {
  return db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
    })
    .from(groups)
    .where(
      and(
        sql`not exists (
          select 1 from group_members gm
          where gm.group_id = ${groups.id} and gm.user_id = ${coachId}
        )`,
        sql`not exists (
          select 1 from group_requests gr
          where gr.group_id = ${groups.id} and gr.coach_id = ${coachId}
            and gr.status = 'pending'
        )`,
      ),
    )
    .orderBy(groups.name);
}

export async function getMyGroups(userId: string): Promise<GroupBasic[]> {
  return db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId))
    .orderBy(groups.name);
}
