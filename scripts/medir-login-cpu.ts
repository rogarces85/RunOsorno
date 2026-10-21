/**
 * Mide el coste de CPU del login en produccion.
 *
 * Hace N intentos de login (con una contrasena incorrecta, que es el mismo
 * camino de CPU: el KDF se ejecuta igual contra el hash ficticio) y mide:
 *   - cuanto tarda cada intento (wall)
 *   - si la respuesta es 200, 429 o 503
 *
 * Sirve para ver cuanto presupuesto de CPU se gasta en el POST de login y si
 * el corte de `exceededCpu` sigue不老. Se usa junto a `wrangler tail` para
 * contrastar con el `cpuTime` que reporta Cloudflare.
 *
 *   npx tsx scripts/medir-login-cpu.ts [intentos] [baseUrl]
 */
import { chromium } from "playwright";

const INTENTOS = Number(process.argv[2] ?? 10);
const BASE = process.argv[3] ?? "https://runosorno.online";
const EMAIL = process.env.MEDIR_EMAIL ?? "medir.login@runosorno.online";
const PASSWORD = process.env.MEDIR_PASSWORD ?? "ContrasenaIncorrecta123!";

type Resultado = {
  intento: number;
  ms: number;
  estado: number | null;
  error: string | null;
};

async function main() {
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext();
  const resultados: Resultado[] = [];

  for (let i = 1; i <= INTENTOS; i++) {
    const pagina = await contexto.newPage();
    const inicio = Date.now();
    let estado: number | null = null;
    let error: string | null = null;
    try {
      const respuesta = await pagina.goto(`${BASE}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await pagina.fill('input[name="email"]', EMAIL);
      await pagina.fill('input[name="password"]', PASSWORD);
      const [navegacion] = await Promise.all([
        pagina.waitForResponse(
          (r) => r.request().method() === "POST",
          { timeout: 45000 },
        ),
        pagina.click('button[type="submit"]'),
      ]);
      estado = navegacion.status();
      await pagina.waitForLoadState("domcontentloaded").catch(() => undefined);
    } catch (e) {
      error = e instanceof Error ? e.message.split("\n")[0] : String(e);
    }
    resultados.push({
      intento: i,
      ms: Date.now() - inicio,
      estado,
      error,
    });
    await pagina.close();
  }

  await navegador.close();

  console.log(`\n${INTENTOS} intentos de login contra ${BASE}\n`);
  for (const r of resultados) {
    console.log(
      `  ${String(r.intento).padStart(2)}  ${String(r.ms).padStart(6)} ms  ` +
        `estado=${r.estado ?? "-"}  ${r.error ?? ""}`,
    );
  }

  const ok = resultados.filter((r) => r.estado !== null && r.estado < 500);
  const con5xx = resultados.filter((r) => r.estado !== null && r.estado >= 500);
  const tiempos = resultados.map((r) => r.ms).sort((a, b) => a - b);
  const mediana = tiempos[Math.floor(tiempos.length / 2)] ?? 0;

  console.log(
    `\n  sin 5xx: ${ok.length}/${INTENTOS}   con 5xx: ${con5xx.length}/${INTENTOS}` +
      `   mediana: ${mediana} ms   min: ${tiempos[0]} ms   max: ${tiempos[tiempos.length - 1]} ms\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
