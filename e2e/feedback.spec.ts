/**
 * E2E del feedback del coach y de las notificaciones (Fase 42, tareas 42.9 y
 * 42.11): el coach revisa el registro del atleta y le deja un comentario, y el
 * atleta lo ve reflejado en la campanita de notificaciones.
 */

import { expect, test } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { chromium } from "playwright";
import { db } from "@/lib/db";
import { notifications, sessionFeedback } from "@/lib/db/schema";
import {
  addSession,
  cleanupRun,
  createTrainingFixture,
  login,
  type Account,
} from "./helpers";

test.describe("Feedback y notificaciones", () => {
  let coach: Account;
  let athlete: Account;
  let teamId: string;
  let templateId: string;
  let pastDate: string;

  test.beforeAll(async () => {
    const fixture = await createTrainingFixture();
    coach = fixture.coach;
    athlete = fixture.athlete;
    teamId = fixture.teamId;
    templateId = fixture.templateId;

    // El atleta registra la sesión primero: el comentario del coach va sobre un
    // registro real, que es el flujo que describe la tarea 42.9.
    const sesion = await addSession(athlete.id, coach.id, templateId, -3);
    pastDate = sesion.dateISO;

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, athlete, "/athlete/dashboard");
    await page.goto("/athlete/calendar");
    await page.locator(`[data-date="${pastDate}"]`).click();
    const form = page.getByTestId("session-form");
    await form.getByTestId("session-distance").fill("10");
    await form.getByTestId("session-duration").fill("60");
    await form.getByTestId("session-rpe").selectOption("6");
    await form.getByTestId("session-form-submit").click();
    await expect(form.getByTestId("session-form-success")).toBeVisible({
      timeout: 20_000,
    });
    await browser.close();
  });

  test.afterAll(async () => {
    await cleanupRun();
  });

  test("42.9 el coach ve el registro del atleta y le deja feedback", async ({
    page,
  }) => {
    await login(page, coach, "/coach/dashboard");
    await page.goto(`/coach/calendar/${teamId}/${athlete.id}`);

    await page.locator(`[data-date="${pastDate}"]`).click();
    const record = page.getByTestId("session-detail-record");
    await expect(record).toBeVisible({ timeout: 20_000 });
    await expect(record).toContainText("10 km");

    const mensaje = "Buen ritmo, sigue así en la próxima semana.";
    await page.getByPlaceholder("Escribe un comentario…").fill(mensaje);
    const enviar = page.getByRole("button", { name: /Enviar/ });
    await enviar.click();

    // Ojo: el texto recién escrito sigue en el `textarea` mientras la acción
    // corre, así que hay que esperar al hilo (`feedback-thread`), no a que el
    // mensaje "sea visible" en cualquier parte del panel.
    const hilo = page.getByTestId("feedback-thread");
    await expect(hilo).toContainText(mensaje, { timeout: 20_000 });
    await expect(enviar).toHaveText("Enviar", { timeout: 20_000 });

    const [feedback] = await db
      .select({ id: sessionFeedback.id, authorId: sessionFeedback.authorId })
      .from(sessionFeedback)
      .where(and(eq(sessionFeedback.authorId, coach.id)));
    expect(feedback).toBeTruthy();
  });

  test("42.11 el atleta recibe la notificación y la marca como leída", async ({
    page,
  }) => {
    await login(page, athlete, "/athlete/dashboard");

    const bell = page.getByTestId("notification-bell");
    const badge = page.getByTestId("notification-badge");
    await expect(badge).toBeVisible({ timeout: 20_000 });
    const unreadBefore = Number((await badge.innerText()).trim());

    await bell.click();
    const dropdown = page.getByTestId("notification-dropdown");
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toContainText("comentario");

    await page.getByTestId("mark-all-read").click();
    await expect(page.getByTestId("notification-badge")).toHaveCount(0, {
      timeout: 20_000,
    });

    const pending = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, athlete.id),
          eq(notifications.isRead, false),
        ),
      );
    expect(pending).toHaveLength(0);
    expect(unreadBefore).toBeGreaterThan(0);
  });

  test("42.11 el centro de notificaciones lista el aviso del coach", async ({
    page,
  }) => {
    await login(page, athlete, "/athlete/dashboard");
    await page.goto("/notifications");
    await expect(page.locator("body")).toContainText("comentario");
  });
});
