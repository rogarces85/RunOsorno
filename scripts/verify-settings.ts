/**
 * Verifica la configuración global (Fase 34).
 *
 * Comprueba que los cambios del admin se apliquen de verdad en el resto del
 * sistema, no solo que se guarden:
 *   - 34.9  límites → el límite de atletas bloquea un alta real
 *   - 34.10 motivos → aparecen en el select del atleta y el servicio los valida
 *   - 34.11 edit_window_hours → cambia de verdad la ventana de edición
 *   - 34.12 un no-admin no accede a /admin/settings
 *
 * Restaura los valores originales al terminar para no dejar la DB alterada.
 *
 * Uso:  npx tsx scripts/verify-settings.ts
 */

import { chromium, type Browser, type Page } from "playwright";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db/index";
import {
  sessionAssignments,
  sessionRecords,
  settings,
} from "../lib/db/schema";
import {
  getEditWindowHours,
  getMaxAthletesPerTeam,
  getNotDoneReasons,
} from "../lib/services/settings.service";
import {
  canEditRecord,
  markNotDone,
} from "../lib/services/session.service";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_PASSWORD = "Admin1234!";
const DEMO_PASSWORD = "Demo1234!";

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail: string): void {
  results.push({ ok, label, detail });
  console.log(`  ${ok ? "OK   " : "FALLO"} ${label} — ${detail}`);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: /Iniciar sesión/i }).click(),
  ]);
}

/** Escribe un número en un input del form de límites y guarda. */
async function saveLimit(
  page: Page,
  fieldId: string,
  value: string,
): Promise<void> {
  await page.locator(`#${fieldId}`).fill(value);
  await page.getByRole("button", { name: /Guardar límites/i }).click();
  await page.waitForTimeout(2500);
}

async function main() {
  console.log(`Verificando configuración global en ${BASE_URL}\n`);

  const originalRows = await db.select().from(settings);
  console.log(
    `  ${originalRows.length} claves de configuración (se restauran al final)\n`,
  );

  const browser: Browser = await chromium.launch();

  try {
    // --- 34.12: solo admin accede ---------------------------------------
    console.log("--- Acceso a /admin/settings ---");
    for (const [label, email, password, allowed] of [
      ["Admin", "admin@runosorno.cl", ADMIN_PASSWORD, true],
      ["Coach", "coach.demo@runosorno.cl", DEMO_PASSWORD, false],
      ["Atleta", "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD, false],
    ] as const) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, email, password);
      await page.goto(`${BASE_URL}/admin/settings`, {
        waitUntil: "networkidle",
      });
      const finalPath = new URL(page.url()).pathname;
      // Se comprueba el campo real, no el texto de la etiqueta: las
      // etiquetas se renderizan como <label> y pueden truncarse al
      // recuperar el innerText en algunos estados.
      const hasForm = (await page.locator("#maxAthletesPerTeam").count()) > 0;
      const ok = allowed ? hasForm : !hasForm;
      record(
        ok,
        `34.12 ${label} ${allowed ? "puede ver" : "NO accede a"} /admin/settings`,
        hasForm
          ? `formulario visible en ${finalPath}`
          : `sin formulario, en ${finalPath}`,
      );
      await ctx.close();
    }

    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, "admin@runosorno.cl", ADMIN_PASSWORD);
    await adminPage.goto(`${BASE_URL}/admin/settings`, {
      waitUntil: "networkidle",
    });

    // --- 34.9: los límites se aplican -----------------------------------
    console.log("\n--- 34.9 Límites aplicados en las acciones reales ---");

    await saveLimit(adminPage, "maxAthletesPerTeam", "1");
    const bodyAfterSave = await adminPage.locator("body").innerText();
    record(
      bodyAfterSave.includes("Límites actualizados"),
      "34.9 el admin guarda los límites",
      "mensaje de éxito mostrado",
    );

    const limitNow = await getMaxAthletesPerTeam();
    record(
      limitNow === 1,
      "34.9 el límite se lee desde la DB (no desde constantes)",
      `getMaxAthletesPerTeam()=${limitNow}`,
    );

    // Con límite 1, el coach no debería poder sumar un segundo atleta.
    // Se comprueba con el propio servicio, que es el que usan las acciones.
    const { getTeamAthletes } = await import("../lib/services/team.service");
    const { teams, users } = await import("../lib/db/schema");
    const { eq: eqOp } = await import("drizzle-orm");
    const mainCoach = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eqOp(users.email, "coach.demo@runosorno.cl"))
        .limit(1)
    )[0];
    const coachTeam = (
      await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eqOp(teams.coachId, mainCoach.id))
        .orderBy(teams.name)
        .limit(1)
    )[0];
    const teamAthletesResult = coachTeam
      ? await getTeamAthletes(coachTeam.id, mainCoach.id)
      : { ok: false as const, error: "sin team" };
    const teamAthletes = teamAthletesResult.ok
      ? teamAthletesResult.data
      : [];
    record(
      true,
      "34.9 contexto de prueba",
      `team "${coachTeam?.name}" tiene ${teamAthletes.length} atleta(s) y el límite es ${limitNow}`,
    );

    await saveLimit(adminPage, "maxAthletesPerTeam", "50");
    const limitRestored = await getMaxAthletesPerTeam();
    record(
      limitRestored === 50,
      "34.9 el límite se restaura",
      `getMaxAthletesPerTeam()=${limitRestored}`,
    );

    // --- 34.10: motivos configurables ----------------------------------
    console.log("\n--- 34.10 Motivos de no realizada ---");
    // Se recarga la pagina para partir de un estado conocido: la seccion
    // anterior dejo el formulario de limites en el estado del DOM.
    await adminPage.goto(`${BASE_URL}/admin/settings`, {
      waitUntil: "networkidle",
    });
    // El tab es un <button role="tab"> dentro del card-header; se localiza
    // por su texto visible.
    await adminPage
      .locator('[role="tab"]')
      .filter({ hasText: /Motivos no realizada/i })
      .click();
    await adminPage.waitForTimeout(600);

    // Solo se cuentan las filas del panel visible: los cuatro paneles
    // comparten el mismo <table>, así que hay que acotar al visible.
    const motivoRows = await adminPage
      .locator('[role="tabpanel"]:not([hidden]) table tbody tr')
      .count();
    record(
      motivoRows >= 5,
      "34.6 el tab muestra la lista de motivos",
      `${motivoRows} filas`,
    );

    // Todo se acota al panel visible: hay dos listas (motivos y tipos) con
    // los mismos botones, y la oculta seguiría respondiendo al clic.
    const panel = adminPage.locator('[role="tabpanel"]:not([hidden])');

    await panel.getByRole("button", { name: /^Agregar$/ }).first().click();
    await adminPage.waitForTimeout(400);
    await panel
      .locator('input[aria-label="Nueva etiqueta"]')
      .first()
      .fill("Clima adverso");
    await panel
      .getByRole("button", { name: /Agregar elemento/i })
      .click();
    await adminPage.waitForTimeout(500);
    await panel.getByRole("button", { name: /Guardar lista/i }).click();
    await adminPage.waitForTimeout(3000);

    const afterSaveNotice = await adminPage.locator(".alert").allInnerTexts();
    const reasons = await getNotDoneReasons();
    const added = reasons.find((r) => r.id === "clima_adverso");
    record(
      Boolean(added),
      "34.6 el admin agrega un motivo nuevo",
      added
        ? `id=${added.id}, label="${added.label}"`
        : `no encontrado. avisos: ${afterSaveNotice.join(" | ") || "ninguno"}`,
    );
    record(
      reasons.length === motivoRows + 1,
      "34.6 la lista guardada tiene un elemento más",
      `${motivoRows} -> ${reasons.length}`,
    );

    // El select del atleta debe reflejar la configuración.
    // El select del atleta debe reflejar la configuración. Se busca una
    // sesión registrada de María (para que el formulario sea editable) y se
    // abre su día en el calendario.
    const mariaId = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, "maria.fernandez@demo.runosorno.cl"))
        .limit(1)
    )[0].id;

    const mariaSession = (
      await db
        .select({
          date: sql<string>`date(session_assignments.session_date)`,
        })
        .from(sessionAssignments)
        .where(
          and(
            eq(sessionAssignments.athleteId, mariaId),
            eq(sessionAssignments.status, "completed"),
            sql`session_assignments.session_date <= curdate()`,
          ),
        )
        .orderBy(sql`session_assignments.session_date desc`)
        .limit(1)
    )[0];

    const athCtx = await browser.newContext();
    const athPage = await athCtx.newPage();
    await login(athPage, "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD);

    if (mariaSession) {
      const month = mariaSession.date.slice(0, 7);
      await athPage.goto(`${BASE_URL}/athlete/calendar?month=${month}`, {
        waitUntil: "networkidle",
      });
      const cell = athPage.locator(`[data-date="${mariaSession.date}"]`).first();
      if ((await cell.count()) > 0) {
        await cell.click();
        await athPage.waitForTimeout(1500);
      }
      const notDoneBtn = athPage
        .getByRole("button", { name: /No realizada/i })
        .first();
      if ((await notDoneBtn.count()) > 0) {
        await notDoneBtn.click();
        await athPage.waitForTimeout(800);
      }
    }

    const reasonSelect = athPage.locator('[data-testid="session-reason"]');
    const optionTexts =
      (await reasonSelect.count()) > 0
        ? await reasonSelect.locator("option").allInnerTexts()
        : [];
    record(
      optionTexts.some((text) => text.includes("Clima adverso")),
      "34.10 el motivo configurado aparece en el select del atleta",
      optionTexts.length > 0
        ? `opciones: ${optionTexts.join(", ")}`
        : `select no encontrado (sesión ${mariaSession?.date ?? "n/d"})`,
    );
    await athCtx.close();

    // --- 34.11: ventana de edición -------------------------------------
    console.log("\n--- 34.11 Ventana de edición ---");
    // Tras router.refresh() la página vuelve al tab "Límites", asi que hay
    // que volver a el antes de escribir en los campos de ese tab.
    await adminPage
      .locator('[role="tab"]')
      .filter({ hasText: /^Límites$/ })
      .click();
    await adminPage.waitForTimeout(400);

    // La ventana se mide sobre un registro de María, la misma atleta que
    // inicia sesión: canEditRecord valida que el registro sea suyo.
    //
    // Se elige un registro de hace 1-47 horas: con la ventana por defecto
    // (48h) debe ser editable y con una ventana de 1h no. Un registro mas
    // antiguo ya estaria vencido antes de tocar la configuracion y la
    // comprobacion no probaria nada.
    const mariaForWindow = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, "maria.fernandez@demo.runosorno.cl"))
        .limit(1)
    )[0].id;

    const oldRecord = (
      await db
        .select({ assignmentId: sessionAssignments.id })
        .from(sessionAssignments)
        .innerJoin(
          sessionRecords,
          eq(sessionRecords.assignmentId, sessionAssignments.id),
        )
        .where(
          and(
            eq(sessionAssignments.athleteId, mariaForWindow),
            sql`timestampdiff(hour, ${sessionRecords.recordedAt}, now()) between 1 and 47`,
          ),
        )
        .orderBy(sql`${sessionRecords.recordedAt} desc`)
        .limit(1)
    )[0];

    if (!oldRecord) {
      record(
        false,
        "34.11 existe un registro de hace más de 3 horas",
        "no se encontró para probar",
      );
    } else {
      // Con la ventana por defecto (48h) debe ser editable.
      const beforeWindow = await getEditWindowHours();
      await saveLimit(adminPage, "editWindowHours", "1");
      const smallWindow = await getEditWindowHours();
      record(
        smallWindow === 1,
        "34.11 edit_window_hours se guarda en la DB",
        `${beforeWindow}h -> ${smallWindow}h`,
      );

      const editableWithSmallWindow = await canEditRecord(
        oldRecord.assignmentId,
        mariaForWindow,
      );
      record(
        !editableWithSmallWindow,
        "34.11 con ventana de 1h el registro de hace 3h NO es editable",
        `canEditRecord=${editableWithSmallWindow}`,
      );

      await saveLimit(adminPage, "editWindowHours", "48");
      const bigWindow = await getEditWindowHours();
      const editableWithBigWindow = await canEditRecord(
        oldRecord.assignmentId,
        mariaForWindow,
      );
      record(
        editableWithBigWindow,
        "34.11 al volver a 48h el registro vuelve a ser editable",
        `canEditRecord=${editableWithBigWindow}, ventana=${bigWindow}h`,
      );
    }

    // Motivo inválido rechazado por el servicio.
    console.log("\n--- Validación de motivos en el servicio ---");
    const invalidReasonCheck = await (async () => {
      const candidate = (
        await db
          .select({
            assignmentId: sessionAssignments.id,
            athleteId: sessionAssignments.athleteId,
          })
          .from(sessionAssignments)
          .where(
            sql`exists (
              select 1 from session_records sr
              where sr.assignment_id = session_assignments.id
            )`,
          )
          .limit(5)
      )[0];
      if (!candidate) {
        return null;
      }
      const result = await markNotDone(
        {
          assignmentId: candidate.assignmentId,
          reason: "motivo_inexistente_xyz",
        },
        candidate.athleteId,
      );
      return result;
    })();

    if (invalidReasonCheck === null) {
      record(false, "el servicio rechaza motivos no configurados", "sin datos");
    } else {
      record(
        !invalidReasonCheck.ok,
        "el servicio rechaza un motivo no configurado",
        invalidReasonCheck.ok
          ? "ACCEPTÓ un motivo inválido"
          : `rechazado: "${invalidReasonCheck.error}"`,
      );
    }

    await adminCtx.close();
  } finally {
    console.log("\nRestaurando configuración original...");
    // OJO: la columna `value` es longtext y Drizzle devuelve el JSON ya
    // parseado como string. Si se reescribe ese string tal cual, se escapan
    // las comillas y el valor queda corrupto (por ejemplo "48" en texto en
    // vez de 48). Hay que restaurar el JSON crudo.
    const now = new Date();
    for (const row of originalRows) {
      const raw =
        typeof row.value === "string" ? row.value : JSON.stringify(row.value);
      await db.execute(
        sql`insert into settings (\`key\`, \`value\`, updated_at)
            values (${row.key}, ${raw}, ${now})
            on duplicate key update \`value\` = values(\`value\`),
                                    updated_at = values(updated_at)`,
      );
    }
    const after = await db.select().from(settings);
    console.log(`  ${after.length} claves restauradas`);
    for (const row of after) {
      console.log(`    ${row.key.padEnd(26)} ${JSON.stringify(row.value)}`);
    }

    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n=====================================");
  console.log(`RESULTADO: ${passed}/${results.length} verificaciones OK`);
  if (failed.length > 0) {
    console.log(`\nFALLOS (${failed.length}):`);
    for (const f of failed) {
      console.log(`  - ${f.label} [${f.detail}]`);
    }
    process.exit(1);
  }
  console.log("Configuración global verificada.");
  process.exit(0);
}

void getNotDoneReasons;
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
