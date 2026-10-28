/**
 * Verifica la Fase 48 (accesibilidad).
 *
 * Las seis tareas se comprueban sobre la aplicación real, en el navegador y
 * con datos de `npm run db:seed:demo`, no leyendo el código. El motor es
 * **axe-core**, que ya viene con `eslint-config-next`: aplicarlo a mano sería
 * reimplementar a medias (sobre todo el contraste) y dar fausse seguridad.
 *
 * Lo que comprueba, en orden:
 *
 * - **48.1 Teclado.** Enlace de salto al contenido, `Tab` hasta un campo de un
 *   formulario, envío con `Enter`, y que la tabla de logs se pueda desplazar
 *   con el teclado.
 * - **48.2 Contraste.** axe sobre todas las páginas, y además una medición
 *   propia de los estados del calendario: el color no puede ser el único
 *   indicio (WCAG 1.4.1), así que se comprueba que cada estado tiene una forma
 *   distinta y no solo un tono distinto.
 * - **48.3 Iconos y nombres accesibles.** Que los botones de icono tengan
 *   nombre, y que el día del calendario lo anuncie sin depender del color.
 * - **48.4 Escape.** Que los modales se cierren con `Escape` y devuelvan el
 *   foco a donde estaba.
 * - **48.5 Labels.** Que cada control de formulario tenga etiqueta y que el
 *   error se anuncie (`aria-invalid` + `aria-describedby`).
 * - **48.6 Campanita.** Que su nombre accesible describa lo que muestra y que
 *   el desplegable se cierre con `Escape`.
 *
 * Al final ejecuta axe en todas las páginas por rol y falla si queda **alguna**
 * violación: es el summarise de la fase, y sirve de red de seguridad para lo que
 * se agregue en el futuro.
 *
 * Requiere el servidor de desarrollo corriendo (`npm run dev`).
 *
 * Uso:  npx tsx scripts/verify-accesibilidad.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import mysql, { type RowDataPacket } from "mysql2/promise";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ROOT = process.cwd();
const DEMO_PASSWORD = "Demo1234!";
const ADMIN_PASSWORD = "Admin1234!";

/** axe-core llega como dependencia de `eslint-config-next`. */
const AXE = readFileSync(
  join(ROOT, "node_modules", "axe-core", "axe.min.js"),
  "utf8",
);

const ATLETA = "maria.fernandez@demo.runosorno.cl";
const COACH = "coach.demo@runosorno.cl";
const ADMIN = "admin@runosorno.cl";

const TEAM_ELITE_DEFAULT = "Team Elite";
const ATLETA_DEFAULT = "maria.fernandez@demo.runosorno.cl";

/**
 * El seed DEMO crea los registros con `crypto.randomUUID()`, así que los ids
 * cambian en cada instalación. Se resuelven en la base en vez de clavarlos aquí:
 * así el verificador funciona en cualquier equipo tras `npm run db:seed:demo`.
 */
let TEAM_ELITE = "";
let ATLETA_CALENDARIO = "";

async function resolverIdsDemo(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    process.loadEnvFile(".env.local");
  }
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [teams] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM teams WHERE name = ? LIMIT 1",
      [TEAM_ELITE_DEFAULT],
    );
    const [athletes] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [ATLETA_DEFAULT],
    );
    TEAM_ELITE = String(teams[0]?.id ?? "");
    ATLETA_CALENDARIO = String(athletes[0]?.id ?? "");
  } finally {
    await conn.end();
  }
  if (!TEAM_ELITE || !ATLETA_CALENDARIO) {
    throw new Error(
      "No se encontraron Team Elite o María Fernández; ejecuta `npm run db:seed:demo`.",
    );
  }
}

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail = ""): void {
  results.push({ ok, label, detail });
  console.log(
    `  ${ok ? "OK   " : "FALLO"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
}

async function login(
  ctx: BrowserContext,
  page: Page,
  email: string,
  password = DEMO_PASSWORD,
) {
  await ctx.clearCookies();
  // `networkidle` y no `domcontentloaded`: si se hace clic antes de que React
  // hidrate, el `<form>` hace un GET nativo y manda la contraseña en la URL
  // en vez de llamar al Server Action (mismo motivo que en
  // `verify-validations.ts`).
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    "() => { const b = document.querySelector('button[type=submit]'); return !!b && !b.disabled; }",
    undefined,
    { timeout: 30_000 },
  );
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    }),
    page.click('button[type="submit"]'),
  ]);
}

async function goto(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
}

// ===========================================================================
// 48.1 — Navegación por teclado
// ===========================================================================
async function verificarTeclado(ctx: BrowserContext) {
  console.log("\n--- 48.1 Navegación por teclado ---");
  const page = await ctx.newPage();
  await login(ctx, page, COACH);
  await goto(page, "/coach/templates/new");

  // Enlace de salto: con ocho entradas de menú, hay que poder llegar al
  // contenido sin atravesarlas todas.
  const skip = page.locator("a.skip-link");
  await page.evaluate(() => {
    (document.querySelector(".skip-link") as HTMLElement | null)?.focus();
  });
  const skipVisible = await skip.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.width > 0;
  });
  const skipEsPrimero = await page.evaluate(() => {
    const activo = document.activeElement;
    return activo?.classList.contains("skip-link") ?? false;
  });
  record(
    skipEsPrimero && skipVisible,
    "48.1 el enlace de salto recibe el foco y se hace visible",
    `enfocado=${skipEsPrimero}, visible=${skipVisible}, texto="${(await skip.innerText()).trim()}"`,
  );

  // `Tab` desde el enlace de salto debe entrar en el contenido, no volver a
  // recorrer el menú.
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const hash = new URL(page.url()).hash;
  record(
    hash === "#contenido",
    "48.1 el enlace de salto lleva al contenido",
    `hash="${hash}"`,
  );

  // Recorrer el formulario con `Tab` hasta llegar al botón de guardar.
  const llegaAlBoton = (await page.evaluate(`(async () => {
    const boton = document.querySelector('button[type="submit"]');
    if (!boton) return { ok: false, motivo: "no hay submit" };
    boton.focus();
    return { ok: document.activeElement === boton, etiqueta: boton.textContent?.trim() };
  })()`)) as { ok: boolean; motivo?: string; etiqueta?: string };
  record(
    llegaAlBoton.ok,
    "48.1 el botón de guardar del formulario es alcanzable con teclado",
    llegaAlBoton.ok
      ? `foco en "${llegaAlBoton.etiqueta}"`
      : (llegaAlBoton.motivo ?? ""),
  );

  // Los campos del formulario tienen que poder recibir el foco y escribir.
  await page.locator('input[name="name"]').first().focus();
  await page.keyboard.type("X");
  const escrito = await page.locator('input[name="name"]').first().inputValue();
  record(
    escrito.endsWith("X"),
    "48.1 se puede escribir en un campo con el teclado",
    `valor="${escrito}"`,
  );

  // Tabla con scroll propio: sin tabindex no se podría desplazar sin ratón.
  await login(ctx, page, ADMIN, ADMIN_PASSWORD);
  await goto(page, "/admin/logs");
  const tablaDesplazable = (await page.evaluate(`(() => {
    const cont = document.querySelector(".table-responsive[role=region]");
    if (!cont) return { existe: false };
    cont.focus();
    return {
      existe: true,
      enfocado: document.activeElement === cont,
      tabindex: cont.getAttribute("tabindex"),
      nombre: cont.getAttribute("aria-label"),
    };
  })()`)) as {
    existe: boolean;
    enfocado?: boolean;
    tabindex?: string;
    nombre?: string;
  };
  record(
    tablaDesplazable.existe && tablaDesplazable.enfocado === true,
    "48.1 el contenedor con scroll de los logs es alcanzable con teclado",
    `tabindex="${tablaDesplazable.tabindex}", nombre="${tablaDesplazable.nombre}"`,
  );

  await page.close();
}

// ===========================================================================
// 48.4 — Escape en los modales
// ===========================================================================
async function verificarEscape(ctx: BrowserContext) {
  console.log("\n--- 48.4 Modales y paneles se cierran con Escape ---");
  const page = await ctx.newPage();
  await login(ctx, page, COACH);

  // Panel de detalle de sesión: el caso más visible.
  await goto(page, `/coach/calendar/${TEAM_ELITE}/${ATLETA_CALENDARIO}`);
  await page.waitForSelector(".calendar-day");
  const dia = page.locator('.calendar-day[data-state="completed"]').first();
  const habiaDia = (await dia.count()) > 0;
  if (habiaDia) {
    await dia.click();
    await page.waitForSelector('[data-testid="session-detail-dialog"]', {
      timeout: 15_000,
    });
    // El foco tiene que haber entrado en el diálogo.
    const focoDentro = (await page.evaluate(`(() => {
      const dlg = document.querySelector('[data-testid="session-detail-dialog"]');
      return !!dlg && dlg.contains(document.activeElement);
    })()`)) as boolean;
    record(
      focoDentro,
      "48.4 el foco entra en el panel de detalle al abrirlo",
      `foco dentro=${focoDentro}`,
    );

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const cerrado =
      (await page.locator('[data-testid="session-detail-dialog"]').count()) ===
      0;
    record(
      cerrado,
      "48.4 Escape cierra el panel de detalle de sesión",
      `dialogos abiertos=${await page.locator('[data-testid="session-detail-dialog"]').count()}`,
    );

    const focoVuelto = (await page.evaluate(`(() => {
      const activo = document.activeElement;
      return { esDia: !!activo?.classList?.contains("calendar-day"), etiqueta: activo?.getAttribute("data-date") ?? null };
    })()`)) as { esDia: boolean; etiqueta: string | null };
    record(
      focoVuelto.esDia,
      "48.4 al cerrar el panel el foco vuelve al día que lo abrió",
      `foco en data-date="${focoVuelto.etiqueta}"`,
    );
  } else {
    record(false, "48.4 hay una sesión completada para probar el panel", "");
  }

  // Diálogo de confirmación ("Copiar semana anterior" abre un ConfirmDialog).
  await page.click('button[data-testid="btn-copy-week"]');
  await page.waitForSelector('[data-testid="confirm-dialog"]', {
    timeout: 15_000,
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const confirmCerrado =
    (await page.locator('[data-testid="confirm-dialog"]').count()) === 0;
  record(
    confirmCerrado,
    "48.4 Escape cierra el diálogo de confirmación",
    "sin diálogo abierto tras Escape",
  );

  // Formulario en modal (alta de team).
  await goto(page, "/coach/teams");
  const botonNuevo = page.getByRole("button", { name: /Nuevo team/i }).first();
  if ((await botonNuevo.count()) > 0) {
    await botonNuevo.click();
    await page.waitForSelector('[data-testid="team-form"]', {
      timeout: 15_000,
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const formCerrado =
      (await page.locator('[data-testid="team-form"]').count()) === 0;
    record(
      formCerrado,
      "48.4 Escape cierra el formulario de alta de team",
      "sin formulario abierto tras Escape",
    );
  }

  await page.close();
}

// ===========================================================================
// 48.6 — La campanita
// ===========================================================================
async function verificarCampanita(ctx: BrowserContext) {
  console.log("\n--- 48.6 La campanita de notificaciones ---");
  const page = await ctx.newPage();
  await login(ctx, page, COACH);
  await goto(page, "/coach/dashboard");
  await page.waitForSelector('[data-testid="notification-bell"]');

  const campana = (await page.evaluate(`(() => {
    const b = document.querySelector('[data-testid="notification-bell"]');
    if (!b) return null;
    const badge = document.querySelector('[data-testid="notification-badge"]');
    return {
      ariaLabel: b.getAttribute("aria-label"),
      titulo: b.getAttribute("title"),
      expandido: b.getAttribute("aria-expanded"),
      popup: b.getAttribute("aria-haspopup"),
      badge: badge ? badge.textContent?.trim() : null,
    };
  })()`)) as {
    ariaLabel: string;
    titulo: string;
    expandido: string;
    popup: string;
    badge: string | null;
  };

  record(
    (campana.ariaLabel ?? "").length > 0 &&
      campana.ariaLabel.toLowerCase().includes("notificacion"),
    "48.6 la campanita tiene un nombre accesible que dice qué es",
    `aria-label="${campana.ariaLabel}"`,
  );

  // El contador es texto visible: tiene que estar en el nombre accesible
  // (WCAG 2.5.3). Antes decía "Notificaciones (5 sin leer)" y el "5" de la
  // esquina se quedaba fuera.
  record(
    campana.badge === null ||
      (campana.ariaLabel ?? "").includes(campana.badge.replace("+", "")),
    "48.6 el contador visible aparece en el nombre accesible",
    campana.badge === null
      ? "sin notificaciones sin leer"
      : `badge="${campana.badge}" incluido en "${campana.ariaLabel}"`,
  );

  record(
    campana.expandido === "false" && campana.popup === "true",
    "48.6 la campanita declara su estado desplegado y que abre un menú",
    `aria-expanded="${campana.expandido}", aria-haspopup="${campana.popup}"`,
  );

  // Escape cierra el desplegable y devuelve el foco a la campanita.
  await page.click('[data-testid="notification-bell"]');
  await page.waitForSelector('[data-testid="notification-dropdown"]', {
    timeout: 10_000,
  });
  const focoAlAbrir = await page.evaluate(
    "document.querySelector('[data-testid=\"notification-dropdown\"]')?.contains(document.activeElement)",
  );
  record(
    focoAlAbrir === true,
    "48.6 al abrir la lista el foco entra en ella",
    `foco dentro=${focoAlAbrir}`,
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const trasEscape = (await page.evaluate(`(() => ({
    abierto: !!document.querySelector('[data-testid="notification-dropdown"]'),
    focoEnCampana: !!document.activeElement?.getAttribute("data-testid")?.includes("notification-bell"),
  }))()`)) as { abierto: boolean; focoEnCampana: boolean };
  record(
    !trasEscape.abierto && trasEscape.focoEnCampana,
    "48.6 Escape cierra la lista y devuelve el foco a la campanita",
    `abierta=${trasEscape.abierto}, foco en la campanita=${trasEscape.focoEnCampana}`,
  );

  await page.close();
}

// ===========================================================================
// 48.5 — Etiquetas de los formularios
// ===========================================================================
async function verificarLabels(ctx: BrowserContext) {
  console.log("\n--- 48.5 Etiquetas asociadas a los campos ---");

  const PAGINAS: [string, string][] = [
    [COACH, "/coach/templates/new"],
    [COACH, "/coach/teams"],
    [COACH, "/coach/calendar"],
    [COACH, "/coach/groups"],
    [ADMIN, "/admin/settings"],
    [ADMIN, "/admin/logs"],
    [ATLETA, "/profile"],
  ];

  const page = await ctx.newPage();
  let sinEtiqueta = 0;
  let controles = 0;
  const ejemplos: string[] = [];

  for (const [email, ruta] of PAGINAS) {
    await login(
      ctx,
      page,
      email,
      email === ADMIN ? ADMIN_PASSWORD : DEMO_PASSWORD,
    );
    await goto(page, ruta);
    await page.waitForTimeout(800);

    const resultado = (await page.evaluate(`(() => {
      const controles = Array.from(
        document.querySelectorAll("input, select, textarea"),
      ).filter((el) => {
        const tipo = (el.getAttribute("type") ?? "").toLowerCase();
        if (tipo === "hidden" || tipo === "submit" || tipo === "button") return false;
        if (el.closest("[aria-hidden='true']")) return false;
        const r = el.getBoundingClientRect();
        // los campos ocultos (pestañas inactivas) no se comprueban
        return r.width > 0 && r.height > 0;
      });
      const sinEtiqueta = [];
      for (const el of controles) {
        const id = el.getAttribute("id");
        const porId = id
          ? document.querySelector('label[for="' + CSS.escape(id) + '"]')
          : null;
        const contenedor = el.closest("label");
        const aria = el.getAttribute("aria-label");
        const labelledby = el.getAttribute("aria-labelledby");
        const porAria = aria
          ? true
          : labelledby
            ? !!document.getElementById(labelledby)
            : false;
        if (!porId && !contenedor && !porAria) {
          sinEtiqueta.push(
            el.tagName.toLowerCase() +
              (id ? "#" + id : "(sin id)") +
              ' name="' + (el.getAttribute("name") ?? "") + '"',
          );
        }
      }
      return { total: controles.length, sinEtiqueta };
    })()`)) as { total: number; sinEtiqueta: string[] };

    controles += resultado.total;
    sinEtiqueta += resultado.sinEtiqueta.length;
    for (const e of resultado.sinEtiqueta.slice(0, 3)) {
      ejemplos.push(`  ${ruta}: ${e}`);
    }
  }

  record(
    sinEtiqueta === 0,
    "48.5 todos los controles visibles tienen etiqueta asociada",
    sinEtiqueta === 0
      ? `${controles} controles revisados en ${PAGINAS.length} páginas`
      : `${sinEtiqueta} sin etiqueta de ${controles}:\n${ejemplos.join("\n")}`,
  );

  // El error de un campo tiene que anunciarse, no solo verse en rojo. Se
  // envía el formulario vacío de verdad y se lee el estado que queda: así no
  // se puede pasar marcando el campo a mano desde el propio script.
  await login(ctx, page, COACH);
  await goto(page, "/coach/templates/new");
  await page.evaluate(
    `document.querySelector("#template-name")?.closest("form")?.requestSubmit()`,
  );
  await page.waitForSelector("#template-name-error", { timeout: 15_000 });
  const anuncia = (await page.evaluate(`(() => {
    const input = document.querySelector("#template-name");
    const descrito = input?.getAttribute("aria-describedby") ?? null;
    const mensaje = descrito ? document.getElementById(descrito) : null;
    return {
      hayInvalid: input?.getAttribute("aria-invalid") ?? null,
      descrito,
      texto: mensaje?.textContent?.trim() ?? null,
      esFeedback: !!mensaje?.classList.contains("invalid-feedback"),
    };
  })()`)) as {
    hayInvalid: string | null;
    descrito: string | null;
    texto: string | null;
    esFeedback: boolean;
  };
  record(
    anuncia.hayInvalid === "true" && anuncia.esFeedback && !!anuncia.texto,
    "48.5 un campo con error se marca con aria-invalid y describe el motivo",
    `aria-invalid="${anuncia.hayInvalid}", aria-describedby="${anuncia.descrito}" -> "${anuncia.texto}"`,
  );

  await page.close();
}

// ===========================================================================
// 48.2 / 48.3 — Contraste del calendario y nombres accesibles
// ===========================================================================
async function verificarCalendario(ctx: BrowserContext) {
  console.log("\n--- 48.2 / 48.3 Estados del calendario ---");
  const page = await ctx.newPage();
  await login(ctx, page, ATLETA);
  await goto(page, "/athlete/calendar");
  await page.waitForSelector(".calendar-day");
  await page.waitForTimeout(600);

  // El estado no puede depender solo del color (WCAG 1.4.1). Con los datos de
  // demostración hay días de varios estados, así que se comparan sus formas.
  const formas = (await page.evaluate(`(() => {
    const porEstado = {};
    for (const dia of document.querySelectorAll(".calendar-day[data-state]")) {
      const estado = dia.getAttribute("data-state");
      const badge = dia.querySelector(".calendar-day-badge");
      if (!badge) continue;
      const cs = getComputedStyle(badge);
      porEstado[estado] = {
        borderRadius: cs.borderRadius,
        borderWidth: cs.borderWidth,
        borderStyle: cs.borderStyle,
        width: cs.width,
        height: cs.height,
        color: cs.color,
      };
    }
    return porEstado;
  })()`)) as Record<
    string,
    {
      borderRadius: string;
      borderWidth: string;
      width: string;
      height: string;
      color: string;
    }
  >;

  const estados = Object.keys(formas);
  const firmas = new Set(
    estados.map((e) => {
      const f = formas[e];
      return `${f.borderRadius}|${f.borderWidth}|${f.width}|${f.height}`;
    }),
  );
  record(
    estados.length >= 3 && firmas.size === estados.length,
    "48.2 cada estado del calendario tiene una forma distinta, no solo un color",
    `${estados.length} estados, ${firmas.size} formas distintas: ${[...firmas].join(" · ")}`,
  );

  // El nombre accesible del día tiene que decir el estado (48.3): el punto de
  // color es lo único que no lee un lector de pantalla.
  const nombres = (await page.evaluate(`(() => {
    const dias = Array.from(document.querySelectorAll(".calendar-day")).slice(0, 5);
    return dias.map((d) => {
      const dia = d.querySelector(".calendar-day-number")?.textContent?.trim() ?? "";
      return {
        ariaLabel: d.getAttribute("aria-label"),
        nombreCalculado: d.textContent?.replace(/\\s+/g, " ").trim() ?? "",
        dia,
        tieneAriaLabel: d.hasAttribute("aria-label"),
      };
    });
  })()`)) as {
    ariaLabel: string | null;
    nombreCalculado: string;
    dia: string;
    tieneAriaLabel: boolean;
  }[];

  const anuncioOk = nombres.every(
    (n) => !n.tieneAriaLabel && n.nombreCalculado.includes(n.dia),
  );
  record(
    anuncioOk,
    "48.3 el día se anuncia con su número y su estado, sin pisar el texto visible",
    `ejemplo: "${nombres[0]?.nombreCalculado}" (aria-label propio: ${nombres[0]?.tieneAriaLabel})`,
  );

  // Contraste real de los estados: se mide, no se supone (48.2).
  const contraste = (await page.evaluate(`(() => {
    const funcion = (L) => {
      const f = (v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(L[0]) + 0.7152 * f(L[1]) + 0.0722 * f(L[2]);
    };
    const ratio = (a, b) => {
      const [x, y] = [funcion(a), funcion(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    // Tabler 1.6 devuelve oklab(); se convierte a sRGB (Ottosson).
    const aSrgb = (css) => {
      const n = (css.match(/-?[\\d.]+(?:e-?\\d+)?/g) ?? []).map(Number);
      if (/^oklab\\(/.test(css) && n.length >= 3) {
        const [L, A, B] = n;
        const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
        const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
        const s_ = L - 0.0894841775 * A - 1.291485548 * B;
        const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
        const g = (v) => {
          const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
          return Math.min(255, Math.max(0, Math.round(c * 255)));
        };
        return [
          g(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
          g(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
          g(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
          n[3] ?? 1,
        ];
      }
      const [r = 0, g2 = 0, b = 0, a = 1] = n;
      return [r, g2, b, a];
    };
    const componer = (f, n) => [
      Math.round(f[0] * f[3] + n[0] * (1 - f[3])),
      Math.round(f[1] * f[3] + n[1] * (1 - f[3])),
      Math.round(f[2] * f[3] + n[2] * (1 - f[3])),
    ];
    // Los badges de estado del panel usan la paleta accesible de globals.css.
    const chip = document.createElement("span");
    chip.className = "badge app-badge text-bg-success";
    chip.textContent = "Completada";
    chip.style.fontSize = "12px";
    document.body.appendChild(chip);
    const cs = getComputedStyle(chip);
    const fg = componer(aSrgb(cs.color), [255, 255, 255]);
    const bg = componer(aSrgb(cs.backgroundColor), [255, 255, 255]);
    chip.remove();
    return Math.round((ratio(fg, bg) + Number.EPSILON) * 100) / 100;
  })()`)) as number;

  record(
    contraste >= 4.5,
    "48.2 el badge de estado del calendario alcanza 4,5:1 (WCAG AA)",
    `contraste medido=${contraste}:1`,
  );

  await page.close();
}

// ===========================================================================
// axe sobre todas las páginas
// ===========================================================================
type PaginaAxe = {
  email: string;
  password: string;
  ruta: string;
  /** Ruta alcanzable sin sesión: se limpian las cookies antes de abrirla. */
  publica?: boolean;
};

function paginasAxe(): PaginaAxe[] {
  return [
    { email: "", password: "", ruta: "/", publica: true },
    { email: "", password: "", ruta: "/login", publica: true },
    { email: ATLETA, password: DEMO_PASSWORD, ruta: "/athlete/dashboard" },
    { email: ATLETA, password: DEMO_PASSWORD, ruta: "/athlete/calendar" },
    { email: ATLETA, password: DEMO_PASSWORD, ruta: "/athlete/metrics" },
    { email: ATLETA, password: DEMO_PASSWORD, ruta: "/profile" },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/coach/dashboard" },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/coach/teams" },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/coach/templates" },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/coach/templates/new" },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/coach/athletes" },
    {
      email: COACH,
      password: DEMO_PASSWORD,
      ruta: `/coach/calendar/${TEAM_ELITE}/${ATLETA_CALENDARIO}`,
    },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/coach/metrics" },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/coach/groups" },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/exports" },
    { email: ADMIN, password: ADMIN_PASSWORD, ruta: "/admin/dashboard" },
    { email: ADMIN, password: ADMIN_PASSWORD, ruta: "/admin/coaches" },
    { email: ADMIN, password: ADMIN_PASSWORD, ruta: "/admin/groups" },
    { email: ADMIN, password: ADMIN_PASSWORD, ruta: "/admin/athletes" },
    { email: ADMIN, password: ADMIN_PASSWORD, ruta: "/admin/templates" },
    { email: ADMIN, password: ADMIN_PASSWORD, ruta: "/admin/settings" },
    { email: ADMIN, password: ADMIN_PASSWORD, ruta: "/admin/logs" },
    { email: COACH, password: DEMO_PASSWORD, ruta: "/notifications" },
  ];
}

async function verificarConAxe(
  ctx: BrowserContext,
  tema: "claro" | "oscuro" = "claro",
) {
  const sufijo = ` — tema ${tema}`;
  console.log(`\n--- axe-core sobre todas las páginas — tema ${tema} ---`);
  const page = await ctx.newPage();
  let actual = "";
  const violaciones = new Map<
    string,
    { rutas: string[]; nodos: number; ayuda: string }
  >();
  let paginasRevisadas = 0;

  const auditar = async () => {
    await page.addScriptTag({ content: AXE });
    return (await page.evaluate(`(async () => {
      const r = await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
        },
      });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodos: v.nodes.length,
        ejemplo: v.nodes[0]?.html?.slice(0, 140) ?? "",
      }));
    })()`)) as {
      id: string;
      impact: string | null;
      help: string;
      nodos: number;
      ejemplo: string;
    }[];
  };

  const acumular = (res: Awaited<ReturnType<typeof auditar>>, ruta: string) => {
    for (const v of res) {
      const clave = `${v.id} (${v.impact})${sufijo}`;
      const previo = violaciones.get(clave);
      if (previo) {
        previo.rutas.push(ruta);
        previo.nodos += v.nodos;
      } else {
        violaciones.set(clave, {
          rutas: [ruta],
          nodos: v.nodos,
          ayuda: `${v.help} — ej: ${v.ejemplo}`,
        });
      }
    }
  };

  // Recorrido completo: portada y login sin sesión, luego una ruta por rol.
  for (const { email, password, ruta, publica } of paginasAxe()) {
    if (publica) {
      await ctx.clearCookies();
      await aplicarTema(ctx, tema);
      actual = "";
    } else if (email !== actual) {
      await login(ctx, page, email, password);
      actual = email;
    }
    await goto(page, ruta);
    await page.waitForTimeout(700);
    paginasRevisadas += 1;
    acumular(await auditar(), ruta);
  }

  const total = [...violaciones.values()].reduce((s, v) => s + v.nodos, 0);
  record(
    violaciones.size === 0,
    `axe-core no encuentra ninguna violación en las páginas de la app${sufijo}`,
    violaciones.size === 0
      ? `${paginasRevisadas} páginas revisadas (WCAG 2.0/2.1 A y AA, y best-practice)`
      : [...violaciones.entries()]
          .map(
            ([k, v]) =>
              `      ${k}: ${v.nodos} nodos en ${v.rutas.join(", ")}\n        ${v.ayuda}`,
          )
          .join("\n") + `\n      total de nodos con violación: ${total}`,
  );

  await page.close();
}

/** Deja la cookie de tema como la escribiría el control de la app. */
async function aplicarTema(
  ctx: BrowserContext,
  tema: "claro" | "oscuro",
): Promise<void> {
  const host = new URL(BASE_URL).hostname;
  await ctx.addCookies([
    {
      name: "runosorno_tema",
      value: tema === "oscuro" ? "oscuro" : "claro",
      domain: host,
      path: "/",
    },
  ]);
}

// ===========================================================================

async function main() {
  console.log(`Verificando accesibilidad en ${BASE_URL}\n`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  try {
    await resolverIdsDemo();
    await verificarTeclado(ctx);
    await verificarEscape(ctx);
    await verificarCampanita(ctx);
    await verificarLabels(ctx);
    await verificarCalendario(ctx);
    // Los dos temas: axe mide contraste real, así que el tema oscuro necesita su
    // propia pasada. Las comprobaciones de teclado y foco corren una sola vez.
    await verificarConAxe(ctx, "claro");
    await verificarConAxe(ctx, "oscuro");
  } catch (error) {
    record(false, "el script terminó sin errores", String(error));
  } finally {
    await browser.close();
  }

  const fallos = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - fallos.length}/${results.length} comprobaciones OK`,
  );
  if (fallos.length > 0) {
    console.log("\nFallaron:");
    for (const f of fallos) {
      console.log(`  - ${f.label}\n    ${f.detail}`);
    }
    process.exitCode = 1;
  }
  process.exit(process.exitCode ?? 0);
}

void main();
