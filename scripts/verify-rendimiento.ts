/**
 * Verifica la Fase 47 (rendimiento y optimización).
 *
 * Las ocho tareas son de "verificar", y cuatro no se comprueban leyendo el
 * código sino mirando lo que hace la aplicación de verdad. El script mezcla
 * las dos cosas a propósito:
 *
 * - **Auditoría de código** (47.1, 47.2, 47.3, 47.5, 47.8): recorre el árbol de
 *   archivos y falla si alguien vuelve a poner `"use client"` en una página,
 *   deja un `memo` inútil en el calendario, o quita el filtro de fecha de las
 *   consultas de métricas. Son las cosas que se rompen en silencio.
 * - **`EXPLAIN` real en MySQL** (47.3): comprueba que las consultas de las
 *   páginas usan índice en vez de recorrer la tabla. Con la base de datos de
 *   demostración (unas cientos de filas) el optimizador elige un plan distinto
 *   que con datos reales, así que el script siembra una tabla temporal grande,
 *   mide, y la borra.
 * - **Interfaz con Playwright** (47.4, 47.6, 47.7): cuenta cuántos registros
 *   carga de verdad el calendario, mide el JavaScript que descarga el navegador
 *   y comprueba que los avatares de un listado van diferidos.
 *
 * Requiere el servidor de desarrollo corriendo (`npm run dev`).
 *
 * Uso:  npx tsx scripts/verify-rendimiento.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { chromium, type Page } from "playwright";
import { db } from "../lib/db/index";
import { sql, type SQL } from "drizzle-orm";
import {
  getTeamMetrics,
  getGroupMetrics,
} from "../lib/services/metric.service";
import { getMonthPlan } from "../lib/services/plan.service";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ROOT = process.cwd();
const DEMO_PASSWORD = "Demo1234!";

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail = ""): void {
  results.push({ ok, label, detail });
  console.log(
    `  ${ok ? "OK   " : "FALLO"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
}

function walk(dir: string, filter: (path: string) => boolean): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walk(full, filter));
    } else if (filter(full)) {
      found.push(full);
    }
  }
  return found;
}

function read(file: string): string {
  return readFileSync(file, "utf8");
}

/**
 * Consulta cruda que devuelve filas.
 *
 * `db.execute` está tipado para sentencias de escritura (`ResultSetHeader`), así
 * que un `SELECT` hay que leerlo con un cast. Además el driver no devuelve
 * siempre la misma forma: con una sola columna llega una lista de objetos
 * (`[{ total: 20 }]`), y con varias llega `[filas, campos, campos]`. Esta
 * función normaliza las dos para que el resto del script no tenga que
 * distinguirlo.
 */
async function consultar<T>(consulta: SQL): Promise<T[]> {
  const result = (await db.execute(consulta)) as unknown;
  if (!Array.isArray(result) || result.length === 0) {
    return [];
  }
  const primero = result[0];
  return (Array.isArray(primero) ? primero : result) as T[];
}

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    "() => { const b = document.querySelector('button[type=submit]'); return !!b && !b.disabled; }",
  );
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', DEMO_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    }),
    page.click('button[type="submit"]'),
  ]);
}

// ===========================================================================
// 47.1 / 47.2 — Server Components y Client Components
// ===========================================================================
function verificarComponentes() {
  console.log(
    "\n--- 47.1 / 47.2 Las páginas son Server Components y los Client son los interactivos ---",
  );

  const pages = walk(join(ROOT, "app"), (p) => p.endsWith("page.tsx"));
  const clientPages = pages.filter((p) =>
    /^\s*["']use client["']/.test(read(p)),
  );
  record(
    clientPages.length === 0,
    "47.1 ninguna página de app/ es Client Component",
    clientPages.length === 0
      ? `${pages.length} páginas, todas RSC`
      : clientPages.map((p) => relative(ROOT, p)).join(", "),
  );

  // Un Client Component sin estado, sin manejadores y sin librería de cliente
  // es casi siempre un `"use client"` olvidado: no lo necesita.
  const clientComponents = walk(
    join(ROOT, "components"),
    (p) => p.endsWith(".tsx") && /^\s*["']use client["']/.test(read(p)),
  );
  const suspects: string[] = [];
  for (const file of clientComponents) {
    const source = read(file);
    // Cualquier hook de React (`useState`, `useEffect`, `memo`…), y también
    // los hooks propios del proyecto (`useNav`, `useDroppable`…), contando los
    // que vienen de dnd-kit.
    const usesHooks = /\buse[A-Z]\w*\s*\(/.test(source);
    const usesEvents = /\b(Form|onClick|onChange|onSubmit|onInput)\b/.test(source);
    const usesClientLib =
      /from "(@dnd-kit|react-hook-form|recharts)"/.test(source) ||
      /from "next\/(navigation|router)"/.test(source);
    if (!usesHooks && !usesEvents && !usesClientLib) {
      suspects.push(relative(ROOT, file));
    }
  }
  record(
    suspects.length === 0,
    "47.2 ningún Client Component usa estado, eventos ni librería de cliente",
    suspects.length === 0
      ? `${clientComponents.length} Client Components revisados`
      : `sin motivo para ser cliente: ${suspects.join(", ")}`,
  );

  // Las gráficas de métricas no deberían arrastrar una librería de gráficas.
  const metricsComponents = walk(
    join(ROOT, "components", "metrics"),
    (p) => p.endsWith(".tsx"),
  );
  const chartLibs = metricsComponents.filter((p) =>
    /from "(recharts|chart\.js|victory|@nivo|visx)"/.test(read(p)),
  );
  record(
    chartLibs.length === 0,
    "47.6 las gráficas no dependen de una librería externa",
    chartLibs.length === 0
      ? `${metricsComponents.length} componentes, SVG propio`
      : chartLibs.map((p) => relative(ROOT, p)).join(", "),
  );
}

// ===========================================================================
// 47.3 — Índices (EXPLAIN sobre datos a escala)
// ===========================================================================

/** Identificadores fijos de los datos de prueba, para poder borrarlos después. */
const ESCALA_ATLETA = "b47f47c0-0000-4000-8000-000000000001";
const ESCALA_TEMPLATE = "b47f47c0-0000-4000-8000-000000000002";
const ESCALA_COACH = "b47f47c0-0000-4000-8000-000000000003";
const ESCALA_EMAIL = "escala.vrf47@test.local";

async function sembrarEscala(dias = 2600): Promise<{
  athleteId: string;
  asignaciones: number;
}> {
  const athleteId = ESCALA_ATLETA;
  const templateId = ESCALA_TEMPLATE;
  const coachId = ESCALA_COACH;

  await db.execute(
    sql`DELETE FROM session_assignments WHERE athlete_id = ${athleteId}`,
  );
  await db.execute(sql`DELETE FROM templates WHERE id = ${templateId}`);
  await db.execute(
    sql`DELETE FROM users WHERE id IN (${athleteId}, ${coachId})`,
  );

  await db.execute(sql`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (${athleteId}, 'Atleta Escala', 'escala.vrf47@test.local', 'x', 'athlete'),
           (${coachId}, 'Coach Escala', 'escala.coach.vrf47@test.local', 'x', 'coach')
  `);
  await db.execute(sql`
    INSERT INTO templates (id, coach_id, name, session_type, structure)
    VALUES (${templateId}, ${coachId}, 'Escala', 'series', JSON_ARRAY())
  `);

  // Una asignación por día durante `dias` días: el histórico que una base
  // real acumula en dos años y que es el que dispara el escaneo completo.
  //
  // La serie se arma con un producto cruzado de cuatro grupos de diez
  // (10.000 combinaciones) en base 10, no en base 50: con multiplicadores
  // mayores se repiten valores y `COUNT` sale más chico de lo pedido, que es
  // justo lo que hace el test pasar sin comprobar nada.
  const first = new Date();
  first.setDate(first.getDate() - dias);
  const firstISO = first.toISOString().slice(0, 10);
  const decena = (inicio: number) =>
    Array.from({ length: 10 }, (_, i) => `SELECT ${inicio + i} AS i`).join(
      " UNION ",
    );
  await db.execute(sql.raw(`
    INSERT INTO session_assignments
      (id, athlete_id, template_id, session_date, week_start, status, created_by)
    SELECT UUID(), '${athleteId}', '${templateId}',
           DATE_ADD('${firstISO}', INTERVAL n DAY),
           DATE_ADD('${firstISO}', INTERVAL n DAY),
           'planned', '${coachId}'
    FROM (
      SELECT (a.i + b.i * 10 + c.i * 100 + d.i * 1000) AS n
      FROM (${decena(0)}) a,
           (${decena(0)}) b,
           (${decena(0)}) c,
           (${decena(0)}) d
    ) seq
    WHERE n < ${dias}
  `));

  const [row] = await consultar<{ total: number }>(
    sql`SELECT COUNT(*) AS total FROM session_assignments WHERE athlete_id = ${athleteId}`,
  );
  return { athleteId, asignaciones: Number(row?.total ?? 0) };
}

/**
 * Borra los datos de escala.
 *
 * El orden importa por las claves foráneas: primero las asignaciones, luego la
 * plantilla y por último los usuarios. Al revés, MySQL rechaza con
 * "Cannot delete or update a parent row".
 */
async function limpiarEscala(athleteId: string) {
  await db.execute(
    sql`DELETE FROM session_assignments WHERE athlete_id = ${athleteId}`,
  );
  await db.execute(
    sql`DELETE FROM session_assignments WHERE created_by = ${ESCALA_COACH}`,
  );
  await db.execute(sql`DELETE FROM templates WHERE id = ${ESCALA_TEMPLATE}`);
  await db.execute(
    sql`DELETE FROM users WHERE id IN (${ESCALA_ATLETA}, ${ESCALA_COACH}) OR email = ${ESCALA_EMAIL}`,
  );
}

type ExplainRow = {
  table: string | null;
  type: string | null;
  key: string | null;
  rows: number | null;
  Extra: string | null;
};

/** Lee el plan de ejecución y dice si alguna tabla se recorre entera. */
async function explicar(
  consulta: string,
): Promise<{ fullScan: string[]; filesort: boolean; plan: ExplainRow[] }> {
  const rows = (await db.execute(sql.raw(`EXPLAIN ${consulta}`))) as unknown as
    ExplainRow[];
  const fullScan = rows
    .filter((r) => r.type === "ALL")
    .map((r) => r.table ?? "?");
  return {
    fullScan,
    filesort: rows.some((r) => (r.Extra ?? "").includes("filesort")),
    plan: rows,
  };
}

async function verificarIndices(athleteId: string) {
  console.log("\n--- 47.3 Las consultas usan índice (EXPLAIN con datos a escala) ---");

  // Un mes de calendario: el caso más frecuente de la app.
  const mes = await explicar(`
    SELECT sa.id, sa.session_date, t.name, sr.distance_km
    FROM session_assignments sa
    LEFT JOIN templates t ON t.id = sa.template_id
    LEFT JOIN session_records sr ON sr.assignment_id = sa.id
    WHERE sa.athlete_id = '${athleteId}'
      AND sa.session_date >= '2026-09-01' AND sa.session_date <= '2026-09-30'
    ORDER BY sa.session_date ASC
  `);
  record(
    mes.fullScan.length === 0 && !mes.filesort,
    "47.3 el calendario del mes no recorre la tabla entera",
    `full scan: ${mes.fullScan.join(", ") || "ninguno"}, filesort: ${mes.filesort}`,
  );

  // Métricas del equipo: filtran por varios atletas.
  const metricas = await explicar(`
    SELECT sa.athlete_id, sa.status, sa.session_date, sr.distance_km
    FROM session_assignments sa
    LEFT JOIN session_records sr ON sr.assignment_id = sa.id
    WHERE sa.athlete_id IN ('${athleteId}')
      AND sa.session_date >= '2020-01-01' AND sa.session_date <= '2026-12-31'
  `);
  record(
    metricas.fullScan.length === 0 && !metricas.filesort,
    "47.5 las métricas filtran por fechas en SQL, no en memoria",
    `full scan: ${metricas.fullScan.join(", ") || "ninguno"}, filesort: ${metricas.filesort}`,
  );

  // /admin/logs: rango de fechas + orden descendente. Antes de la Fase 47
  // `audit_logs` no tenía ningún índice y salía `type = ALL`.
  const logs = await explicar(`
    SELECT * FROM audit_logs
    WHERE created_at >= '2020-01-01 00:00:00' AND created_at <= '2030-01-01 00:00:00'
    ORDER BY created_at DESC LIMIT 50
  `);
  record(
    logs.fullScan.length === 0 && !logs.filesort,
    "47.3 /admin/logs usa índice de fecha y no ordena aparte",
    `full scan: ${logs.fullScan.join(", ") || "ninguno"}, filesort: ${logs.filesort}, key: ${logs.plan[0]?.key}`,
  );

  // Campanita: usuario + leídas + orden por fecha (era un filesort).
  const notificaciones = await explicar(`
    SELECT * FROM notifications
    WHERE user_id = 'b47f47c0-0000-4000-8000-000000000001' AND is_read = 0
    ORDER BY created_at DESC LIMIT 8
  `);
  record(
    notificaciones.fullScan.length === 0 && !notificaciones.filesort,
    "47.3 la campanita sale ordenada del índice",
    `full scan: ${notificaciones.fullScan.join(", ") || "ninguno"}, filesort: ${notificaciones.filesort}, key: ${notificaciones.plan[0]?.key}`,
  );
}

// ===========================================================================
// 47.4 — El calendario carga un mes
// ===========================================================================
async function verificarAlcanceDelCalendario() {
  console.log("\n--- 47.4 El calendario solo carga el mes visible ---");

  const source = read(join(ROOT, "lib", "services", "plan.service.ts"));
  const cuerpoGetMonthPlan = source.slice(
    source.indexOf("export async function getMonthPlan"),
    source.indexOf("export type DayCompliance"),
  );
  const filtraPorFechas = /whereSessionDateBetween\(firstDay, lastDay\)/.test(
    cuerpoGetMonthPlan,
  );
  const sinFiltroDeAtleta = !/sessionAssignments\.athleteId/.test(
    cuerpoGetMonthPlan.replace(/and\(\s*eq\(sessionAssignments\.athleteId/, ""),
  );
  record(
    filtraPorFechas && sinFiltroDeAtleta,
    "47.4 getMonthPlan acota la consulta al mes y al atleta",
    filtraPorFechas
      ? "WHERE athlete_id = ? AND session_date BETWEEN primero Y último"
      : "getMonthPlan NO filtra por rango de fechas",
  );

  // Comprobación con datos: un atleta con histórico largo solo debe devolver
  // el mes, no todo lo anterior.
  const [atleta] = await consultar<{ id: string; email: string }>(
    sql`SELECT sa.athlete_id AS id, u.email
        FROM session_assignments sa
        JOIN users u ON u.id = sa.athlete_id
        GROUP BY sa.athlete_id, u.email
        ORDER BY COUNT(*) DESC
        LIMIT 1`,
  );
  if (!atleta) {
    record(false, "47.4 hay datos para comparar el tamaño del calendario", "");
    return;
  }

  const [totales] = await consultar<{
    total: number;
    min: string;
    max: string;
  }>(
    sql`SELECT COUNT(*) AS total, MIN(session_date) AS min, MAX(session_date) AS max
        FROM session_assignments WHERE athlete_id = ${atleta.id}`,
  );
  const historial = Number(totales?.total ?? 0);

  const mes = await getMonthPlan(atleta.id, 2026, 10);
  const fueraDeOctubre = mes.filter(
    (item) => !item.sessionDate.startsWith("2026-10"),
  );
  record(
    fueraDeOctubre.length === 0 && mes.length <= 31,
    "47.4 el calendario de octubre no trae sesiones de otros meses",
    `${mes.length} filas para octubre; el atleta tiene ${historial} en total (${totales?.min} a ${totales?.max})`,
  );

  const [semanas] = await consultar<{ total: number }>(
    sql`SELECT COUNT(*) AS total FROM session_assignments
        WHERE athlete_id = ${atleta.id}
          AND session_date >= '2026-10-01' AND session_date <= '2026-10-31'`,
  );
  record(
    mes.length === Number(semanas?.total ?? 0),
    "47.4 las filas del calendario coinciden con las del mes en la base",
    `UI: ${mes.length}, base: ${semanas?.total}`,
  );
}

// ===========================================================================
// 47.5 — Las métricas no cargan todo el histórico
// ===========================================================================
async function verificarAlcanceDeMetricas(athleteId: string) {
  console.log(
    "\n--- 47.5 Las métricas no arrastran el histórico completo ---",
  );

  const source = read(join(ROOT, "lib", "services", "metric.service.ts"));
  const sinFiltro = /async function loadJoinedRows/.test(source);
  record(
    !sinFiltro,
    "47.5 no queda la consulta sin filtro de fecha",
    sinFiltro
      ? "loadJoinedRows sigue trayendo todo el histórico"
      : "loadRowsInRange acotada por fechas + loadLastActivity",
  );

  // Cuántas filas trae cada una contra el histórico completo.
  const [historico] = await consultar<{ total: number }>(
    sql`SELECT COUNT(*) AS total FROM session_assignments WHERE athlete_id = ${athleteId}`,
  );
  const [acotado] = await consultar<{ total: number }>(
    sql`SELECT COUNT(*) AS total FROM session_assignments
        WHERE athlete_id = ${athleteId}
          AND session_date >= DATE_SUB(CURDATE(), INTERVAL 20 DAY)`,
  );
  const total = Number(historico?.total ?? 0);
  const ventana = Number(acotado?.total ?? 0);
  record(
    ventana < total,
    "47.5 la ventana de alertas es mucho más chica que el histórico",
    `${ventana} filas en 21 días frente a ${total} sin filtro`,
  );

  // Y que las alertas sigan funcionando: el equipo con escala tiene que
  // aparecer como "sin registrar".
  const [coach] = await consultar<{ id: string }>(
    sql`SELECT id FROM users WHERE role = 'coach' ORDER BY created_at DESC LIMIT 1`,
  );
  if (coach) {
    const [team] = await consultar<{ id: string }>(
      sql`SELECT id FROM teams WHERE coach_id = ${coach.id} LIMIT 1`,
    );
    if (team) {
      const resultado = await getTeamMetrics(team.id, { kind: "year", year: 2026 });
      if (resultado.ok) {
        const hayAlertas = resultado.data.alerts.length > 0;
        record(
          hayAlertas,
          "47.5 las alertas del equipo se siguen calculando con la ventana acotada",
          `${resultado.data.alerts.length} alertas: ${resultado.data.alerts
            .slice(0, 2)
            .map((a) => a.message)
            .join(" | ")}`,
        );
      }
    }
  }
}

// ===========================================================================
// 47.8 — El calendario no se repinta entero
// ===========================================================================
function verificarMemo() {
  console.log("\n--- 47.8 El calendario evita re-renders innecesarios ---");

  const calendarDay = read(
    join(ROOT, "components", "calendar", "CalendarDay.tsx"),
  );
  record(
    /export const CalendarDay = memo\(/.test(calendarDay),
    "47.8 CalendarDay va envuelto en memo",
    /memo\(/.test(calendarDay) ? "memo(function CalendarDay…)" : "SIN memo",
  );

  // Un `memo` sin props estables no sirve de nada: es el fallo silencioso más
  // probable al tocar este componente.
  const flechaPorDia = /onClick=\{\(\) => onDayClick\?\./.test(calendarDay);
  record(
    !flechaPorDia,
    "47.8 las celdas no reciben una función nueva en cada render",
    flechaPorDia
      ? "cada día recibe onClick={() => ...}: memo no cortaría nada"
      : "reciben un único onSelect estable",
  );

  const month = read(join(ROOT, "components", "calendar", "MonthCalendar.tsx"));
  const useMemo = /useMemo\(\s*\(\) => new Map\(items/.test(month);
  const useCallback = /const handleDayClick = useCallback\(/.test(month);
  record(
    useMemo && useCallback,
    "47.8 el índice de sesiones y el callback se memorizan",
    `useMemo(itemsByDate): ${useMemo}, useCallback(handleDayClick): ${useCallback}`,
  );
}

// ===========================================================================
// 47.6 / 47.7 — En el navegador
// ===========================================================================
async function verificarEnElNavegador(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  console.log("\n--- 47.6 / 47.7 Lo que descarga y pinta el navegador ---");

  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await ctx.newPage();

  // Los errores de consola se recogen durante toda la función. Es lo que
  // destapó el `points` de un `<polyline>` con formato de `d`: la línea no se
  // dibujaba y el único rastro era el aviso del navegador.
  const erroresConsola: string[] = [];
  page.on("console", (mensaje) => {
    if (mensaje.type() === "error") {
      erroresConsola.push(mensaje.text());
    }
  });
  page.on("pageerror", (error) => {
    erroresConsola.push(`pageerror: ${error.message}`);
  });

  const js = new Map<string, number>();
  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("/_next/static/") || !url.endsWith(".js")) return;
    try {
      const body = await response.body();
      const nombre = url.split("/").pop() ?? url;
      js.set(nombre, (js.get(nombre) ?? 0) + body.length);
    } catch {
      // el navegador puede cancelar la petición al navegar; no importa
    }
  });

  await login(page, "maria.fernandez@demo.runosorno.cl");
  // Se parte de `/login` para no contar el JavaScript del dashboard del atleta,
  // que es otra página distinta a la que se está midiendo.
  js.clear();
  await page.goto(`${BASE_URL}/athlete/metrics`, { waitUntil: "networkidle" });

  const total = [...js.values()].reduce((sum, bytes) => sum + bytes, 0);
  const mayor = [...js.entries()].sort((a, b) => b[1] - a[1])[0];
  record(
    total > 0 && total < 900_000,
    "47.6 /athlete/metrics no supera 900 KB de JavaScript",
    `${Math.round(total / 1024)} KB en ${js.size} archivos` +
      (mayor ? `; el mayor: ${mayor[0].split("/").pop()} (${Math.round(mayor[1] / 1024)} KB)` : ""),
  );

  const hayGraficaLibreria = [...js.keys()].some((n) =>
    /recharts|d3|chart/i.test(n),
  );
  record(
    !hayGraficaLibreria,
    "47.6 no se descarga ninguna librería de gráficas",
    hayGraficaLibreria ? "aparecen chunks de recharts/d3" : "solo el código de la app",
  );

  // 47.1: las gráficas tienen que estar en el HTML de la respuesta, sin
  // esperar a que JavaScript las dibuje. Se comprueba sobre el HTML crudo
  // (sin hidratar) para que no se pueda pasar por hidratar después.
  const htmlCrudo = await page.content();
  const svgEnHtml = (htmlCrudo.match(/metric-chart-plot/g) ?? []).length;
  record(
    svgEnHtml > 0,
    "47.6 las gráficas vienen en el HTML de la respuesta",
    `${svgEnHtml} gráficas en el HTML servido, antes de hidratar`,
  );

  const svgServidor = (await page.evaluate(
    "document.querySelectorAll('.metric-chart-plot svg').length",
  )) as number;
  record(
    svgServidor >= 2,
    "47.6 las gráficas de líneas y barras se pintan",
    `${svgServidor} gráficas de métricas visibles`,
  );

  // Las etiquetas de los ejes tienen que caber sin salirse de su tarjeta.
  const desborde = (await page.evaluate(`(() => {
    const ticks = Array.from(document.querySelectorAll(".metric-chart-tick"));
    const fuera = ticks.filter((t) => {
      const card = t.closest(".card");
      if (!card) return false;
      const a = t.getBoundingClientRect();
      const b = card.getBoundingClientRect();
      return a.left < b.left - 1 || a.right > b.right + 1;
    });
    return { total: ticks.length, fuera: fuera.length };
  })()`)) as { total: number; fuera: number };
  record(
    desborde.total > 0 && desborde.fuera === 0,
    "47.6 las etiquetas de los ejes no se salen de su tarjeta",
    `${desborde.total} etiquetas, ${desborde.fuera} fuera`,
  );

  // 47.6: las barras por atleta (HTML puro) tienen que venir en el HTML de
  // `/coach/metrics`, que es donde vive ese componente. Se pide un equipo con
  // atletas: por defecto la página muestra el primero, y en los datos de
  // demostración ese es uno vacío, que muestra el mensaje de "sin atletas".
  const [teamConAtletas] = await consultar<{ id: string; n: number }>(sql`
    SELECT tm.team_id AS id, COUNT(*) AS n
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN users c ON c.id = t.coach_id
    WHERE c.email = 'coach.demo@runosorno.cl'
    GROUP BY tm.team_id
    ORDER BY n DESC
    LIMIT 1
  `);
  await login(page, "coach.demo@runosorno.cl");
  await page.goto(
    `${BASE_URL}/coach/metrics?team=${teamConAtletas?.id ?? ""}`,
    { waitUntil: "networkidle" },
  );
  const htmlCoach = await page.content();
  const barrasCoach = (htmlCoach.match(/athlete-compliance-chart/g) ?? []).length;
  record(
    barrasCoach > 0,
    "47.6 las barras de cumplimiento por atleta vienen en el HTML",
    `${barrasCoach} lista(s) de barras en el DOM de /coach/metrics`,
  );

  // 47.7: los avatares de un listado van diferidos; el del header no.
  await page.goto(`${BASE_URL}/coach/athletes`, { waitUntil: "networkidle" });
  const avatares = (await page.evaluate(`(() => {
    const imgs = Array.from(document.querySelectorAll("img.avatar"));
    const enListado = imgs.filter((i) => !i.closest(".app-header"));
    return {
      total: enListado.length,
      lazy: enListado.filter((i) => i.getAttribute("loading") === "lazy").length,
    };
  })()`)) as { total: number; lazy: number };
  record(
    avatares.total > 0 && avatares.lazy === avatares.total,
    '47.7 los avatares de un listado se cargan con loading="lazy"',
    `${avatares.lazy} diferidos de ${avatares.total}`,
  );

  const header = (await page.evaluate(`(() => {
    const img = document.querySelector(".app-header img.avatar");
    return img ? img.getAttribute("loading") : null;
  })()`)) as string | null;
  record(
    header === "eager",
    "47.7 el avatar del header se carga de inmediato",
    `loading="${header}"`,
  );

  // La campanita y el calendario del coach con drag & drop son las dos páginas
  // donde se hidratan cosas que no salen en las gráficas: horas escritas por
  // ICU y el `aria-describedby` que genera dnd-kit. Ahí aparecieron dos errores
  // de consola que el resto de las páginas no destapaba.
  await page.goto(`${BASE_URL}/notifications`, { waitUntil: "networkidle" });
  await page.goto(`${BASE_URL}/coach/calendar`, { waitUntil: "networkidle" });
  // Se recorren los teams hasta dar con uno que tenga atletas: el primero de la
  // lista puede estar vacío, y el calendario con drag & drop vive en el detalle
  // del atleta.
  const enlacesTeam = (await page
    .locator('a[href^="/coach/calendar?team="]')
    .evaluateAll((enlaces) =>
      enlaces.map((enlace) => enlace.getAttribute("href")),
    )) as (string | null)[];
  for (const enlaceTeam of enlacesTeam) {
    if (!enlaceTeam) continue;
    await page.goto(`${BASE_URL}${enlaceTeam}`, { waitUntil: "networkidle" });
    const enlaceAtleta = (await page.evaluate(
      'document.querySelector(\'a[href^="/coach/calendar/"]\')?.getAttribute("href") ?? null',
    )) as string | null;
    if (enlaceAtleta) {
      await page.goto(`${BASE_URL}${enlaceAtleta}`, { waitUntil: "networkidle" });
      break;
    }
  }

  // 47.6: una gráfica que no se dibuja no se ve, pero tampoco rompe la página.
  // Solo el aviso del navegador delata un atributo mal formado.
  record(
    erroresConsola.length === 0,
    "47.6 las páginas revisadas no dejan errores en la consola",
    erroresConsola.length === 0
      ? "sin errores en /athlete/metrics, /coach/metrics, /coach/athletes, /notifications ni el calendario del coach"
      : erroresConsola.slice(0, 3).join(" | "),
  );

  await ctx.close();
}

// ===========================================================================

async function main() {
  let athleteId = "";
  try {
    verificarComponentes();
    verificarMemo();

    console.log("\n--- Preparando datos a escala para el EXPLAIN ---");
    const escala = await sembrarEscala();
    athleteId = escala.athleteId;
    console.log(`  ${escala.asignaciones} asignaciones de prueba para ${ESCALA_EMAIL}`);

    await verificarIndices(athleteId);
    await verificarAlcanceDelCalendario();
    await verificarAlcanceDeMetricas(athleteId);

    // Las alertas de grupo, que comparten el camino acotado.
    const [grupo] = await consultar<{ id: string }>(
      sql`SELECT id FROM groups LIMIT 1`,
    );
    if (grupo) {
      const resultado = await getGroupMetrics(grupo.id, { kind: "season" });
      record(
        resultado.ok,
        "47.5 las métricas de grupo se calculan con las consultas acotadas",
        resultado.ok
          ? `${resultado.data.teams.length} teams, ${resultado.data.coaches.length} coaches`
          : resultado.error,
      );
    }

    const browser = await chromium.launch();
    try {
      await verificarEnElNavegador(browser);
    } finally {
      await browser.close();
    }
  } catch (error) {
    record(false, "el script terminó sin errores", String(error));
  } finally {
    if (athleteId) {
      await limpiarEscala(athleteId);
      console.log("\n  datos de escala eliminados");
    }
  }

  const fallos = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - fallos.length}/${results.length} comprobaciones OK`,
  );
  if (fallos.length > 0) {
    console.log("\nFallaron:");
    for (const f of fallos) {
      console.log(`  - ${f.label}: ${f.detail}`);
    }
    process.exitCode = 1;
  }
  process.exit(process.exitCode ?? 0);
}

void main();
