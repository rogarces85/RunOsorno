"use server";

import { ActionFailure, runAction, type ActionResult } from "./base";
import {
  createGroupSchema,
  groupIdSchema,
  groupTargetSchema,
  sendAnnouncementSchema,
  updateGroupSchema,
} from "@/lib/validations/group.schemas";
import { isDirector } from "@/lib/permissions";
import {
  approveRequest,
  createGroup,
  deleteGroup,
  rejectRequest,
  requestJoin,
  sendAnnouncement,
  toggleDirector,
  updateGroup,
  type GroupBasic,
} from "@/lib/services/group.service";

export async function createGroupAction(
  input: unknown,
): Promise<ActionResult<GroupBasic>> {
  return runAction(
    { schema: createGroupSchema, role: "admin" },
    input,
    async (data, user) => {
      const result = await createGroup(data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function updateGroupAction(
  id: string,
  input: unknown,
): Promise<ActionResult<GroupBasic>> {
  return runAction(
    { schema: updateGroupSchema, role: "admin" },
    input,
    async (data, user) => {
      const result = await updateGroup(id, data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function deleteGroupAction(
  id: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: groupIdSchema, role: "admin" },
    id,
    async (groupId, user) => {
      const result = await deleteGroup(groupId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function requestJoinAction(
  groupId: string,
): Promise<ActionResult<{ requestId: string }>> {
  return runAction(
    { schema: groupIdSchema, role: "coach" },
    groupId,
    async (id, user) => {
      const result = await requestJoin(id, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function approveRequestAction(
  requestId: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: groupIdSchema, role: "admin" },
    requestId,
    async (id, user) => {
      const result = await approveRequest(id, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function rejectRequestAction(
  requestId: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: groupIdSchema, role: "admin" },
    requestId,
    async (id, user) => {
      const result = await rejectRequest(id, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function toggleDirectorAction(
  input: unknown,
): Promise<ActionResult<{ isDirector: boolean }>> {
  return runAction(
    { schema: groupTargetSchema, role: "admin" },
    input,
    async (data, user) => {
      const result = await toggleDirector(data.groupId, data.userId, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function sendAnnouncementAction(
  input: unknown,
): Promise<ActionResult<{ notified: number; emailed: number }>> {
  return runAction(
    { schema: sendAnnouncementSchema },
    input,
    async (data, user) => {
      if (!(await isDirector(user, data.groupId))) {
        throw new ActionFailure(
          "No tienes permiso para anunciar en este grupo",
        );
      }
      const result = await sendAnnouncement(data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}
