import { and, eq, inArray } from "drizzle-orm";
import type { Role } from "@/lib/auth/role";
import { db } from "@/lib/db";
import {
  groupMembers,
  teams,
  teamMembers,
} from "@/lib/db/schema";
import { canEditRecord as serviceCanEditRecord } from "@/lib/services/session.service";

export * from "./roles";

export type PermissionUser = { id: string; role: Role };

export const isAdmin = (user: Pick<PermissionUser, "role">) =>
  user.role === "admin";
export const isCoach = (user: Pick<PermissionUser, "role">) =>
  user.role === "coach";
export const isAthlete = (user: Pick<PermissionUser, "role">) =>
  user.role === "athlete";

export async function isDirector(user: PermissionUser, groupId: string) {
  if (user.role === "admin") {
    return true;
  }
  if (user.role !== "coach") {
    return false;
  }
  const [row] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id),
        eq(groupMembers.isDirector, true),
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function isGroupMember(user: PermissionUser, groupId: string) {
  if (user.role === "admin") {
    return true;
  }
  const [row] = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
    )
    .limit(1);
  return row !== undefined;
}

export async function canManageTeam(user: PermissionUser, teamId: string) {
  if (user.role !== "coach") {
    return false;
  }
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  return team !== undefined && team.coachId === user.id;
}

export async function canPlanFor(user: PermissionUser, athleteId: string) {
  if (user.role !== "coach") {
    return false;
  }
  const rows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(eq(teamMembers.athleteId, athleteId), eq(teams.coachId, user.id)),
    )
    .limit(1);
  return rows.length > 0;
}

export async function canViewAthlete(user: PermissionUser, athleteId: string) {
  if (user.role === "admin") {
    return true;
  }
  if (user.role === "athlete") {
    return user.id === athleteId;
  }
  if (user.role !== "coach") {
    return false;
  }

  if (await canPlanFor(user, athleteId)) {
    return true;
  }

  const myGroups = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(
      and(eq(groupMembers.userId, user.id), eq(groupMembers.isDirector, true)),
    );
  if (myGroups.length === 0) {
    return false;
  }

  const directorRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .innerJoin(groupMembers, eq(groupMembers.userId, teams.coachId))
    .where(
      and(
        eq(teamMembers.athleteId, athleteId),
        inArray(
          groupMembers.groupId,
          myGroups.map((row) => row.groupId),
        ),
      ),
    )
    .limit(1);
  return directorRows.length > 0;
}

export async function canEditRecord(
  user: PermissionUser,
  assignmentId: string,
) {
  if (user.role !== "athlete") {
    return false;
  }
  return serviceCanEditRecord(assignmentId, user.id);
}
