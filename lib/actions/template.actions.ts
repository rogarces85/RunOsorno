"use server";

import { ActionFailure, runAction, type ActionResult } from "./base";
import {
  cloneTemplateSchema,
  shareTemplateSchema,
  templateIdSchema,
  templateSchema,
} from "@/lib/validations/template.schemas";
import {
  cloneTemplate,
  createTemplate,
  deleteTemplate,
  shareTemplate,
  unshareTemplate,
  updateTemplate,
} from "@/lib/services/template.service";

export async function createTemplateAction(
  input: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  return runAction(
    { schema: templateSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await createTemplate(user.id, data);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function updateTemplateAction(
  templateId: string,
  input: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  return runAction(
    { schema: templateSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await updateTemplate(templateId, data, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function deleteTemplateAction(
  templateId: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: templateIdSchema, role: "coach" },
    templateId,
    async (id, user) => {
      const result = await deleteTemplate(id, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function cloneTemplateAction(
  input: unknown,
): Promise<ActionResult<{ id: string; name: string }>> {
  return runAction(
    { schema: cloneTemplateSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await cloneTemplate(
        data.templateId,
        user.id,
        data.newName,
      );
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return result.data;
    },
  );
}

export async function shareTemplateAction(
  input: unknown,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: shareTemplateSchema, role: "coach" },
    input,
    async (data, user) => {
      const result = await shareTemplate(
        data.templateId,
        data.groupId,
        user.id,
      );
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}

export async function unshareTemplateAction(
  templateId: string,
): Promise<ActionResult<null>> {
  return runAction(
    { schema: templateIdSchema, role: "coach" },
    templateId,
    async (id, user) => {
      const result = await unshareTemplate(id, user.id);
      if (!result.ok) {
        throw new ActionFailure(result.error);
      }
      return null;
    },
  );
}
