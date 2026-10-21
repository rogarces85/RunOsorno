import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración de las pruebas E2E (Fase 42).
 *
 * Por defecto el runner levanta el servidor de desarrollo (`npm run dev`) y lo
 * reutiliza si ya está corriendo, igual que hacen los scripts `verify-*`. Para
 * apuntar a otro entorno (preview, staging) se define `BASE_URL` y entonces no
 * se arranca ningún servidor:
 *
 *   BASE_URL=https://runosorno.online npx playwright test
 *
 * `workers: 1` y `fullyParallel: false` son deliberados: los flujos crean datos
 * reales (coaches, grupos, equipos, sesiones) sobre la base de desarrollo, y en
 * paralelo se pisarían entre sí.
 */

const PORT = process.env.PORT ?? "3000";
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const external = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    // La app formatea fechas y números en es-CL y usa America/Santiago: si el
    // navegador usa otra zona, las pruebas de calendario ven días distintos.
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
