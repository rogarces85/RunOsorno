import { randomBytes } from "crypto";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { renderWelcomeEmail } from "@/emails/welcome";
import { env } from "@/lib/config";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/security/hashing";
import {
  groupMembers,
  groups,
  sessionAssignments,
  sessions,
  teams,
  templates,
  users,
} from "@/lib/db/schema";
import type {
  CreateCoachInput,
  UpdateCoachInput,
} from "@/lib/validations/user.schemas";
import { logAudit } from "./audit.service";
import { sendEmail } from "./email.service";

export type ServiceResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

export type CoachListItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  groups: string[];
};

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url").slice(0, 10);
}

async function sendCredentialsEmail(params: {
  name: string;
  email: string;
  tempPassword: string;
  subject: string;
}): Promise<void> {
  const html = await renderWelcomeEmail({
    name: params.name,
    tempPassword: params.tempPassword,
    loginUrl: `${env.appUrl}/login`,
  });
  await sendEmail({ to: params.email, subject: params.subject, html });
}

async function findCoach(id: string) {
  const [coach] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "coach")))
    .limit(1);
  return coach;
}

export async function createCoach(
  input: CreateCoachInput,
  actorId: string,
  ipAddress: string | null,
): Promise<
  ServiceResult<{
    coach: { id: string; name: string; email: string };
    tempPassword: string;
  }>
> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (existing) {
    return { ok: false, error: "Ya existe un usuario con ese email" };
  }

  const id = crypto.randomUUID();
  const tempPassword = generateTempPassword();
  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(tempPassword),
    role: "coach",
    isActive: true,
    mustChangePassword: true,
  });

  await logAudit({
    userId: actorId,
    action: "coach_created",
    entityType: "user",
    entityId: id,
    details: { name: input.name, email: input.email },
    ipAddress,
  });

  await sendCredentialsEmail({
    name: input.name,
    email: input.email,
    tempPassword,
    subject: "Bienvenido a RunOsorno — tu invitación como coach",
  });

  return {
    ok: true,
    data: {
      coach: { id, name: input.name, email: input.email },
      tempPassword,
    },
  };
}

export async function updateCoach(
  id: string,
  input: UpdateCoachInput,
  actorId: string,
): Promise<ServiceResult<{ id: string; name: string; email: string }>> {
  const coach = await findCoach(id);
  if (!coach) {
    return { ok: false, error: "Coach no encontrado" };
  }
  if (coach.email !== input.email) {
    const [duplicate] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (duplicate) {
      return { ok: false, error: "Ya existe un usuario con ese email" };
    }
  }

  await db
    .update(users)
    .set({ name: input.name, email: input.email })
    .where(eq(users.id, id));

  await logAudit({
    userId: actorId,
    action: "coach_updated",
    entityType: "user",
    entityId: id,
    details: { name: input.name, email: input.email },
  });

  return { ok: true, data: { id, name: input.name, email: input.email } };
}

export async function deactivateCoach(
  id: string,
  actorId: string,
): Promise<ServiceResult<null>> {
  const coach = await findCoach(id);
  if (!coach || !coach.isActive) {
    return { ok: false, error: "Coach no encontrado o ya inactivo" };
  }

  await db.update(users).set({ isActive: false }).where(eq(users.id, id));
  await db.delete(sessions).where(eq(sessions.userId, id));

  await logAudit({
    userId: actorId,
    action: "coach_deactivated",
    entityType: "user",
    entityId: id,
    details: { name: coach.name, email: coach.email },
  });

  return { ok: true, data: null };
}

export async function reactivateCoach(
  id: string,
  actorId: string,
): Promise<ServiceResult<null>> {
  const coach = await findCoach(id);
  if (!coach || coach.isActive) {
    return { ok: false, error: "Coach no encontrado o ya activo" };
  }

  await db.update(users).set({ isActive: true }).where(eq(users.id, id));

  await logAudit({
    userId: actorId,
    action: "coach_reactivated",
    entityType: "user",
    entityId: id,
    details: { name: coach.name, email: coach.email },
  });

  return { ok: true, data: null };
}

export async function deleteCoach(
  id: string,
  actorId: string,
): Promise<ServiceResult<null>> {
  const coach = await findCoach(id);
  if (!coach) {
    return { ok: false, error: "Coach no encontrado" };
  }

  const [teamsRow] = await db
    .select({ value: count() })
    .from(teams)
    .where(eq(teams.coachId, id));
  if (teamsRow.value > 0) {
    return {
      ok: false,
      error: "Este coach tiene teams. Desactívalo en su lugar.",
    };
  }

  const [assignmentsRow] = await db
    .select({ value: count() })
    .from(sessionAssignments)
    .where(eq(sessionAssignments.createdBy, id));
  if (assignmentsRow.value > 0) {
    return {
      ok: false,
      error: "Este coach tiene sesiones planificadas. Desactívalo en su lugar.",
    };
  }

  const [groupsRow] = await db
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.userId, id));
  if (groupsRow.value > 0) {
    return {
      ok: false,
      error:
        "Este coach pertenece a un grupo. Quítalo del grupo o desactívalo.",
    };
  }

  const [templatesRow] = await db
    .select({ value: count() })
    .from(templates)
    .where(eq(templates.coachId, id));
  if (templatesRow.value > 0) {
    return {
      ok: false,
      error: "Este coach tiene plantillas propias. Desactívalo en su lugar.",
    };
  }

  await db.delete(users).where(eq(users.id, id));

  await logAudit({
    userId: actorId,
    action: "coach_deleted",
    entityType: "user",
    entityId: id,
    details: { name: coach.name, email: coach.email },
  });

  return { ok: true, data: null };
}

async function regeneratePassword(
  id: string,
  actorId: string,
  auditAction: string,
): Promise<ServiceResult<{ tempPassword: string }>> {
  const coach = await findCoach(id);
  if (!coach) {
    return { ok: false, error: "Coach no encontrado" };
  }

  const tempPassword = generateTempPassword();
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    })
    .where(eq(users.id, id));
  await db.delete(sessions).where(eq(sessions.userId, id));

  await logAudit({
    userId: actorId,
    action: auditAction,
    entityType: "user",
    entityId: id,
    details: { email: coach.email },
  });

  await sendCredentialsEmail({
    name: coach.name,
    email: coach.email,
    tempPassword,
    subject:
      auditAction === "invitation_resent"
        ? "Reenvío de invitación a RunOsorno"
        : "Tu nueva contraseña temporal de RunOsorno",
  });

  return { ok: true, data: { tempPassword } };
}

export async function resetPassword(
  id: string,
  actorId: string,
): Promise<ServiceResult<{ tempPassword: string }>> {
  return regeneratePassword(id, actorId, "password_reset");
}

export async function resendInvitation(
  id: string,
  actorId: string,
): Promise<ServiceResult<{ tempPassword: string }>> {
  return regeneratePassword(id, actorId, "invitation_resent");
}

export async function getCoaches(
  filters: {
    status?: "active" | "inactive" | "all";
    groupId?: string;
    search?: string;
  } = {},
): Promise<CoachListItem[]> {
  const conditions = [eq(users.role, "coach")];
  if (filters.status === "active") {
    conditions.push(eq(users.isActive, true));
  } else if (filters.status === "inactive") {
    conditions.push(eq(users.isActive, false));
  }
  if (filters.groupId) {
    const groupId = filters.groupId;
    conditions.push(
      sql`exists (
        select 1 from group_members gm
        where gm.user_id = ${users.id} and gm.group_id = ${groupId}
      )`,
    );
  }
  if (filters.search) {
    const query = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      sql`lower(${users.name}) like ${query} or lower(${users.email}) like ${query}`,
    );
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.name);

  const coachIds = rows.map((row) => row.id);
  const memberships =
    coachIds.length > 0
      ? await db
          .select({ userId: groupMembers.userId, groupName: groups.name })
          .from(groupMembers)
          .innerJoin(groups, eq(groupMembers.groupId, groups.id))
          .where(inArray(groupMembers.userId, coachIds))
      : [];

  return rows.map((row) => ({
    ...row,
    groups: memberships
      .filter((membership) => membership.userId === row.id)
      .map((membership) => membership.groupName),
  }));
}

export async function getOrphanCoaches(): Promise<CoachListItem[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "coach"),
        sql`not exists (
          select 1 from group_members gm where gm.user_id = ${users.id}
        )`,
      ),
    )
    .orderBy(users.name);

  return rows.map((row) => ({ ...row, groups: [] }));
}
