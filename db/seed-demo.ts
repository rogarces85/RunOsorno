/**
 * Seed de datos de demostracion (para validar dashboards, menus por rol y
 * permisos de Director Tecnico con informacion real).
 *
 * Escenario creado:
 *   - 1 grupo con 2 coaches (uno es Director Tecnico) + 1 solicitud pendiente
 *   - 3 teams: 2 del coach principal, 1 del Director Tecnico
 *   - 5 atletas repartidos en los teams, cada uno con perfil fisiologico
 *   - 8 semanas de planificaciones con registros variados
 *     (completadas, parciales, no realizadas y futuras planificadas)
 *   - 1 atleta con sobrecarga (dispara alerta de RPE alto sostenido)
 *   - 1 atleta inactivo (dispara alerta de "sin registrar")
 *   - feedback del coach y notificaciones sin leer
 *
 * Es idempotente: si el grupo DEMO ya existe, no hace nada.
 *
 * Uso:  npm run db:seed:demo
 */

import { eq } from "drizzle-orm";
import { db } from "../lib/db/index";
import { hashPassword } from "../lib/security/hashing";
import {
  athleteProfiles,
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
  type TemplateSection,
} from "../lib/db/schema";

const DEMO_GROUP_NAME = "RunOsorno Demo (DEMO)";
const DEMO_PASSWORD = "Demo1234!";

/** PRNG determinista (mulberry32): el seed produce siempre los mismos datos. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makeRandom(20260313);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(items: readonly (T | null)[]): T | null {
  return items[Math.floor(rand() * items.length)];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- Utilidades de fecha (fechas locales, sin UTC) ------------------------

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** Lunes de la semana a la que pertenece la fecha. */
function weekStartOf(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday));
  return utc.toISOString().slice(0, 10);
}

function timestampFor(iso: string, hour: number): Date {
  return new Date(`${iso}T${String(hour).padStart(2, "0")}:15:00`);
}

/** Convierte un ISO (YYYY-MM-DD) a Date para columnas `date()` de MySQL. */
function toDateColumn(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

// --- Escenario ------------------------------------------------------------

type SessionKind = "long" | "quality" | "tempo" | "rest";

type AthleteSeed = {
  key: string;
  name: string;
  email: string;
  teamKey: string;
  birthDate: string;
  weightKg: number;
  heightCm: number;
  maxHr: number;
  restingHr: number;
  /** Volumen semanal base en km. */
  baseWeekKm: number;
  rpeRange: [number, number];
  /** Probabilidad de cumplir el plan (0-1). */
  adherence: number;
  /** Dias desde su ultimo registro. >7 dispara alerta de inactividad. */
  lastActiveOffsetDays: number;
  /** Marca los ultimos dias con RPE alto para disparar la alerta de sobrecarga. */
  overloadBlock?: boolean;
};

const ATHLETES: AthleteSeed[] = [
  {
    key: "maria",
    name: "María Fernández",
    email: "maria.fernandez@demo.runosorno.cl",
    teamKey: "elite",
    birthDate: "1991-03-14",
    weightKg: 58.5,
    heightCm: 168,
    maxHr: 188,
    restingHr: 48,
    baseWeekKm: 42,
    rpeRange: [5, 7],
    adherence: 0.95,
    lastActiveOffsetDays: 0,
  },
  {
    key: "carlos",
    name: "Carlos Muñoz",
    email: "carlos.munoz@demo.runosorno.cl",
    teamKey: "elite",
    birthDate: "1988-07-02",
    weightKg: 72.4,
    heightCm: 179,
    maxHr: 192,
    restingHr: 45,
    baseWeekKm: 38,
    rpeRange: [6, 8],
    adherence: 0.78,
    lastActiveOffsetDays: 1,
    // Bloque de sobrecarga al final: 3 dias seguidos con RPE alto.
    overloadBlock: true,
  },
  {
    key: "sofia",
    name: "Sofía Reyes",
    email: "sofia.reyes@demo.runosorno.cl",
    teamKey: "juvenil",
    birthDate: "1996-11-21",
    weightKg: 61.2,
    heightCm: 170,
    maxHr: 190,
    restingHr: 50,
    baseWeekKm: 35,
    rpeRange: [5, 7],
    adherence: 0.88,
    lastActiveOffsetDays: 0,
  },
  {
    key: "matias",
    name: "Matías González",
    email: "matias.gonzalez@demo.runosorno.cl",
    teamKey: "juvenil",
    birthDate: "1993-05-30",
    weightKg: 68.9,
    heightCm: 175,
    maxHr: 186,
    restingHr: 52,
    baseWeekKm: 28,
    rpeRange: [6, 9],
    adherence: 0.62,
    // >7 dias sin registrar -> alerta "no_logging"
    lastActiveOffsetDays: 12,
  },
  {
    key: "javier",
    name: "Javier Soto",
    email: "javier.soto@demo.runosorno.cl",
    teamKey: "base",
    birthDate: "1985-09-08",
    weightKg: 80.1,
    heightCm: 182,
    maxHr: 184,
    restingHr: 55,
    baseWeekKm: 25,
    rpeRange: [4, 6],
    adherence: 0.9,
    lastActiveOffsetDays: 0,
  },
];

/** Distribucion semanal tipo 3F + 1S + 1T + 2D (indice 0 = lunes). */
const WEEK_PLAN: { dayIndex: number; kind: SessionKind }[] = [
  { dayIndex: 0, kind: "long" },
  { dayIndex: 1, kind: "rest" },
  { dayIndex: 2, kind: "quality" },
  { dayIndex: 3, kind: "tempo" },
  { dayIndex: 4, kind: "rest" },
  { dayIndex: 5, kind: "quality" },
  { dayIndex: 6, kind: "long" },
];

/** Volumen relativo y ritmo aprox. por tipo de sesion. */
const KIND_PROFILE: Record<
  Exclude<SessionKind, "rest">,
  { factor: number; pace: number }
> = {
  long: { factor: 0.32, pace: 5.6 },
  quality: { factor: 0.2, pace: 4.2 },
  tempo: { factor: 0.16, pace: 4.9 },
};

const TEMPLATE_NAME_BY_KIND: Record<Exclude<SessionKind, "rest">, string> = {
  long: "Fondo largo",
  quality: "Series 6×800m",
  tempo: "Tempo 25 min",
};

const SESSION_TYPE_BY_KIND: Record<Exclude<SessionKind, "rest">, string> = {
  long: "fondos",
  quality: "series",
  tempo: "tempo",
};

function buildSections(
  kind: Exclude<SessionKind, "rest">,
  weekKm: number,
): { title: string; type: TemplateSection["type"]; content: string }[] {
  if (kind === "long") {
    const km = round1(weekKm * KIND_PROFILE.long.factor);
    return [
      {
        title: "Calentamiento",
        type: "warmup",
        content: "8 min de trote suave + movilidad articular.",
      },
      {
        title: "Fondo largo",
        type: "main",
        content: `${km} km a ritmo cómodo (conversacional). Hidratación y control de ritmo en cuestas.`,
      },
      {
        title: "Enfriamiento",
        type: "cooldown",
        content: "10 min de trote muy suave + estiramientos largos.",
      },
    ];
  }

  if (kind === "quality") {
    return [
      {
        title: "Calentamiento",
        type: "warmup",
        content: "12 min de trote suave + 4 progresivos de 40 m.",
      },
      {
        title: "Series 6×800m",
        type: "main",
        content:
          "6×800 m a ritmo de 5K con 2 min de recuperación entre repeticiones.",
      },
      {
        title: "Enfriamiento",
        type: "cooldown",
        content: "10 min de trote suave + estiramientos.",
      },
    ];
  }

  return [
    {
      title: "Calentamiento",
      type: "warmup",
      content: "10 min de trote suave + 3×1 min progresivo.",
    },
    {
      title: "Tempo",
      type: "main",
      content: "25 min a ritmo de umbral (esfuerzo 7/10, sostenible).",
    },
    {
      title: "Enfriamiento",
      type: "cooldown",
      content: "10 min de trote suave + estiramientos.",
    },
  ];
}

export async function main() {
  const already = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.name, DEMO_GROUP_NAME))
    .limit(1);
  if (already.length > 0) {
    console.log("El seed DEMO ya existe, se omite.");
    return;
  }

  console.log("Generando datos de demostracion...");
  const today = toISODate(new Date());
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // --- Grupo -------------------------------------------------------------
  const groupId = crypto.randomUUID();
  await db.insert(groups).values({
    id: groupId,
    name: DEMO_GROUP_NAME,
    description:
      "Grupo de demostracion con coaches, equipos y atletas para validar dashboards, metricas y permisos.",
  });
  console.log(`  grupo: ${DEMO_GROUP_NAME}`);

  // --- Coaches -----------------------------------------------------------
  const coachMainId = crypto.randomUUID();
  const directorId = crypto.randomUUID();
  const coachPendingId = crypto.randomUUID();

  await db.insert(users).values([
    {
      id: coachMainId,
      name: "Coach Demo Principal",
      email: "coach.demo@runosorno.cl",
      passwordHash,
      role: "coach",
      mustChangePassword: false,
    },
    {
      id: directorId,
      name: "Coach Demo Director",
      email: "director.demo@runosorno.cl",
      passwordHash,
      role: "coach",
      mustChangePassword: false,
    },
    {
      id: coachPendingId,
      name: "Coach Demo Pendiente",
      email: "coach.pendiente@runosorno.cl",
      passwordHash,
      role: "coach",
      mustChangePassword: false,
    },
  ]);

  await db.insert(groupMembers).values([
    { groupId, userId: coachMainId, isDirector: false },
    { groupId, userId: directorId, isDirector: true },
  ]);
  console.log(
    "  coaches: 2 en el grupo (1 Director Tecnico) + 1 con solicitud pendiente",
  );

  await db.insert(groupRequests).values({
    id: crypto.randomUUID(),
    groupId,
    coachId: coachPendingId,
    status: "pending",
  });

  // --- Teams -------------------------------------------------------------
  const teamByKey: Record<string, { id: string; coachId: string }> = {};
  const teamSeeds = [
    { key: "elite", name: "Team Elite", coachId: coachMainId },
    { key: "juvenil", name: "Team Juvenil", coachId: coachMainId },
    { key: "base", name: "Team Base", coachId: directorId },
  ];
  for (const team of teamSeeds) {
    const id = crypto.randomUUID();
    teamByKey[team.key] = { id, coachId: team.coachId };
    await db.insert(teams).values({
      id,
      name: team.name,
      coachId: team.coachId,
    });
  }
  console.log(`  teams: ${teamSeeds.map((t) => t.name).join(", ")}`);

  // --- Atletas -----------------------------------------------------------
  const athleteIdByKey: Record<string, string> = {};

  for (const athlete of ATHLETES) {
    const id = crypto.randomUUID();
    athleteIdByKey[athlete.key] = id;

    await db.insert(users).values({
      id,
      name: athlete.name,
      email: athlete.email,
      passwordHash,
      role: "athlete",
      mustChangePassword: false,
    });

    await db.insert(athleteProfiles).values({
      userId: id,
      birthDate: new Date(`${athlete.birthDate}T00:00:00`),
      weightKg: athlete.weightKg.toString(),
      heightCm: athlete.heightCm.toString(),
      maxHr: athlete.maxHr,
      restingHr: athlete.restingHr,
    });

    await db.insert(teamMembers).values({
      teamId: teamByKey[athlete.teamKey].id,
      athleteId: id,
    });
  }
  console.log(`  atletas: ${ATHLETES.map((a) => a.name).join(", ")}`);

  // --- Plantillas por cada coach de team --------------------------------
  const templateIdByCoachAndKind = new Map<string, string>();
  for (const team of teamSeeds) {
    const reference = ATHLETES.find((a) => a.teamKey === team.key)!;
    for (const kind of ["long", "quality", "tempo"] as const) {
      const id = crypto.randomUUID();
      templateIdByCoachAndKind.set(`${team.coachId}:${kind}`, id);
      await db.insert(templates).values({
        id,
        coachId: team.coachId,
        groupId: null,
        name: TEMPLATE_NAME_BY_KIND[kind],
        sessionType: SESSION_TYPE_BY_KIND[kind],
        isOfficial: false,
        isShared: false,
        structure: buildSections(kind, reference.baseWeekKm).map(
          (section, index) => ({
            id: crypto.randomUUID(),
            order: index,
            ...section,
          }),
        ),
      });
    }
  }
  console.log(`  plantillas propias: ${teamSeeds.length * 3} (fondo, series, tempo)`);

  // --- Planificaciones y registros (8 semanas) ---------------------------
  const WEEKS_BACK = 8;
  const recentAssignments: { id: string; date: string }[] = [];
  let completed = 0;
  let partial = 0;
  let notDone = 0;

  for (const athlete of ATHLETES) {
    const athleteId = athleteIdByKey[athlete.key];
    const coachId = teamByKey[athlete.teamKey].coachId;
    const lastActiveDate = shiftDays(today, -athlete.lastActiveOffsetDays);

    for (let w = WEEKS_BACK - 1; w >= 0; w -= 1) {
      const weekStart = shiftDays(weekStartOf(today), -7 * w);

      for (const slot of WEEK_PLAN) {
        const sessionDate = shiftDays(weekStart, slot.dayIndex);
        const assignmentId = crypto.randomUUID();

        let status:
          | "planned"
          | "in_progress"
          | "completed"
          | "partial"
          | "not_done";

        if (sessionDate > today) {
          status = "planned";
        } else if (sessionDate === today) {
          status = "in_progress";
        } else if (sessionDate > lastActiveDate) {
          status = "planned";
        } else if (rand() < athlete.adherence) {
          status = "completed";
        } else if (rand() < 0.6) {
          status = "partial";
        } else {
          status = "not_done";
        }

        // Los dias de descanso se planifican igual (usando la plantilla de
        // fondo como marcador) para que el calendario muestre descanso.
        const restTemplateId = templateIdByCoachAndKind.get(
          `${coachId}:long`,
        )!;
        const resolvedTemplateId =
          slot.kind === "rest"
            ? restTemplateId
            : templateIdByCoachAndKind.get(`${coachId}:${slot.kind}`)!;

        // El coach propietario del team es quien planifica.
        await db.insert(sessionAssignments).values({
          id: assignmentId,
          athleteId,
          templateId: resolvedTemplateId,
          sessionDate: toDateColumn(sessionDate),
          weekStart: toDateColumn(weekStart),
          status,
          createdBy: coachId,
        });

        if (
          status === "completed" ||
          status === "partial" ||
          status === "not_done"
        ) {
          const isOverloadDay =
            athlete.overloadBlock === true &&
            sessionDate > shiftDays(today, -3) &&
            sessionDate <= lastActiveDate;

          const kind = slot.kind === "rest" ? "tempo" : slot.kind;
          const profile = KIND_PROFILE[kind];
          const targetKm =
            round1(athlete.baseWeekKm * profile.factor) || 6;

          let distanceKm: string | null = null;
          let durationMinutes: number | null = null;
          let rpe: number | null = null;
          let comments: string | null = null;
          let notDoneReason: string | null = null;

          if (status === "not_done") {
            notDone += 1;
            notDoneReason = pick([
              "lesion",
              "trabajo",
              "enfermedad",
              "personal",
            ]);
          } else if (status === "completed") {
            completed += 1;
            const km = round2(targetKm * (0.92 + rand() * 0.18));
            distanceKm = km.toString();
            durationMinutes = Math.round(km * profile.pace);
            rpe = isOverloadDay
              ? randInt(8, 9)
              : randInt(athlete.rpeRange[0], athlete.rpeRange[1]);
            comments = pick([
              "Buena sesion, las piernas responden bien.",
              "Ritmo estable todo el recorrido.",
              "Me costo el ultimo tramo pero aguante.",
              null,
            ]);
          } else {
            partial += 1;
            const km = round2(targetKm * (0.55 + rand() * 0.25));
            distanceKm = km.toString();
            durationMinutes = Math.round(km * profile.pace);
            rpe = isOverloadDay ? 9 : randInt(athlete.rpeRange[0], athlete.rpeRange[1] + 1);
            comments = "Corte la sesion antes de tiempo por trabajo.";
          }

          await db.insert(sessionRecords).values({
            id: crypto.randomUUID(),
            assignmentId,
            distanceKm,
            durationMinutes,
            rpe,
            comments,
            notDoneReason,
            customReason: null,
            recordedAt: timestampFor(sessionDate, randInt(7, 21)),
          });

          recentAssignments.push({ id: assignmentId, date: sessionDate });
        }
      }
    }
  }

  console.log(
    `  registros: ${completed} completadas, ${partial} parciales, ${notDone} no realizadas`,
  );

  // --- Feedback del coach -------------------------------------------------
  const feedbackTargets = recentAssignments.filter(
    (a) => a.date <= today && a.date >= shiftDays(today, -21),
  );
  let feedbackCount = 0;
  for (const target of feedbackTargets) {
    if (feedbackCount >= 12) {
      break;
    }
    await db.insert(sessionFeedback).values({
      id: crypto.randomUUID(),
      assignmentId: target.id,
      authorId: rand() < 0.7 ? coachMainId : directorId,
      message: pick([
        "Buen trabajo esta semana, mantén el ritmo.",
        "Noto una mejora clara en las series, sigue así.",
        "Recuerda calentar bien antes de los fondos.",
        "La carga va bien, no la subas de golpe.",
        "Excelente constancia, tus numeros lo muestran.",
      ])!,
      createdAt: timestampFor(target.date, 21),
    });
    feedbackCount += 1;
  }
  console.log(`  feedback: ${feedbackCount} mensajes`);

  // --- Notificaciones -----------------------------------------------------
  await db.insert(notifications).values([
    {
      id: crypto.randomUUID(),
      userId: coachMainId,
      type: "session_completed",
      title: "Sesiones completadas",
      message:
        "María Fernández y Sofía Reyes completaron sus sesiones de esta semana.",
    },
    {
      id: crypto.randomUUID(),
      userId: coachMainId,
      type: "alert",
      title: "Atleta sin registrar",
      message: "Matías González lleva 12 días sin registrar sesiones.",
    },
    {
      id: crypto.randomUUID(),
      userId: directorId,
      type: "announcement",
      title: "Bienvenido al grupo",
      message: "Te has unido como Director Técnico a RunOsorno Demo.",
    },
  ]);
  console.log("  notificaciones: 3 sin leer");

  console.log("\nSeed DEMO completado.");
  console.log(`\nCredenciales (contrasena: ${DEMO_PASSWORD})`);
  console.log("  Admin             admin@runosorno.cl");
  console.log("  Coach principal   coach.demo@runosorno.cl");
  console.log("  Director Tecnico  director.demo@runosorno.cl");
  console.log("  Atleta            maria.fernandez@demo.runosorno.cl");
}

/**
 * Solo arranca si este archivo es el punto de entrada (`npm run db:seed:demo`).
 *
 * Importado desde un Worker —para sembrar la base de producción a través del
 * binding de Hyperdrive— no debe ejecutarse solo.
 */
const esEjecucionDirecta =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("db/seed-demo.ts");

if (esEjecucionDirecta) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
