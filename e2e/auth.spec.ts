/**
 * E2E de autenticación y sesión (Fase 42, tareas 42.3-42.5).
 *
 * Usa las cuentas de `db:seed:demo` porque aquí no se crea nada: lo que se
 * comprueba es la ruta de entrada al producto.
 */

import { expect, test } from "@playwright/test";
import { ADMIN, ATHLETE_DEMO, COACH_DEMO, login } from "./helpers";

test.describe("Autenticación", () => {
  test("42.3 login válido lleva al dashboard de cada rol", async ({ page }) => {
    const casos = [
      { user: ADMIN, path: "/admin/dashboard" },
      { user: COACH_DEMO, path: "/coach/dashboard" },
      { user: ATHLETE_DEMO, path: "/athlete/dashboard" },
    ];

    for (const caso of casos) {
      await page.context().clearCookies();
      await login(page, caso.user, caso.path);
      await expect(page).toHaveURL(new RegExp(`${caso.path}$`));
      // El sidebar lateral es la señal de que la sesión quedó abierta.
      await expect(page.getByTestId("app-sidebar")).toBeAttached();
    }
  });

  test("42.4 login inválido muestra un mensaje genérico", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', COACH_DEMO.email);
    await page.fill('input[name="password"]', "ClaveIncorrecta9!");
    await page.click('button[type="submit"]');

    const error = page.getByTestId("login-error");
    await expect(error).toBeVisible();
    await expect(error).toHaveText("Email o contraseña incorrectos");
    // No debe revelar nada sobre la cuenta: ni el email ni si existe.
    await expect(error).not.toContainText("@");
    await expect(page).toHaveURL(/\/login/);
  });

  test("42.4 un email inexistente da exactamente el mismo mensaje", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "nadie@runosorno.cl");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');

    await expect(page.getByTestId("login-error")).toHaveText(
      "Email o contraseña incorrectos",
    );
  });

  test("42.5 logout cierra la sesión y bloquea las rutas protegidas", async ({
    page,
  }) => {
    await login(page, ATHLETE_DEMO, "/athlete/dashboard");

    await page.click('button[aria-label="Cerrar sesión"]');
    await page.waitForURL(/\/login/);
    await expect(page.getByTestId("login-error")).toHaveCount(0);

    // Con la sesión destruida, la ruta protegida devuelve al login.
    await page.goto("/athlete/calendar");
    await page.waitForURL(/\/login/);

    await page.goto("/coach/dashboard");
    await page.waitForURL(/\/login/);

    await page.goto("/admin/dashboard");
    await page.waitForURL(/\/login/);
  });

  test("42.5 un rol no puede entrar en el dashboard de otro", async ({
    page,
  }) => {
    await login(page, ATHLETE_DEMO, "/athlete/dashboard");
    await page.goto("/admin/dashboard");
    await page.waitForURL(/\/athlete\/dashboard/);
  });
});
