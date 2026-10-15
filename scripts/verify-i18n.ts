import { chromium } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Verificación de la Fase 46 (i18n y localización).
 *
 * La fase se comprobó en tres planos, y aquí se verifican los dos últimos:
 *
 * 1. **Unitaria** (`tests/unit/i18n.test.ts`): instantes concretos que en UTC y
 *    en hora de Santiago dan días distintos. Es donde se comprueba el desfase.
 * 2. **Auditoría de código** (aquí): que ninguna fecha se formatee por su cuenta
 *    y que las abreviaturas del calendario no estén escritas a mano. Es la
 *    única forma de que la garantía se mantenga dentro de seis meses.
 * 3. **Interfaz** (aquí): que un usuario en Chile vea el mes y los días en
 *    español y las unidades con coma decimal.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ATHLETE = {
  email: "maria.fernandez@demo.runosorno.cl",
  password: "Demo1234!",
};

let ok = 0;
const fallos: string[] = [];

function record(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) {
    ok++;
    console.log(`  OK    ${nombre}`);
  } else {
    fallos.push(`${nombre}${detalle ? ` — ${detalle}` : ""}`);
    console.log(`  FALLO ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

/** Lista recursivamente archivos de un directorio del proyecto. */
async function listar(dir: string): Promise<string[]> {
  const salida: string[] = [];
  async function recorrer(actual: string) {
    for (const e of await readdir(actual, { withFileTypes: true })) {
      const completo = join(actual, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        await recorrer(completo);
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        salida.push(completo);
      }
    }
  }
  await recorrer(dir);
  return salida;
}

async function main() {
  console.log("46.3 — una sola fuente de formato\n");

  // La regla del proyecto: nadie formatea fechas por su cuenta. Si alguien
  // escribe `new Intl.DateTimeFormat(...)` o llama a `toLocaleString()` en un
  // componente, la fecha sale en la zona del servidor (UTC en el Worker) y se
  // desfasa un día respecto de Chile.
  const infractores: string[] = [];
  for (const carpeta of ["app", "components", "lib", "emails"]) {
    for (const f of await listar(carpeta)) {
      if (f.startsWith(join("lib", "i18n"))) continue;
      const txt = await readFile(f, "utf8");
      const lineas = txt.split("\n");
      lineas.forEach((linea, i) => {
        // Se ignoran los comentarios: la regla documentada puede nombrar las API.
        if (linea.trim().startsWith("*") || linea.trim().startsWith("//")) return;
        if (/new Intl\.|toLocaleString\(|toLocaleDateString\(|toLocaleTimeString\(/.test(linea)) {
          infractores.push(`${f}:${i + 1}`);
        }
      });
    }
  }
  record(
    "ningún módulo formatea fechas fuera de lib/i18n",
    infractores.length === 0,
    infractores.join(" | "),
  );

  const calendario = await readFile(
    join("components", "calendar", "MonthCalendar.tsx"),
    "utf8",
  );
  record(
    "el calendario saca sus días de Intl, no de una lista escrita a mano",
    calendario.includes("formatWeekdays()") &&
      !/const WEEKDAYS = \[/.test(calendario),
  );
  record(
    "el encabezado de mes usa el formateador central",
    calendario.includes("formatMonthYear(year, month)"),
  );

  const config = await readFile(join("lib", "i18n", "config.ts"), "utf8");
  record("el locale es es-CL", config.includes('LOCALE = "es-CL"'));
  record("la zona horaria es America/Santiago", config.includes('"America/Santiago"'));

  const mensajes = JSON.parse(
    await readFile(join("messages", "es-CL.json"), "utf8"),
  ) as Record<string, Record<string, string>>;
  record(
    "existe messages/es-CL.json con los textos comunes",
    Boolean(mensajes.common && mensajes.nav && mensajes.units),
    Object.keys(mensajes).join(", "),
  );

  console.log("\n46.4 / 46.5 — en la interfaz\n");
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ locale: "es-CL" });
  await pagina.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await pagina.waitForLoadState("networkidle");
  await pagina.fill('input[name="email"]', ATHLETE.email);
  await pagina.fill('input[name="password"]', ATHLETE.password);

  // El login se reintenta mientras no haya un POST a /login: hasta que el
  // bundle hidrata, el clic dispara el envío nativo del formulario.
  let sesion = false;
  for (let i = 0; i < 8 && !sesion; i++) {
    const enviado = pagina.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/login"),
      { timeout: 5000 },
    );
    await pagina.click('button[type="submit"]').catch(() => undefined);
    const posting = await enviado.catch(() => null);
    if (!posting) continue;
    sesion = await pagina
      .waitForURL("**/athlete/dashboard", { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
  }
  record("el atleta puede iniciar sesión", sesion);
  if (!sesion) {
    await navegador.close();
    console.log("\nSin sesión no se puede seguir con la verificación de interfaz.");
    console.log(`RESULTADO: ${ok}/${ok + fallos.length} verificaciones OK`);
    process.exit(1);
  }

  await pagina.goto(`${BASE}/athlete/calendar`, { waitUntil: "domcontentloaded" });
  const encabezado = await pagina
    .getByTestId("calendar-month-label")
    .textContent()
    .catch(() => null);
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  record(
    "el mes del calendario sale en español",
    Boolean(encabezado && meses.some((m) => encabezado.toLowerCase().includes(m))),
    encabezado ?? "(sin encabezado)",
  );

  const dias = await pagina.locator(".calendar-weekdays span").allTextContents();
  const esperados = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
  record(
    "los encabezados de día vienen de Intl y arrancan en lunes",
    dias.length === 7 &&
      esperados.every((d, i) => dias[i].trim().toLowerCase().startsWith(d.slice(0, 3))),
    dias.join(" | "),
  );

  await pagina.goto(`${BASE}/athlete/metrics`, { waitUntil: "domcontentloaded" });
  const cuerpo = await pagina.locator("body").innerText();
  record(
    "el cumplimiento se muestra como porcentaje",
    /cumplimiento/i.test(cuerpo) && /\d+\s*%/.test(cuerpo),
  );
  record(
    "las distancias usan coma decimal",
    /\d+,\d+\s*km/.test(cuerpo) || !/\d+\.\d+\s*km/.test(cuerpo),
    "se encontró un kilometeraje con punto decimal",
  );
  record(
    "las horas de duración usan h/min en español",
    /\d+\s*(h|min)/.test(cuerpo) || /\d+\s*h\s+\d+\s*min/.test(cuerpo),
  );

  await navegador.close();

  console.log("\n=====================================");
  console.log(`RESULTADO: ${ok}/${ok + fallos.length} verificaciones OK`);
  if (fallos.length) {
    console.log(`FALLOS (${fallos.length}):`);
    for (const f of fallos) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("Todas las verificaciones pasaron.");
}

main().catch((e) => {
  console.log("ERROR:", String(e).slice(0, 600));
  process.exit(1);
});