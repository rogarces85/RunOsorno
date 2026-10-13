/**
 * Verifica la página de perfil y el cambio de contraseña (Fase 37).
 *
 * Comprueba el comportamiento real, incluida la decisión de proyecto de
 * cerrar TODAS las sesiones menos la actual:
 *   - 37.6 el usuario cambia la contraseña y puede entrar con la nueva
 *   - 37.4 se revocan las demás sesiones, pero la actual sobrevive
 *   - 37.7 el avatar se refleja en el header
 *   - validación: contraseña actual incorrecta, contraseñas que no
 *     coinciden y nueva contraseña demasiado corta
 *   - el email no se puede editar
 *
 * Restaura la contraseña original al terminar.
 *
 * Uso:  npx tsx scripts/verify-profile.ts
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db/index";
import { sessions, users } from "../lib/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DEMO_PASSWORD = "Demo1234!";
const NEW_PASSWORD = "NuevaClave2026!";

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail: string): void {
  results.push({ ok, label, detail });
  console.log(`  ${ok ? "OK   " : "FALLO"} ${label} — ${detail}`);
}

async function login(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: /Iniciar sesión/i }).click(),
  ]);
  return page;
}

async function sessionCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(sessions)
    .where(eq(sessions.userId, userId));
  return row?.n ?? 0;
}

async function main() {
  console.log(`Verificando perfil en ${BASE_URL}\n`);

  const maria = (
    await db
      .select({ id: users.id, name: users.name, hash: users.passwordHash })
      .from(users)
      .where(eq(users.email, "maria.fernandez@demo.runosorno.cl"))
      .limit(1)
  )[0];

  if (!maria) {
    console.error(
      "No se encontro el atleta de demo. Ejecuta: npm run db:seed:demo",
    );
    process.exit(1);
  }

  const originalHash = maria.hash;
  const originalName = maria.name;

  const browser = await chromium.launch();

  try {
    // --- La página carga -----------------------------------------------
    console.log("--- Página de perfil ---");
    const ctxA = await browser.newContext();
    const page = await login(ctxA, "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD);
    await page.goto(`${BASE_URL}/profile`, { waitUntil: "networkidle" });

    const text = await page.locator("body").innerText();
    record(
      text.includes("Datos personales") && text.includes("Seguridad"),
      "37.1 la página muestra datos personales y seguridad",
      "ambas secciones presentes",
    );
    record(
      (await page.locator("#profile-name").count()) > 0,
      "37.2 ProfileForm permite editar el nombre",
      "campo #profile-name presente",
    );
    record(
      (await page.locator("#current-password").count()) > 0 &&
        (await page.locator("#new-password").count()) > 0 &&
        (await page.locator("#confirm-password").count()) > 0,
      "37.3 PasswordChange pide actual, nueva y confirmación",
      "los 3 campos presentes",
    );
    const emailValue = await page.locator("#profile-email").inputValue();
    const emailDisabled = await page.locator("#profile-email").isDisabled();
    record(
      emailValue === "maria.fernandez@demo.runosorno.cl" && emailDisabled,
      "37.2 el email NO es editable",
      `valor="${emailValue}", deshabilitado=${emailDisabled}`,
    );

    // --- 37.7: el avatar se refleja en el header ------------------------
    console.log("\n--- 37.7 Avatar ---");
    const headerAvatar = page.locator("header img, .navbar-brand + img").first();
    const profileAvatar = page.locator('img[alt="' + maria.name + '"]').first();
    const headerOk = (await headerAvatar.count()) > 0;
    const profileOk = (await profileAvatar.count()) > 0;
    record(
      headerOk && profileOk,
      "37.7 el avatar se muestra en el perfil y en el header",
      `perfil=${profileOk ? "sí" : "no"}, header=${headerOk ? "sí" : "no"}`,
    );

    // --- Validaciones ---------------------------------------------------
    console.log("\n--- Validaciones del formulario ---");

    // Contraseñas que no coinciden (validación de cliente).
    await page.fill("#current-password", DEMO_PASSWORD);
    await page.fill("#new-password", NEW_PASSWORD);
    await page.fill("#confirm-password", "OtraClaveDistinta1!");
    await page.getByRole("button", { name: /Cambiar contraseña/i }).click();
    await page.waitForTimeout(1200);
    const mismatch = await page.locator("body").innerText();
    record(
      mismatch.includes("no coinciden"),
      "se rechazan contraseñas que no coinciden",
      mismatch.includes("no coinciden") ? "mensaje correcto" : "sin mensaje",
    );

    // Nueva contraseña demasiado corta.
    await page.fill("#current-password", DEMO_PASSWORD);
    await page.fill("#new-password", "corta");
    await page.fill("#confirm-password", "corta");
    await page.getByRole("button", { name: /Cambiar contraseña/i }).click();
    await page.waitForTimeout(1200);
    const shortText = await page.locator("body").innerText();
    record(
      shortText.includes("al menos 8 caracteres"),
      "se rechaza una contraseña menor a 8 caracteres",
      shortText.includes("al menos 8") ? "mensaje correcto" : "sin mensaje",
    );

    // Contraseña actual incorrecta (llega al servidor).
    await page.fill("#current-password", "ClaveIncorrecta99!");
    await page.fill("#new-password", NEW_PASSWORD);
    await page.fill("#confirm-password", NEW_PASSWORD);
    await page.getByRole("button", { name: /Cambiar contraseña/i }).click();
    await page.waitForTimeout(3000);
    const wrongCurrent = await page.locator("body").innerText();
    record(
      wrongCurrent.includes("no es correcta"),
      "se rechaza una contraseña actual incorrecta",
      wrongCurrent.includes("no es correcta")
        ? "mensaje del servidor mostrado"
        : `sin mensaje (texto: ${wrongCurrent.slice(0, 120)})`,
    );

    // Se vuelve a /profile por si el intento anterior dejó otro estado:
    // tras un error de servidor la página puede haber re-renderizado.
    await page.goto(`${BASE_URL}/profile`, { waitUntil: "networkidle" });
    await page.waitForSelector("#current-password", { timeout: 15_000 });

    // --- Sesiones antes del cambio -------------------------------------
    console.log("\n--- 37.4 Revocación de sesiones ---");
    // Se abre una segunda sesión en otro "dispositivo".
    const ctxB = await browser.newContext();
    await login(ctxB, "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD);
    const ctxC = await browser.newContext();
    const pageC = await login(ctxC, "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD);

    const sessionsBefore = await sessionCount(maria.id);
    record(
      sessionsBefore >= 3,
      "hay varias sesiones abiertas antes del cambio",
      `${sessionsBefore} sesiones de María`,
    );

    // --- 37.6: cambiar la contraseña desde la sesión principal ---------
    await page.fill("#current-password", DEMO_PASSWORD);
    await page.fill("#new-password", NEW_PASSWORD);
    await page.fill("#confirm-password", NEW_PASSWORD);
    await page.getByRole("button", { name: /Cambiar contraseña/i }).click();
    await page.waitForTimeout(3000);

    const afterChange = await page.locator("body").innerText();
    record(
      afterChange.includes("Contraseña actualizada"),
      "37.6 el cambio de contraseña se confirma",
      afterChange.includes("Contraseña actualizada")
        ? "mensaje de éxito"
        : "sin mensaje",
    );

    const sessionsAfter = await sessionCount(maria.id);
    record(
      sessionsAfter === 1,
      "37.4 solo queda la sesión actual",
      `${sessionsBefore} -> ${sessionsAfter} sesiones`,
    );

    // La sesión principal sigue viva.
    await page.goto(`${BASE_URL}/athlete/dashboard`, {
      waitUntil: "networkidle",
    });
    const stillIn = new URL(page.url()).pathname;
    record(
      stillIn === "/athlete/dashboard",
      "37.4 la sesión actual NO se cierra al cambiar la contraseña",
      `sigue en ${stillIn}`,
    );

    // Las otras sesiones deben quedar invalidadas: al navegar, el proxy
    // debe redirigir a /login.
    for (const [label, otherCtx, otherPage] of [
      ["sesión B", ctxB, null],
      ["sesión C", ctxC, pageC],
    ] as const) {
      const page = otherPage ?? (await otherCtx.newPage());
      await page.goto(`${BASE_URL}/athlete/dashboard`, {
        waitUntil: "networkidle",
      });
      const path = new URL(page.url()).pathname;
      record(
        path === "/login",
        `37.4 la ${label} queda cerrada`,
        `redirigida a ${path}`,
      );
      await otherCtx.close();
    }

    // --- 37.6: login con la nueva contraseña ---------------------------
    console.log("\n--- 37.6 Login con la nueva contraseña ---");
    const ctxD = await browser.newContext();
    await login(ctxD, "maria.fernandez@demo.runosorno.cl", NEW_PASSWORD);
    const newPassPath = new URL(ctxD.pages()[0].url()).pathname;
    record(
      newPassPath === "/athlete/dashboard",
      "37.6 se puede iniciar sesión con la nueva contraseña",
      `entra en ${newPassPath}`,
    );
    await ctxD.close();

    // La contraseña anterior ya no sirve.
    const ctxE = await browser.newContext();
    const pageE = await ctxE.newPage();
    await pageE.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await pageE.fill('input[name="email"]', "maria.fernandez@demo.runosorno.cl");
    await pageE.fill('input[name="password"]', DEMO_PASSWORD);
    await pageE.getByRole("button", { name: /Iniciar sesión/i }).click();
    await pageE.waitForTimeout(2500);
    const oldPassText = await pageE.locator("body").innerText();
    record(
      oldPassText.includes("Email o contraseña incorrectos") ||
        new URL(pageE.url()).pathname === "/login",
      "37.6 la contraseña anterior ya no permite entrar",
      oldPassText.includes("incorrectos")
        ? "rechazada con mensaje genérico"
        : `quedó en ${new URL(pageE.url()).pathname}`,
    );
    await ctxE.close();

    // --- Editar el nombre ----------------------------------------------
    console.log("\n--- 37.2 Editar nombre ---");
    // La sesión principal se navega a /athlete/dashboard arriba, así que
    // hay que volver al perfil antes de seguir.
    await page.goto(`${BASE_URL}/profile`, { waitUntil: "networkidle" });
    await page.waitForSelector("#profile-name", { timeout: 15_000 });

    await page.fill("#profile-name", "María Fernández Soto");
    await page.getByRole("button", { name: /Guardar cambios/i }).click();
    await page.waitForTimeout(2500);
    const nameSaved = await page.locator("body").innerText();
    record(
      nameSaved.includes("Datos actualizados"),
      "37.2 el nombre se actualiza",
      nameSaved.includes("Datos actualizados") ? "mensaje de éxito" : "sin mensaje",
    );

    const [row] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, maria.id))
      .limit(1);
    record(
      row?.name === "María Fernández Soto",
      "37.2 el nombre queda guardado en la DB",
      `name="${row?.name}"`,
    );

    await ctxA.close();
  } finally {
    console.log("\nRestaurando datos de María...");
    await db
      .update(users)
      .set({
        passwordHash: originalHash,
        name: originalName,
        mustChangePassword: false,
      })
      .where(eq(users.id, maria.id));
    console.log("  contraseña y nombre originales restaurados");
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n=====================================");
  console.log(`RESULTADO: ${passed}/${results.length} verificaciones OK`);
  if (failed.length > 0) {
    console.log(`\nFALLOS (${failed.length}):`);
    for (const f of failed) {
      console.log(`  - ${f.label} [${f.detail}]`);
    }
    process.exit(1);
  }
  console.log("Perfil verificado.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
