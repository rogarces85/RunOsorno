/**
 * E2E del flujo completo del administrador (Fase 42, tarea 42.6):
 * crear coach → crear grupo → aprobar su solicitud → nombrarlo Director Técnico.
 *
 * Cada paso va por la interfaz, que es lo que se quiere cubrir; al final se
 * comprueba además el estado en la base de datos y se limpia lo creado.
 */

import { expect, test } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groupMembers, groupRequests, groups, users } from "@/lib/db/schema";
import { ADMIN, RUN, cleanupRun, login } from "./helpers";

test.describe("Flujo del administrador", () => {
  test.afterAll(async () => {
    await cleanupRun();
  });

  test("42.6 crear coach, crear grupo, aprobar solicitud y asignar Director Técnico", async ({
    page,
  }) => {
    const coachEmail = `admin.coach.${RUN}@runosorno.cl`;
    const coachName = `Coach Alta ${RUN}`;
    const groupName = `Grupo ${RUN}`;

    // --- crear coach ------------------------------------------------------
    await login(page, ADMIN, "/admin/dashboard");
    await page.goto("/admin/coaches");
    await page.getByRole("button", { name: "Nuevo coach" }).click();
    await page.fill("#coach-name", coachName);
    await page.fill("#coach-email", coachEmail);
    await page.locator('.modal button[type="submit"]').click();

    const coachRow = page.locator("tr", { hasText: coachEmail });
    await expect(coachRow).toBeVisible({ timeout: 20_000 });

    // --- crear grupo ------------------------------------------------------
    await page.goto("/admin/groups");
    await page.getByRole("button", { name: "Nuevo grupo" }).first().click();
    await page.fill("#group-name", groupName);
    await page.fill("#group-description", "Grupo creado por la suite E2E");
    await page.locator('.modal button[type="submit"]').click();

    const groupRow = page.locator("tr", { hasText: groupName });
    await expect(groupRow).toBeVisible({ timeout: 20_000 });

    // --- el coach solicita unirse ----------------------------------------
    const coachPage = await page.context().browser()!.newContext();
    const coachP = await coachPage.newPage();
    const [coach] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, coachEmail));
    expect(coach).toBeTruthy();

    // El alta genera una contraseña temporal que solo conoce el servicio, así
    // que se fija una conocida para poder entrar en la interfaz.
    const { hashSync } = await import("bcryptjs");
    const tempPassword = `E2e${RUN}!`;
    await db
      .update(users)
      .set({
        passwordHash: hashSync(tempPassword, 10),
        mustChangePassword: false,
      })
      .where(eq(users.id, coach!.id));

    await login(
      coachP,
      { email: coachEmail, password: tempPassword },
      "/coach/dashboard",
    );
    await coachP.goto("/coach/groups");
    await coachP
      .locator(".card", { hasText: groupName })
      .getByRole("button", { name: "Solicitar unirse" })
      .click();
    await expect(
      coachP
        .locator(".card", { hasText: groupName })
        .getByText("Solicitud enviada"),
    ).toBeVisible({ timeout: 20_000 });

    // --- el admin aprueba y nombra director -------------------------------
    const [group] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.name, groupName));
    expect(group).toBeTruthy();
    // Se entra por URL y no por el enlace de la tabla: el listado mezcla el
    // grupo recién creado con los de demostración y el orden no es estable.
    await page.goto(`/admin/groups/${group!.id}`);
    await expect(page.getByRole("heading", { name: groupName })).toBeVisible();

    await page
      .locator(".list-group-item", { hasText: coachEmail })
      .getByRole("button", { name: "Aprobar" })
      .click();

    // Tras aprobar, el coach aparece en la tabla de miembros.
    const memberRow = page.locator("tr", { hasText: coachEmail });
    await expect(memberRow).toBeVisible({ timeout: 20_000 });

    const toggle = memberRow.getByRole("switch");
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked({ timeout: 20_000 });
    await expect(memberRow).toContainText("Director Técnico");

    // --- estado final en la base -----------------------------------------
    const [member] = await db
      .select({ isDirector: groupMembers.isDirector })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group!.id),
          eq(groupMembers.userId, coach!.id),
        ),
      );
    expect(member?.isDirector).toBe(true);

    const [request] = await db
      .select({ status: groupRequests.status })
      .from(groupRequests)
      .where(
        and(
          eq(groupRequests.groupId, group!.id),
          eq(groupRequests.coachId, coach!.id),
        ),
      );
    expect(request?.status).toBe("approved");

    await coachPage.close();
  });
});
