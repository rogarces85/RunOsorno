/**
 * Limpia los datos creados por db/seed-demo.ts, dejando la base exactamente
 * como estaba antes de correr el seed de demostracion.
 *
 * Solo elimina lo que el demo seed creo:
 *   - el grupo cuyo nombre termina en "(DEMO)"
 *   - los usuarios @demo.runosorno.cl, @runosorno.cl de demo y sus dependencias
 *   - las plantillas, equipos, asignaciones, registros, feedback y
 *     notificaciones asociados a esos usuarios
 *   - los audit logs generados por las verificaciones de anuncios
 *
 * NO toca usuarios, grupos, plantillas ni logs previos al seed.
 *
 * Requiere confirmacion con --yes para ejecutarse.
 *
 * Uso:  npx tsx db/seed-demo-clean.ts --yes
 */

import { and, eq, inArray, like, or } from "drizzle-orm";
import { db } from "../lib/db/index";
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
  sessions,
  teamMembers,
  teams,
  templates,
  users,
} from "../lib/db/schema";

const DEMO_GROUP_SUFFIX = "(DEMO)";

/** Patrones de email creados exclusivamente por el seed de demostracion. */
const DEMO_EMAIL_PATTERNS = [
  "%@demo.runosorno.cl",
  "coach.demo@runosorno.cl",
  "director.demo@runosorno.cl",
  "coach.pendiente@runosorno.cl",
];

/** Acciones de auditoria que solo genera el flujo de anuncios verificado. */
const DEMO_AUDIT_ACTIONS = ["announcement_sent"];

async function main() {
  const confirmed = process.argv.includes("--yes");
  if (!confirmed) {
    console.log(
      "Este script eliminara los datos de demostracion.\n" +
        "Revisalo y ejecutalo con:  npx tsx db/seed-demo-clean.ts --yes",
    );
    process.exit(0);
  }

  console.log("Limpiando datos de demostracion...\n");

  // --- Identificar el grupo DEMO -----------------------------------------
  const demoGroups = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(like(groups.name, `%${DEMO_GROUP_SUFFIX}`));

  if (demoGroups.length === 0) {
    console.log("No se encontro ningun grupo DEMO. Nada que limpiar.");
    process.exit(0);
  }
  const demoGroupIds = demoGroups.map((g) => g.id);
  console.log(`  grupo DEMO: ${demoGroups.map((g) => g.name).join(", ")}`);

  // --- Identificar usuarios demo -----------------------------------------
  const emailConditions = DEMO_EMAIL_PATTERNS.map((pattern) =>
    like(users.email, pattern),
  );
  const demoUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(or(...emailConditions));
  const demoUserIds = demoUsers.map((u) => u.id);
  console.log(`  usuarios demo: ${demoUsers.length}`);

  if (demoUserIds.length === 0) {
    console.log("No hay usuarios demo. Nada mas que limpiar.");
    process.exit(0);
  }

  // --- Templates creadas por coaches demo --------------------------------
  const demoTemplates = await db
    .select({ id: templates.id })
    .from(templates)
    .where(inArray(templates.coachId, demoUserIds));
  const demoTemplateIds = demoTemplates.map((t) => t.id);

  // --- Teams de coaches demo ---------------------------------------------
  const demoTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(inArray(teams.coachId, demoUserIds));
  const demoTeamIds = demoTeams.map((t) => t.id);

  // --- Asignaciones de atletas demo (por ANY de sus teams) ---------------
  const demoAssignments = await db
    .select({ id: sessionAssignments.id })
    .from(sessionAssignments)
    .where(inArray(sessionAssignments.athleteId, demoUserIds));
  const demoAssignmentIds = demoAssignments.map((a) => a.id);
  console.log(`  asignaciones demo: ${demoAssignmentIds.length}`);

  // --- Borrado en orden inverso a las FK --------------------------------
  if (demoAssignmentIds.length > 0) {
    await db
      .delete(sessionFeedback)
      .where(inArray(sessionFeedback.assignmentId, demoAssignmentIds));
    await db
      .delete(sessionRecords)
      .where(inArray(sessionRecords.assignmentId, demoAssignmentIds));
    await db
      .delete(sessionAssignments)
      .where(inArray(sessionAssignments.id, demoAssignmentIds));
    console.log(`  borradas asignaciones, registros y feedback`);
  }

  await db
    .delete(sessionFeedback)
    .where(inArray(sessionFeedback.authorId, demoUserIds));

  // Los registros de los atletas demo ya se borraron arriba via
  // demoAssignmentIds. Este caso solo cubre registros de asignaciones
  // creadas por coaches demo (sin atleta demo), por si el seed dejara
  // alguna combinacion mixta.
  const coachAssignments = await db
    .select({ id: sessionAssignments.id })
    .from(sessionAssignments)
    .where(inArray(sessionAssignments.createdBy, demoUserIds));
  if (coachAssignments.length > 0) {
    const ids = coachAssignments.map((a) => a.id);
    await db
      .delete(sessionFeedback)
      .where(inArray(sessionFeedback.assignmentId, ids));
    await db.delete(sessionRecords).where(inArray(sessionRecords.assignmentId, ids));
    await db.delete(sessionAssignments).where(inArray(sessionAssignments.id, ids));
  }

  await db.delete(notifications).where(inArray(notifications.userId, demoUserIds));
  console.log(`  borradas notificaciones`);

  await db
    .delete(auditLogs)
    .where(
      and(
        inArray(auditLogs.action, DEMO_AUDIT_ACTIONS),
        inArray(auditLogs.userId, demoUserIds),
      ),
    );
  console.log(`  borrados audit logs de anuncios`);

  await db.delete(athleteProfiles).where(inArray(athleteProfiles.userId, demoUserIds));
  await db
    .delete(teamMembers)
    .where(
      or(
        inArray(teamMembers.athleteId, demoUserIds),
        ...demoTeamIds.map((id) => eq(teamMembers.teamId, id)),
      ),
    );

  await db
    .delete(groupRequests)
    .where(inArray(groupRequests.coachId, demoUserIds));

  await db
    .delete(groupMembers)
    .where(
      or(
        inArray(groupMembers.userId, demoUserIds),
        ...demoGroupIds.map((id) => eq(groupMembers.groupId, id)),
      ),
    );

  await db.delete(sessions).where(inArray(sessions.userId, demoUserIds));

  if (demoTeamIds.length > 0) {
    await db.delete(teams).where(inArray(teams.id, demoTeamIds));
  }
  if (demoTemplateIds.length > 0) {
    await db.delete(templates).where(inArray(templates.id, demoTemplateIds));
  }
  console.log(`  borrados ${demoTeamIds.length} teams y ${demoTemplateIds.length} plantillas`);

  await db.delete(groups).where(inArray(groups.id, demoGroupIds));
  console.log(`  borrado el grupo DEMO`);

  await db.delete(users).where(inArray(users.id, demoUserIds));
  console.log(`  borrados ${demoUserIds.length} usuarios`);

  console.log("\nLimpieza completada.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
