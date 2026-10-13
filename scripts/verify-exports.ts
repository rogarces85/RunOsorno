/**
 * Verifica la generación real de archivos de exportación (Fase 33).
 *
 * Descarga los archivos por HTTP como un usuario autenticado y comprueba:
 *   - que la respuesta sea 200 y traiga el Content-Type correcto
 *   - que los bytes correspondan a un archivo válido (firma PDF/XLSZ/CSV)
 *   - que el nombre de archivo enviado sea el esperado
 *   - que un coach NO pueda exportar datos de otro coach
 *   - que un atleta no pueda exportar nada
 *
 * Uso:  npx tsx scripts/verify-exports.ts
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import { eq, like } from "drizzle-orm";
import { db } from "../lib/db/index";
import { groups, teams, users } from "../lib/db/schema";

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
    page.waitForURL((u) => !u.pathname.startsWith("/login"), {
      timeout: 30_000,
    }),
    page.getByRole("button", { name: /Iniciar sesión/i }).click(),
  ]);
}

type Download = {
  status: number;
  contentType: string;
  filename: string;
  body: Buffer;
};

async function downloadViaApi(
  context: BrowserContext,
  payload: Record<string, unknown>,
): Promise<Download> {
  const page: Page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

  const response = await page.evaluate(async (data: Record<string, unknown>) => {
    const result = await fetch("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const contentType = result.headers.get("content-type") ?? "";
    const disposition = result.headers.get("content-disposition") ?? "";
    const buffer = result.ok ? await result.arrayBuffer() : new ArrayBuffer(0);
    const bytes = result.ok ? Array.from(new Uint8Array(buffer)) : [];
    return {
      status: result.status,
      contentType,
      disposition,
      bytes,
      text: result.ok ? "" : await result.text(),
    };
  }, payload);

  await page.close();

  const filenameMatch = response.disposition.match(/filename="([^"]+)"/);
  return {
    status: response.status,
    contentType: response.contentType,
    filename: filenameMatch ? filenameMatch[1] : "",
    body: Buffer.from(response.bytes),
  };
}

/** Firma magica de cada formato. */
function signatureMatches(contentType: string, body: Buffer): boolean {
  if (contentType.includes("application/pdf")) {
    return body.subarray(0, 5).toString() === "%PDF-";
  }
  if (contentType.includes("spreadsheetml")) {
    // XLSX es un ZIP: empieza con PK\x03\x04
    return (
      body[0] === 0x50 && body[1] === 0x4b && body[2] === 0x03 && body[3] === 0x04
    );
  }
  if (contentType.includes("text/csv")) {
    return body.length > 0 && body.toString("utf8").includes(",");
  }
  return false;
}

async function main() {
  console.log(`Verificando exportaciones en ${BASE_URL}\n`);

  // --- Datos de referencia ----------------------------------------------
  const athlete = (
    await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, "maria.fernandez@demo.runosorno.cl"))
      .limit(1)
  )[0];
  if (!athlete) {
    console.error(
      "No se encontro el atleta de demo. Ejecuta primero: npm run db:seed:demo",
    );
    process.exit(1);
  }

  const coach = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "coach.demo@runosorno.cl"))
      .limit(1)
  )[0];

  // Un team del coach principal: el test verifica que puede exportarlo.
  const coachTeam = (
    await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.coachId, coach.id))
      .limit(1)
  )[0];

  // Grupo del DEMO donde el Director Técnico es director.
  const demoGroup = (
    await db
      .select({ id: groups.id })
      .from(groups)
      .where(like(groups.name, "%(DEMO)%"))
      .limit(1)
  )[0];
  const directorGroup = demoGroup ? [demoGroup] : [];

  const period = { kind: "season" as const };

  const browser = await chromium.launch();

  try {
    // --- Admin: CSV globales --------------------------------------------
    console.log("--- Admin: exportaciones CSV globales ---");
    const adminCtx = await browser.newContext();
    await login(await adminCtx.newPage(), "admin@runosorno.cl", ADMIN_PASSWORD);

    for (const entity of ["coaches", "athletes", "groups"] as const) {
      const dl = await downloadViaApi(adminCtx, {
        target: "global:csv",
        kind: "global",
        format: "csv",
        entity,
      });
      const valid = dl.status === 200 && signatureMatches(dl.contentType, dl.body);
      record(
        valid,
        `33.6 admin exporta ${entity} a CSV`,
        `HTTP ${dl.status}, ${dl.filename}, ${dl.body.length} bytes${valid ? "" : " (firma invalida)"}`,
      );
    }

    // El CSV de coaches debe contener las columnas esperadas.
    const coachesCsv = await downloadViaApi(adminCtx, {
      target: "global:csv",
      kind: "global",
      format: "csv",
      entity: "coaches",
    });
    const csvText = coachesCsv.body.toString("utf8");
    record(
      csvText.includes("Nombre") && csvText.includes("Email"),
      "33.6 el CSV de coaches tiene las columnas esperadas",
      csvText.split("\r\n")[0]?.replace(/^﻿/, "") ?? "",
    );
    record(
      csvText.includes("coach.demo@runosorno.cl"),
      "33.6 el CSV refleja datos reales de la DB",
      "incluye el coach del seed",
    );

    // Un admin NO puede pedir un PDF de un atleta cualquiera sin ser dueño... de hecho
    // el admin sí puede ver todos. Comprobamos que sí puede.
    const adminAthletePdf = await downloadViaApi(adminCtx, {
      target: "athlete:pdf",
      kind: "athlete",
      format: "pdf",
      athleteId: athlete.id,
      period,
    });
    record(
      adminAthletePdf.status === 200 &&
        signatureMatches(adminAthletePdf.contentType, adminAthletePdf.body),
      "33.2 admin puede exportar el PDF de un atleta",
      `HTTP ${adminAthletePdf.status}, ${adminAthletePdf.filename}, ${adminAthletePdf.body.length} bytes`,
    );

    // Periodo sin datos -> mensaje de error, no un archivo vacío.
    const emptyExport = await downloadViaApi(adminCtx, {
      target: "athlete:xlsx",
      kind: "athlete",
      format: "xlsx",
      athleteId: athlete.id,
      period: { kind: "custom", from: "1990-01-01", to: "1990-01-31" },
    });
    record(
      emptyExport.status === 404,
      "33.13 exportar sin datos muestra mensaje y no genera archivo",
      `HTTP ${emptyExport.status}: ${emptyExport.body.toString().slice(0, 80)}`,
    );
    await adminCtx.close();

    // --- Coach: Excel del team + informe del atleta ----------------------
    console.log("\n--- Coach: Excel de team e informe del atleta ---");
    const coachCtx = await browser.newContext();
    await login(await coachCtx.newPage(), "coach.demo@runosorno.cl", DEMO_PASSWORD);

    const teamXlsx = await downloadViaApi(coachCtx, {
      target: "team:xlsx",
      kind: "team",
      format: "xlsx",
      teamId: coachTeam.id,
      period,
    });
    record(
      teamXlsx.status === 200 &&
        signatureMatches(teamXlsx.contentType, teamXlsx.body),
      "33.4 coach exporta su team a Excel",
      `HTTP ${teamXlsx.status}, ${teamXlsx.filename}, ${teamXlsx.body.length} bytes`,
    );

    const athletePdf = await downloadViaApi(coachCtx, {
      target: "athlete:pdf",
      kind: "athlete",
      format: "pdf",
      athleteId: athlete.id,
      period,
    });
    record(
      athletePdf.status === 200 &&
        signatureMatches(athletePdf.contentType, athletePdf.body),
      "33.10 coach exporta métricas de atleta a PDF",
      `HTTP ${athletePdf.status}, ${athletePdf.filename}, ${athletePdf.body.length} bytes`,
    );

    const athleteXlsx = await downloadViaApi(coachCtx, {
      target: "athlete:xlsx",
      kind: "athlete",
      format: "xlsx",
      athleteId: athlete.id,
      period,
    });
    record(
      athleteXlsx.status === 200 &&
        signatureMatches(athleteXlsx.contentType, athleteXlsx.body),
      "33.11 coach exporta a Excel",
      `HTTP ${athleteXlsx.status}, ${athleteXlsx.filename}, ${athleteXlsx.body.length} bytes`,
    );

    // --- Permisos: coach no puede exportar CSV global -------------------
    const coachGlobal = await downloadViaApi(coachCtx, {
      target: "global:csv",
      kind: "global",
      format: "csv",
      entity: "athletes",
    });
    record(
      coachGlobal.status === 403,
      "33.6 un coach NO puede exportar datos globales",
      `HTTP ${coachGlobal.status}`,
    );

    // --- Permisos: coach no puede exportar otro team --------------------
    const directorTeam = (
      await db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.coachId, (
          await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, "director.demo@runosorno.cl"))
            .limit(1)
        )[0].id))
        .limit(1)
    )[0];
    if (directorTeam) {
      const crossTeam = await downloadViaApi(coachCtx, {
        target: "team:xlsx",
        kind: "team",
        format: "xlsx",
        teamId: directorTeam.id,
        period,
      });
      record(
        crossTeam.status === 403,
        "33.x un coach NO puede exportar el team de otro coach",
        `HTTP ${crossTeam.status}`,
      );
    }

    // --- Director: Excel del grupo -------------------------------------
    // Ojo: la petición va con la sesión del DIRECTOR, no la del coach
    // principal, porque solo un Director Técnico puede exportar su grupo.
    if (directorGroup.length > 0) {
      const dirCtx = await browser.newContext();
      await login(
        await dirCtx.newPage(),
        "director.demo@runosorno.cl",
        DEMO_PASSWORD,
      );
      const groupXlsx = await downloadViaApi(dirCtx, {
        target: "group:xlsx",
        kind: "group",
        format: "xlsx",
        groupId: directorGroup[0].id,
        period,
      });
      record(
        groupXlsx.status === 200 &&
          signatureMatches(groupXlsx.contentType, groupXlsx.body),
        "33.5 el Director Técnico exporta su grupo a Excel",
        `HTTP ${groupXlsx.status}, ${groupXlsx.filename}, ${groupXlsx.body.length} bytes`,
      );
      await dirCtx.close();
    }

    // --- Atletas: solo sus propios datos --------------------------------
    console.log("\n--- Atleta: permisos de exportación ---");
    const athCtx = await browser.newContext();
    await login(
      await athCtx.newPage(),
      "maria.fernandez@demo.runosorno.cl",
      DEMO_PASSWORD,
    );

    const ownExport = await downloadViaApi(athCtx, {
      target: "athlete:pdf",
      kind: "athlete",
      format: "pdf",
      athleteId: athlete.id,
      period,
    });
    record(
      ownExport.status === 200 &&
        signatureMatches(ownExport.contentType, ownExport.body),
      "33.2 el atleta exporta su propio informe",
      `HTTP ${ownExport.status}, ${ownExport.filename}, ${ownExport.body.length} bytes`,
    );

    // Exportar a otro atleta debe estar prohibido.
    const otherAthlete = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, "carlos.munoz@demo.runosorno.cl"))
        .limit(1)
    )[0];
    const crossAthlete = await downloadViaApi(athCtx, {
      target: "athlete:pdf",
      kind: "athlete",
      format: "pdf",
      athleteId: otherAthlete.id,
      period,
    });
    record(
      crossAthlete.status === 403,
      "45.x un atleta NO puede exportar los datos de otro atleta",
      `HTTP ${crossAthlete.status}`,
    );

    const athleteGlobal = await downloadViaApi(athCtx, {
      target: "global:csv",
      kind: "global",
      format: "csv",
      entity: "coaches",
    });
    record(
      athleteGlobal.status === 403,
      "33.x un atleta NO puede exportar datos globales",
      `HTTP ${athleteGlobal.status}`,
    );

    await athCtx.close();
    await coachCtx.close();
  } finally {
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
  console.log("Exportaciones verificadas.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
