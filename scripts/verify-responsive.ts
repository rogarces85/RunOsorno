/**
 * Verifica la Fase 39 (responsive) con un navegador real.
 *
 * Playwright permite fijar el viewport, así que "verificar que algo es usable
 * en móvil" deja de ser una inspección a ojo: se mide el ancho de cada celda,
 * se comprueba que el scroll horizontal de la página sea cero, que el menú
 * se abra y cierre, que las gráficas caigan dentro de su contenedor y que los
 * campos de formulario ocupen el ancho disponible.
 *
 * Qué cubre cada tarea:
 *   39.1 login usable en mobile / tablet / desktop
 *   39.2 el sidebar colapsa en mobile y se abre desde el header
 *   39.3 calendario legible y con tap para el detalle
 *   39.4 listados con scroll horizontal propio, sin desbordar la página
 *   39.5 formularios a ancho completo en mobile
 *   39.6 gráficas adaptadas al tamaño de pantalla y renderizadas dentro del SVG
 *   39.7 drag & drop con soporte táctil + fallback de asignar tocando el día
 *   39.8 ninguna ruta desborda horizontalmente en los tres anchos
 *
 * Requiere el servidor de desarrollo corriendo (`npm run dev`) y los datos de
 * `npm run db:seed:demo`.
 *
 * Uso:  npx tsx scripts/verify-responsive.ts
 */

import { and, eq, sql } from "drizzle-orm";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { db } from "../lib/db/index";
import {
  notifications,
  sessionAssignments,
  sessionFeedback,
  sessionRecords,
  teamMembers,
  teams,
  users,
} from "../lib/db/schema";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DEMO_PASSWORD = "Demo1234!";

type Viewport = { name: string; width: number; height: number };
const VIEWPORTS: Viewport[] = [
  { name: "mobile", width: 375, height: 780 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1400, height: 1000 },
];

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail = ""): void {
  results.push({ ok, label, detail });
  console.log(
    `  ${ok ? "OK   " : "FALLO"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
}

async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.context().clearCookies();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    }),
    page.click('button[type="submit"]'),
  ]);
}

/** El login deja la sesión puesta: se usa para navegar por varias rutas. */
async function goto(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
}

/**
 * Se pasa como string porque tsx inyecta helpers (`__name`) en las funciones
 * que `page.evaluate` serializa, y dentro del navegador no existen.
 */
const PROBE = `(() => {
  const de = document.documentElement;
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const isVisible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.visibility !== "hidden" && s.display !== "none" && r.width > 0 && r.height > 0;
  };
  return {
    vw: de.clientWidth,
    overflow: de.scrollWidth - de.clientWidth,
    sidebar: box(document.querySelector('[data-testid="app-sidebar"]')),
    sidebarVisible: isVisible(document.querySelector('[data-testid="app-sidebar"]')),
    sidebarX: (() => {
      const el = document.querySelector('[data-testid="app-sidebar"]');
      return el ? Math.round(el.getBoundingClientRect().right) : null;
    })(),
    toggleVisible: isVisible(document.querySelector('[data-testid="nav-toggle"]')),
    backdrop: !!document.querySelector('[data-testid="app-sidebar-backdrop"]'),
    bodyLocked: getComputedStyle(document.body).overflow,
    header: box(document.querySelector("header.navbar")),
    logout: box(document.querySelector(".app-logout")),
    logoutLabelVisible: isVisible(document.querySelector(".app-logout-label")),
  };
})()`;

type ShellState = {
  vw: number;
  overflow: number;
  sidebar: { x: number; y: number; w: number; h: number } | null;
  sidebarVisible: boolean;
  sidebarX: number | null;
  toggleVisible: boolean;
  backdrop: boolean;
  bodyLocked: string;
  header: { x: number; y: number; w: number; h: number } | null;
  logout: { x: number; y: number; w: number; h: number } | null;
  logoutLabelVisible: boolean;
};

async function probe(page: Page): Promise<ShellState> {
  return (await page.evaluate(PROBE)) as ShellState;
}

/** Detecta el desbordamiento horizontal de la página en la ruta actual. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    "(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)()",
  ) as Promise<number>;
}

/**
 * Arrastra una plantilla a un día del calendario usando eventos táctiles
 * reales (Playwright no tiene un API de arrastre con `touchscreen`, así que se
 * va por CDP). Devuelve el `YYYY-MM-DD` del día de destino.
 *
 * Apunta al primer día libre del mes: si el destino ya estuviera ocupado,
 * soltar la plantilla abriría el diálogo de reemplazo y no crearía nada.
 */
async function touchDrag(
  page: Page,
  context: BrowserContext,
): Promise<{ date: string }> {
  const source = await page
    .locator('[data-testid="sidebar-template"]')
    .first()
    .boundingBox();
  const target = (await page.evaluate(`(() => {
    const cells = Array.from(document.querySelectorAll(".calendar-droppable"));
    const free = cells.find((c) => c.querySelector('.calendar-day[data-state="rest"]'));
    const cell = free || cells[0];
    const r = cell.getBoundingClientRect();
    return {
      x: Math.round(r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2),
      date: cell.getAttribute("data-droppable"),
    };
  })()`)) as { x: number; y: number; date: string | null };

  const client = await context.newCDPSession(page);
  const touch = (
    type: "touchStart" | "touchMove" | "touchEnd",
    x: number,
    y: number,
  ) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints:
        type === "touchEnd"
          ? []
          : [{ x, y, radiusX: 10, radiusY: 10, force: 1, id: 1 }],
    });

  const from = {
    x: Math.round((source?.x ?? 0) + (source?.width ?? 0) / 2),
    y: Math.round((source?.y ?? 0) + (source?.height ?? 0) / 2),
  };
  await touch("touchStart", from.x, from.y);
  const steps = 12;
  for (let step = 1; step <= steps; step += 1) {
    await touch(
      "touchMove",
      Math.round(from.x + ((target.x - from.x) * step) / steps),
      Math.round(from.y + ((target.y - from.y) * step) / steps),
    );
    await page.waitForTimeout(40);
  }
  await touch("touchEnd", target.x, target.y);
  await page.waitForTimeout(2500);
  return { date: target.date ?? "" };
}

/** Deja la base como estaba: borra la asignación del arrastre y su aviso. */
async function cleanupAssignment(
  athleteId: string,
  dateISO: string,
): Promise<void> {
  if (!dateISO) {
    return;
  }
  const [row] = await db
    .select({ id: sessionAssignments.id })
    .from(sessionAssignments)
    .where(
      and(
        eq(sessionAssignments.athleteId, athleteId),
        sql`${sessionAssignments.sessionDate} = ${dateISO}`,
      ),
    );
  if (!row) {
    return;
  }
  await db
    .delete(sessionFeedback)
    .where(eq(sessionFeedback.assignmentId, row.id));
  await db
    .delete(sessionRecords)
    .where(eq(sessionRecords.assignmentId, row.id));
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.userId, athleteId),
        eq(notifications.entityType, "assignment"),
        eq(notifications.entityId, row.id),
      ),
    );
  await db.delete(sessionAssignments).where(eq(sessionAssignments.id, row.id));
}

async function main() {
  console.log(`Verificando responsive en ${BASE_URL}\n`);

  const browser: Browser = await chromium.launch();

  // ------------------------------------------------------------- 39.1 ----
  console.log("--- 39.1 Login en mobile, tablet y desktop ---");
  for (const vp of VIEWPORTS) {
    const isTouch = vp.name !== "desktop";
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: isTouch,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

    const box = await page.locator("form .card, .card").first().boundingBox();
    const input = await page.locator('input[name="email"]').boundingBox();
    const button = await page.locator('button[type="submit"]').boundingBox();
    const overflow = await horizontalOverflow(page);

    const cardFits = box !== null && box.width <= vp.width && box.x >= 0;
    const inputFits =
      input !== null && input.width > 0 && input.x + input.width <= vp.width;
    // 44 px es el mínimo cómodo para tocar (WCAG 2.5.8). Con ratón se acepta
    // la altura por defecto de Tabler (40 px).
    const minHeight = isTouch ? 44 : 38;
    const tapTarget = button !== null && button.height >= minHeight;

    record(
      cardFits && inputFits && tapTarget && overflow <= 0,
      `39.1 login usable en ${vp.name} (${vp.width}px)`,
      `tarjeta=${Math.round(box?.width ?? 0)}px, input=${Math.round(input?.width ?? 0)}px, botón=${Math.round(button?.height ?? 0)}px (mín ${minHeight}), overflow=${overflow}px`,
    );
    await ctx.close();
  }

  // ------------------------------------------------------------- 39.8 ----
  // Se recorre una ruta representativa de cada rol en los tres anchos: si
  // alguna desborda, el problema está en esa vista concreta.
  console.log("\n--- 39.8 Ninguna página desborda horizontalmente ---");
  const ROUTES: { email: string; paths: string[] }[] = [
    {
      email: "admin@runosorno.cl",
      paths: [
        "/admin/dashboard",
        "/admin/coaches",
        "/admin/athletes",
        "/admin/logs",
        "/admin/settings",
        "/admin/templates",
      ],
    },
    {
      email: "coach.demo@runosorno.cl",
      paths: [
        "/coach/dashboard",
        "/coach/teams",
        "/coach/templates",
        "/coach/metrics",
        "/coach/athletes",
      ],
    },
    {
      email: "maria.fernandez@demo.runosorno.cl",
      paths: [
        "/athlete/dashboard",
        "/athlete/calendar",
        "/athlete/metrics",
        "/profile",
      ],
    },
  ];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.name !== "desktop",
    });
    const page = await ctx.newPage();
    const offenders: string[] = [];

    for (const route of ROUTES) {
      await login(
        page,
        route.email,
        route.paths[0].includes("admin") ? "Admin1234!" : DEMO_PASSWORD,
      );
      for (const path of route.paths) {
        await goto(page, path);
        const overflow = await horizontalOverflow(page);
        if (overflow > 1) {
          offenders.push(`${path} +${overflow}px`);
        }
      }
    }

    record(
      offenders.length === 0,
      `39.8 sin scroll horizontal en ${vp.name} (${vp.width}px)`,
      offenders.length ? offenders.join(", ") : "13 rutas revisadas",
    );
    await ctx.close();
  }

  // ------------------------------------------------------------- 39.2 ----
  console.log("\n--- 39.2 Sidebar: colapsa en mobile, fijo en desktop ---");
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.name !== "desktop",
    });
    const page = await ctx.newPage();
    await login(page, "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD);
    await goto(page, "/athlete/dashboard");

    const closed = await probe(page);
    const isDesktop = vp.width >= 992;

    if (isDesktop) {
      record(
        closed.sidebarVisible && !closed.toggleVisible,
        "39.2 en desktop el sidebar está siempre visible",
        `sidebar ${closed.sidebar?.w}x${closed.sidebar?.h}px, hamburguesa oculta=${!closed.toggleVisible}`,
      );
    } else {
      // Cerrado: fuera de pantalla, sin ocupar la cabecera.
      record(
        !closed.sidebarVisible && closed.toggleVisible,
        `39.2 en ${vp.name} el sidebar arranca colapsado`,
        `hamburguesa visible=${closed.toggleVisible}`,
      );

      await page.click('[data-testid="nav-toggle"]');
      await page.waitForTimeout(400);
      const opened = await probe(page);

      const linksVisible = await page
        .locator('[data-testid="app-sidebar"] .navbar-nav .nav-link')
        .first()
        .isVisible();
      record(
        opened.sidebarVisible &&
          linksVisible &&
          (opened.sidebarX ?? 0) > 0 &&
          opened.backdrop,
        `39.2 el menú se abre sobre un fondo en ${vp.name}`,
        `sidebar x=${opened.sidebarX}px, enlaces visibles=${linksVisible}, fondo=${opened.backdrop}, scroll bloqueado=${opened.bodyLocked}`,
      );

      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      const afterEscape = await probe(page);
      record(
        !afterEscape.sidebarVisible,
        `39.2 Escape cierra el menú en ${vp.name}`,
        `sidebar visible=${afterEscape.sidebarVisible}`,
      );

      // El botón de la cabecera no debe quedar tapado por el sidebar cerrado:
      // antes de esta fase quedaba una franja fija de 56 px encima del header.
      const closedState = await probe(page);
      const headerTop = closedState.header?.y ?? 0;
      record(
        headerTop <= 1,
        `39.2 el header arranca en el borde superior en ${vp.name}`,
        `header top=${headerTop}px (antes el sidebar fijo lo desplazaba 56px)`,
      );
    }

    await ctx.close();
  }

  // ------------------------------------------------------------- 39.3 ----
  console.log("\n--- 39.3 Calendario en mobile y desktop ---");
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.name !== "desktop",
    });
    const page = await ctx.newPage();
    await login(page, "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD);
    await goto(page, "/athlete/calendar");

    const cell = await page.locator(".calendar-day").first().boundingBox();
    const tapOk = cell !== null && cell.width >= 40 && cell.height >= 40;
    // Por debajo de `sm` el nombre del tipo de sesión se oculta: en una celda
    // de ~42 px solo cabía "Te…".
    const labelVisible = await page
      .locator(".calendar-day-session")
      .first()
      .isVisible()
      .catch(() => false);
    record(
      tapOk,
      `39.3 celdas del calendario con área de toque suficiente en ${vp.name}`,
      `celda ${Math.round(cell?.width ?? 0)}x${Math.round(cell?.height ?? 0)}px (mínimo 40x40), etiqueta de sesión visible=${labelVisible}`,
    );

    await page.locator(".calendar-day").nth(10).click();
    const dialog = page.locator('.modal[role="dialog"]');
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    const dialogBox = await dialog.boundingBox();
    const closeVisible = await dialog
      .locator('button:has-text("Cerrar")')
      .isVisible();
    record(
      dialogBox !== null && dialogBox.width <= vp.width && closeVisible,
      `39.3 el detalle de la sesión abre a pantalla completa en ${vp.name}`,
      `modal ${Math.round(dialogBox?.width ?? 0)}px de ${vp.width}px, botón cerrar=${closeVisible}`,
    );
    await ctx.close();
  }

  // ------------------------------------------------------------- 39.4 ----
  console.log("\n--- 39.4 Listados y tablas en mobile ---");
  {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 780 },
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await login(page, "admin@runosorno.cl", "Admin1234!");
    await goto(page, "/admin/coaches");

    const tableInfo = (await page.evaluate(`(() => {
      const wrapper = document.querySelector(".table-responsive");
      const table = wrapper ? wrapper.querySelector("table") : null;
      if (!wrapper || !table) return null;
      return {
        wrapperW: Math.round(wrapper.getBoundingClientRect().width),
        wrapperScrollW: wrapper.scrollWidth,
        overflowX: getComputedStyle(wrapper).overflowX,
        tableW: Math.round(table.getBoundingClientRect().width),
      };
    })()`)) as {
      wrapperW: number;
      wrapperScrollW: number;
      overflowX: string;
      tableW: number;
    } | null;
    const overflow = await horizontalOverflow(page);

    record(
      tableInfo !== null &&
        ["auto", "scroll"].includes(tableInfo.overflowX) &&
        tableInfo.tableW > tableInfo.wrapperW &&
        overflow <= 1,
      "39.4 la tabla de coaches hace scroll propio en mobile",
      tableInfo
        ? `contenedor ${tableInfo.wrapperW}px, tabla ${tableInfo.tableW}px, overflow-x=${tableInfo.overflowX}, página=${overflow}px`
        : "no se encontró .table-responsive",
    );
    await ctx.close();
  }

  // ------------------------------------------------------------- 39.5 ----
  console.log("\n--- 39.5 Formularios a ancho completo en mobile ---");
  {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 780 },
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await login(page, "coach.demo@runosorno.cl", DEMO_PASSWORD);
    await goto(page, "/coach/templates/new");

    const fields = (await page.evaluate(`(() => {
      const inputs = Array.from(document.querySelectorAll("form .form-control, form .form-select"));
      return inputs
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const parent = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
          return {
            name: el.getAttribute("name") || el.tagName,
            w: Math.round(r.width),
            right: Math.round(r.right),
            ratio: parent && parent.width ? r.width / parent.width : 0,
          };
        });
    })()`)) as { name: string; w: number; right: number; ratio: number }[];

    const overflowing = fields.filter((f) => f.right > 375);
    const narrow = fields.filter((f) => f.ratio < 0.8);
    record(
      fields.length > 0 && overflowing.length === 0 && narrow.length === 0,
      "39.5 los campos del editor de plantilla ocupan el ancho disponible",
      `${fields.length} campos, fuera de pantalla=${overflowing.length}, más estrechos del 80%=${narrow.length}`,
    );
    await ctx.close();
  }

  // ------------------------------------------------------------- 39.6 ----
  console.log("\n--- 39.6 Gráficas adaptadas al tamaño de pantalla ---");
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();
    await login(page, "maria.fernandez@demo.runosorno.cl", DEMO_PASSWORD);
    await goto(page, "/athlete/metrics");

    const charts = (await page.evaluate(`(() => {
      const describe = (svg) => {
        if (!svg) return null;
        const r = svg.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x) };
      };
      const donut = document.querySelector('[data-testid="donut-chart"]');
      const donutSvg = donut ? donut.querySelector("svg") : null;
      const slices = donut
        ? Array.from(donut.querySelectorAll('[data-testid="donut-slice"]')).map((p) => {
            const r = p.getBoundingClientRect();
            return { w: Math.round(r.width), h: Math.round(r.height) };
          })
        : [];
      const card = donut ? donut.closest(".card") : null;
      return {
        donut: describe(donutSvg),
        slices,
        donutCentered: (() => {
          if (!donutSvg || slices.length === 0) return false;
          const sr = donutSvg.getBoundingClientRect();
          const srBox = donutSvg.parentElement.getBoundingClientRect();
          return Math.abs((sr.x + sr.width / 2) - (srBox.x + srBox.width / 2)) <= 2;
        })(),
        // Desde la Fase 47 las gráficas de líneas y barras ya no son de
        // recharts: son SVG propios con viewBox, marcados como metric-chart.
        plots: Array.from(
          document.querySelectorAll(".metric-chart-plot svg"),
        ).map(describe),
        cardWidth: card ? Math.round(card.getBoundingClientRect().width) : null,
      };
    })()`)) as {
      donut: { w: number; h: number; x: number } | null;
      slices: { w: number; h: number }[];
      donutCentered: boolean;
      plots: ({ w: number; h: number; x: number } | null)[];
      cardWidth: number | null;
    };

    const donutOk =
      charts.donut !== null &&
      charts.donut.w > 0 &&
      charts.donut.w <= (charts.cardWidth ?? 0) &&
      charts.slices.length > 0 &&
      charts.slices.every((s) => s.w > 0 && s.h > 0) &&
      charts.donutCentered;
    record(
      donutOk,
      `39.6 los anillos se dibujan dentro de su tarjeta en ${vp.name}`,
      `svg ${charts.donut?.w}x${charts.donut?.h}px, ${charts.slices.length} sectores, centrado=${charts.donutCentered}`,
    );

    const plotsOk =
      charts.plots.length > 0 &&
      charts.plots.every(
        (r: { w: number; h: number } | null) =>
          r !== null && r.w > 100 && r.h > 100,
      );
    record(
      plotsOk,
      `39.6 las gráficas de líneas y barras tienen tamaño real en ${vp.name}`,
      charts.plots
        .map((r: { w: number; h: number } | null) => `${r?.w}x${r?.h}`)
        .join(", "),
    );

    // El ancho del SVG debe seguir al de la ventana, no quedarse pegado al
    // valor con el que se montó.
    const before = charts.plots[0]?.w ?? 0;
    await page.setViewportSize({ width: vp.width - 60, height: vp.height });
    await page.waitForTimeout(600);
    const after = (await page.evaluate(`(() => {
      const svg = document.querySelector(".metric-chart-plot svg");
      return svg ? Math.round(svg.getBoundingClientRect().width) : 0;
    })()`)) as number;
    record(
      Math.abs(after - before) > 20,
      `39.6 las gráficas se reajustan al cambiar el ancho en ${vp.name}`,
      `svg ${before}px -> ${after}px tras Narrow${vp.width - 60}px`,
    );

    await ctx.close();
  }

  // ------------------------------------------------------------- 39.7 ----
  console.log(
    "\n--- 39.7 Drag & drop táctil y fallback de asignar tocando el día ---",
  );
  {
    const coachId = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, "coach.demo@runosorno.cl"))
    )[0]?.id;
    const teamId = (
      await db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.coachId, coachId!))
    )[0]?.id;
    const athleteId = teamId
      ? (
          await db
            .select({ athleteId: teamMembers.athleteId })
            .from(teamMembers)
            .where(eq(teamMembers.teamId, teamId))
        )[0]?.athleteId
      : undefined;

    if (!coachId || !teamId || !athleteId) {
      record(
        false,
        "39.7 datos de prueba disponibles",
        "falta coach, team o atleta del seed demo",
      );
    } else {
      const calendarPath = `/coach/calendar/${teamId}/${athleteId}`;

      // Tablet en horizontal: la bandeja de plantillas es visible y debe
      // aceptar arrastre con el dedo.
      const tabletCtx = await browser.newContext({
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
      });
      const tabletPage = await tabletCtx.newPage();
      await login(tabletPage, "coach.demo@runosorno.cl", DEMO_PASSWORD);
      await goto(tabletPage, calendarPath);

      const dragInfo = (await tabletPage.evaluate(`(() => {
        const sidebar = document.querySelector('[data-testid="template-sidebar"]');
        const item = document.querySelector('[data-testid="sidebar-template"]');
        const day = document.querySelector(".calendar-droppable[data-droppable]");
        return {
          sidebarVisible: !!sidebar && sidebar.getBoundingClientRect().width > 0,
          itemVisible: !!item && item.getBoundingClientRect().width > 0,
          touchAction: item ? getComputedStyle(item).touchAction : null,
          droppable: !!day,
        };
      })()`)) as {
        sidebarVisible: boolean;
        itemVisible: boolean;
        touchAction: string | null;
        droppable: boolean;
      };

      // Sin `touch-action: none` el primer dedo desplaza la página y el
      // arrastre nunca arranca en una tablet.
      record(
        dragInfo.sidebarVisible &&
          dragInfo.itemVisible &&
          dragInfo.touchAction === "none" &&
          dragInfo.droppable,
        "39.7 la bandeja arrastrable funciona con pantalla táctil en tablet",
        `bandeja visible=${dragInfo.sidebarVisible}, touch-action=${dragInfo.touchAction}, días con drop=${dragInfo.droppable}`,
      );

      // Y no solo que el CSS esté puesto: se arrastra de verdad con eventos
      // táctiles (CDP) y se comprueba que el día queda planificado.
      const dropped = await touchDrag(tabletPage, tabletCtx);
      const assigned = await tabletPage
        .locator(
          `.calendar-droppable[data-droppable="${dropped.date}"] .calendar-day`,
        )
        .getAttribute("data-state");
      record(
        assigned === "planned",
        "39.7 arrastrar con el dedo asigna la plantilla en el día de destino",
        `día ${dropped.date}: estado tras soltar=${assigned}`,
      );
      await cleanupAssignment(athleteId, dropped.date);
      await tabletCtx.close();

      // Mobile: la bandeja se oculta (arrastrar sería imposible con el dedo) y
      // la asignación se hace tocando el día.
      const mobileCtx = await browser.newContext({
        viewport: { width: 375, height: 780 },
        hasTouch: true,
      });
      const mobilePage = await mobileCtx.newPage();
      await login(mobilePage, "coach.demo@runosorno.cl", DEMO_PASSWORD);
      await goto(mobilePage, calendarPath);

      const mobileSidebar = await mobilePage
        .locator('[data-testid="template-sidebar"]')
        .isVisible()
        .catch(() => false);
      const hintVisible = await mobilePage
        .locator('[data-testid="template-sidebar-hint"]')
        .isVisible();

      await mobilePage.locator(".calendar-day").nth(10).click();
      const assignForm = mobilePage.locator('[data-testid="assign-form"]');
      await assignForm.waitFor({ state: "visible", timeout: 10_000 });

      record(
        !mobileSidebar && hintVisible,
        "39.7 en mobile se oculta la bandeja y se explica cómo asignar",
        `bandeja visible=${mobileSidebar}, aviso=${hintVisible}`,
      );
      record(
        await assignForm.isVisible(),
        "39.7 fallback: tocar un día abre el formulario de asignación",
        "panel de detalle con selector de plantilla",
      );
      await mobileCtx.close();
    }
  }

  await browser.close();

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
  console.log(
    "La interfaz se comporta correctamente en mobile, tablet y desktop.",
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
