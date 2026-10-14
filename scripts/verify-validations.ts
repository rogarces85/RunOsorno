/**
 * Verifica la Fase 40 (validaciones y manejo de errores).
 *
 * 40.1 y 40.2 no se comprueban "a ojo": se audita el código. Cada Server
 * Action exportada tiene que pasar por `runAction` (que dentro ya hace
 * `requireAuth` + `safeParse`) o declarar su propio `requireAuth`/`requireRole`
 * y `safeParse`. El script recorre `lib/actions/*.ts` y falla si encuentra una
 * acción sin ninguna de las dos cosas, de modo que un action nuevo sin
 * validación se note en la revisión.
 *
 * El resto se comprueba contra la app real con Playwright y los datos de
 * `npm run db:seed:demo`, manipcando la configuración (`settings`) y
 * restaurándola al terminar. Dos tareas se resuelven por servicio y no por
 * interfaz, y el script lo dice: el error al que apuntan solo se alcanza con
 * una petición falsificada, que es justo lo que el servicio debe impedir.
 *
 * Requiere el servidor de desarrollo corriendo (`npm run dev`).
 *
 * Uso:  npx tsx scripts/verify-validations.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { chromium, type Browser, type Page } from "playwright";
import { db } from "../lib/db/index";
import { groups, sessions, teamMembers, teams, users } from "../lib/db/schema";
import { requestJoin } from "../lib/services/group.service";
import { copyPreviousWeek } from "../lib/services/plan.service";
import { getNumberSetting, setSetting } from "../lib/services/settings.service";
import {
  notDoneSchema,
  recordSessionSchema,
} from "../lib/validations/session.schemas";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN = { email: "admin@runosorno.cl", password: "Admin1234!" };
const COACH = { email: "coach.demo@runosorno.cl", password: "Demo1234!" };
const PENDING_COACH = {
  email: "coach.pendiente@runosorno.cl",
  password: "Demo1234!",
};
const ATHLETE = {
  email: "maria.fernandez@demo.runosorno.cl",
  password: "Demo1234!",
};

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail = ""): void {
  results.push({ ok, label, detail });
  console.log(
    `  ${ok ? "OK   " : "FALLO"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
}

async function login(page: Page, user: { email: string; password: string }) {
  await page.context().clearCookies();
  // `networkidle` y no `domcontentloaded`: si se hace clic antes de que
  // React hidrate, el `<form>` hace un GET nativo y manda la contraseña en la
  // URL en vez de llamar al Server Action.
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    "() => { const b = document.querySelector('button[type=submit]'); return !!b && !b.disabled; }",
  );
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    }),
    page.click('button[type="submit"]'),
  ]);
}

async function goto(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
}

/** Cierra el panel de detalle de sesión si está abierto (bloquea los clics). */
async function closePanel(page: Page): Promise<void> {
  const close = page
    .locator('.modal [aria-label="Cerrar"], .modal .btn-close')
    .first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Texto del primer Alert/mensaje de error visible, o "" si no aparece.
 * Espera a que aparezca: los Server Actions tardan un par de segundos.
 */
async function errorText(page: Page, selector: string): Promise<string> {
  const node = page.locator(selector).first();
  const visible = await node
    .waitFor({ state: "visible", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  return visible ? (await node.innerText()).trim() : "";
}

/** Restaura un valor de `settings` aunque el script falle a mitad. */
const restoreSetting = async (key: string, fallback: number) => {
  await setSetting(key, fallback);
};

// --- 40.1 / 40.2: auditoría estática de las Server Actions ----------------

type ActionAudit = {
  total: number;
  viaRunAction: number;
  manual: number;
  offenders: string[];
};

/**
 * Extrae el cuerpo de cada `export async function` de un archivo de acciones.
 * No es un parser de AST: el patrón `export async function` al comienzo de una
 * línea es estable en este proyecto y suficiente para la auditoría.
 */
function extractActions(
  file: string,
  source: string,
): { name: string; body: string }[] {
  const lines = source.split("\n");
  const actions: { name: string; body: string }[] = [];
  let current: { name: string; body: string[] } | null = null;

  // El cuerpo se toma hasta el siguiente `export`. Contar llaves no sirve: las
  // firmas multilínea y los tipos genéricos (`ActionResult<{ id: string }>`)
  // abren y cierran llaves sin que ninguna abra el cuerpo de la función.
  const flush = () => {
    if (current) {
      actions.push({ name: current.name, body: current.body.join("\n") });
      current = null;
    }
  };

  for (const line of lines) {
    const match = /^export\s+async\s+function\s+(\w+)/.exec(line);
    if (match) {
      flush();
      current = { name: match[1], body: [line] };
      continue;
    }
    if (!current) {
      continue;
    }
    if (/^export\s/.test(line)) {
      flush();
      continue;
    }
    current.body.push(line);
  }
  flush();
  void file;
  return actions;
}

function auditActions(): ActionAudit {
  const dir = join(process.cwd(), "lib", "actions");
  // `base.ts` es el helper, no una acción. `auth.actions.ts`.login no puede
  // exigir sesión (es la que la crea) y `logout` solo destruye la propia.
  const skip = new Set(["base.ts", "auth.actions.ts", ".gitkeep"]);

  const audit: ActionAudit = {
    total: 0,
    viaRunAction: 0,
    manual: 0,
    offenders: [],
  };

  for (const file of readdirSync(dir)) {
    if (skip.has(file)) continue;
    const source = readFileSync(join(dir, file), "utf8");
    for (const action of extractActions(file, source)) {
      audit.total += 1;
      if (action.body.includes("runAction(")) {
        audit.viaRunAction += 1;
        continue;
      }
      const hasAuth =
        action.body.includes("requireAuth(") ||
        action.body.includes("requireRole(");
      const hasValidation =
        action.body.includes("safeParse(") || action.body.includes(".parse(");
      if (hasAuth && hasValidation) {
        audit.manual += 1;
      } else {
        audit.offenders.push(
          `${file}:${action.name} (sesión=${hasAuth ? "sí" : "no"}, validación=${hasValidation ? "sí" : "no"})`,
        );
      }
    }
  }
  return audit;
}

async function main() {
  console.log(`Verificando validaciones y manejo de errores en ${BASE_URL}\n`);

  // --------------------------------------------------------- 40.1 / 40.2 --
  console.log("--- 40.1 / 40.2 Auditoría de las Server Actions ---");
  const audit = auditActions();
  record(
    audit.offenders.length === 0,
    "40.1 toda Server Action valida su entrada con Zod",
    `${audit.total} acciones: ${audit.viaRunAction} por runAction, ${audit.manual} con requireAuth + safeParse`,
  );
  record(
    audit.offenders.length === 0 && audit.total >= 40,
    "40.2 toda Server Action verifica sesión y permisos",
    audit.offenders.length === 0
      ? "ninguna acción sin sesión ni validación"
      : audit.offenders.join(" | "),
  );

  // El helper es la piedra angular: si `runAction` dejara de validar, las 40+
  // acciones que lo usan pasarían a hacerlo todo.
  const base = readFileSync(
    join(process.cwd(), "lib", "actions", "base.ts"),
    "utf8",
  );
  const runActionBody = extractActions("base.ts", base).find(
    (a) => a.name === "runAction",
  );
  record(
    !!runActionBody &&
      runActionBody.body.includes("requireAuth(") &&
      runActionBody.body.includes("safeParse("),
    "40.1 runAction exige sesión y parsea el esquema",
    runActionBody
      ? "requireAuth + safeParse presentes en el helper"
      : "no se encontró runAction en base.ts",
  );

  const userId = async (email: string) =>
    (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
    )[0]?.id;

  const coachId = await userId(COACH.email);
  const pendingCoachId = await userId(PENDING_COACH.email);
  const athleteId = await userId(ATHLETE.email);
  const teamId = (
    await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.coachId, coachId!))
  )[0]?.id;
  // El calendario del coach es por team y atleta: hace falta uno de su equipo.
  const groupId = (await db.select({ id: groups.id }).from(groups).limit(1))[0]
    ?.id;

  if (!coachId || !pendingCoachId || !athleteId || !teamId || !groupId) {
    record(
      false,
      "Datos de demostración",
      "falta coach, atleta, team o grupo del seed",
    );
    console.log(
      "\nRESULTADO: no se pudo verificar sin datos de `db:seed:demo`.",
    );
    process.exit(1);
  }

  const browser: Browser = await chromium.launch();

  try {
    // ------------------------------------------------------------- 40.3 --
    console.log("\n--- 40.3 El login no revela si el email existe ---");
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const messages: string[] = [];
      for (const email of [COACH.email, "nadie@runosorno.cl"]) {
        await goto(page, "/login");
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', "ClaveIncorrecta9!");
        await page.click('button[type="submit"]');
        const alert = page.locator('[data-testid="login-error"]');
        await alert.waitFor({ state: "visible", timeout: 15_000 });
        messages.push((await alert.innerText()).trim());
      }
      const same = messages[0] === messages[1];
      const leaks = messages.some(
        (m) => m.includes("@") || /existe|no existe/i.test(m),
      );
      record(
        same && !leaks,
        "40.3 email existente e inexistente devuelven el mismo mensaje",
        same ? `"${messages[0]}"` : `${messages[0]} vs ${messages[1]}`,
      );
      await ctx.close();
    }

    // ------------------------------------------------------------- 40.4 --
    console.log("\n--- 40.4 Sesión expirada ---");
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, ATHLETE);
      // Se borra la sesión en la base: la cookie sigue ahí pero ya no valida.
      await db.delete(sessions).where(eq(sessions.userId, athleteId!));
      await page.goto(`${BASE_URL}/athlete/calendar`, {
        waitUntil: "domcontentloaded",
      });
      await page
        .locator('[data-testid="login-expired"]')
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => null);
      const alert = await errorText(page, '[data-testid="login-expired"]');
      record(
        page.url().includes("/login") && /expirado/i.test(alert),
        "40.4 sesión expirada redirige a /login con aviso",
        `url=${page.url().replace(BASE_URL, "")}, aviso="${alert}"`,
      );
      await ctx.close();
    }

    // ------------------------------------------------------------- 40.5 --
    console.log("\n--- 40.5 Email duplicado ---");
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, ADMIN);
      await goto(page, "/admin/coaches");
      await page.click('button:has-text("Nuevo coach")');
      await page.fill("#coach-name", "Duplicado Fase 40");
      await page.fill("#coach-email", COACH.email);
      await page.click('.modal button[type="submit"]');
      const message = await errorText(page, '[data-testid="coach-form-error"]');
      // La app dice "ese email"; la tarea 40.5 lo escribe como "este email".
      record(
        /Ya existe un usuario con (ese|este) email/i.test(message),
        "40.5 email duplicado muestra el mensaje de error",
        message ? `"${message}"` : "no apareció el mensaje",
      );
      await ctx.close();
    }

    // ------------------------------------------------------------- 40.6 --
    console.log("\n--- 40.6 Límite de teams por coach ---");
    {
      const [current] = await db
        .select({ total: sql<number>`count(*)` })
        .from(teams)
        .where(eq(teams.coachId, coachId!));
      const previous = await getNumberSetting("max_teams_per_coach", 10);
      await setSetting("max_teams_per_coach", current?.total ?? 1);

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, COACH);
      await goto(page, "/coach/teams");
      await page.click('button:has-text("Nuevo team")');
      await page.fill("#team-name", "Equipo por encima del límite");
      await page.click('.modal button[type="submit"]');
      const message = await errorText(page, '[data-testid="team-form-error"]');
      const [after] = await db
        .select({ total: sql<number>`count(*)` })
        .from(teams)
        .where(eq(teams.coachId, coachId!));
      await restoreSetting("max_teams_per_coach", previous);
      record(
        /l[ií]mite/i.test(message) && after?.total === current?.total,
        "40.6 no se puede crear un team por encima del límite",
        `mensaje="${message}", teams antes=${current?.total} después=${after?.total}`,
      );
      await ctx.close();
    }

    // ------------------------------------------------------------- 40.7 --
    console.log("\n--- 40.7 Límite de atletas por team ---");
    {
      const [current] = await db
        .select({ total: sql<number>`count(*)` })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId!));
      const previous = await getNumberSetting("max_athletes_per_team", 50);
      await setSetting("max_athletes_per_team", current?.total ?? 1);

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, COACH);
      await goto(page, `/coach/teams/${teamId}`);
      // Asignar un atleta existente que no está en el team.
      const option = await page
        .locator("#assign-athlete option")
        .nth(1)
        .getAttribute("value")
        .catch(() => null);
      let message = "";
      if (option) {
        await page.selectOption("#assign-athlete", option);
        await page.click('button:has-text("Asignar")');
        message = await errorText(page, ".alert-danger");
      }
      const [after] = await db
        .select({ total: sql<number>`count(*)` })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId!));
      await restoreSetting("max_athletes_per_team", previous);
      record(
        !!option &&
          /l[ií]mite/i.test(message) &&
          after?.total === current?.total,
        "40.7 no se puede añadir un atleta por encima del límite",
        option
          ? `mensaje="${message}", atletas antes=${current?.total} después=${after?.total}`
          : "no hay atletas asignables en el selector",
      );
      await ctx.close();
    }

    // --------------------------------------------------------- 40.8 / 40.9 --
    console.log("\n--- 40.8 Ventana de edición / 40.9 Sesión futura ---");
    {
      const previous = await getNumberSetting("edit_window_hours", 48);
      await setSetting("edit_window_hours", 0);

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, ATHLETE);
      await goto(page, "/athlete/calendar");

      // Día pasado con registro: con ventana 0 ya no debe poder editarse.
      const pastRecordDay = await page.evaluate(`(() => {
        const today = new Date().toISOString().slice(0, 10);
        const cells = Array.from(document.querySelectorAll(".calendar-day"));
        const hit = cells.find(
          (c) => c.getAttribute("data-date") < today &&
                 (c.getAttribute("data-state") === "completed" || c.getAttribute("data-state") === "partial"),
        );
        return hit ? hit.getAttribute("data-date") : null;
      })()`);
      let expiredMessage = "";
      if (pastRecordDay) {
        await page.click(`[data-date="${pastRecordDay}"]`);
        expiredMessage = await errorText(
          page,
          '[data-testid="session-form-readonly"]',
        );
        await closePanel(page);
      }
      record(
        !!pastRecordDay &&
          /ventana de edici[oó]n ha expirado/i.test(expiredMessage),
        "40.8 fuera de la ventana el registro es de solo lectura",
        pastRecordDay
          ? `edit_window_hours=0, día ${pastRecordDay}: "${expiredMessage}"`
          : "no hay días con registro en el mes visible",
      );

      // Con una ventana amplia el mismo día vuelve a ser editable: si el
      // formulario trajera el valor fijo de 48 h, seguiría en solo lectura
      // aunque el admin agrande la ventana desde Configuración.
      await setSetting("edit_window_hours", 8760);
      await goto(page, "/athlete/calendar");
      let editableWithWideWindow = false;
      if (pastRecordDay) {
        await page.click(`[data-date="${pastRecordDay}"]`);
        editableWithWideWindow = await page
          .locator('[data-testid="session-form"]')
          .isVisible()
          .catch(() => false);
        await closePanel(page);
      }
      await restoreSetting("edit_window_hours", previous);
      record(
        !!pastRecordDay && editableWithWideWindow,
        "40.8 la ventana se toma de la configuración, no de un valor fijo",
        `edit_window_hours=8760, formulario editable=${editableWithWideWindow} (antes: 48h hardcodeado en el formulario)`,
      );

      // 40.9: día futuro con sesión planificada.
      const futureDay = await page.evaluate(`(() => {
        const today = new Date().toISOString().slice(0, 10);
        const cells = Array.from(document.querySelectorAll(".calendar-day"));
        const hit = cells.find(
          (c) => c.getAttribute("data-date") > today &&
                 c.getAttribute("data-state") !== "rest",
        );
        return hit ? hit.getAttribute("data-date") : null;
      })()`);
      let futureMessage = "";
      if (futureDay) {
        await page.click(`[data-date="${futureDay}"]`);
        futureMessage = await errorText(
          page,
          '[data-testid="session-form-readonly"]',
        );
        await closePanel(page);
      }
      record(
        !!futureDay && /días futuros/i.test(futureMessage),
        "40.9 no se puede registrar una sesión futura",
        futureDay
          ? `día ${futureDay}: "${futureMessage}"`
          : "no hay días futuros planificados",
      );
      await ctx.close();
    }

    // ------------------------------------------------------------ 40.10 --
    console.log("\n--- 40.10 RPE fuera de rango ---");
    {
      const base = {
        assignmentId: "3f1a5d7c-1f1a-4a1a-9a1a-1a1a1a1a1a1a",
        distanceKm: 10,
        durationMinutes: 60,
        status: "completed" as const,
      };
      const bad = recordSessionSchema.safeParse({ ...base, rpe: 11 });
      const alsoBad = recordSessionSchema.safeParse({ ...base, rpe: 0 });
      const good = recordSessionSchema.safeParse({ ...base, rpe: 7 });
      const message = bad.success ? "" : (bad.error.issues[0]?.message ?? "");
      record(
        !bad.success &&
          !alsoBad.success &&
          good.success &&
          /entre 1 y 10/i.test(message),
        "40.10 el servidor rechaza RPE fuera de 1-10",
        `rpe=11 y rpe=0 rechazados, rpe=7 aceptado, mensaje="${message}"`,
      );

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, ATHLETE);
      // Ventana amplia para que el formulario sea editable: lo que se comprueba
      // aquí es el selector de RPE, no la ventana (que ya se verificó en 40.8).
      await setSetting("edit_window_hours", 8760);
      await goto(page, "/athlete/calendar");
      const dayWithForm = await page.evaluate(`(() => {
        const today = new Date().toISOString().slice(0, 10);
        const cells = Array.from(document.querySelectorAll(".calendar-day"));
        const hit = cells.find(
          (c) => c.getAttribute("data-date") <= today && c.getAttribute("data-state") !== "rest",
        );
        return hit ? hit.getAttribute("data-date") : null;
      })()`);
      let options: string[] = [];
      if (dayWithForm) {
        await page.click(`[data-date="${dayWithForm}"]`);
        const select = page.locator('[data-testid="session-rpe"]');
        await select
          .waitFor({ state: "visible", timeout: 15_000 })
          .catch(() => null);
        options = await select
          .locator("option")
          .evaluateAll((nodes) =>
            nodes.map((n) => (n as HTMLOptionElement).value),
          )
          .catch(() => []);
      }
      await restoreSetting("edit_window_hours", 48);
      const numeric = options.filter((value) => value !== "").map(Number);
      record(
        numeric.length === 10 &&
          Math.min(...numeric) === 1 &&
          Math.max(...numeric) === 10,
        "40.10 el cliente solo ofrece RPE del 1 al 10",
        options.length
          ? `opciones=${options.join(",")}`
          : `día=${dayWithForm}, select no encontrado`,
      );
      await ctx.close();
    }

    // ------------------------------------------------------------ 40.11 --
    console.log("\n--- 40.11 Motivo 'Otro' sin descripción ---");
    {
      // Servidor: el esquema rechaza el motivo sin descripción aunque alguien
      // falsifique la llamada.
      const serverSide = notDoneSchema.safeParse({
        assignmentId: "3f1a5d7c-1f1a-4a1a-9a1a-1a1a1a1a1a1a",
        reason: "otro",
      });
      const serverMessage = serverSide.success
        ? ""
        : (serverSide.error.issues[0]?.message ?? "");

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, ATHLETE);
      await setSetting("edit_window_hours", 8760);
      await goto(page, "/athlete/calendar");
      const day = await page.evaluate(`(() => {
        const today = new Date().toISOString().slice(0, 10);
        const cells = Array.from(document.querySelectorAll(".calendar-day"));
        const hit = cells.find((c) => c.getAttribute("data-date") < today && c.getAttribute("data-state") !== "rest");
        return hit ? hit.getAttribute("data-date") : null;
      })()`);
      let message = "";
      if (day) {
        await page.click(`[data-date="${day}"]`);
        await page
          .locator('[data-testid="session-mode-not_done"]')
          .waitFor({ state: "visible", timeout: 15_000 })
          .catch(() => null);
        await page.click('[data-testid="session-mode-not_done"]');
        await page.selectOption('[data-testid="session-reason"]', "otro");
        await page.click('[data-testid="session-form-submit"]');
        message = await errorText(
          page,
          '[data-testid="session-error-custom-reason"]',
        );
      }
      await restoreSetting("edit_window_hours", 48);
      record(
        /describe el motivo/i.test(message) && !serverSide.success,
        "40.11 'Otro' sin descripción muestra el error bajo el campo",
        message
          ? `cliente="${message}", servidor="${serverMessage}"`
          : `día=${day} sin mensaje`,
      );
      await ctx.close();
    }

    // ------------------------------------------------------------ 40.12 --
    console.log("\n--- 40.12 Plantilla vacía ---");
    {
      const [before] = await db
        .select({ total: sql<number>`count(*)` })
        .from(sql`templates`);
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, COACH);
      await goto(page, "/coach/templates/new");
      await page.fill("#template-name", "");
      // Ojo: el header tiene su propio `<form action={logout}>` con un botón
      // submit, así que el selector tiene que acotarse al formulario de la
      // plantilla o se acaba cerrando sesión.
      await page
        .locator('form:has(#template-name) button[type="submit"]')
        .first()
        .click();
      const nameError = await page
        .locator("#template-name ~ .invalid-feedback")
        .first()
        .innerText({ timeout: 15_000 })
        .catch(() => "");
      const [after] = await db
        .select({ total: sql<number>`count(*)` })
        .from(sql`templates`);
      record(
        nameError.trim().length > 0 && after?.total === before?.total,
        "40.12 no se guarda una plantilla sin nombre",
        nameError.trim()
          ? `"${nameError.trim()}", plantillas antes=${before?.total} después=${after?.total}`
          : `plantillas antes=${before?.total} después=${after?.total}, sin mensaje de campo`,
      );
      await ctx.close();
    }

    // ------------------------------------------------------------ 40.13 --
    console.log("\n--- 40.13 Solicitud duplicada a un grupo ---");
    {
      // Por servicio: la interfaz oculta a propósito los grupos que ya tienen
      // una solicitud, así que este error solo se alcanza con una petición
      // falsificada — exactamente lo que el servicio tiene que impedir.
      const first = await requestJoin(groupId!, pendingCoachId!);
      const second = await requestJoin(groupId!, pendingCoachId!);
      const secondError = second.ok ? "" : second.error;
      record(
        !first.ok && !second.ok && /solicitud pendiente/i.test(secondError),
        "40.13 una segunda solicitud al mismo grupo se rechaza",
        `primera="${first.ok ? "aceptada" : first.error}", segunda="${secondError}"`,
      );
    }

    // ------------------------------------------------------------ 40.14 --
    console.log("\n--- 40.14 Copiar semana sin datos previos ---");
    {
      // Por servicio y no por interfaz: el botón del calendario copia siempre
      // hacia la semana en curso (el diálogo lo dice), así que en una base con
      // datosweeks la semana anterior existe y el error no se alcanza desde la
      // UI. Se llama al mismo servicio con una semana cuyo pickles anterior está
      // vacío, que es la situación que el mensaje cubre.
      const empty = await copyPreviousWeek(athleteId!, "2020-01-06", coachId!);
      const emptyError = empty.ok ? "" : empty.error;
      const ok = await copyPreviousWeek(athleteId!, "2026-10-12", coachId!);
      record(
        !empty.ok &&
          /No hay semana anterior para copiar/i.test(emptyError) &&
          ok.ok,
        "40.14 copiar semana sin datos previos avisa",
        empty.ok
          ? `la copia se ejecutó sin avisar (${empty.data.copied} sesiones)`
          : `sin semana previa="${emptyError}", con semana previa copiadas=${ok.ok ? ok.data.copied : "error"}`,
      );
    }

    // ------------------------------------------------------------ 40.15 --
    console.log("\n--- 40.15 Pantalla de error inesperado ---");
    {
      const source = readFileSync(
        join(process.cwd(), "app", "error.tsx"),
        "utf8",
      );
      const isClient = source.startsWith('"use client"');
      const hasReset = /reset:\s*\(\)\s*=>/.test(source);
      const callsReset = /onClick=\{\(\)\s*=>\s*reset\(\)\}/.test(source);
      const goesHome = /router\.push\("\/"\)/.test(source);
      const hasHome = /Volver al inicio/.test(source);
      record(
        isClient && hasReset && callsReset && goesHome && hasHome,
        "40.15 error.tsx ofrece reintentar y volver al inicio",
        `cliente=${isClient}, reintentar con reset=${callsReset}, "Volver al inicio" navega a /=${goesHome}`,
      );
    }
  } finally {
    await browser.close();
    // Si el script muere a mitad, la configuración debe quedar como estaba.
    await restoreSetting("max_teams_per_coach", 10);
    await restoreSetting("max_athletes_per_team", 50);
    await restoreSetting("edit_window_hours", 48);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log("\n=====================================");
  console.log(`RESULTADO: ${passed}/${results.length} verificaciones OK`);
  if (failed.length > 0) {
    for (const f of failed) {
      console.log(`  - ${f.label} [${f.detail}]`);
    }
    process.exit(1);
  }
  console.log(
    "Las validaciones y los mensajes de error se comportan correctamente.",
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
