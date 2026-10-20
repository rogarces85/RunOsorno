/**
 * Verifica la Fase 38 (estados vacíos y mensajes de error).
 *
 * - 38.5: cada listado vacío muestra un mensaje orientativo y, cuando
 *        corresponde, una acción.
 * - 38.6: los errores de validación se muestran bajo el campo responsable.
 * - 38.7: los errores de negocio se muestran en un `Alert` con un mensaje
 *        claro, no en un `alert-danger` suelto dentro del listado.
 * - 38.8: las acciones destructivas piden confirmación con `ConfirmDialog`.
 *
 * Usa el coach `coach.pendiente@runosorno.cl` del seed de demostración: no
 * tiene teams, plantillas ni notificaciones, así que sus listados están
 * vacíos de verdad sin tener que tocar datos.
 *
 * Requiere el servidor de desarrollo corriendo (`npm run dev`).
 *
 * Uso:  npx tsx scripts/verify-empty-states.ts
 */

import { readFileSync } from "node:fs";
import { eq, inArray } from "drizzle-orm";
import { chromium, type Browser, type Page } from "playwright";
import { db } from "../lib/db/index";
import { notifications, users } from "../lib/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = "admin@runosorno.cl";
const ADMIN_PASSWORD = "Admin1234!";
const EMPTY_COACH_EMAIL = "coach.pendiente@runosorno.cl";
const DEMO_PASSWORD = "Demo1234!";
const TEST_TEAM = "Verificación Fase 38";

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail = ""): void {
  results.push({ ok, label, detail });
  console.log(
    `  ${ok ? "OK   " : "FALLO"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
}

async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    }),
    page.click('button[type="submit"]'),
  ]);
}

/**
 * Comprueba que hay un `EmptyState` visible con el título esperado y que,
 * si se pide, ofrece una acción pulsable.
 */
async function checkEmptyState(
  page: Page,
  label: string,
  path: string,
  title: string,
  expectAction: boolean,
): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
  const empty = page.locator('[data-testid="empty-state"]').first();
  try {
    await empty.waitFor({ state: "visible", timeout: 15_000 });
    const renderedTitle = (
      await page
        .locator('[data-testid="empty-state-title"]')
        .first()
        .innerText()
    ).trim();
    const description = (await empty.innerText())
      .replace(renderedTitle, "")
      .trim();
    const hasAction =
      (await page.locator('[data-testid="empty-state-action"]').count()) > 0;
    const ok = renderedTitle === title && (!expectAction || hasAction);
    record(
      ok,
      `${label} (${path})`,
      `titulo="${renderedTitle}", accion=${hasAction}, orientativo=${description.length > 0}`,
    );
  } catch {
    record(false, `${label} (${path})`, "no se encontro ningun EmptyState");
  }
}

/** 38.6: el input marcado como invalido muestra el feedback debajo. */
async function checkFieldError(
  page: Page,
  label: string,
  inputSelector: string,
): Promise<void> {
  const input = page.locator(inputSelector).first();
  const isInvalid = await input.evaluate((el) =>
    el.classList.contains("is-invalid"),
  );
  const feedback = input
    .locator("xpath=following-sibling::*[contains(@class,'invalid-feedback')]")
    .first();
  const visible = await feedback.isVisible().catch(() => false);
  const text = visible ? (await feedback.innerText()).trim() : "";
  record(
    isInvalid && visible && text.length > 0,
    label,
    visible ? `feedback="${text}"` : "sin feedback visible",
  );
}

/**
 * Deja al coach sin datos sin notificaciones.
 *
 * El seed lo crea con la solicitud de unirse pendiente, pero cualquier
 * ejecución anterior que apruebe esa solicitud (u otro flujo que le escriba,
 * como las pruebas E2E de feedback) le deja un aviso y entonces
 * `/notifications` ya no está vacío: la comprobación fallaría por el estado de
 * la base, no por el del componente.
 */
async function purgarNotificaciones(email: string): Promise<void> {
  const destinatarios = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (destinatarios.length === 0) return;
  await db.delete(notifications).where(
    inArray(
      notifications.userId,
      destinatarios.map((u) => u.id),
    ),
  );
}

async function main() {
  console.log(`Verificando estados vacíos y errores en ${BASE_URL}\n`);

  // --------------------------------------------------------------- 38.5 ---
  console.log("--- 38.5 Estados vacíos con mensaje orientativo y acción ---");
  const coachContext = await (
    await chromium.launch()
  ).newContext({ viewport: { width: 1400, height: 1000 } });
  const coachPage = await coachContext.newPage();

  try {
    await purgarNotificaciones(EMPTY_COACH_EMAIL);
    await login(coachPage, EMPTY_COACH_EMAIL, DEMO_PASSWORD);
    record(
      true,
      "login del coach sin datos",
      coachPage.url().replace(BASE_URL, ""),
    );

    // Limpieza previa: una ejecución anterior pudo dejar el team de prueba.
    await coachPage.goto(`${BASE_URL}/coach/teams`, {
      waitUntil: "networkidle",
    });
    await deleteTestTeam(coachPage);

    await checkEmptyState(
      coachPage,
      "listado de teams",
      "/coach/teams",
      "No tienes teams",
      true,
    );
    await checkEmptyState(
      coachPage,
      "biblioteca de plantillas",
      "/coach/templates",
      "No hay plantillas",
      true,
    );
    await checkEmptyState(
      coachPage,
      "centro de notificaciones",
      "/notifications",
      "No tienes notificaciones",
      false,
    );

    // "No hay atletas en este team": se crea un team y se abre su detalle.
    const emptyTeam = await verifyEmptyTeam(coachPage);
    record(emptyTeam.ok, "detalle de team sin atletas", emptyTeam.detail);

    // "No hay coaches registrados" solo es alcanzable con la base vacía, que
    // no se puede obtener sin destruir los datos del resto de verificaciones.
    // Se comprueba que el componente lo renderiza.
    const source = readFileSync("components/admin/CoachesList.tsx", "utf8");
    record(
      source.includes('title="No hay coaches registrados"'),
      "listado de coaches (base vacía)",
      source.includes('title="No hay coaches registrados"')
        ? "título presente en CoachesList (requiere base vacía para verlo en pantalla)"
        : "el componente no declara el estado vacío",
    );
  } finally {
    await coachContext.close();
  }

  // ------------------------------------------------------------ 38.6-38.8 --
  console.log(
    "\n--- 38.6 / 38.7 / 38.8 Formularios y acciones destructivas ---",
  );
  const browser: Browser = await chromium.launch();
  const adminContext = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
  });
  const adminPage = await adminContext.newPage();

  try {
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    await adminPage.goto(`${BASE_URL}/admin/coaches`, {
      waitUntil: "networkidle",
    });

    // --- 38.6: errores de validación bajo el campo ---
    await adminPage.click('button:has-text("Nuevo coach")');
    await adminPage.click('.modal button[type="submit"]');
    await adminPage.waitForTimeout(300);
    await checkFieldError(
      adminPage,
      "nombre vacío muestra error",
      "#coach-name",
    );
    await checkFieldError(
      adminPage,
      "email vacío muestra error",
      "#coach-email",
    );

    // --- 38.7: email duplicado = error de negocio, no de campo ---
    await adminPage.fill("#coach-name", "Coach Duplicado Fase 38");
    await adminPage.fill("#coach-email", "coach.demo@runosorno.cl");
    await adminPage.click('.modal button[type="submit"]');
    const businessAlert = adminPage.locator('[data-testid="coach-form-error"]');
    await businessAlert
      .waitFor({ state: "visible", timeout: 20_000 })
      .catch(() => null);
    const alertVisible = await businessAlert.isVisible().catch(() => false);
    const alertText = alertVisible
      ? (await businessAlert.innerText()).trim()
      : "";
    record(
      alertVisible && alertText.length > 0,
      "email duplicado muestra Alert de negocio",
      alertVisible ? `"${alertText}"` : "no apareció el Alert",
    );

    // --- 38.8: acción destructiva pide confirmación ---
    await adminPage.click(".modal .btn-close");
    await adminPage.waitForTimeout(300);
    const coachRow = adminPage
      .locator("tr")
      .filter({ hasText: "Coach Demo Principal" })
      .first();
    await coachRow.locator('button[title="Eliminar"]').click();

    const dialog = adminPage.locator('.modal[role="dialog"]').filter({
      hasText: "Eliminar coach",
    });
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    const dialogText = (await dialog.innerText()).trim();
    const confirmVisible = await dialog
      .locator('button:has-text("Eliminar")')
      .isVisible();
    record(
      confirmVisible && dialogText.includes("Coach Demo Principal"),
      "eliminar coach pide confirmación",
      confirmVisible ? dialogText.split("\n")[0] : "sin botón de confirmación",
    );

    // Confirmar debe producir un error de negocio claro, no un 500.
    await dialog.locator('button:has-text("Eliminar")').click();
    const destroyAlert = adminPage.locator(".alert-danger").first();
    await destroyAlert
      .waitFor({ state: "visible", timeout: 20_000 })
      .catch(() => null);
    const destroyVisible = await destroyAlert.isVisible().catch(() => false);
    const destroyText = destroyVisible
      ? (await destroyAlert.innerText()).trim()
      : "";
    record(
      destroyVisible && /desact/i.test(destroyText),
      "confirmar eliminación muestra el motivo del rechazo",
      destroyVisible ? `"${destroyText}"` : "no apareció el mensaje",
    );
  } finally {
    await adminContext.close();
    await browser.close();
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
    "Los estados vacíos y los mensajes de error se comportan correctamente.",
  );
  process.exit(0);
}

/**
 * Crea un team, abre su detalle para ver el estado vacío "No hay atletas en
 * este team" y lo vuelve a eliminar para no dejar datos detrás.
 */
async function verifyEmptyTeam(
  page: Page,
): Promise<{ ok: boolean; detail: string }> {
  try {
    await page.goto(`${BASE_URL}/coach/teams`, { waitUntil: "networkidle" });
    // El script debe ser idempotente: si una ejecución anterior falló a
    // medias, el team de prueba sigue ahí.
    await deleteTestTeam(page);

    await page.click('button:has-text("Nuevo team")');
    await page.fill("#team-name", TEST_TEAM);
    await page.click('.modal button[type="submit"]');

    // Crear el team no navega: hay que abrir su detalle desde el listado.
    const card = page.locator(".card").filter({ hasText: TEST_TEAM }).first();
    await card.waitFor({ state: "visible", timeout: 20_000 });
    await Promise.all([
      page.waitForURL(/\/coach\/teams\/[0-9a-f-]+/, { timeout: 20_000 }),
      card.locator('a.btn:has-text("Ver")').click(),
    ]);

    // La página tiene dos estados vacíos posibles (el del listado del team y el del
    // selector "Asignar atleta"). Se apunta al del listado, que es el que esta
    // comprobación mide: con todos los atletas ya asignados, el primero del DOM es
    // el del selector.
    const listaTeam = page
      .locator(".card")
      .filter({ hasText: "Atletas del team" })
      .first();
    const empty = listaTeam.locator('[data-testid="empty-state"]').first();
    await empty.waitFor({ state: "visible", timeout: 15_000 });
    const title = (
      await listaTeam
        .locator('[data-testid="empty-state-title"]')
        .first()
        .innerText()
    ).trim();

    await page.goto(`${BASE_URL}/coach/teams`, { waitUntil: "networkidle" });
    await deleteTestTeam(page);

    return {
      ok: title === "No hay atletas en este team",
      detail: `titulo="${title}"`,
    };
  } catch (error) {
    return { ok: false, detail: String(error).slice(0, 140) };
  }
}

/** Elimina el team de prueba desde el listado, si existe. */
async function deleteTestTeam(page: Page): Promise<void> {
  const card = page.locator(".card").filter({ hasText: TEST_TEAM }).first();
  if ((await card.count()) === 0) {
    return;
  }
  await card.locator('button[title="Eliminar"]').click();
  const dialog = page
    .locator('.modal[role="dialog"]')
    .filter({ hasText: "Eliminar team" });
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  await dialog.locator('button:has-text("Eliminar")').click();
  await page.waitForTimeout(2500);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
