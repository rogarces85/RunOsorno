/**
 * Utilidades compartidas por las pruebas E2E (Fase 42).
 *
 * Los flujos se crean sobre la base de desarrollo, así que cada ejecución usa
 * un sufijo único (`RUN`) en nombres y emails: dos corridas seguidas no colisionan
 * y `cleanupRun()` deja la base como estaba, borrando todo lo que lleva ese
 * sufijo (usuarios, grupos, equipos, plantillas, sesiones, feedback y avisos).
 */

import { expect, type Page } from "@playwright/test";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/security/hashing";
import {
  athleteProfiles,
  auditLogs,
  groupMembers,
  groupRequests,
  groups,
  notifications,
  sessionAssignments,
  sessionFeedback,
  sessionRecords,
  teamMembers,
  teams,
  templates,
  users,
} from "@/lib/db/schema";

/** Sufijo único por ejecución. */
export const RUN = `e2e${Date.now().toString(36).slice(-6)}`;

export const ADMIN = { email: "admin@runosorno.cl", password: "Admin1234!" };
export const COACH_DEMO = {
  email: "coach.demo@runosorno.cl",
  password: "Demo1234!",
};
export const ATHLETE_DEMO = {
  email: "maria.fernandez@demo.runosorno.cl",
  password: "Demo1234!",
};

export async function login(
  page: Page,
  user: { email: string; password: string },
  expectedPath: string,
): Promise<void> {
  await page.goto("/login");
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${expectedPath}`);
}

export type Account = { id: string; email: string; password: string };

/** Fecha `YYYY-MM-DD` a `offsetDays` de hoy (negativo = pasado). */
export function isoDate(offsetDays: number): string {
  const day = new Date();
  day.setDate(day.getDate() + offsetDays);
  return [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, "0"),
    String(day.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Fechas listas para insertar en las columnas `date` de MySQL.
 *
 * Regla del proyecto: se insertan como `Date` a mediodía local, porque Drizzle
 * las lee como UTC y con medianoche el round-trip puede correr un día.
 */
export function sessionDates(offsetDays: number): {
  sessionDate: Date;
  weekStart: Date;
} {
  const [year, month, day] = isoDate(offsetDays).split("-").map(Number);
  const sessionDate = new Date(year!, month! - 1, day!, 12);
  const weekStart = new Date(sessionDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return { sessionDate, weekStart };
}

/** Crea una asignación para el fixture, lista para el calendario. */
export async function addSession(
  athleteId: string,
  coachId: string,
  templateId: string,
  offsetDays: number,
): Promise<{ id: string; dateISO: string }> {
  const id = crypto.randomUUID();
  const { sessionDate, weekStart } = sessionDates(offsetDays);
  await db.insert(sessionAssignments).values({
    id,
    athleteId,
    templateId,
    sessionDate,
    weekStart,
    createdBy: coachId,
  });
  return { id, dateISO: isoDate(offsetDays) };
}

/**
 * Crea coach + equipo + atleta + plantilla con inserciones directas.
 *
 * Se evita llamar a los servicios a propósito: `user.service` y
 * `athlete.service` importan las plantillas de email (`.tsx`), que el
 * transformador de Playwright no resuelve, y el alta de coach dispararía un
 * envío real a Resend. El setup de la suite no es lo que se prueba: los flujos
 * que sí se prueban (42.7-42.11) van enteros por la interfaz.
 *
 * No crea sesiones a propósito: cada test pide las suyas con `addSession`. Si el
 * fixture dejara una sesión en el mismo día que usa un test, el calendario
 * mostraría la primera y la assertion miraría a la otra.
 */
export async function createTrainingFixture(): Promise<{
  coach: Account;
  athlete: Account;
  teamId: string;
  templateId: string;
}> {
  const coachId = crypto.randomUUID();
  const athleteId = crypto.randomUUID();
  const teamId = crypto.randomUUID();
  const templateId = crypto.randomUUID();
  const coachPassword = `E2e${RUN}!`;
  const athletePassword = `E2e${RUN}!`;

  await db.insert(users).values([
    {
      id: coachId,
      name: `Coach ${RUN}`,
      email: `coach.${RUN}@runosorno.cl`,
      passwordHash: await hashPassword(coachPassword),
      role: "coach",
    },
    {
      id: athleteId,
      name: `Atleta ${RUN}`,
      email: `atleta.${RUN}@runosorno.cl`,
      passwordHash: await hashPassword(athletePassword),
      role: "athlete",
    },
  ]);
  await db.insert(teams).values({ id: teamId, name: `Team ${RUN}`, coachId });
  await db.insert(teamMembers).values({ teamId, athleteId });
  await db.insert(athleteProfiles).values({ userId: athleteId });
  await db.insert(templates).values({
    id: templateId,
    coachId,
    name: `Plantilla ${RUN}`,
    sessionType: "series",
    structure: [
      {
        id: "s1",
        order: 0,
        title: "Calentamiento",
        type: "warmup",
        content: "8 min de trote suave",
      },
      {
        id: "s2",
        order: 1,
        title: "Entrenamiento específico",
        type: "main",
        content: "6 x 400 m a ritmo de series",
      },
      {
        id: "s3",
        order: 2,
        title: "Enfriamiento",
        type: "cooldown",
        content: "10 min de trote suave",
      },
    ],
  });

  return {
    coach: {
      id: coachId,
      email: `coach.${RUN}@runosorno.cl`,
      password: coachPassword,
    },
    athlete: {
      id: athleteId,
      email: `atleta.${RUN}@runosorno.cl`,
      password: athletePassword,
    },
    teamId,
    templateId,
  };
}

/**
 * Borra todo lo creado por la ejecución: primero las filas dependientes y
 * después las principales, para no chocar con las claves foráneas.
 */
export async function cleanupRun(): Promise<void> {
  const createdUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `%${RUN}%`));
  const userIds = createdUsers.map((row) => row.id);

  const createdTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(like(teams.name, `%${RUN}%`));
  const teamIds = createdTeams.map((row) => row.id);

  const createdGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(like(groups.name, `%${RUN}%`));
  const groupIds = createdGroups.map((row) => row.id);

  const assignments = userIds.length
    ? await db
        .select({ id: sessionAssignments.id })
        .from(sessionAssignments)
        .where(inArray(sessionAssignments.athleteId, userIds))
    : [];

  if (assignments.length) {
    const ids = assignments.map((row) => row.id);
    await db
      .delete(sessionFeedback)
      .where(inArray(sessionFeedback.assignmentId, ids));
    await db
      .delete(sessionRecords)
      .where(inArray(sessionRecords.assignmentId, ids));
    await db.delete(notifications).where(inArray(notifications.entityId, ids));
    await db
      .delete(sessionAssignments)
      .where(inArray(sessionAssignments.id, ids));
  }

  if (userIds.length) {
    await db
      .delete(notifications)
      .where(inArray(notifications.userId, userIds));
  }
  if (teamIds.length) {
    await db.delete(teamMembers).where(inArray(teamMembers.teamId, teamIds));
  }
  if (userIds.length) {
    await db.delete(teamMembers).where(inArray(teamMembers.athleteId, userIds));
    await db
      .delete(athleteProfiles)
      .where(inArray(athleteProfiles.userId, userIds));
  }
  if (groupIds.length) {
    await db
      .delete(groupRequests)
      .where(inArray(groupRequests.groupId, groupIds));
    await db
      .delete(groupMembers)
      .where(inArray(groupMembers.groupId, groupIds));
  }
  if (userIds.length) {
    await db
      .delete(groupRequests)
      .where(inArray(groupRequests.coachId, userIds));
    await db.delete(groupMembers).where(inArray(groupMembers.userId, userIds));
  }

  await db.delete(templates).where(like(templates.name, `%${RUN}%`));
  if (teamIds.length) {
    await db.delete(teams).where(inArray(teams.id, teamIds));
  }
  if (groupIds.length) {
    await db.delete(groups).where(inArray(groups.id, groupIds));
  }
  if (userIds.length) {
    await db.delete(auditLogs).where(inArray(auditLogs.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
}

/** Espera a que un Server Action termine y el DOM refleje el resultado. */
export async function expectMessage(
  page: Page,
  testId: string,
  pattern: RegExp,
): Promise<void> {
  const node = page.getByTestId(testId);
  await expect(node).toBeVisible({ timeout: 20_000 });
  await expect(node).toHaveText(pattern);
}

export async function countRowsFor(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
  return rows.length;
}
