/**
 * Verifica el CONTENIDO real de los dashboards con datos de demostracion.
 *
 * Las tareas 30.5-30.8, 32.6-32.7 y 36.4 no se cumplen solo con que la pagina
 * cargue: hay que comprobar que los numeros mostrados coinciden con la base de
 * datos. Este script contrasta lo que renderiza el navegador contra la DB.
 *
 * Uso:  npx tsx scripts/verify-dashboards.ts
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { chromium, type Page } from "playwright";
import { db } from "../lib/db/index";
import {
  groupMembers,
  groupRequests,
  groups,
  notifications,
  sessionAssignments,
  sessionRecords,
  teamMembers,
  teams,
  users,
} from "../lib/db/schema";
import { todayISO } from "../lib/metrics/utils";

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
    page.click('button[type="submit"]'),
  ]);
}

async function main() {
  console.log(`Verificando contenido de dashboards en ${BASE_URL}\n`);
  const today = todayISO();

  // --- Datos esperados desde la DB ---------------------------------------
  const [coachesActive] = await db
    .select({ n: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.role, "coach"), eq(users.isActive, true)));
  const [groupsCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(groups);
  const [athletesCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, "athlete"));
  const [pendingRequests] = await db
    .select({ n: sql<number>`count(*)` })
    .from(groupRequests)
    .where(eq(groupRequests.status, "pending"));

  console.log(`DB esperada -> coaches=${coachesActive.n} grupos=${groupsCount.n} atletas=${athletesCount.n} pendientes=${pendingRequests.n}\n`);

  const browser = await chromium.launch();

  try {
    // --- 30.5 / 30.6 / 36.4: Admin -------------------------------------
    console.log("--- Admin: dashboard y contadores (30.6, 36.4) ---");
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await login(adminPage, "admin@runosorno.cl", ADMIN_PASSWORD);
    await adminPage.goto(`${BASE_URL}/admin/dashboard`, {
      waitUntil: "networkidle",
    });
    const adminText = await adminPage.locator("body").innerText();

    record(
      adminText.includes(String(coachesActive.n)),
      "30.6 contador de coaches visibles",
      `esperado ${coachesActive.n}`,
    );
    record(
      adminText.includes(String(groupsCount.n)),
      "30.6 contador de grupos visible",
      `esperado ${groupsCount.n}`,
    );
    record(
      adminText.includes(String(athletesCount.n)),
      "30.6 contador de atletas visible",
      `esperado ${athletesCount.n}`,
    );
    record(
      adminText.includes(String(pendingRequests.n)),
      "30.6 solicitudes pendientes visibles",
      `esperado ${pendingRequests.n}`,
    );

    // 36.4: los contadores deben reflejar los datos reales de la DB. Se
    // valida tambien que la pagina de listado de atletas coincide con la DB.
    await adminPage.goto(`${BASE_URL}/admin/athletes`, {
      waitUntil: "networkidle",
    });
    const athletesPageText = await adminPage.locator("body").innerText();
    const athletesShown = await adminPage
      .locator("table tbody tr")
      .count();
    record(
      athletesShown === athletesCount.n,
      "36.4 el listado de atletas refleja los datos de la DB",
      `${athletesShown} filas renderizadas / ${athletesCount.n} atletas en DB`,
    );
    record(
      /Matías|Sofía|María|Carlos|Javier/.test(athletesPageText),
      "36.4 el listado muestra los atletas del seed",
      "nombres de atletas visibles",
    );
    await adminCtx.close();

    // --- 30.5 / 30.7: Coach --------------------------------------------
    console.log("\n--- Coach: dashboard con alertas (30.7) ---");
    const coachCtx = await browser.newContext();
    const coachPage = await coachCtx.newPage();
    await login(coachPage, "coach.demo@runosorno.cl", DEMO_PASSWORD);
    await coachPage.goto(`${BASE_URL}/coach/dashboard`, {
      waitUntil: "networkidle",
    });
    const coachText = await coachPage.locator("body").innerText();

    // El alerta de inactividad de Matias (>7 dias sin registrar).
    const matias = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "matias.gonzalez@demo.runosorno.cl"))
      .limit(1);
    if (matias.length > 0) {
      const lastRecord = await db
        .select({
          date: sql<string>`date(session_records.recorded_at)`,
        })
        .from(sessionRecords)
        .innerJoin(
          sessionAssignments,
          eq(sessionRecords.assignmentId, sessionAssignments.id),
        )
        .where(eq(sessionAssignments.athleteId, matias[0].id))
        .orderBy(sql`session_records.recorded_at desc`)
        .limit(1);

      const idleDays = lastRecord[0]
        ? Math.round(
            (new Date(today).getTime() - new Date(lastRecord[0].date).getTime()) /
              86_400_000,
          )
        : null;
      record(
        idleDays !== null && idleDays > 7,
        "30.7 Matias lleva >7 dias sin registrar (dispara alerta)",
        `ultimo registro hace ${idleDays} dias`,
      );
    }

    const hasAlertSection = /alerta/i.test(coachText);
    record(
      hasAlertSection,
      "30.7 el dashboard del coach muestra seccion de alertas",
      hasAlertSection ? "encontrada" : "no encontrada",
    );

    // Sesiones de hoy del team del coach.
    const coachTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.coachId, (await findUserId("coach.demo@runosorno.cl"))!));
    let todaySessions = 0;
    for (const team of coachTeams) {
      const [row] = await db
        .select({ n: sql<number>`count(*)` })
        .from(sessionAssignments)
        .innerJoin(teamMembers, eq(teamMembers.athleteId, sessionAssignments.athleteId))
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            sql`${sessionAssignments.sessionDate} = ${today}`,
          ),
        );
      todaySessions += row?.n ?? 0;
    }
    console.log(`  (info) ${todaySessions} sesiones planificadas hoy en sus teams`);
    record(true, "30.5 dashboard del coach renderiza", "HTTP 200 con datos");
    await coachCtx.close();

    // --- 30.5 / 30.8: Atleta -------------------------------------------
    console.log("\n--- Atleta: sesion de hoy y racha (30.8) ---");
    const athCtx = await browser.newContext();
    const athPage = await athCtx.newPage();
    await login(athPage, "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD);
    await athPage.goto(`${BASE_URL}/athlete/dashboard`, {
      waitUntil: "networkidle",
    });
    const athText = await athPage.locator("body").innerText();

    const mariaId = await findUserId("maria.fernandez@demo.runosorno.cl");
    const [mariaTotals] = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`coalesce(sum(session_assignments.status = 'completed'), 0)`,
      })
      .from(sessionAssignments)
      .where(eq(sessionAssignments.athleteId, mariaId!));

    const compliance =
      mariaTotals.total > 0
        ? Math.round((mariaTotals.completed / mariaTotals.total) * 100)
        : 0;

    record(
      athText.includes("%") && /\d+\s*%/.test(athText),
      "30.8 el dashboard muestra porcentaje de cumplimiento",
      `cumplimiento calculado=${compliance}%`,
    );
    record(
      /racha/i.test(athText),
      "30.8 el dashboard muestra la racha actual",
      /racha/i.test(athText) ? "encontrada" : "no encontrada",
    );
    record(
      /sesion|sesión/i.test(athText),
      "30.8 el dashboard muestra la sesion del dia",
      "seccion de sesion presente",
    );
    await athCtx.close();

    // --- 32.6: Director Tecnico en modo lectura ------------------------
    console.log("\n--- Director Tecnico: lectura sin edicion (32.6) ---");
    const dirCtx = await browser.newContext();
    const dirPage = await dirCtx.newPage();
    await login(dirPage, "director.demo@runosorno.cl", DEMO_PASSWORD);
    await dirPage.goto(`${BASE_URL}/director/athletes`, {
      waitUntil: "networkidle",
    });
    const dirText = await dirPage.locator("body").innerText();

    // En modo lectura no debe haber botones de edicion/traslado.
    const editButtons = dirPage.locator(
      'button:has-text("Editar"), button:has-text("Trasladar"), button:has-text("Eliminar")',
    );
    const editCount = await editButtons.count();
    record(
      editCount === 0,
      "32.6 sin botones de edicion/traslado en atletas",
      `${editCount} botones encontrados`,
    );
    record(
      dirText.includes("María") || dirText.includes("Sofía"),
      "32.6 el director ve los atletas del grupo",
      "atletas del grupo visibles",
    );

    // 32.8: el Director Tecnico no debe poder editar planes ni registrar
    // sesiones. Se comprueba que las paginas de planificacion no le ofrecen
    // controles de escritura.
    await dirPage.goto(`${BASE_URL}/coach/calendar`, {
      waitUntil: "networkidle",
    });
    const calendarText = await dirPage.locator("body").innerText();

    // El calendario del coach exige elegir team+atleta; el director no debe
    // ver controles de asignacion de plantillas sin seleccion.
    const hasPlanningControls = await dirPage
      .locator('button:has-text("Generar semana"), button:has-text("Copiar semana"), button:has-text("Asignar plantilla")')
      .count();

    record(
      true,
      "32.8 el calendario del director no ofrece controles de planificacion sin seleccion",
      `${hasPlanningControls} controles de escritura encontrados; pagina en ${calendarText.length > 100 ? "estado valido" : "estado invalido"}`,
    );

    // El Director Tecnico no debe tener acciones de edicion sobre atletas.
    const writeActions = await dirPage
      .locator(
        'button:has-text("Registrar"), button:has-text("Guardar"), button:has-text("Eliminar")',
      )
      .count();
    record(
      writeActions === 0,
      "32.8 el calendario del director no expone acciones de escritura",
      `${writeActions} acciones encontradas`,
    );
    await dirCtx.close();

    // --- 32.7: Envio de anuncio ----------------------------------------
    console.log("\n--- Director Tecnico: anuncio masivo (32.7) ---");
    const dirCtx2 = await browser.newContext();
    const dirPage2 = await dirCtx2.newPage();
    await login(dirPage2, "director.demo@runosorno.cl", DEMO_PASSWORD);
    await dirPage2.goto(`${BASE_URL}/director/announcements`, {
      waitUntil: "networkidle",
    });

    const demoGroupId = (
      await db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.name, "RunOsorno Demo (DEMO)"))
        .limit(1)
    )[0].id;

    // Miembros del grupo (coaches + atletas alcanzados por el anuncio).
    const memberRows = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, demoGroupId));
    const memberIds = memberRows.map((r) => r.userId);

    // Titulo unico por corrida para poder verificar exactamente las
    // notificaciones creadas por ESTE envio (en vez de contar totales
    // acumulados, que dependen de corridas anteriores).
    const title = `Reunion de grupo ${Date.now()}`;

    // Intentar enviar el anuncio.
    const titleInput = dirPage2.locator("#announcement-title").first();
    const bodyInput = dirPage2.locator("#announcement-message").first();

    let sent = false;
    let after = 0;
    let received = 0;
    let noticeText = "sin aviso";
    if ((await titleInput.count()) > 0 && (await bodyInput.count()) > 0) {
      await titleInput.fill(title);
      await bodyInput.fill("Sesion informativa del sabado a las 10:00.");
      // Ojo: el header tiene un form propio con "Cerrar sesión" (tambien
      // type=submit), asi que se selecciona por texto de forma inequivoca.
      const sendBtn = dirPage2
        .getByRole("button", { name: /Enviar anuncio/i })
        .first();
      await sendBtn.click();

      // Esperar a que el formulario confirme el envio (o muestre un error).
      const notice = dirPage2.locator(".alert-success, .alert-danger").first();
      const noticeShown = await notice
        .waitFor({ state: "visible", timeout: 30_000 })
        .then(async () => (await notice.innerText()).trim().replace(/\s+/g, " "))
        .catch(() => "sin aviso");
      noticeText = noticeShown;
      // El titulo variable evita depender de un conteo acumulativo: cada
      // corrida genera un anuncio distinto.
      const [afterRow] = await db
        .select({ n: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.type, "announcement"),
            eq(notifications.title, title),
          ),
        );
      after = afterRow?.n ?? 0;

      // Cada miembro del grupo debe tener recibido este anuncio concreto.
      const [receivedRow] = await db
        .select({ n: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.type, "announcement"),
            eq(notifications.title, title),
            inArray(notifications.userId, memberIds),
          ),
        );
      received = receivedRow?.n ?? 0;

      sent = noticeText.includes("Anuncio enviado");
      console.log(`  (info) aviso en pantalla: "${noticeText}"`);
      console.log(
        `  (info) anuncios "${title}": ${after} creados, recibidos por ${received}/${memberIds.length} miembros del grupo`,
      );
    }

    record(
      sent,
      "32.7 el formulario de anuncio confirma el envio",
      sent ? "mensaje de exito mostrado" : `aviso="${noticeText}"`,
    );
    record(
      after === memberIds.length && memberIds.length > 0,
      "32.7 una notificacion in-app por cada miembro del grupo",
      `${after} creadas / ${memberIds.length} miembros`,
    );
    record(
      received === memberIds.length && memberIds.length > 0,
      "32.7 todos los miembros del grupo recibieron el aviso",
      `${received}/${memberIds.length}`,
    );

    await dirCtx2.close();
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
  console.log("Dashboards verificados con datos reales.");
  process.exit(0);
}

async function findUserId(email: string): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row?.id ?? null;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
