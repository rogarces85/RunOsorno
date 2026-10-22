import { chromium } from "@playwright/test";

/**
 * Verifica el despliegue real de Cloudflare Workers: login contra la base de
 * Aiven a traves de Hyperdrive y llegada al dashboard. Es la 43.10 y la 43.11
 * de la Fase 43.
 */
const BASE = process.env.BASE_URL ?? "https://runosorno.rodrigo-garces-guerrero.workers.dev";

// Credenciales de producción. Se pueden pasar por entorno para no dejar la
// contraseña en el código: ADMIN_EMAIL / ADMIN_PASSWORD. El valor por defecto
// es el admin del seed local, no el de producción.
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@runosorno.cl";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin1234!";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: "es-CL", timezoneId: "America/Santiago" });

  const errores: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 500) errores.push(`${r.status()} ${r.url()}`);
  });
  page.on("pageerror", (e) => errores.push(`pageerror: ${String(e).slice(0, 200)}`));

  console.log(`Probando ${BASE}`);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });

  // 1. Cookie de sesion: debe ser Secure y HttpOnly en HTTPS
  const antes = await page.context().cookies();
  console.log(`cookies antes del login: ${antes.length}`);

  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL("**/admin/dashboard", { timeout: 45000 });
    console.log("LOGIN OK -> " + page.url());
  } catch {
    console.log("LOGIN FALLIDO. URL actual: " + page.url());
    const texto = await page.locator("body").innerText();
    console.log("pantalla:\n" + texto.slice(0, 400));
    await browser.close();
    process.exit(1);
  }

  const cookies = await page.context().cookies();
  const sesion = cookies.find((c) => c.name.toLowerCase().includes("session"));
  console.log(
    `cookie de sesion: ${sesion ? sesion.name : "NINGUNA"} | secure=${sesion?.secure} httpOnly=${sesion?.httpOnly} sameSite=${sesion?.sameSite}`,
  );

  // 2. La sesion persistio en la base de Aiven: recargar no debe cerrar
  await page.reload({ waitUntil: "domcontentloaded" });
  const trasRecarga = page.url();
  console.log(`tras recargar: ${trasRecarga.includes("admin/dashboard") ? "sigue dentro (DB real)" : "expulsado: " + trasRecarga}`);

  // 3. Ruta protegida sin sesion debe redirigir
  //
  // La redireccion se resuelve en el render (el layout pide la sesion), asi que
  // la respuesta inicial es 200 con el shell de error de Next y el cliente
  // navega a /login. Por eso hay que esperar a `networkidle` y mirar la URL
  // final: mirar la URL inmediata daria la ruta protegida y parece una fuga.
  const anonimo = await browser.newContext({ locale: "es-CL" });
  const p2 = await anonimo.newPage();
  await p2.goto(`${BASE}/admin/dashboard`, {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  const urlFinal = p2.url();
  const dentro = (await p2.getByTestId("app-sidebar").count()) > 0;
  console.log(
    `sin sesion, /admin/dashboard -> ${urlFinal}` +
      (urlFinal.includes("/login") && !dentro
        ? "  (redirigido, sin datos)"
        : "  !! NO redirigió o dejó datos visibles"),
  );

  console.log(errores.length ? `ERRORES 5xx: ${errores.join(", ")}` : "sin errores 5xx");

  await browser.close();
  process.exit(0);
}

main().catch((e) => {
  console.log("ERROR:", String(e).slice(0, 500));
  process.exit(1);
});