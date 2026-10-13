/**
 * Verifica que el formulario de login valide correctamente:
 * credenciales invalidas muestran un mensaje generico sin revelar si el
 * email existe (tareas 4.13 y 40.3).
 *
 * Uso:  npx tsx scripts/verify-login.ts
 */

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

type Case = {
  label: string;
  email: string;
  password: string;
  expectError: string;
};

const CASES: Case[] = [
  {
    label: "password incorrecto",
    email: "coach.demo@runosorno.cl",
    password: "ClaveMala123!",
    expectError: "Email o contraseña incorrectos",
  },
  {
    label: "email inexistente",
    email: "nadie@runosorno.cl",
    password: "Demo1234!",
    expectError: "Email o contraseña incorrectos",
  },
  {
    label: "email con password incorrecto",
    email: "maria.fernandez@demo.runosorno.cl",
    password: "otraClave9!",
    expectError: "Email o contraseña incorrectos",
  },
];

async function main() {
  console.log(`Verificando login en ${BASE_URL}\n`);
  const browser = await chromium.launch();
  const results: { ok: boolean; label: string; detail: string }[] = [];

  try {
    for (const testCase of CASES) {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.fill('input[name="email"]', testCase.email);
      await page.fill('input[name="password"]', testCase.password);
      await page.click('button[type="submit"]');

      // Esperar a que aparezca el alert de error.
      const alert = page.locator(".alert-danger").first();
      let ok = false;
      let detail = "sin mensaje de error";

      try {
        await alert.waitFor({ state: "visible", timeout: 10_000 });
        const text = (await alert.innerText()).trim();
        const stayedOnLogin = new URL(page.url()).pathname === "/login";
        // El mensaje debe ser generico: nunca revelar si el email existe.
        const isGeneric = text === testCase.expectError;
        ok = stayedOnLogin && isGeneric;
        detail = `mensaje="${text}", permanece en login=${stayedOnLogin}`;
      } catch {
        detail = "no aparecio el alert de error";
      }

      results.push({ ok, label: testCase.label, detail });
      console.log(
        `  ${ok ? "OK   " : "FALLO"} ${testCase.label} — ${detail}`,
      );
      await context.close();
    }

    // Verificar que el mensaje NO revela si el email existe.
    console.log("\nComprobacion de seguridad (mensaje generico):");
    const uniqueMessages = new Set<string>();
    for (const r of results) {
      const match = r.detail.match(/mensaje="([^"]+)"/);
      if (match) uniqueMessages.add(match[1]);
    }
    const isGeneric = uniqueMessages.size === 1;
    console.log(
      `  ${isGeneric ? "OK   " : "FALLO"} todos los casos muestran el mismo mensaje (${uniqueMessages.size} variantes)`,
    );
    results.push({
      ok: isGeneric,
      label: "mensaje generico (no revela existencia del email)",
      detail: `${uniqueMessages.size} variantes`,
    });
  } finally {
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
  console.log("El login se comporta correctamente.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
