import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sessionAssignments,
  sessionRecords,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import type {
  CreateTeamInput,
  UpdateTeamInput,
} from "@/lib/validations/team.schemas";
import { logAudit } from "./audit.service";
import { notify } from "./notification.service";
import {
  getMaxAthletesPerTeam,
  getMaxTeamsPerCoach,
} from "./settings.service";

export type ServiceResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

export type TeamListItem = {
  id: string;
  name: string;
  athletesCount: number;
};

export type TeamAthleteItem = {
  athleteId: string;
  name: string;
  email: string;
  joinedAt: Date;
  lastRecord: {
    distanceKm: string | null;
    durationMinutes: number | null;
    rpe: number | null;
    recordedAt: Date;
  } | null;
  completedSessions: number;
  totalSessions: number;
};

export type AssignableAthlete = {
  id: string;
  name: string;
  email: string;
  currentTeamNames: string[];
};

function defaultTeamName(coachName: string): string {
  const parts = coachName.trim().split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "Equipo";
}

async function findOwnedTeam(teamId: string, coachId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.coachId, coachId)))
    .limit(1);
  return team;
}

export async function createTeam(
  coachId: string,
  input: CreateTeamInput,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const [coach] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, coachId))
    .limit(1);
  if (!coach) {
    return { ok: false, error: "Coach no encontrado" };
  }

  // Límite global por coach. El admin lo edita en Configuración → Límites y el
  // valor por defecto (10) viene de `DEFAULT_SETTINGS.maxTeamsPerCoach`. El
  // límite de atletas por team sí se aplicaba; este se configuraba pero nunca
  // se comprobaba.
  const maxTeams = await getMaxTeamsPerCoach();
  const [current] = await db
    .select({ total: sql<number>`count(*)` })
    .from(teams)
    .where(eq(teams.coachId, coachId));
  if ((current?.total ?? 0) >= maxTeams) {
    return {
      ok: false,
      error: `Has alcanzado el límite de ${maxTeams} teams. Elimina uno o pide al administrador que lo aumente.`,
    };
  }

  const name = input.name ? input.name : defaultTeamName(coach.name);
  const id = crypto.randomUUID();
  await db.insert(teams).values({ id, name, coachId });

  await logAudit({
    userId: coachId,
    action: "team_created",
    entityType: "team",
    entityId: id,
    details: { name },
  });

  return { ok: true, data: { id, name } };
}

export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput,
  coachId: string,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const team = await findOwnedTeam(teamId, coachId);
  if (!team) {
    return { ok: false, error: "Team no encontrado" };
  }

  await db.update(teams).set({ name: input.name }).where(eq(teams.id, teamId));

  await logAudit({
    userId: coachId,
    action: "team_updated",
    entityType: "team",
    entityId: teamId,
    details: { name: input.name },
  });

  return { ok: true, data: { id: teamId, name: input.name } };
}

export async function deleteTeam(
  teamId: string,
  coachId: string,
): Promise<ServiceResult<null>> {
  const team = await findOwnedTeam(teamId, coachId);
  if (!team) {
    return { ok: false, error: "Team no encontrado" };
  }

  const [membersRow] = await db
    .select({ value: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  if (membersRow.value > 0) {
    return {
      ok: false,
      error: "El team tiene atletas. Quítalos antes de eliminarlo.",
    };
  }

  await db.delete(teams).where(eq(teams.id, teamId));

  await logAudit({
    userId: coachId,
    action: "team_deleted",
    entityType: "team",
    entityId: teamId,
    details: { name: team.name },
  });

  return { ok: true, data: null };
}

export async function getTeamsByCoach(
  coachId: string,
): Promise<TeamListItem[]> {
  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.coachId, coachId))
    .orderBy(teams.name);
  if (teamRows.length === 0) {
    return [];
  }

  const teamIds = teamRows.map((team) => team.id);
  const memberRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, teamIds));

  return teamRows.map((team) => ({
    id: team.id,
    name: team.name,
    athletesCount: memberRows.filter((row) => row.teamId === team.id).length,
  }));
}

export async function assignAthlete(
  teamId: string,
  athleteId: string,
  coachId: string,
): Promise<ServiceResult<null>> {
  const team = await findOwnedTeam(teamId, coachId);
  if (!team) {
    return { ok: false, error: "Team no encontrado" };
  }

  const [athlete] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, athleteId), eq(users.role, "athlete")))
    .limit(1);
  if (!athlete) {
    return { ok: false, error: "Atleta no encontrado" };
  }

  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.athleteId, athleteId)),
    )
    .limit(1);
  if (existing) {
    return { ok: false, error: "El atleta ya está en este team" };
  }

  const [currentRow] = await db
    .select({ value: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  const maxAthletes = await getMaxAthletesPerTeam();
  if (currentRow.value >= maxAthletes) {
    return {
      ok: false,
      error: "Has alcanzado el límite de atletas en este team",
    };
  }

  await db.insert(teamMembers).values({ teamId, athleteId });

  await notify({
    userId: athleteId,
    type: "athlete_assigned",
    title: "Agregado a un team",
    message: `Tu coach te agregó al team "${team.name}".`,
    entityType: "team",
    entityId: teamId,
  });

  await logAudit({
    userId: coachId,
    action: "athlete_assigned",
    entityType: "team_member",
    entityId: `${teamId}:${athleteId}`,
    details: { teamId, athleteId },
  });

  return { ok: true, data: null };
}

export async function removeAthlete(
  teamId: string,
  athleteId: string,
  coachId: string,
): Promise<ServiceResult<null>> {
  const team = await findOwnedTeam(teamId, coachId);
  if (!team) {
    return { ok: false, error: "Team no encontrado" };
  }

  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.athleteId, athleteId)),
    )
    .limit(1);
  if (!existing) {
    return { ok: false, error: "El atleta no está en este team" };
  }

  await db
    .delete(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.athleteId, athleteId)),
    );

  await logAudit({
    userId: coachId,
    action: "athlete_removed",
    entityType: "team_member",
    entityId: `${teamId}:${athleteId}`,
    details: { teamId, athleteId },
  });

  return { ok: true, data: null };
}

export async function getTeamAthletes(
  teamId: string,
  coachId: string,
): Promise<ServiceResult<TeamAthleteItem[]>> {
  const team = await findOwnedTeam(teamId, coachId);
  if (!team) {
    return { ok: false, error: "Team no encontrado" };
  }

  const memberRows = await db
    .select({
      athleteId: teamMembers.athleteId,
      name: users.name,
      email: users.email,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.athleteId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(users.name);
  if (memberRows.length === 0) {
    return { ok: true, data: [] };
  }

  const athleteIds = memberRows.map((row) => row.athleteId);

  const assignmentRows = await db
    .select({
      id: sessionAssignments.id,
      athleteId: sessionAssignments.athleteId,
      status: sessionAssignments.status,
    })
    .from(sessionAssignments)
    .where(inArray(sessionAssignments.athleteId, athleteIds));

  const assignmentIds = assignmentRows.map((row) => row.id);
  const recordRows =
    assignmentIds.length > 0
      ? await db
          .select({
            assignmentId: sessionRecords.assignmentId,
            distanceKm: sessionRecords.distanceKm,
            durationMinutes: sessionRecords.durationMinutes,
            rpe: sessionRecords.rpe,
            recordedAt: sessionRecords.recordedAt,
          })
          .from(sessionRecords)
          .where(inArray(sessionRecords.assignmentId, assignmentIds))
          .orderBy(desc(sessionRecords.recordedAt))
      : [];

  return {
    ok: true,
    data: memberRows.map((row) => {
      const athleteAssignments = assignmentRows.filter(
        (assignment) => assignment.athleteId === row.athleteId,
      );
      const assignmentIdSet = new Set(
        athleteAssignments.map((assignment) => assignment.id),
      );
      const athleteRecords = recordRows.filter((record) =>
        assignmentIdSet.has(record.assignmentId),
      );
      return {
        athleteId: row.athleteId,
        name: row.name,
        email: row.email,
        joinedAt: row.joinedAt,
        lastRecord: athleteRecords[0]
          ? {
              distanceKm: athleteRecords[0].distanceKm,
              durationMinutes: athleteRecords[0].durationMinutes,
              rpe: athleteRecords[0].rpe,
              recordedAt: athleteRecords[0].recordedAt,
            }
          : null,
        completedSessions: athleteAssignments.filter(
          (assignment) => assignment.status === "completed",
        ).length,
        totalSessions: athleteAssignments.length,
      };
    }),
  };
}

export async function getAssignableAthletes(
  coachId: string,
  teamId: string,
): Promise<AssignableAthlete[]> {
  const coachTeamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.coachId, coachId));
  const coachTeamIds = new Set(coachTeamRows.map((team) => team.id));
  if (coachTeamIds.size === 0) {
    return [];
  }

  const allAthletes = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.role, "athlete"), eq(users.isActive, true)))
    .orderBy(users.name);
  if (allAthletes.length === 0) {
    return [];
  }

  const athleteIds = allAthletes.map((athlete) => athlete.id);
  const memberships = await db
    .select({
      athleteId: teamMembers.athleteId,
      teamId: teamMembers.teamId,
      teamName: teams.name,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(inArray(teamMembers.athleteId, athleteIds));

  return allAthletes
    .filter((athlete) => {
      const athleteTeams = memberships.filter(
        (row) => row.athleteId === athlete.id,
      );
      if (athleteTeams.some((row) => row.teamId === teamId)) {
        return false;
      }
      const isFreeAgent = athleteTeams.length === 0;
      const isCoachAthlete = athleteTeams.some((row) =>
        coachTeamIds.has(row.teamId),
      );
      return isFreeAgent || isCoachAthlete;
    })
    .map((athlete) => ({
      ...athlete,
      currentTeamNames: memberships
        .filter((row) => row.athleteId === athlete.id)
        .map((row) => row.teamName),
    }));
}
