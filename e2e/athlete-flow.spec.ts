/**
 * E2E del flujo del atleta (Fase 42, tareas 42.8 y 42.10):
 * ver el calendario → registrar la sesión → ver el detalle y las métricas, y
 * marcar otra sesión como "no realizada" con su motivo.
 *
 * Cada test crea su propia sesión antes de actuar: si uno dependiera del
 * anterior, un worker reiniciado a mitad de suite (o un reintento) partiría
 * con datos que ya no existen.
 */

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionRecords } from "@/lib/db/schema";
import {
  addSession,
  cleanupRun,
  createTrainingFixture,
  login,
  type Account,
} from "./helpers";

test.describe("Flujo del atleta", () => {
  let coach: Account;
  let athlete: Account;
  let teamId: string;
  let templateId: string;

  test.beforeAll(async () => {
    const fixture = await createTrainingFixture();
    coach = fixture.coach;
    athlete = fixture.athlete;
    teamId = fixture.teamId;
    templateId = fixture.templateId;
  });

  test.afterAll(async () => {
    await cleanupRun();
  });

  test("42.8 el calendario muestra la sesión y permite registrarla", async ({
    page,
  }) => {
    const sesion = await addSession(athlete.id, coach.id, templateId, -3);

    await login(page, athlete, "/athlete/dashboard");
    await page.goto("/athlete/calendar");

    const day = page.locator(`[data-date="${sesion.dateISO}"]`);
    await expect(day).toBeVisible();
    await expect(day).toHaveAttribute("data-state", "planned");

    await day.click();
    const form = page.getByTestId("session-form");
    await expect(form).toBeVisible({ timeout: 20_000 });

    await form.getByTestId("session-distance").fill("8.5");
    await form.getByTestId("session-duration").fill("52");
    await form.getByTestId("session-rpe").selectOption("7");
    await form.getByTestId("session-comments").fill("Ritmo controlado");
    await form.getByTestId("session-form-submit").click();

    await expect(form.getByTestId("session-form-success")).toBeVisible({
      timeout: 20_000,
    });
    // El día pasa a verde (completada) tras guardar.
    await expect(
      page.locator(`[data-date="${sesion.dateISO}"]`),
    ).toHaveAttribute("data-state", "completed", { timeout: 20_000 });

    const [record] = await db
      .select({
        distanceKm: sessionRecords.distanceKm,
        rpe: sessionRecords.rpe,
        comments: sessionRecords.comments,
      })
      .from(sessionRecords)
      .where(eq(sessionRecords.assignmentId, sesion.id));
    expect(Number(record?.distanceKm)).toBe(8.5);
    expect(record?.rpe).toBe(7);
    expect(record?.comments).toBe("Ritmo controlado");
  });

  test("42.8 el detalle de la sesión muestra el registro guardado", async ({
    page,
  }) => {
    const sesion = await addSession(athlete.id, coach.id, templateId, -2);
    await db.insert(sessionRecords).values({
      id: crypto.randomUUID(),
      assignmentId: sesion.id,
      distanceKm: "9.25",
      durationMinutes: 58,
      rpe: 6,
      comments: "Sesión con ritmo sostenido",
      recordedAt: new Date(),
    });

    await login(page, athlete, "/athlete/dashboard");
    await page.goto("/athlete/calendar");
    await page.locator(`[data-date="${sesion.dateISO}"]`).click();

    const detail = page.getByTestId("session-detail-record");
    await expect(detail).toBeVisible({ timeout: 20_000 });
    await expect(detail).toContainText("9,25 km");
    await expect(detail).toContainText("Sesión con ritmo sostenido");
  });

  test("42.8 las métricas del atleta se calculan", async ({ page }) => {
    await login(page, athlete, "/athlete/dashboard");
    await page.goto("/athlete/metrics");

    await expect(page.locator("body")).toContainText("Cumplimiento");
    await expect(page.locator("body")).toContainText("Carga semanal");
    await expect(page.locator("body")).toContainText("km");
  });

  test("42.10 marcar una sesión como no realizada con motivo", async ({
    page,
  }) => {
    const sesion = await addSession(athlete.id, coach.id, templateId, -4);

    await login(page, athlete, "/athlete/dashboard");
    await page.goto("/athlete/calendar");

    await page.locator(`[data-date="${sesion.dateISO}"]`).click();
    const form = page.getByTestId("session-form");
    await expect(form).toBeVisible({ timeout: 20_000 });

    await form.getByTestId("session-mode-not_done").click();
    await form.getByTestId("session-reason").selectOption("lesion");
    await form.getByTestId("session-form-submit").click();

    await expect(form.getByTestId("session-form-success")).toBeVisible({
      timeout: 20_000,
    });
    // El día queda en rojo (no realizada).
    await expect(
      page.locator(`[data-date="${sesion.dateISO}"]`),
    ).toHaveAttribute("data-state", "not_done", { timeout: 20_000 });

    // Y el motivo queda guardado, no solo el estado.
    const [record] = await db
      .select({ reason: sessionRecords.notDoneReason })
      .from(sessionRecords)
      .where(eq(sessionRecords.assignmentId, sesion.id));
    expect(record?.reason).toBe("lesion");
  });

  test("un atleta no puede abrir el calendario de coach", async ({ page }) => {
    await login(page, athlete, "/athlete/dashboard");
    await page.goto(`/coach/calendar/${teamId}/${athlete.id}`);
    await expect(page).toHaveURL(/\/athlete\/dashboard/);
  });
});
