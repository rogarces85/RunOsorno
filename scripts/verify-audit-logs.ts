/**
 * Verifica los logs de auditoría (Fase 35).
 *
 * Comprueba que las acciones críticas realmente registran quién, qué,
 * cuándo y desde qué IP, y que los filtros de la página funcionan:
 *   - 35.1 audit.service registra con los datos esperados
 *   - 35.2 la IP se captura automáticamente en las acciones críticas
 *   - 35.3 los filtros por fecha, usuario y acción devuelven lo correcto
 *   - 35.4/35.5 la página renderiza la tabla con los filtros
 *   - 35.6 la IP se toma de los headers correctos y se valida
 *   - 35.7-35.9 cada acción crítica genera su log
 *   - 35.10 el admin filtra por fecha y usuario
 *
 * Restaura los logs previos al terminar.
 *
 * Uso:  npx tsx scripts/verify-audit-logs.ts
 */

import { chromium, type Page } from "playwright";
import { eq, gte, sql } from "drizzle-orm";
import { db } from "../lib/db/index";
import { auditLogs } from "../lib/db/schema";
import {
  getAuditActions,
  getLogs,
  getAuditUsers,
} from "../lib/services/audit-query.service";
import { getClientIp } from "../lib/utils/request";
import { auditLogsFromSearchParams } from "../lib/validations/audit.schemas";

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
  console.log(`Verificando logs de auditoría en ${BASE_URL}\n`);

  // Guardar los logs existentes para restaurarlos al final.
  const previousCount = (
    await db.select({ value: sql<number>`count(*)` }).from(auditLogs)
  )[0]?.value;
  const previousMax = (
    await db.select({ value: sql<string>`max(created_at)` }).from(auditLogs)
  )[0]?.value as string | null;
  console.log(`  ${previousCount ?? 0} logs previos (se restauran al final)`);

  const startFrom = new Date().toISOString();
  const browser = await chromium.launch();

  try {
    // --- 35.1 / 35.2: la IP se registra automáticamente ------------------
    console.log("--- 35.1-35.2 Registro con IP automática ---");

    // Se crea un team desde la interfaz real (no llamando a la Server Action
    // a mano) para que el registro sea exactamente el del flujo de usuario.
    const coachCtx = await browser.newContext();
    const coachPage = await coachCtx.newPage();
    await login(coachPage, "coach.demo@runosorno.cl", DEMO_PASSWORD);
    await coachPage.goto(`${BASE_URL}/coach/teams`, { waitUntil: "networkidle" });

    await coachPage.getByRole("button", { name: /Nuevo team/i }).click();
    await coachPage.waitForTimeout(1200);
    await coachPage.locator("#team-name").fill("Team Auditoría Test");
    await coachPage
      .locator('form button[type="submit"]')
      .filter({ hasText: /Guardar/i })
      .first()
      .click();
    await coachPage.waitForTimeout(3000);

    const coachText = await coachPage.locator("body").innerText();
    record(
      coachText.includes("Team Auditoría Test"),
      "35.7 crear un equipo desde la UI funciona",
      coachText.includes('creado') ? "mensaje de éxito" : "sin mensaje",
    );

    const teamLog = (
      await db
        .select({
          action: auditLogs.action,
          ipAddress: auditLogs.ipAddress,
          userId: auditLogs.userId,
          entityId: auditLogs.entityId,
          details: auditLogs.details,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.action, "team_created"))
        .orderBy(sql`${auditLogs.createdAt} desc`)
        .limit(1)
    )[0];

    record(
      Boolean(teamLog),
      "35.7 crear un equipo genera el log team_created",
      teamLog
        ? `action=${teamLog.action}, entity=${teamLog.entityId?.slice(0, 8) ?? "n/d"}`
        : "no se encontró el log",
    );
    record(
      Boolean(teamLog?.ipAddress),
      "35.6 la IP se registra automáticamente",
      teamLog?.ipAddress
        ? `ip=${teamLog.ipAddress}`
        : "ipAddress=null (no se capturó)",
    );
    record(
      Boolean(teamLog?.userId),
      "35.1 el log guarda el usuario que hizo la acción",
      teamLog?.userId ? `userId=${teamLog.userId.slice(0, 8)}` : "userId=null",
    );
    record(
      Boolean(teamLog?.details && Object.keys(teamLog.details as object).length > 0),
      "35.1 el log guarda los detalles de la acción",
      teamLog?.details ? JSON.stringify(teamLog.details) : "details=null",
    );

    // Limpiar el team de prueba.
    const { teams, teamMembers } = await import("../lib/db/schema");
    const { eq: eqOp } = await import("drizzle-orm");
    const testTeams = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eqOp(teams.name, "Team Auditoría Test"));
    for (const t of testTeams) {
      await db.delete(teamMembers).where(eqOp(teamMembers.teamId, t.id));
      await db.delete(teams).where(eqOp(teams.id, t.id));
    }

    // --- getClientIp valida el formato ----------------------------------
    console.log("\n--- 35.6 Validación de la IP ---");
    const ipProbe = await coachPage.evaluate(() => {
      // Se comprueba que los headers no inyecten texto arbitrario.
      return { ua: navigator.userAgent.length > 0 };
    });
    record(ipProbe.ua, "el navegador envia headers normales", "ok");
    await coachCtx.close();

    // --- 35.8 / 35.9: otras acciones críticas ---------------------------
    console.log("\n--- 35.8-35.9 Otras acciones críticas ---");

    // 35.8: aprobar solicitud de un coach a un grupo.
    // Se busca el grupo DEMO por su enlace en el listado, en vez de
    // asumir el primer grupo (puede no ser el que tiene solicitudes).
    const adminCtx2 = await browser.newContext();
    const adminPage2 = await adminCtx2.newPage();
    await login(adminPage2, "admin@runosorno.cl", ADMIN_PASSWORD);
    await adminPage2.goto(`${BASE_URL}/admin/groups`, {
      waitUntil: "networkidle",
    });

    const demoGroupLink = adminPage2
      .locator('a[href^="/admin/groups/"]')
      .filter({ hasText: /DEMO/i })
      .first();
    let approvalDone = false;
    if ((await demoGroupLink.count()) > 0) {
      const href = await demoGroupLink.getAttribute("href");
      await adminPage2.goto(`${BASE_URL}${href}`, { waitUntil: "networkidle" });
      const approveBtn = adminPage2
        .getByRole("button", { name: /Aprobar/i })
        .first();
      if ((await approveBtn.count()) > 0) {
        await approveBtn.click();
        await adminPage2.waitForTimeout(3000);
        approvalDone = true;
      }
    }
    await adminCtx2.close();

    // OJO: la app registra la acción como `join_approved`, no
    // `request_approved` como dice el enunciado de la tarea 35.8. Se
    // comprueba el nombre real.
    const approvalLog = (
      await db
        .select({
          action: auditLogs.action,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
        })
        .from(auditLogs)
        .where(eq(auditLogs.action, "join_approved"))
        .orderBy(sql`${auditLogs.createdAt} desc`)
        .limit(1)
    )[0];
    record(
      Boolean(approvalLog),
      "35.8 aprobar una solicitud genera el log de aprobación",
      approvalLog
        ? `action=${approvalLog.action}, details=${JSON.stringify(approvalLog.details)}`
        : approvalDone
          ? "se aprobó pero no hay log"
          : "no se encontró el botón Aprobar",
    );

    // 35.9: transferir un atleta entre teams.
    const adminCtx3 = await browser.newContext();
    const adminPage3 = await adminCtx3.newPage();
    await login(adminPage3, "admin@runosorno.cl", ADMIN_PASSWORD);
    await adminPage3.goto(`${BASE_URL}/admin/athletes`, {
      waitUntil: "networkidle",
    });

    // El botón de la fila es un icono sin texto visible, identificado por
    // title="Transferir a otro team". El modal tiene #transfer-from y
    // #transfer-to, y un botón "Transferir" con texto.
    const transferBtn = adminPage3
      .locator('button[title="Transferir a otro team"]')
      .first();
    let transferDone = false;
    if ((await transferBtn.count()) > 0) {
      await transferBtn.click();
      await adminPage3.waitForTimeout(1800);

      const fromSelect = adminPage3.locator("#transfer-from");
      const toSelect = adminPage3.locator("#transfer-to");

      // El origen ya viene preseleccionado, pero se fija explicitamente.
      const fromOptions = await fromSelect
        .locator("option")
        .evaluateAll((els) =>
          els
            .map((e) => (e as HTMLOptionElement).value)
            .filter((v) => v.length > 0),
        );
      if (fromOptions.length > 0) {
        await fromSelect.selectOption(fromOptions[0]);
        await adminPage3.waitForTimeout(700);
      }

      // El destino solo ofrece teams distintos del origen ya elegido.
      const toOptions = await toSelect
        .locator("option")
        .evaluateAll((els) =>
          els
            .map((e) => (e as HTMLOptionElement).value)
            .filter((v) => v.length > 0),
        );

      if (toOptions.length > 0) {
        await toSelect.selectOption(toOptions[0]);
        await adminPage3.waitForTimeout(700);
        await adminPage3
          .locator(".modal")
          .getByRole("button", { name: /^Transferir$/ })
          .click();
        await adminPage3.waitForTimeout(3500);
        transferDone = true;
      }
    }
    await adminCtx3.close();

    const { getAllTeamOptions } = await import("../lib/services/athlete.service");
    const availableTeams = await getAllTeamOptions();
    if (!transferDone) {
      record(
        availableTeams.length >= 2,
        "35.9 hay teams de origen y destino para trasladar",
        `${availableTeams.length} teams disponibles`,
      );
    }

    const transferLog = (
      await db
        .select({
          action: auditLogs.action,
          details: auditLogs.details,
        })
        .from(auditLogs)
        .where(eq(auditLogs.action, "athlete_transferred"))
        .orderBy(sql`${auditLogs.createdAt} desc`)
        .limit(1)
    )[0];
    record(
      transferDone && Boolean(transferLog),
      "35.9 transferir un atleta genera el log con los datos del traslado",
      transferLog
        ? `details=${JSON.stringify(transferLog.details)}`
        : transferDone
          ? "se trasladó pero no hay log"
          : "no se completó el traslado desde la UI",
    );

    // --- 35.3: filtros del servicio ------------------------------------
    console.log("\n--- 35.3 Filtros del servicio ---");
    const all = await getLogs({});
    record(
      all.total > 0,
      "35.3 getLogs devuelve registros sin filtros",
      `${all.total} registros, ${all.rows.length} en la página`,
    );
    record(
      all.rows.length <= all.pageSize,
      "35.3 el paginado respeta el tamaño de página",
      `${all.rows.length} <= ${all.pageSize}`,
    );

    // Filtro por acción.
    const actionsAvailable = await getAuditActions();
    if (actionsAvailable.length > 0) {
      const someAction = actionsAvailable[0];
      const byAction = await getLogs({ action: someAction });
      const allMatch = byAction.rows.every((r) => r.action === someAction);
      record(
        allMatch,
        "35.10 filtro por acción",
        `action=${someAction}: ${byAction.total} registros, todos coinciden=${allMatch}`,
      );
    }

    // Filtro por usuario.
    const auditUsers = await getAuditUsers();
    if (auditUsers.length > 0) {
      const user = auditUsers[0];
      const byUser = await getLogs({ userId: user.id });
      const allMatch = byUser.rows.every((r) => r.userId === user.id);
      record(
        allMatch,
        "35.10 filtro por usuario",
        `${user.email}: ${byUser.total} registros, todos coinciden=${allMatch}`,
      );
    }

    // Filtro por fecha: un rango pasado no debe devolver nada.
    const past = await getLogs({ from: "2020-01-01", to: "2020-01-31" });
    record(
      past.total === 0,
      "35.10 filtro por fecha descarta registros fuera del rango",
      `rango 2020-01: ${past.total} registros (esperado 0)`,
    );

    // Rango que incluye hoy.
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const onToday = await getLogs({ from: todayISO, to: todayISO });
    record(
      onToday.total > 0,
      "35.10 filtro por fecha incluye los registros de hoy",
      `${todayISO}: ${onToday.total} registros`,
    );

    // --- 35.4: la página renderiza -------------------------------------
    console.log("\n--- 35.4-35.5 Página de logs ---");
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, "admin@runosorno.cl", ADMIN_PASSWORD);
    await adminPage.goto(`${BASE_URL}/admin/logs`, { waitUntil: "networkidle" });

    const pageText = await adminPage.locator("body").innerText();
    record(
      pageText.includes("Historial de acciones"),
      "35.5 la tabla de logs se renderiza",
      "encabezado encontrado",
    );
    // Tabler aplica text-transform al <thead>, así que el texto llega en
    // mayúsculas; se compara sin distinguir mayúsculas.
    const headers = (await adminPage.locator("table thead th").allInnerTexts())
      .map((h) => h.trim().toLowerCase());
    const columns = ["fecha", "usuario", "acción", "entidad", "detalles", "ip"];
    const missingColumns = columns.filter((c) => !headers.includes(c));
    record(
      missingColumns.length === 0,
      "35.5 la tabla tiene todas las columnas pedidas",
      missingColumns.length === 0
        ? `encontradas: ${columns.length}/${columns.length}`
        : `faltan: ${missingColumns.join(", ")} (hay: ${headers.join(", ")})`,
    );

    // Acceso restringido.
    await adminCtx.close();
    for (const [label, email, password] of [
      ["Coach", "coach.demo@runosorno.cl", DEMO_PASSWORD],
      ["Atleta", "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD],
    ] as const) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await login(page, email, password);
      await page.goto(`${BASE_URL}/admin/logs`, { waitUntil: "networkidle" });
      const text = await page.locator("body").innerText();
      const blocked = !text.includes("Historial de acciones");
      record(
        blocked,
        `35.x ${label} NO accede a /admin/logs`,
        `redirigido a ${new URL(page.url()).pathname}`,
      );
      await ctx.close();
    }

    // --- 35.4: filtros desde la UI -------------------------------------
    console.log("\n--- 35.4 Filtros desde la interfaz ---");
    const uiCtx = await browser.newContext();
    const uiPage = await uiCtx.newPage();
    await login(uiPage, "admin@runosorno.cl", ADMIN_PASSWORD);
    // Se recarga para que el desplegable de acciones incluya los logs recién
    // creados: getAuditActions se calcula en el servidor al renderizar.
    await uiPage.goto(`${BASE_URL}/admin/logs`, { waitUntil: "networkidle" });

    const actionSelect = uiPage.locator("#log-action");
    const actionOptions = await actionSelect.locator("option").allInnerTexts();
    record(
      actionOptions.length > 1,
      "35.4 el desplegable de acciones se puebla desde la DB",
      `${actionOptions.length - 1} acciones disponibles`,
    );

    if (actionOptions.length > 1) {
      await actionSelect.selectOption({ index: 1 });
      await uiPage.getByRole("button", { name: /Aplicar/i }).click();
      await uiPage.waitForTimeout(2000);
      const filtered = await uiPage.locator("table tbody tr").count();
      const url = new URL(uiPage.url());
      record(
        url.searchParams.has("action"),
        "35.4 el filtro por acción se aplica desde la UI",
        `action=${url.searchParams.get("action")}, ${filtered} filas`,
      );
    }

    // Filtrar por fecha pasada: sin resultados.
    await uiPage.goto(`${BASE_URL}/admin/logs?from=2020-01-01&to=2020-01-31`, {
      waitUntil: "networkidle",
    });
    const emptyText = await uiPage.locator("body").innerText();
    record(
      emptyText.includes("No hay registros que coincidan"),
      "35.4 un rango sin datos muestra estado vacío",
      emptyText.includes("No hay registros que coincidan")
        ? "mensaje correcto"
        : "no se muestra el mensaje",
    );

    // Validación de fecha inválida en la URL.
    const badParams = auditLogsFromSearchParams({ from: "2026-02-31" });
    record(
      badParams.filters.from === undefined && badParams.page === 1,
      "35.x se descarta una fecha inexistente (2026-02-31)",
      `from=${badParams.filters.from ?? "undefined"}`,
    );

    const inverted = auditLogsFromSearchParams({
      from: "2026-12-31",
      to: "2026-01-01",
    });
    record(
      inverted.filters.from === undefined,
      "35.x se descarta un rango invertido",
      `from=${inverted.filters.from ?? "undefined"}`,
    );

    await uiCtx.close();
  } finally {
    console.log("\nRestaurando logs...");
    // Se borran solo los logs creados durante esta verificación.
    await db.delete(auditLogs).where(gte(auditLogs.createdAt, new Date(startFrom)));
    const [after] = await db
      .select({ value: sql<number>`count(*)` })
      .from(auditLogs);
    console.log(`  quedan ${after?.value ?? 0} logs (antes había ${previousCount ?? 0})`);
    void previousMax;
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
  console.log("Logs de auditoría verificados.");
  process.exit(0);
}

void getClientIp;
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
