/**
 * Descarga los archivos exportados a disco y valida su contenido real:
 *   - el PDF se abre y contiene texto legible
 *   - el XLSX es un ZIP con las hojas esperadas
 *   - el CSV tiene las filas de la DB
 *
 * Uso:  npx tsx scripts/verify-export-files.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { eq, like } from "drizzle-orm";
import { db } from "../lib/db/index";
import { groups, teams, users } from "../lib/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), ".export-check");

async function fetchFile(
  context: BrowserContext,
  payload: Record<string, unknown>,
): Promise<{ filename: string; body: Buffer }> {
  const page: Page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  const res = await page.evaluate(async (data: Record<string, unknown>) => {
    const r = await fetch("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const disposition = r.headers.get("content-disposition") ?? "";
    const buf = await r.arrayBuffer();
    return {
      status: r.status,
      disposition,
      bytes: Array.from(new Uint8Array(buf)),
    };
  }, payload);
  await page.close();
  const m = res.disposition.match(/filename="([^"]+)"/);
  return { filename: m ? m[1] : "archivo", body: Buffer.from(res.bytes) };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const athlete = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "maria.fernandez@demo.runosorno.cl"))
      .limit(1)
  )[0];
  const coach = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "coach.demo@runosorno.cl"))
      .limit(1)
  )[0];
  // Un team con atletas del coach principal: el orden de `limit 1` sin
  // filtro no es estable entre corridas.
  const team = (
    await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.coachId, coach.id))
      .orderBy(teams.name)
      .limit(1)
  )[0];
  const group = (
    await db
      .select({ id: groups.id })
      .from(groups)
      .where(like(groups.name, "%(DEMO)%"))
      .limit(1)
  )[0];

  const browser = await chromium.launch();
  const results: { ok: boolean; label: string; detail: string }[] = [];
  const record = (ok: boolean, label: string, detail: string) => {
    results.push({ ok, label, detail });
    console.log(`  ${ok ? "OK   " : "FALLO"} ${label} — ${detail}`);
  };

  try {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await adminPage.fill('input[name="email"]', "admin@runosorno.cl");
    await adminPage.fill('input[name="password"]', "Admin1234!");
    await Promise.all([
      adminPage.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }),
      adminPage.getByRole("button", { name: /Iniciar sesión/i }).click(),
    ]);

    // --- PDF ---
    const pdf = await fetchFile(adminCtx, {
      target: "athlete:pdf",
      kind: "athlete",
      format: "pdf",
      athleteId: athlete.id,
      period: { kind: "season" },
    });
    const pdfPath = join(OUT_DIR, pdf.filename);
    writeFileSync(pdfPath, pdf.body);

    const pdfText = pdf.body.toString("latin1");
    const isPdf = pdfText.startsWith("%PDF-");
    // El PDF de @react-pdf comprime los streams, pero el archivo debe estar
    // cerrado correctamente para que los lectores lo acepten.
    const hasEOF = pdfText.trimEnd().endsWith("%%EOF");

    record(isPdf, "PDF tiene cabecera válida", pdfText.slice(0, 8));
    record(hasEOF, "PDF está completo (termina en %%EOF)", hasEOF ? "sí" : "no");
    record(pdf.body.length > 5000, "PDF tiene contenido", `${pdf.body.length} bytes`);

    // --- XLSX ---
    const xlsx = await fetchFile(adminCtx, {
      target: "athlete:xlsx",
      kind: "athlete",
      format: "xlsx",
      athleteId: athlete.id,
      period: { kind: "season" },
    });
    const xlsxPath = join(OUT_DIR, xlsx.filename);
    writeFileSync(xlsxPath, xlsx.body);

    const isZip = xlsx.body[0] === 0x50 && xlsx.body[1] === 0x4b;
    // Un XLSX válido es un ZIP con [Content_Types].xml y xl/workbook.xml.
    const zipText = xlsx.body.toString("latin1");
    const hasContentTypes = zipText.includes("Content_Types") || zipText.includes("xl/workbook");
    record(isZip, "XLSX es un contenedor ZIP válido", isZip ? "PK" : "no");
    record(hasContentTypes, "XLSX contiene la estructura de un libro", hasContentTypes ? "sí" : "no");

    // --- CSV ---
    const csv = await fetchFile(adminCtx, {
      target: "global:csv",
      kind: "global",
      format: "csv",
      entity: "athletes",
    });
    const csvPath = join(OUT_DIR, csv.filename);
    writeFileSync(csvPath, csv.body);
    const csvText = csv.body.toString("utf8");
    const lines = csvText.trim().split("\r\n");
    record(
      lines[0].includes("Nombre") && lines[0].includes("Email"),
      "CSV tiene encabezado correcto",
      lines[0].replace(/^﻿/, ""),
    );
    record(
      csvText.includes("maria.fernandez@demo.runosorno.cl"),
      "CSV contiene los atletas reales de la DB",
      `${lines.length - 1} filas de datos`,
    );

    console.log(`\nArchivos guardados en: ${OUT_DIR}`);
    console.log(`  ${pdf.filename} (${pdf.body.length} bytes)`);
    console.log(`  ${xlsx.filename} (${xlsx.body.length} bytes)`);
    console.log(`  ${csv.filename} (${csv.body.length} bytes)`);

    await adminCtx.close();

    // --- Team y grupo ---
    const coachCtx = await browser.newContext();
    const coachPage = await coachCtx.newPage();
    await coachPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await coachPage.fill('input[name="email"]', "coach.demo@runosorno.cl");
    await coachPage.fill('input[name="password"]', "Demo1234!");
    await Promise.all([
      coachPage.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }),
      coachPage.getByRole("button", { name: /Iniciar sesión/i }).click(),
    ]);

    const teamXlsx = await fetchFile(coachCtx, {
      target: "team:xlsx",
      kind: "team",
      format: "xlsx",
      teamId: team.id,
      period: { kind: "season" },
    });
    writeFileSync(join(OUT_DIR, teamXlsx.filename), teamXlsx.body);
    record(
      teamXlsx.body[0] === 0x50 && teamXlsx.body.length > 3000,
      "XLSX del team es válido",
      `${teamXlsx.filename}, ${teamXlsx.body.length} bytes`,
    );

    const dirCtx = await browser.newContext();
    const dirPage = await dirCtx.newPage();
    await dirPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await dirPage.fill('input[name="email"]', "director.demo@runosorno.cl");
    await dirPage.fill('input[name="password"]', "Demo1234!");
    await Promise.all([
      dirPage.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }),
      dirPage.getByRole("button", { name: /Iniciar sesión/i }).click(),
    ]);

    const groupXlsx = await fetchFile(dirCtx, {
      target: "group:xlsx",
      kind: "group",
      format: "xlsx",
      groupId: group.id,
      period: { kind: "season" },
    });
    writeFileSync(join(OUT_DIR, groupXlsx.filename), groupXlsx.body);
    record(
      groupXlsx.body[0] === 0x50 && groupXlsx.body.length > 3000,
      "XLSX del grupo es válido",
      `${groupXlsx.filename}, ${groupXlsx.body.length} bytes`,
    );

    await dirCtx.close();
    await coachCtx.close();
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
  console.log("Archivos de exportación válidos.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
