/**
 * Comprueba el endpoint de salud del Worker desplegado (P1.5).
 *
 * Es el blanco del ping externo de calentamiento: debe responder 200 con
 * `{"ok":true}`, sin tocar la base de datos. Sirve para confirmar que el
 * despliegue salió bien y que el cron externo tiene a dónde apuntar.
 *
 * Uso:
 *   npx tsx scripts/verify-health.ts
 *   BASE_URL=http://localhost:3000 npx tsx scripts/verify-health.ts
 */

// Sin imports, este archivo sería un script global y sus `BASE` y `main`
// chocarían con los de cualquier otro script sin imports del directorio.
// Con `export {}` pasa a ser un módulo y sus nombres quedan(scope) propio.
export {};

const BASE =
  process.env.BASE_URL ?? "https://runosorno.rodrigo-garces-guerrero.workers.dev";

async function main() {
  const url = `${BASE}/api/health`;
  console.log(`Comprobando ${url}\n`);

  const inicio = performance.now();
  let res: Response;
  try {
    res = await fetch(url, { redirect: "manual" });
  } catch (error) {
    console.error(`FALLO: no se pudo conectar (${String(error)})`);
    process.exit(1);
  }
  const ms = Math.round(performance.now() - inicio);
  const cuerpo = await res.text();

  console.log(`  status: ${res.status}`);
  console.log(`  tiempo: ${ms} ms`);
  console.log(`  cuerpo: ${cuerpo.slice(0, 120)}`);

  if (res.status !== 200) {
    console.error("\nFALLO: se esperaba 200");
    process.exit(1);
  }

  let ok = false;
  try {
    ok = JSON.parse(cuerpo).ok === true;
  } catch {
    ok = false;
  }
  if (!ok) {
    console.error('\nFALLO: el cuerpo no es {"ok":true}');
    process.exit(1);
  }

  console.log("\nOK: /api/health responde 200 sin base de datos");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
