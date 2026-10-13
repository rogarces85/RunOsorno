/**
 * Verifica la página /exports y el botón de descarga en el navegador,
 * incluyendo la descarga real initiated por el usuario (tarea 33.9).
 */

import { chromium, type Browser, type Page } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_PASSWORD = "Admin1234!";
const DEMO_PASSWORD = "Demo1234!";

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail: string): void {
  results.push({ ok, label, detail });
  console.log(`  ${ok ? "OK   " : "FALLO"} ${label} — ${detail}`);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: /Iniciar sesión/i }).click(),
  ]);
}

async function main() {
  console.log(`Verificando UI de exportación en ${BASE_URL}\n`);
  const browser: Browser = await chromium.launch();

  try {
    // --- Página /exports por rol ---------------------------------------
    console.log("--- Página /exports ---");
    for (const [label, email, password, expectCards] of [
      ["Admin", "admin@runosorno.cl", ADMIN_PASSWORD, ["Coaches", "Atletas", "Grupos"]],
      ["Coach", "coach.demo@runosorno.cl", DEMO_PASSWORD, ["Resumen de teams"]],
    ] as const) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, email, password);
      await page.goto(`${BASE_URL}/exports`, { waitUntil: "networkidle" });

      const text = await page.locator("body").innerText();
      record(
        text.includes("Exportes"),
        `33.9 ${label} ve la página de exportes`,
        page.url().replace(BASE_URL, ""),
      );
      for (const card of expectCards) {
        record(
          text.includes(card),
          `33.9 ${label} ve la sección "${card}"`,
          text.includes(card) ? "presente" : "ausente",
        );
      }
      await ctx.close();
    }

    // --- Descarga real desde el botón ----------------------------------
    console.log("\n--- Descarga real desde el botón (admin, CSV) ---");
    const ctx = await browser.newContext({ acceptDownloads: true });
    const page = await ctx.newPage();
    await login(page, "admin@runosorno.cl", ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/exports`, { waitUntil: "networkidle" });

    const csvButtons = page.getByRole("button", { name: /Exportar CSV/i });
    const count = await csvButtons.count();
    record(count > 0, "33.8 hay botones de exportación CSV", `${count} botones`);

    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await csvButtons.first().click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    const path = await download.path();
    record(
      filename.endsWith(".csv"),
      "33.12 la descarga entrega un archivo CSV",
      `archivo="${filename}"`,
    );
    record(
      Boolean(path),
      "33.12 el archivo se descarga al disco del navegador",
      path ?? "sin ruta",
    );
    await ctx.close();
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n=====================================");
  console.log(`RESULTADO: ${passed}/${results.length} verificaciones OK`);
  if (failed.length > 0) {
    for (const f of failed) console.log(`  - ${f.label} [${f.detail}]`);
    process.exit(1);
  }
  console.log("UI de exportación verificada.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
