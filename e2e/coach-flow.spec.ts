/**
 * E2E del flujo de planificación del coach (Fase 42, tarea 42.7):
 * crear team → crear plantilla → asignarla a un atleta en el calendario.
 *
 * El coach, el atleta y la plantilla se crean por servicio en `beforeAll`
 * (el setup no es lo que se prueba aquí); los tres pasos del flujo sí van por
 * la interfaz, y se comprueba el resultado en la base de datos.
 */

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionAssignments, teams, templates } from "@/lib/db/schema";
import {
  RUN,
  cleanupRun,
  createTrainingFixture,
  login,
  type Account,
} from "./helpers";

test.describe("Flujo del coach", () => {
  let coach: Account;
  let athlete: Account;
  let teamId: string;

  test.beforeAll(async () => {
    const fixture = await createTrainingFixture();
    coach = fixture.coach;
    athlete = fixture.athlete;
    teamId = fixture.teamId;
  });

  test.afterAll(async () => {
    await cleanupRun();
  });

  test("42.7 crear team, crear plantilla y asignarla en el calendario", async ({
    page,
  }) => {
    await login(page, coach, "/coach/dashboard");

    // --- crear team -------------------------------------------------------
    await page.goto("/coach/teams");
    await page.getByRole("button", { name: "Nuevo team" }).first().click();
    const teamName = `Team Plan ${RUN}`;
    await page.fill("#team-name", teamName);
    await page.locator('.modal button[type="submit"]').click();
    await expect(
      page.locator(".card", { hasText: teamName }).first(),
    ).toBeVisible({ timeout: 20_000 });

    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.name, teamName));
    expect(team).toBeTruthy();

    // --- crear plantilla --------------------------------------------------
    await page.goto("/coach/templates/new");
    const templateName = `Plantilla UI ${RUN}`;
    await page.fill("#template-name", templateName);
    await page.fill("#template-session-type", "series");
    // El editor arranca con tres secciones y contenido vacío: la validación
    // exige descripción en cada una, así que hay que completarlas.
    for (const [index, content] of [
      "8 min de trote suave + movilidad",
      "6 x 400 m a ritmo de series con 2 min de recuperación",
      "10 min de trote muy suave + estiramientos",
    ].entries()) {
      await page.fill(`#section-content-${index}`, content);
    }
    await page
      .locator('form:has(#template-name) button[type="submit"]')
      .click();
    // El editor guarda y vuelve a la biblioteca.
    await page.waitForURL(/\/coach\/templates$/, { timeout: 20_000 });
    await expect(
      page.locator(".card", { hasText: templateName }).first(),
    ).toBeVisible({ timeout: 20_000 });

    const [template] = await db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.name, templateName));
    expect(template).toBeTruthy();

    // --- asignar la plantilla a un día del calendario ---------------------
    // El calendario es por equipo y atleta: se usa el equipo del fixture, que es
    // donde está el atleta (el team recién creado todavía no tiene atletas).
    await page.goto(`/coach/calendar/${teamId}/${athlete.id}`);
    // Se elige un día libre del mes: si ya tuviera sesión, abriría el diálogo
    // de reemplazo en vez de asignar.
    const target = await page.evaluate(`(() => {
      const cell = document.querySelector('.calendar-droppable[data-droppable] .calendar-day[data-state="rest"]')
        || document.querySelector('.calendar-droppable[data-droppable] .calendar-day');
      return cell ? cell.getAttribute("data-date") : null;
    })()`);
    expect(target).toBeTruthy();

    await page.click(`[data-date="${target}"]`);
    const form = page.getByTestId("assign-form");
    await expect(form).toBeVisible({ timeout: 20_000 });
    await form.locator("select").selectOption(template!.id);
    await form.getByRole("button", { name: "Asignar" }).click();

    // El día pasa a estado "planificada" y muestra el tipo de sesión.
    const day = page.locator(`[data-date="${target}"]`);
    await expect(day).toHaveAttribute("data-state", "planned", {
      timeout: 20_000,
    });
    await expect(day).toContainText("Series");

    // La celda muestra el tipo, no el nombre: el nombre se comprueba abriendo
    // el detalle del día.
    await day.click();
    await expect(
      page.locator(".modal", { hasText: templateName }).first(),
    ).toBeVisible({ timeout: 20_000 });

    const [assignment] = await db
      .select({
        id: sessionAssignments.id,
        templateId: sessionAssignments.templateId,
      })
      .from(sessionAssignments)
      .where(eq(sessionAssignments.templateId, template!.id));
    expect(assignment).toBeTruthy();
  });
});
