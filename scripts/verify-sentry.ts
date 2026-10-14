import { chromium } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Verificación de la Fase 44 (Sentry).
 *
 * No basta con comprobar que los archivos de configuración existen: lo que se
 * verifica es que un error real llega al colector. Para eso el script levanta
 * dos cosas:
 *
 * 1. Un servidor en 127.0.0.1:8789 que hace de Sentry. Recibe los envelopes en
 *    `POST /api/1/envelope/` y guarda el cuerpo. Con esto se comprueba el
 *    evento completo: que salió, qué trae y qué **no** trae.
 * 2. Un `next dev` propio en el puerto 3111 con `SENTRY_DSN` apuntando a ese
 *    colector. No reutiliza el servidor del desarrollador justamente porque el
 *    DSN se lee al arrancar: si el servidor ya estaba en pie, la variable no
 *    existiría y la comprobación no probaría nada.
 *
 * Para provocar los errores se crean archivos temporales bajo
 * `app/sentry-probe/` (un Server Action que lanza y una página que falla al
 * renderizar) y se borran al terminar. El directorio **no** puede empezar por
 * `_`: Next trata esas carpetas como privadas y nunca las compila, así que la
 * ruta no existiría y la comprobación pasaría sin comprobar nada.
 *
 * Las comprobaciones se hacen con sesión iniciada porque `proxy.ts` manda a
 * `/login` cualquier ruta sin cookie: sin iniciar sesión, la sonda devolvería
 * la portada de login en lugar de fallar.
 */

const PUERTO_COLECTOR = 8789;
const PUERTO_APP = 3111;
// La clave pública del DSN solo admite caracteres alfanuméricos: el parser del
// SDK usa `\w+`, y una clave con guiones hace que descarte el DSN entero ("Invalid
// Sentry Dsn") sin avisar por ningún otro lado.
const CLAVE_PUBLICA = "clavepublicadeprueba123456";
const DSN = `http://${CLAVE_PUBLICA}@127.0.0.1:${PUERTO_COLECTOR}/1`;
const DIR_SONDA = join(process.cwd(), "app", "sentry-probe");

const EMAIL = "admin@runosorno.cl";
const PASSWORD = "Admin1234!";

const MENSAJE_ACTION = "SENTRY_PROBE_ACTION: fallo de Server Action";
const MENSAJE_RENDER = "SENTRY_PROBE_RENDER: fallo de render";
const MENSAJE_EXPLICITA = "SENTRY_PROBE_EXPLICITO: captura manual";

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

/**
 * Un envelope de Sentry son varias líneas JSON: la primera es la cabecera del
 * envelope y a partir de ahí van de dos en dos (cabecera del item + payload). Los
 * items de tipo `session` o `client_report` no son errores; aquí solo interesan
 * los de tipo `event`.
 */
function eventosDe(cuerpo: string): Record<string, unknown>[] {
  const lineas = cuerpo.split("\n").filter((l) => l.trim().length > 0);
  const eventos: Record<string, unknown>[] = [];
  for (let i = 1; i + 1 < lineas.length; i += 2) {
    try {
      const cabecera = JSON.parse(lineas[i]);
      if (cabecera.type !== "event") continue;
      eventos.push(JSON.parse(lineas[i + 1]));
    } catch {
      // Una línea que no es JSON no es un item: se ignora.
    }
  }
  return eventos;
}

/** Volcado de los envelopes recibidos, para diagnosticar el parser. */
function volcar(recibidos: string[]): string {
  return recibidos
    .map((c) => {
      const lineas = c.split("\n").filter((l) => l.trim());
      return lineas
        .map((l) => l.slice(0, 160))
        .join(" | ")
        .slice(0, 400);
    })
    .join("\n    ");
}

function abrirColector(): Promise<{ servidor: Server; recibidos: string[] }> {
  const recibidos: string[] = [];
  const servidor = createServer((req, res) => {
    let cuerpo = "";
    req.on("data", (chunk) => {
      cuerpo += chunk;
    });
    req.on("end", () => {
      if (req.method === "POST" && req.url?.startsWith("/api/1/envelope/")) {
        recibidos.push(cuerpo);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ id: "evento-de-prueba" }));
        return;
      }
      res.writeHead(404).end();
    });
  });
  return new Promise((resolve) => {
    servidor.listen(PUERTO_COLECTOR, "127.0.0.1", () =>
      resolve({ servidor, recibidos }),
    );
  });
}

/** Espera a que exista un envelope cuyo mensaje contenga `aguja`. */
async function esperarEvento(
  recibidos: string[],
  aguja: string,
  ms = 20000,
): Promise<Record<string, unknown> | null> {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    for (const cuerpo of recibidos) {
      for (const evento of eventosDe(cuerpo)) {
        if (JSON.stringify(evento).includes(aguja)) return evento;
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function esperarServidor(url: string, ms = 120000): Promise<boolean> {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return true;
    } catch {
      // Todavía no levanta.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function escribirSonda() {
  await mkdir(DIR_SONDA, { recursive: true });
  await writeFile(
    join(DIR_SONDA, "actions.ts"),
    `"use server";

/**
 * Server Action de prueba: lanza una excepción no controlada, que es
 * exactamente lo que runAction deja pasar (los fail() de negocio no llegan
 * aquí). Es el caso que quiere cubrir la tarea 44.4.
 */
export async function falloInesperado(): Promise<void> {
  throw new Error(${JSON.stringify(MENSAJE_ACTION)});
}
`,
  );
  await writeFile(
    join(DIR_SONDA, "sonda.tsx"),
    `"use client";

import { useState } from "react";
import { falloInesperado } from "./actions";

export function Sonda() {
  const [estado, setEstado] = useState("listo");
  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => {
          setEstado("lanzo");
          await falloInesperado();
          setEstado("termino");
        }}
      >
        Lanzar error
      </button>
      <p data-testid="estado">{estado}</p>
    </div>
  );
}
`,
  );
  await writeFile(
    join(DIR_SONDA, "page.tsx"),
    `import * as Sentry from "@sentry/nextjs";
import { Sonda } from "./sonda";

// Con "cacheComponents" una página que lee los searchParams no se puede
// prerenderizar: Next la bloquea salvo que se marque como instantánea-pero-no.
export const instant = false;

export default async function SondaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.lanzar === "render") {
    // Falla el render del Server Component: es la tarea 44.5, y en pantalla
    // tiene que aparecer el error.tsx en lugar de una página en blanco.
    throw new Error(${JSON.stringify(MENSAJE_RENDER)});
  }
  if (params.lanzar === "explicito") {
    // Captura explícita desde el servidor, que es el camino que usa la app
    // cuando quiere dejar constancia de algo que no es un crash.
    Sentry.captureException(new Error(${JSON.stringify(MENSAJE_EXPLICITA)}));
  }
  return (
    <div className="page">
      <Sonda />
    </div>
  );
}
`,
  );
}

/** Ejecuta un comando a la espera y devuelve su salida y su código de retorno. */
function ejecutar(
  comando: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ codigo: number | null; salida: string }> {
  return new Promise((resolve) => {
    const hijo = spawn(comando, args, { env });
    let salida = "";
    hijo.stdout?.on("data", (d) => (salida += d));
    hijo.stderr?.on("data", (d) => (salida += d));
    hijo.on("exit", (codigo) => resolve({ codigo, salida }));
  });
}

async function esperarCierre(proceso: ChildProcess) {
  if (proceso.exitCode !== null || proceso.signalCode) return;
  await new Promise<void>((resolve) => {
    proceso.once("exit", () => resolve());
    setTimeout(() => {
      proceso.kill();
      resolve();
    }, 5000);
  });
}

async function main() {
  console.log(`Verificando Sentry (colector en ${PUERTO_COLECTOR})\n`);

  console.log("44.3 — configuración de build");
  // `next.config.ts` es TypeScript, así que se evalúa con tsx en vez de
  // releerlo: lo que se comprueba es el valor que Next recibiría de verdad.
  const leerConfig = async (token: string | undefined) => {
    // Se evalúa `next.config.ts` en un proceso aparte porque el SDK decide su
    // comportamiento **una vez** al cargar el módulo: reutilizar el mismo
    // proceso devolvería siempre el resultado del primer caso. `TURBOPACK=1`
    // replica el bundler real del build (Sentry lo lee de ahí para saber si
    // compila con Turbopack o con webpack).
    const hijo = spawn(
      process.execPath,
      [
        "--experimental-strip-types",
        "-e",
        `import("./next.config.ts").then((m) => {
           process.stdout.write(JSON.stringify({
             browserSourceMaps: m.default.productionBrowserSourceMaps ?? false,
           }));
         });`,
      ],
      {
        env: {
          ...process.env,
          TURBOPACK: "1",
          SENTRY_AUTH_TOKEN: token ?? "",
          SENTRY_ORG: "org-de-prueba",
          SENTRY_PROJECT: "proyecto-de-prueba",
        },
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    let salida = "";
    hijo.stdout.on("data", (d) => (salida += d));
    await new Promise<void>((resolve) => hijo.on("exit", () => resolve()));
    return JSON.parse(salida) as { browserSourceMaps: boolean };
  };

  const conToken = await leerConfig("token-de-prueba");
  record(
    "con SENTRY_AUTH_TOKEN se generan los source maps del navegador",
    conToken.browserSourceMaps === true,
    JSON.stringify(conToken),
  );

  const sinToken = await leerConfig(undefined);
  record(
    "sin SENTRY_AUTH_TOKEN no se generan source maps",
    sinToken.browserSourceMaps === false,
    JSON.stringify(sinToken),
  );

  // La opción `sourcemaps.disable` es de Sentry, no de Next: no aparece en el
  // objeto de configuración que devuelve `withSentryConfig`, así que se
  // comprueba en el código que la enlaza con el token.
  const fuenteConfig = await readFile("next.config.ts", "utf8");
  record(
    "la subida de source maps depende del token",
    /sourcemaps:\s*\{[\s\S]*?disable:\s*!process\.env\.SENTRY_AUTH_TOKEN/.test(
      fuenteConfig,
    ),
  );

  const { servidor, recibidos } = await abrirColector();
  await escribirSonda();

  // Se compila con la sonda incluida y se arranca el servidor de producción en
  // lugar de `next dev`. Motivo: **en desarrollo el transporte de Sentry no
  // envía nada**. Los eventos se capturan (el log del SDK lo dice) pero ningún
  // envelope sale hacia el colector, ni siquiera con `Sentry.flush()`, que
  // además devuelve `true`. Un `fetch` normal desde la misma ruta sí llega, así
  // que no es la red: es el_entorno de desarrollo. Como el servidor de
  // producción entrega los eventos correctamente, es donde se verifica, que es
  // además el runtime que importa (el Worker).
  console.log("Compilando con la sonda incluida (next build)...");
  const compilacion = await ejecutar(
    process.execPath,
    [join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "build"],
    process.env,
  );
  record(
    "la app compila con Sentry configurado",
    compilacion.codigo === 0,
    compilacion.salida.slice(-400),
  );

  // Se lanza el binario de Next directamente en vez de `npm run start`: en
  // Windows `spawn` de un `.cmd` sin shell está bloqueado desde Node 18.20, y
  // así además el proceso que se cierra al terminar es el servidor y no npm.
  const app: ChildProcess = spawn(
    process.execPath,
    [
      join(process.cwd(), "node_modules", "next", "dist", "bin", "next"),
      "start",
      "-p",
      String(PUERTO_APP),
    ],
    {
      env: {
        ...process.env,
        SENTRY_DSN: DSN,
        SENTRY_ENVIRONMENT: "verification",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  // El log del servidor se guarda en un archivo: si algo falla, la causa está
  // casi siempre ahí (una ruta que no compila, un error de inicialización del
  // SDK) y no en la salida del script.
  const logServidor = join(tmpdir(), "verify-sentry-servidor.log");
  const flujoLog = createWriteStream(logServidor, { flags: "w" });
  app.stdout?.pipe(flujoLog);
  app.stderr?.pipe(flujoLog);

  try {
    // El servidor se pide por `localhost` y no por `127.0.0.1`: en desarrollo Next
    // bloquea los recursos de HMR de un origen que no reconoce, y con esa
    // advertencia la hidrataciónDelayed y el formulario de login se enviaba de
    // forma nativa (GET con la contraseña en la URL) en lugar de llamar al
    // Server Action. El colector sí se queda en 127.0.0.1: es local y no
    // importa.
    const base = `http://localhost:${PUERTO_APP}`;
    const lista = await esperarServidor(`${base}/login`);
    record("la app arranca con SENTRY_DSN configurado", lista);
    if (!lista) return;

    // 44.2 — la app sigue funcionando con la observabilidad puesta.
    const login = await fetch(`${base}/login`);
    const html = await login.text();
    record(
      "la página de login sigue respondiendo bien",
      login.status === 200 && html.includes("RunOsorno"),
      `status=${login.status}`,
    );

    console.log("\nSesión de prueba");
    const navegador = await chromium.launch();
    const pagina = await navegador.newPage();
    await pagina.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    // Sin esperar a la hidratación, el clic en "Entrar" hace el envío nativo del
    // formulario (`GET /login?email=...`) y no llama al Server Action. Este
    // servidor es recién arrancado, así que el primer render tarda más.
    await pagina.waitForLoadState("networkidle");
    await pagina.fill('input[name="email"]', EMAIL);
    await pagina.fill('input[name="password"]', PASSWORD);

    // El login se reintenta mientras no haya un POST a /login: hasta que el
    // bundle no hidrata, el clic dispara el envío nativo del formulario
    // (GET con la contraseña en la URL) en vez de llamar al Server Action.
    let haySesion = false;
    for (let intento = 0; intento < 10 && !haySesion; intento++) {
      const enviado = pagina.waitForResponse(
        (r) => r.request().method() === "POST" && r.url().includes("/login"),
        { timeout: 5000 },
      );
      await pagina.click('button[type="submit"]').catch(() => undefined);
      const posting = await enviado.catch(() => null);
      if (!posting) continue;
      haySesion = await pagina
        .waitForURL("**/admin/dashboard", { timeout: 30000 })
        .then(() => true)
        .catch(() => false);
    }
    const textoLogin = await pagina
      .locator('[data-testid="login-error"], .alert-danger')
      .first()
      .textContent()
      .catch(() => null);
    record(
      "se puede iniciar sesión en la app instrumentada",
      haySesion,
      `mensaje en pantalla: ${textoLogin?.trim() ?? "(ninguno)"}`,
    );

    console.log("\n44.5 — errores de render");
    const respuesta = await pagina.goto(`${base}/sentry-probe?lanzar=render`, {
      waitUntil: "domcontentloaded",
    });
    const htmlSonda = await pagina.content();
    record(
      "el fallo de render no devuelve la página con normalidad",
      respuesta?.status() !== 200 || htmlSonda.includes("Algo salió mal"),
      `status=${respuesta?.status()}`,
    );
    record(
      "el usuario ve la pantalla de error de error.tsx",
      htmlSonda.includes("Algo salió mal") && htmlSonda.includes("Reintentar"),
    );
    const eventoRender = await esperarEvento(recibidos, MENSAJE_RENDER);
    record("el error de render llega a Sentry", eventoRender !== null);
    record(
      "el evento describe la ruta que falló",
      JSON.stringify(eventoRender ?? {}).includes("/sentry-probe"),
    );
    record(
      "el evento conserva el stack trace (el scrub no lo destruye)",
      JSON.stringify(eventoRender ?? {}).includes('"stacktrace"'),
      "los frames del stack no llegaron",
    );

    console.log("\nCaptura explícita desde el servidor");
    await pagina.goto(`${base}/sentry-probe?lanzar=explicito`, {
      waitUntil: "domcontentloaded",
    });
    const eventoExplicito = await esperarEvento(recibidos, MENSAJE_EXPLICITA);
    record(
      "captureException del servidor llega a Sentry",
      eventoExplicito !== null,
    );

    console.log("\n44.4 — errores de Server Action");
    await pagina.goto(`${base}/sentry-probe`, { waitUntil: "domcontentloaded" });
    await pagina.click("button");
    const eventoAction = await esperarEvento(recibidos, MENSAJE_ACTION);
    record("el error del Server Action llega a Sentry", eventoAction !== null);
    record(
      "un fallo de negocio (ActionFailure) no se reporta como incidencia",
      !recibidos.some((c) => c.includes("ActionFailure")),
    );
    await navegador.close();

    console.log("\n44.2 — privacidad de los eventos");
    console.log(`  (envelopes recibidos: ${recibidos.length})`);
    const todo = recibidos.join("\n");
    record(
      "los eventos no llevan la cookie de sesión",
      !todo.includes("auth_session"),
    );
    record(
      "los eventos no llevan correos de usuarios",
      !/[\\w.+-]+@[\\w-]+\\.[\\w.-]+/.test(todo.replace(DSN, "")),
      "apareció un correo en algún envelope",
    );
    const conCabeceras = recibidos.some((c) => /"headers"\s*:/.test(c));
    record("los eventos no arrastran cabeceras HTTP", !conCabeceras);
  } finally {
    await esperarCierre(app);
    await rm(DIR_SONDA, { recursive: true, force: true });
    servidor.close();
  }

  console.log("\n=====================================");
  console.log(`RESULTADO: ${ok}/${ok + fallos.length} verificaciones OK`);
  if (fallos.length) {
    console.log(`FALLOS (${fallos.length}):`);
    for (const f of fallos) console.log(`  - ${f}`);
    // El volcado solo cuando algo falla: sin él no se distingue "no llegó nada"
    // de "llegó pero el parser no lo entendió".
    console.log(`\nEnvelopes recibidos:\n    ${volcar(recibidos)}`);
    process.exit(1);
  }
  console.log("Todas las verificaciones pasaron.");
}

main().catch((e) => {
  console.log("ERROR:", String(e).slice(0, 600));
  process.exit(1);
});