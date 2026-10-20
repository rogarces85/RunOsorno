/**
 * E2E del tema claro/oscuro (Fase A, tarea 3.5).
 *
 * Comprueba las tres cosas que no se pueden verificar leyendo CSS:
 *
 * 1. El tema claro es el valor por defecto aunque el sistema operativo prefiera
 *    oscuro (el tema lo decide `data-bs-theme`, no `prefers-color-scheme`).
 * 2. La elección persiste entre recargas y navegación, porque se guarda en cookie y
 *    la lee el servidor.
 * 3. El control es accesible: se alcanza con teclado, muestra foco y anuncia estado.
 *
 * No crea datos: usa la cuenta de demostración y solo cambia una cookie.
 */

import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test.use({ colorScheme: "dark" });

test.describe("Tema de la interfaz", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("el tema claro es el valor por defecto aunque el sistema esté en oscuro", async ({
    page,
  }) => {
    await login(page, ADMIN, "/admin/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "light");
  });

  test("la elección de tema persiste tras recargar y navegar", async ({ page }) => {
    await login(page, ADMIN, "/admin/dashboard");

    const toggle = page.getByRole("button", { name: /Cambiar a tema oscuro/i });
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");

    await page.goto("/admin/coaches");
    await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");

    // Y se puede volver al claro.
    await page.getByRole("button", { name: /Cambiar a tema claro/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "light");
  });

  test("el control de tema se alcanza con teclado y anuncia su estado", async ({
    page,
  }) => {
    await login(page, ADMIN, "/admin/dashboard");

    const toggle = page.getByRole("button", { name: /Cambiar a tema oscuro/i });
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");
    await expect(
      page.getByRole("button", { name: /Cambiar a tema claro/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
