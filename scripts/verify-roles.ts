/**
 * Verificacion automatizada de las fases 30, 31, 32 y 36.
 *
 * Usa un navegador real (Playwright) para iniciar sesion con cada rol y
 * comprobar que las paginas renderizan con datos reales y que el menu
 * lateral muestra los items correctos segun el rol.
 *
 * Requiere el servidor de desarrollo corriendo (`npm run dev`).
 *
 * Uso:  npx tsx scripts/verify-roles.ts
 */

import { chromium, type Browser, type Page } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DEMO_PASSWORD = "Demo1234!";
const ADMIN_PASSWORD = "Admin1234!";

type Role = "admin" | "coach" | "director" | "athlete";

type Account = {
  role: Role;
  email: string;
  password: string;
  label: string;
  expectPages: { path: string; label: string }[];
  expectBlocked: string[];
  expectNav: string[];
  expectNoNav: string[];
};

const ACCOUNTS: Account[] = [
  {
    role: "admin",
    email: "admin@runosorno.cl",
    password: ADMIN_PASSWORD,
    label: "Administrador",
    expectPages: [
      { path: "/admin/dashboard", label: "dashboard admin" },
      { path: "/admin/coaches", label: "coaches" },
      { path: "/admin/groups", label: "grupos" },
      { path: "/admin/athletes", label: "atletas" },
      { path: "/admin/templates", label: "plantillas oficiales" },
    ],
    expectBlocked: ["/coach/dashboard", "/athlete/dashboard"],
    expectNav: ["Coaches", "Grupos", "Atletas", "Plantillas oficiales"],
    expectNoNav: ["Mis Teams", "Mis métricas", "Calendario"],
  },
  {
    role: "coach",
    email: "coach.demo@runosorno.cl",
    password: DEMO_PASSWORD,
    label: "Coach principal",
    expectPages: [
      { path: "/coach/dashboard", label: "dashboard coach" },
      { path: "/coach/teams", label: "mis teams" },
      { path: "/coach/calendar", label: "calendario" },
      { path: "/coach/templates", label: "plantillas" },
      { path: "/coach/athletes", label: "atletas" },
      { path: "/coach/metrics", label: "metricas" },
      { path: "/coach/groups", label: "grupos" },
    ],
    expectBlocked: ["/admin/dashboard", "/athlete/dashboard"],
    expectNav: ["Mis Teams", "Calendario", "Plantillas", "Métricas", "Grupos"],
    expectNoNav: ["Coaches", "Plantillas oficiales"],
  },
  {
    role: "director",
    email: "director.demo@runosorno.cl",
    password: DEMO_PASSWORD,
    label: "Director Tecnico",
    expectPages: [
      { path: "/coach/dashboard", label: "dashboard coach" },
      { path: "/director/dashboard", label: "dashboard del grupo" },
      { path: "/director/teams", label: "comparativa de teams" },
      { path: "/director/athletes", label: "atletas lectura" },
      { path: "/director/announcements", label: "anuncios" },
    ],
    expectBlocked: ["/admin/dashboard"],
    expectNav: [
      "Mis Teams",
      "Calendario",
      "Director Técnico",
      "Dashboard del grupo",
      "Anuncios",
    ],
    expectNoNav: ["Coaches", "Plantillas oficiales"],
  },
  {
    role: "athlete",
    email: "maria.fernandez@demo.runosorno.cl",
    password: DEMO_PASSWORD,
    label: "Atleta",
    expectPages: [
      { path: "/athlete/dashboard", label: "dashboard atleta" },
      { path: "/athlete/calendar", label: "calendario" },
      { path: "/athlete/metrics", label: "metricas" },
      { path: "/profile", label: "perfil" },
    ],
    expectBlocked: ["/coach/dashboard", "/admin/dashboard", "/director/dashboard"],
    expectNav: ["Calendario", "Mis métricas", "Perfil"],
    expectNoNav: ["Mis Teams", "Coaches", "Plantillas oficiales"],
  },
];

type Check = { ok: boolean; label: string; detail: string };
const results: Check[] = [];

function record(ok: boolean, label: string, detail = ""): void {
  results.push({ ok, label, detail });
  console.log(`  ${ok ? "OK   " : "FALLO"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function login(page: Page, email: string, password: string): Promise<void> {
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

/** Texto visible del sidebar (navegacion lateral). */
async function sidebarText(page: Page): Promise<string> {
  const sidebar = page.locator("aside, .navbar-vertical, nav.sidebar").first();
  if ((await sidebar.count()) === 0) {
    return (await page.locator("body").innerText()).toLowerCase();
  }
  return (await sidebar.innerText()).toLowerCase();
}

async function main() {
  console.log(`Verificando ${BASE_URL}\n`);
  const browser: Browser = await chromium.launch();
  const errorsByPage: string[] = [];

  try {
    for (const account of ACCOUNTS) {
      console.log(`--- ${account.label} (${account.email}) ---`);
      const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
      const page = await context.newPage();

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errorsByPage.push(`[${account.label}] ${msg.text().slice(0, 200)}`);
        }
      });

      try {
        await login(page, account.email, account.password);
        record(true, `${account.label}: login correcto`, page.url().replace(BASE_URL, ""));
      } catch (error) {
        record(false, `${account.label}: login`, String(error).slice(0, 120));
        await context.close();
        continue;
      }

      // Paginas que deben renderizar.
      for (const target of account.expectPages) {
        try {
          const response = await page.goto(`${BASE_URL}${target.path}`, {
            waitUntil: "networkidle",
            timeout: 30_000,
          });
          const status = response?.status() ?? 0;
          const bodyText = (await page.locator("body").innerText()).trim();
          const isErrorPage =
            bodyText.includes("Application error") ||
            bodyText.includes("This page could not be found") ||
            bodyText.includes("Something went wrong");
          const ok = status === 200 && !isErrorPage && bodyText.length > 100;
          record(
            ok,
            `${target.label} (${target.path})`,
            ok ? `HTTP ${status}` : `HTTP ${status}${isErrorPage ? " (pagina de error)" : ""}`,
          );
        } catch (error) {
          record(false, `${target.label} (${target.path})`, String(error).slice(0, 100));
        }
      }

      // Rutas que deben estar bloqueadas para este rol.
      for (const path of account.expectBlocked) {
        try {
          await page.goto(`${BASE_URL}${path}`, {
            waitUntil: "networkidle",
            timeout: 30_000,
          });
          const finalPath = new URL(page.url()).pathname;
          const redirectedToLogin = finalPath === "/login";
          const blocked =
            redirectedToLogin ||
            finalPath !== path ||
            !(await page.locator("body").innerText()).includes("404");
          record(
            blocked,
            `bloqueo de ${path}`,
            blocked ? `redirigido a ${finalPath}` : `acceso permitido en ${path}`,
          );
        } catch (error) {
          record(false, `bloqueo de ${path}`, String(error).slice(0, 100));
        }
      }

      // Menu lateral del dashboard principal.
      const dashboardPath = account.expectPages[0].path;
      await page.goto(`${BASE_URL}${dashboardPath}`, { waitUntil: "networkidle" });
      const nav = await sidebarText(page);

      for (const item of account.expectNav) {
        const found = nav.includes(item.toLowerCase());
        record(found, `menu incluye "${item}"`, found ? "" : "no encontrado");
      }
      for (const item of account.expectNoNav) {
        const absent = !nav.includes(item.toLowerCase());
        record(absent, `menu NO incluye "${item}"`, absent ? "" : "aparece indebidamente");
      }

      await context.close();
      console.log("");
    }
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log("=====================================");
  console.log(`RESULTADO: ${passed}/${results.length} verificaciones OK`);

  if (errorsByPage.length > 0) {
    console.log(`\nErrores de consola en el navegador (${errorsByPage.length}):`);
    for (const error of [...new Set(errorsByPage)].slice(0, 10)) {
      console.log(`  - ${error}`);
    }
  }

  if (failed.length > 0) {
    console.log(`\nFALLOS (${failed.length}):`);
    for (const f of failed) {
      console.log(`  - ${f.label} [${f.detail}]`);
    }
    process.exit(1);
  }
  console.log("Todas las verificaciones pasaron.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
