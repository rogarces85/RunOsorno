import { and, count, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupMembers,
  groups,
  sessionAssignments,
  templates,
  users,
  type TemplateSection,
} from "@/lib/db/schema";
import type { TemplateInput } from "@/lib/validations/template.schemas";
import { logAudit } from "./audit.service";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type TemplateOwnership = "own" | "official" | "group";

export type TemplateListItem = {
  id: string;
  name: string;
  sessionType: string;
  isOfficial: boolean;
  isShared: boolean;
  ownership: TemplateOwnership;
  groupName: string | null;
  sectionCount: number;
  updatedAt: Date;
  canEdit: boolean;
  canClone: boolean;
  canShare: boolean;
  canDelete: boolean;
};

export type TemplateDetail = {
  id: string;
  coachId: string | null;
  groupId: string | null;
  name: string;
  sessionType: string;
  isOfficial: boolean;
  isShared: boolean;
  structure: TemplateSection[];
  groupName: string | null;
  ownerName: string | null;
  updatedAt: Date;
};

export type TemplateVisibility = {
  canView: boolean;
  canEdit: boolean;
  canClone: boolean;
  canShare: boolean;
  canDelete: boolean;
};

export function parseStructure(value: unknown): TemplateSection[] {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as TemplateSection[]) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    return value as TemplateSection[];
  }
  return [];
}

function normalizeStructure(input: TemplateInput["structure"]) {
  return input.map((section, index) => ({
    id: section.id ?? crypto.randomUUID(),
    order: index,
    title: section.title,
    type: section.type,
    content: section.content,
  }));
}

async function isGroupMember(
  userId: string,
  groupId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function createTemplate(
  coachId: string,
  input: TemplateInput,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const structure = normalizeStructure(input.structure);
  if (structure.length === 0) {
    return { ok: false, error: "Agrega al menos una sección con contenido" };
  }

  const id = crypto.randomUUID();
  await db.insert(templates).values({
    id,
    coachId,
    name: input.name,
    sessionType: input.sessionType,
    structure,
  });

  await logAudit({
    userId: coachId,
    action: "template_created",
    entityType: "template",
    entityId: id,
    details: { name: input.name, sessionType: input.sessionType },
  });

  return { ok: true, data: { id, name: input.name } };
}

export async function updateTemplate(
  templateId: string,
  input: TemplateInput,
  coachId: string,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!template) {
    return { ok: false, error: "Plantilla no encontrada" };
  }
  if (template.isOfficial) {
    return {
      ok: false,
      error:
        "Las plantillas oficiales no se pueden editar. Clónalas para adaptarlas.",
    };
  }
  if (template.coachId !== coachId) {
    return { ok: false, error: "No puedes editar esta plantilla" };
  }

  const structure = normalizeStructure(input.structure);
  if (structure.length === 0) {
    return { ok: false, error: "Agrega al menos una sección con contenido" };
  }

  await db
    .update(templates)
    .set({
      name: input.name,
      sessionType: input.sessionType,
      structure,
      updatedAt: new Date(),
    })
    .where(eq(templates.id, templateId));

  await logAudit({
    userId: coachId,
    action: "template_updated",
    entityType: "template",
    entityId: templateId,
    details: { name: input.name },
  });

  return { ok: true, data: { id: templateId, name: input.name } };
}

export async function deleteTemplate(
  templateId: string,
  coachId: string,
): Promise<ServiceResult<null>> {
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!template) {
    return { ok: false, error: "Plantilla no encontrada" };
  }
  if (template.isOfficial) {
    return { ok: false, error: "Las plantillas oficiales no se pueden eliminar" };
  }
  if (template.coachId !== coachId) {
    return { ok: false, error: "No puedes eliminar esta plantilla" };
  }

  const [assignedRow] = await db
    .select({ value: count() })
    .from(sessionAssignments)
    .where(eq(sessionAssignments.templateId, templateId));
  if (assignedRow && assignedRow.value > 0) {
    return {
      ok: false,
      error:
        "La plantilla tiene sesiones planificadas. Elimina o reprograma esas sesiones antes de borrarla.",
    };
  }

  await db.delete(templates).where(eq(templates.id, templateId));

  await logAudit({
    userId: coachId,
    action: "template_deleted",
    entityType: "template",
    entityId: templateId,
    details: { name: template.name },
  });

  return { ok: true, data: null };
}

export async function cloneTemplate(
  sourceId: string,
  coachId: string,
  newName: string,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const [source] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, sourceId))
    .limit(1);
  if (!source) {
    return { ok: false, error: "Plantilla no encontrada" };
  }

  const visibility = await getTemplateVisibility(source, {
    id: coachId,
    role: "coach",
  });
  if (!visibility.canView || !visibility.canClone) {
    return { ok: false, error: "Plantilla no encontrada" };
  }

  const structure = parseStructure(source.structure).map(
    (section, index) => ({
      ...section,
      id: crypto.randomUUID(),
      order: index,
    }),
  );

  const id = crypto.randomUUID();
  await db.insert(templates).values({
    id,
    coachId,
    name: newName,
    sessionType: source.sessionType,
    structure,
  });

  await logAudit({
    userId: coachId,
    action: "template_cloned",
    entityType: "template",
    entityId: id,
    details: { sourceId, name: newName },
  });

  return { ok: true, data: { id, name: newName } };
}

export async function shareTemplate(
  templateId: string,
  groupId: string,
  coachId: string,
): Promise<ServiceResult<null>> {
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!template || template.coachId !== coachId) {
    return { ok: false, error: "Plantilla no encontrada" };
  }
  if (template.isOfficial) {
    return { ok: false, error: "Las plantillas oficiales ya son globales" };
  }

  const [group] = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) {
    return { ok: false, error: "Grupo no encontrado" };
  }
  if (!(await isGroupMember(coachId, groupId))) {
    return { ok: false, error: "No eres miembro de ese grupo" };
  }

  await db
    .update(templates)
    .set({ isShared: true, groupId, updatedAt: new Date() })
    .where(eq(templates.id, templateId));

  await logAudit({
    userId: coachId,
    action: "template_shared",
    entityType: "template",
    entityId: templateId,
    details: { groupId, groupName: group.name },
  });

  return { ok: true, data: null };
}

export async function unshareTemplate(
  templateId: string,
  coachId: string,
): Promise<ServiceResult<null>> {
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!template || template.coachId !== coachId) {
    return { ok: false, error: "Plantilla no encontrada" };
  }
  if (template.isOfficial) {
    return { ok: false, error: "Las plantillas oficiales no se pueden modificar" };
  }

  await db
    .update(templates)
    .set({ isShared: false, groupId: null, updatedAt: new Date() })
    .where(eq(templates.id, templateId));

  await logAudit({
    userId: coachId,
    action: "template_unshared",
    entityType: "template",
    entityId: templateId,
    details: { name: template.name },
  });

  return { ok: true, data: null };
}

export async function getTemplatesByCoach(
  coachId: string,
): Promise<TemplateListItem[]> {
  const membershipRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, coachId));
  const myGroupIds = membershipRows.map((row) => row.groupId);

  const visibleConditions: SQL[] = [
    eq(templates.coachId, coachId),
    eq(templates.isOfficial, true),
  ];
  if (myGroupIds.length > 0) {
    const sharedCondition = and(
      eq(templates.isShared, true),
      inArray(templates.groupId, myGroupIds),
    );
    if (sharedCondition) {
      visibleConditions.push(sharedCondition);
    }
  }

  const rows = await db
    .select({
      id: templates.id,
      coachId: templates.coachId,
      name: templates.name,
      sessionType: templates.sessionType,
      isOfficial: templates.isOfficial,
      isShared: templates.isShared,
      groupId: templates.groupId,
      structure: templates.structure,
      updatedAt: templates.updatedAt,
      groupName: groups.name,
    })
    .from(templates)
    .leftJoin(groups, eq(templates.groupId, groups.id))
    .where(or(...visibleConditions))
    .orderBy(desc(templates.updatedAt));

  return rows.map((row) => {
    const structure = parseStructure(row.structure);
    const isOwn = row.coachId === coachId;
    const ownership: TemplateOwnership = isOwn
      ? "own"
      : row.isOfficial
        ? "official"
        : "group";
    return {
      id: row.id,
      name: row.name,
      sessionType: row.sessionType,
      isOfficial: row.isOfficial,
      isShared: row.isShared,
      ownership,
      groupName: row.groupName,
      sectionCount: structure.length,
      updatedAt: row.updatedAt,
      canEdit: isOwn && !row.isOfficial,
      canClone: true,
      canShare: isOwn && !row.isOfficial,
      canDelete: isOwn && !row.isOfficial,
    };
  });
}

export async function getTemplateById(
  templateId: string,
): Promise<TemplateDetail | null> {
  const [row] = await db
    .select({
      id: templates.id,
      coachId: templates.coachId,
      groupId: templates.groupId,
      name: templates.name,
      sessionType: templates.sessionType,
      isOfficial: templates.isOfficial,
      isShared: templates.isShared,
      structure: templates.structure,
      updatedAt: templates.updatedAt,
      groupName: groups.name,
      ownerName: users.name,
    })
    .from(templates)
    .leftJoin(groups, eq(templates.groupId, groups.id))
    .leftJoin(users, eq(templates.coachId, users.id))
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!row) {
    return null;
  }
  return { ...row, structure: parseStructure(row.structure) };
}

export async function getTemplateVisibility(
  template: Pick<
    TemplateDetail,
    "coachId" | "groupId" | "isOfficial" | "isShared"
  >,
  user: { id: string; role: string },
): Promise<TemplateVisibility> {
  if (user.role === "admin") {
    return {
      canView: true,
      canEdit: false,
      canClone: true,
      canShare: false,
      canDelete: false,
    };
  }

  const isOwn = template.coachId === user.id;
  const isGroupShared =
    template.isShared &&
    template.groupId !== null &&
    (await isGroupMember(user.id, template.groupId));
  const canView = isOwn || template.isOfficial || isGroupShared;

  return {
    canView,
    canEdit: isOwn && !template.isOfficial,
    canClone: canView,
    canShare: isOwn && !template.isOfficial,
    canDelete: isOwn && !template.isOfficial,
  };
}

export type OfficialTemplateListItem = {
  id: string;
  name: string;
  sessionType: string;
  structure: TemplateSection[];
  sectionCount: number;
  updatedAt: Date;
};

export async function getOfficialTemplates(): Promise<
  OfficialTemplateListItem[]
> {
  const rows = await db
    .select({
      id: templates.id,
      name: templates.name,
      sessionType: templates.sessionType,
      structure: templates.structure,
      updatedAt: templates.updatedAt,
    })
    .from(templates)
    .where(eq(templates.isOfficial, true))
    .orderBy(templates.name);

  return rows.map((row) => {
    const structure = parseStructure(row.structure);
    return {
      id: row.id,
      name: row.name,
      sessionType: row.sessionType,
      structure,
      sectionCount: structure.length,
      updatedAt: row.updatedAt,
    };
  });
}

export async function createOfficialTemplate(
  input: TemplateInput,
  adminId: string,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const structure = normalizeStructure(input.structure);
  if (structure.length === 0) {
    return { ok: false, error: "Agrega al menos una sección con contenido" };
  }

  const id = crypto.randomUUID();
  await db.insert(templates).values({
    id,
    coachId: null,
    groupId: null,
    name: input.name,
    sessionType: input.sessionType,
    isOfficial: true,
    isShared: false,
    structure,
  });

  await logAudit({
    userId: adminId,
    action: "official_template_created",
    entityType: "template",
    entityId: id,
    details: { name: input.name, sessionType: input.sessionType },
  });

  return { ok: true, data: { id, name: input.name } };
}

export async function updateOfficialTemplate(
  templateId: string,
  input: TemplateInput,
  adminId: string,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!template) {
    return { ok: false, error: "Plantilla no encontrada" };
  }
  if (!template.isOfficial) {
    return {
      ok: false,
      error: "Solo se pueden editar las plantillas oficiales",
    };
  }

  const structure = normalizeStructure(input.structure);
  if (structure.length === 0) {
    return { ok: false, error: "Agrega al menos una sección con contenido" };
  }

  await db
    .update(templates)
    .set({
      name: input.name,
      sessionType: input.sessionType,
      structure,
      updatedAt: new Date(),
    })
    .where(eq(templates.id, templateId));

  await logAudit({
    userId: adminId,
    action: "official_template_updated",
    entityType: "template",
    entityId: templateId,
    details: { name: input.name },
  });

  return { ok: true, data: { id: templateId, name: input.name } };
}

export async function deleteOfficialTemplate(
  templateId: string,
  adminId: string,
): Promise<ServiceResult<null>> {
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!template) {
    return { ok: false, error: "Plantilla no encontrada" };
  }
  if (!template.isOfficial) {
    return {
      ok: false,
      error: "Solo se pueden eliminar las plantillas oficiales",
    };
  }

  const [assignedRow] = await db
    .select({ value: count() })
    .from(sessionAssignments)
    .where(eq(sessionAssignments.templateId, templateId));
  if (assignedRow && assignedRow.value > 0) {
    return {
      ok: false,
      error:
        "La plantilla tiene sesiones planificadas. Elimina o reprograma esas sesiones antes de borrarla.",
    };
  }

  await db.delete(templates).where(eq(templates.id, templateId));

  await logAudit({
    userId: adminId,
    action: "official_template_deleted",
    entityType: "template",
    entityId: templateId,
    details: { name: template.name },
  });

  return { ok: true, data: null };
}
