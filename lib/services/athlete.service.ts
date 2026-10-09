import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { renderWelcomeEmail } from "@/emails/welcome";
import { env } from "@/lib/config";
import { db } from "@/lib/db";
import {
  athleteProfiles,
  sessionAssignments,
  sessionRecords,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import type {
  CreateAthleteInput,
  TransferAthleteInput,
  UpdateAthleteProfileInput,
} from "@/lib/validations/athlete.schemas";
import { logAudit } from "./audit.service";
import { sendEmail } from "./email.service";
import { getMaxAthletesPerTeam } from "./settings.service";
import { toISODate } from "@/lib/utils/date";

export type ServiceResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

export type AthleteListItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  teamNames: string[];
  teamRefs: { id: string; name: string }[];
  profile: AthleteProfileData | null;
  completedSessions: number;
  totalSessions: number;
  lastActivity: Date | null;
};

export type AthleteProfileData = {
  birthDate: string | null;
  weightKg: string | null;
  heightCm: string | null;
  maxHr: number | null;
  restingHr: number | null;
};

export type AthleteDetail = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  profile: AthleteProfileData | null;
  teams: { id: string; name: string }[];
  completedSessions: number;
  totalSessions: number;
  lastRecord: {
    distanceKm: string | null;
    durationMinutes: number | null;
    rpe: number | null;
    recordedAt: Date;
  } | null;
};

export type TeamOption = {
  id: string;
  name: string;
  coachName: string;
};

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url").slice(0, 10);
}

function normalizeOptionalNumber(
  value: number | string | undefined,
): string | number | null {
  if (value === undefined || value === "") {
    return null;
  }
  return typeof value === "number" ? value : Number(value);
}

function toDateOrNull(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}

async function findOwnedTeam(teamId: string, coachId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.coachId, coachId)))
    .limit(1);
  return team;
}

export async function createAthlete(
  coachId: string,
  input: CreateAthleteInput,
): Promise<
  ServiceResult<{
    id: string;
    name: string;
    email: string;
    tempPassword: string;
  }>
> {
  const team = await findOwnedTeam(input.teamId, coachId);
  if (!team) {
    return { ok: false, error: "Team no encontrado" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (existing) {
    return { ok: false, error: "Ya existe un usuario con ese email" };
  }

  const [currentRow] = await db
    .select({ value: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, input.teamId));
  const maxAthletes = await getMaxAthletesPerTeam();
  if (currentRow.value >= maxAthletes) {
    return {
      ok: false,
      error: "Has alcanzado el límite de atletas en este team",
    };
  }

  const id = crypto.randomUUID();
  const tempPassword = generateTempPassword();
  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    passwordHash: await hash(tempPassword, 10),
    role: "athlete",
    isActive: true,
    mustChangePassword: true,
  });

  await db.insert(athleteProfiles).values({
    userId: id,
    birthDate: toDateOrNull(input.birthDate),
    weightKg: normalizeOptionalNumber(input.weightKg)?.toString() ?? null,
    heightCm: normalizeOptionalNumber(input.heightCm)?.toString() ?? null,
    maxHr: Number(normalizeOptionalNumber(input.maxHr)) || null,
    restingHr: Number(normalizeOptionalNumber(input.restingHr)) || null,
  });

  await db.insert(teamMembers).values({
    teamId: input.teamId,
    athleteId: id,
  });

  await logAudit({
    userId: coachId,
    action: "athlete_created",
    entityType: "user",
    entityId: id,
    details: { name: input.name, email: input.email, teamId: input.teamId },
  });

  const html = await renderWelcomeEmail({
    name: input.name,
    tempPassword,
    loginUrl: `${env.appUrl}/login`,
  });
  await sendEmail({
    to: input.email,
    subject: "Bienvenido a RunOsorno — tu cuenta de atleta",
    html,
  });

  return {
    ok: true,
    data: { id, name: input.name, email: input.email, tempPassword },
  };
}

export async function updateAthleteProfile(
  athleteId: string,
  input: UpdateAthleteProfileInput,
  actorId: string,
): Promise<ServiceResult<null>> {
  const [athlete] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, athleteId), eq(users.role, "athlete")))
    .limit(1);
  if (!athlete) {
    return { ok: false, error: "Atleta no encontrado" };
  }

  const memberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(eq(teamMembers.athleteId, athleteId), eq(teams.coachId, actorId)),
    )
    .limit(1);
  if (memberships.length === 0) {
    return { ok: false, error: "Atleta no encontrado" };
  }

  if (input.name && input.name !== athlete.name) {
    await db
      .update(users)
      .set({ name: input.name })
      .where(eq(users.id, athleteId));
  }

  const profileValues = {
    userId: athleteId,
    birthDate: toDateOrNull(input.birthDate),
    weightKg: normalizeOptionalNumber(input.weightKg)?.toString() ?? null,
    heightCm: normalizeOptionalNumber(input.heightCm)?.toString() ?? null,
    maxHr: Number(normalizeOptionalNumber(input.maxHr)) || null,
    restingHr: Number(normalizeOptionalNumber(input.restingHr)) || null,
  };
  await db
    .insert(athleteProfiles)
    .values(profileValues)
    .onDuplicateKeyUpdate({
      set: {
        birthDate: profileValues.birthDate,
        weightKg: profileValues.weightKg,
        heightCm: profileValues.heightCm,
        maxHr: profileValues.maxHr,
        restingHr: profileValues.restingHr,
      },
    });

  await logAudit({
    userId: actorId,
    action: "athlete_profile_updated",
    entityType: "user",
    entityId: athleteId,
    details: { name: input.name ?? athlete.name },
  });

  return { ok: true, data: null };
}

async function loadAthleteStats(athleteIds: string[]) {
  if (athleteIds.length === 0) {
    return {
      assignmentRows: [] as {
        id: string;
        athleteId: string;
        status: string;
      }[],
      lastActivityByAthlete: new Map<string, Date>(),
    };
  }

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
            recordedAt: sessionRecords.recordedAt,
          })
          .from(sessionRecords)
          .where(inArray(sessionRecords.assignmentId, assignmentIds))
          .orderBy(desc(sessionRecords.recordedAt))
      : [];

  const lastActivityByAthlete = new Map<string, Date>();
  const assignmentById = new Map(
    assignmentRows.map((row) => [row.id, row.athleteId]),
  );
  for (const record of recordRows) {
    const athleteId = assignmentById.get(record.assignmentId);
    if (athleteId && !lastActivityByAthlete.has(athleteId)) {
      lastActivityByAthlete.set(athleteId, record.recordedAt);
    }
  }

  return { assignmentRows, lastActivityByAthlete };
}

async function loadAthleteProfiles(
  athleteIds: string[],
): Promise<Map<string, AthleteProfileData>> {
  const map = new Map<string, AthleteProfileData>();
  if (athleteIds.length === 0) {
    return map;
  }
  const rows = await db
    .select()
    .from(athleteProfiles)
    .where(inArray(athleteProfiles.userId, athleteIds));
  for (const row of rows) {
    map.set(row.userId, {
      birthDate: row.birthDate
        ? typeof row.birthDate === "string"
          ? row.birthDate
          : toISODate(row.birthDate)
        : null,
      weightKg: row.weightKg,
      heightCm: row.heightCm,
      maxHr: row.maxHr,
      restingHr: row.restingHr,
    });
  }
  return map;
}

export async function getAthletesByCoach(
  coachId: string,
): Promise<AthleteListItem[]> {
  const coachTeamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.coachId, coachId));
  if (coachTeamRows.length === 0) {
    return [];
  }
  const coachTeamIds = coachTeamRows.map((team) => team.id);

  const membershipRows = await db
    .select({
      athleteId: teamMembers.athleteId,
      teamId: teamMembers.teamId,
      teamName: teams.name,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(inArray(teamMembers.teamId, coachTeamIds));
  if (membershipRows.length === 0) {
    return [];
  }

  const athleteIds = [...new Set(membershipRows.map((row) => row.athleteId))];
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(inArray(users.id, athleteIds))
    .orderBy(users.name);

  const { assignmentRows, lastActivityByAthlete } =
    await loadAthleteStats(athleteIds);
  const profileMap = await loadAthleteProfiles(athleteIds);

  return userRows.map((user) => {
    const athleteAssignments = assignmentRows.filter(
      (row) => row.athleteId === user.id,
    );
    const memberships = membershipRows.filter(
      (row) => row.athleteId === user.id,
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      teamNames: memberships.map((row) => row.teamName),
      teamRefs: memberships.map((row) => ({
        id: row.teamId,
        name: row.teamName,
      })),
      profile: profileMap.get(user.id) ?? null,
      completedSessions: athleteAssignments.filter(
        (row) => row.status === "completed",
      ).length,
      totalSessions: athleteAssignments.length,
      lastActivity: lastActivityByAthlete.get(user.id) ?? null,
    };
  });
}

export async function getAthleteDetail(
  athleteId: string,
  viewer: { id: string; role: "admin" | "coach" | "athlete" },
): Promise<ServiceResult<AthleteDetail>> {
  const [athlete] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, athleteId), eq(users.role, "athlete")))
    .limit(1);
  if (!athlete) {
    return { ok: false, error: "Atleta no encontrado" };
  }

  if (viewer.role === "athlete" && viewer.id !== athleteId) {
    return { ok: false, error: "Atleta no encontrado" };
  }
  if (viewer.role === "coach") {
    const owned = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(eq(teamMembers.athleteId, athleteId), eq(teams.coachId, viewer.id)),
      )
      .limit(1);
    if (owned.length === 0) {
      return { ok: false, error: "Atleta no encontrado" };
    }
  }

  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.athleteId, athleteId))
    .orderBy(teams.name);

  const [profile] = await db
    .select()
    .from(athleteProfiles)
    .where(eq(athleteProfiles.userId, athleteId))
    .limit(1);

  const { assignmentRows } = await loadAthleteStats([athleteId]);
  const completedSessions = assignmentRows.filter(
    (row) => row.status === "completed",
  ).length;

  let lastRecord: AthleteDetail["lastRecord"] = null;
  if (assignmentRows.length > 0) {
    const [recordRow] = await db
      .select({
        distanceKm: sessionRecords.distanceKm,
        durationMinutes: sessionRecords.durationMinutes,
        rpe: sessionRecords.rpe,
        recordedAt: sessionRecords.recordedAt,
      })
      .from(sessionRecords)
      .innerJoin(
        sessionAssignments,
        eq(sessionRecords.assignmentId, sessionAssignments.id),
      )
      .where(eq(sessionAssignments.athleteId, athleteId))
      .orderBy(desc(sessionRecords.recordedAt))
      .limit(1);
    if (recordRow) {
      lastRecord = recordRow;
    }
  }

  return {
    ok: true,
    data: {
      id: athlete.id,
      name: athlete.name,
      email: athlete.email,
      isActive: athlete.isActive,
      createdAt: athlete.createdAt,
      profile: profile
        ? {
            birthDate: profile.birthDate
              ? typeof profile.birthDate === "string"
                ? profile.birthDate
                : toISODate(profile.birthDate)
              : null,
            weightKg: profile.weightKg,
            heightCm: profile.heightCm,
            maxHr: profile.maxHr,
            restingHr: profile.restingHr,
          }
        : null,
      teams: teamRows,
      completedSessions,
      totalSessions: assignmentRows.length,
      lastRecord,
    },
  };
}

export type AthleteFilters = {
  coachId?: string;
  teamId?: string;
  groupId?: string;
  status?: "active" | "inactive" | "all";
};

export async function getAllAthletes(
  filters: AthleteFilters = {},
): Promise<AthleteListItem[]> {
  const conditions = [eq(users.role, "athlete")];
  if (filters.status === "active") {
    conditions.push(eq(users.isActive, true));
  } else if (filters.status === "inactive") {
    conditions.push(eq(users.isActive, false));
  }

  if (filters.teamId) {
    const teamId = filters.teamId;
    conditions.push(
      sql`exists (
        select 1 from team_members tm
        where tm.athlete_id = ${users.id} and tm.team_id = ${teamId}
      )`,
    );
  }
  if (filters.coachId) {
    const coachId = filters.coachId;
    conditions.push(
      sql`exists (
        select 1 from team_members tm
        inner join teams t on t.id = tm.team_id
        where tm.athlete_id = ${users.id} and t.coach_id = ${coachId}
      )`,
    );
  }
  if (filters.groupId) {
    const groupId = filters.groupId;
    conditions.push(
      sql`exists (
        select 1 from team_members tm
        inner join teams t on t.id = tm.team_id
        inner join group_members gm on gm.user_id = t.coach_id
        where tm.athlete_id = ${users.id} and gm.group_id = ${groupId}
      )`,
    );
  }

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.name);
  if (userRows.length === 0) {
    return [];
  }

  const athleteIds = userRows.map((row) => row.id);
  const membershipRows = await db
    .select({
      athleteId: teamMembers.athleteId,
      teamId: teamMembers.teamId,
      teamName: teams.name,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(inArray(teamMembers.athleteId, athleteIds));

  const { assignmentRows, lastActivityByAthlete } =
    await loadAthleteStats(athleteIds);
  const profileMap = await loadAthleteProfiles(athleteIds);

  return userRows.map((user) => {
    const athleteAssignments = assignmentRows.filter(
      (row) => row.athleteId === user.id,
    );
    const memberships = membershipRows.filter(
      (row) => row.athleteId === user.id,
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      teamNames: memberships.map((row) => row.teamName),
      teamRefs: memberships.map((row) => ({
        id: row.teamId,
        name: row.teamName,
      })),
      profile: profileMap.get(user.id) ?? null,
      completedSessions: athleteAssignments.filter(
        (row) => row.status === "completed",
      ).length,
      totalSessions: athleteAssignments.length,
      lastActivity: lastActivityByAthlete.get(user.id) ?? null,
    };
  });
}

export async function getAllTeamOptions(): Promise<TeamOption[]> {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      coachName: users.name,
    })
    .from(teams)
    .innerJoin(users, eq(teams.coachId, users.id))
    .orderBy(users.name, teams.name);
  return rows;
}

export async function transferAthlete(
  input: TransferAthleteInput,
  actorId: string,
): Promise<ServiceResult<null>> {
  if (input.fromTeamId === input.toTeamId) {
    return {
      ok: false,
      error: "El team de origen y destino deben ser distintos",
    };
  }
  const [athlete] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, input.athleteId), eq(users.role, "athlete")))
    .limit(1);
  if (!athlete) {
    return { ok: false, error: "Atleta no encontrado" };
  }

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.athleteId, input.athleteId),
        eq(teamMembers.teamId, input.fromTeamId),
      ),
    )
    .limit(1);
  if (!membership) {
    return { ok: false, error: "El atleta no está en el team de origen" };
  }

  const [toTeam] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, input.toTeamId))
    .limit(1);
  if (!toTeam) {
    return { ok: false, error: "Team de destino no encontrado" };
  }

  const [currentRow] = await db
    .select({ value: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, input.toTeamId));
  const maxAthletes = await getMaxAthletesPerTeam();
  if (currentRow.value >= maxAthletes) {
    return {
      ok: false,
      error: "Has alcanzado el límite de atletas en el team de destino",
    };
  }

  await db
    .delete(teamMembers)
    .where(
      and(
        eq(teamMembers.athleteId, input.athleteId),
        eq(teamMembers.teamId, input.fromTeamId),
      ),
    );
  await db.insert(teamMembers).values({
    teamId: input.toTeamId,
    athleteId: input.athleteId,
  });

  await logAudit({
    userId: actorId,
    action: "athlete_transferred",
    entityType: "team_member",
    entityId: `${input.fromTeamId}:${input.athleteId}`,
    details: {
      athleteId: input.athleteId,
      fromTeamId: input.fromTeamId,
      toTeamId: input.toTeamId,
    },
  });

  return { ok: true, data: null };
}

export async function getOrphanAthletes(): Promise<
  {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    lastActivity: Date | null;
  }[]
> {
  const athleteRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.role, "athlete"), eq(users.isActive, true)))
    .orderBy(users.name);
  if (athleteRows.length === 0) {
    return [];
  }

  const athleteIds = athleteRows.map((row) => row.id);
  const membershipRows = await db
    .select({ athleteId: teamMembers.athleteId })
    .from(teamMembers)
    .where(inArray(teamMembers.athleteId, athleteIds));
  const withTeam = new Set(membershipRows.map((row) => row.athleteId));
  const orphanIds = athleteIds.filter((id) => !withTeam.has(id));
  if (orphanIds.length === 0) {
    return [];
  }

  const { lastActivityByAthlete } = await loadAthleteStats(orphanIds);

  return athleteRows
    .filter((row) => orphanIds.includes(row.id))
    .map((row) => ({
      ...row,
      lastActivity: lastActivityByAthlete.get(row.id) ?? null,
    }));
}
