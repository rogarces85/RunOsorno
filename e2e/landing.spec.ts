/**
 * E2E de la landing pública (cambio `landing-publica`).
 *
 * Lo que se protege aquí es la frontera: la portada se ve sin sesión, el sistema no,
 * y con sesión la raíz lleva al tablero del rol. También se comprueba que el tema
 * elegido sobrevive a la recarga sin sesión.
 */

import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test.describe("Landing pública", () => {
  test("un visitante sin sesión ve la portada con la oferta", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Planifica\. Entrena\. Evoluciona\./ }),
    ).toBeVisible();
    // El enlace existe en el hero y en el pie: se apunta al del contenido.
    await expect(
      page.locator("#contenido").getByRole("link", { name: "Entrar al sistema" }),
    ).toBeVisible();

    // Los tres productos por rol, sin precios.
    await expect(page.locator(".app-product")).toHaveCount(3);
    await expect(page.locator("body")).not.toContainText("$");
    await expect(page.locator("body")).not.toContainText("CLP");
  });

  test("el llamado de entrada lleva al inicio de sesión", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("#contenido")
      .getByRole("link", { name: "Entrar al sistema" })
      .click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("el sistema sigue cerrado sin sesión", async ({ page }) => {
    for (const ruta of [
      "/admin/dashboard",
      "/coach/dashboard",
      "/athlete/calendar",
      "/athlete/metrics",
    ]) {
      await page.goto(ruta);
      await expect(page, `ruta ${ruta}`).toHaveURL(/\/login/);
    }
  });

  test("con sesión, la raíz lleva al tablero del rol", async ({ page }) => {
    await login(page, ADMIN, "/admin/dashboard");
    await page.goto("/");
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  });

  test("el tema elegido sobrevive a la recarga sin sesión", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Cambiar a tema oscuro/i });
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");
  });
});
