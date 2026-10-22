/**
 * Comprueba si una pagina autenticada renderiza en runtime o se cuelga.
 *
 * El render en runtime es el camino que usan todas las paginas con sesion
 * (tableros, calendario, metricas): nunca estan en la cache, asi que siempre
 * se generan en el momento. Si el render se cuelga en workerd, la app
 * autenticada esta caida aunque la landing responda.
 *
 *   npx tsx scripts/verificar-render-autenticado.ts [email] [password]
 */
import { chromium } from "playwright";

const EMAIL = process.argv[2] ?? "admin@runosorno.cl";
const PASSWORD = process.argv[3] ?? "Admin1234!";
const BASE = process.env.BASE_URL ?? "https://runosorno.online";

const RUTAS = [
  "/admin/dashboard",
  "/coach/dashboard",
  "/athlete/dashboard",
  "/athlete/calendar",
  "/admin/coaches",
];

async function main() {
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext();
  const pagina = await contexto.newPage();

  console.log(`\nLogin como ${EMAIL} en ${BASE}\n`);

  const inicio = Date.now();
  // `networkidle`: sin eso, el clic puede caer antes de que hidrate el
  // formulario y el navegador hace un GET nativo (la contraseña acaba en la
  // URL y la accion nunca se ejecuta).
  await pagina.goto(`${BASE}/login`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await pagina.fill('input[name="email"]', EMAIL);
  await pagina.fill('input[name="password"]', PASSWORD);
  const [respuesta] = await Promise.all([
    pagina.waitForResponse((r) => r.request().method() === "POST", { timeout: 45000 }),
    pagina.click('button[type="submit"]'),
  ]);
  await pagina.waitForLoadState("domcontentloaded").catch(() => undefined);
  console.log(`  POST /login -> ${respuesta.status()}  (${Date.now() - inicio} ms)`);

  // El cliente navega al tablero con `window.location.assign` después del
  // 303: hay que esperar a esa navegación antes de probar las páginas, o el
  // `goto` siguiente se aborta al competir con ella.
  await pagina
    .waitForURL(/\/(admin|coach|athlete|director)\/dashboard/, { timeout: 45000 })
    .catch(() => undefined);
  console.log(`  URL tras login: ${pagina.url()}`);

  const cuerpo = await pagina.textContent("body").catch(() => "");
  if (/incorrectos|revisa los datos/i.test(cuerpo ?? "")) {
    console.log("  !! Credenciales incorrectas: el resto de la prueba no es valida.");
    await navegador.close();
    return;
  }

  console.log("\n  Paginas con sesion:");
  for (const ruta of RUTAS) {
    const t0 = Date.now();
    let estado = "sin respuesta";
    try {
      const r = await pagina.goto(`${BASE}${ruta}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      estado = String(r?.status());
    } catch {
      estado = "TIMEOUT";
    }
    const ms = Date.now() - t0;
    const marca = estado === "200" ? "ok " : "FALLA";
    console.log(`    ${marca} ${ruta.padEnd(22)} ${estado.padEnd(12)} ${ms} ms`);
  }

  await navegador.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
