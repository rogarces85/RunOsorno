/**
 * Ráfaga real de peticiones en paralelo contra producción.
 *
 * Importa con `node:http` y conexiones propias: cada petición abre su propia
 * conexión TCP, que es lo que pasa en el navegador cuando se abren varias
 * pestañas o cuando un bot barre el sitio.
 *
 *   npx tsx scripts/medir-rafaga.ts [peticiones] [concurrencia] [baseUrl]
 */
const PETICIONES = Number(process.argv[2] ?? 30);
const CONCURRENCIA = Number(process.argv[3] ?? 10);
const BASE = process.argv[4] ?? "https://runosorno.online";
const RUTAS = ["/api/health", "/login", "/"];

type Resultado = { ruta: string; estado: number; ms: number };

async function una(ruta: string): Promise<Resultado> {
  const inicio = Date.now();
  try {
    const res = await fetch(`${BASE}${ruta}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    await res.arrayBuffer();
    return { ruta, estado: res.status, ms: Date.now() - inicio };
  } catch (e) {
    return { ruta, estado: 0, ms: Date.now() - inicio };
  }
}

async function main() {
  console.log(
    `\n${PETICIONES} peticiones, ${CONCURRENCIA} a la vez, contra ${BASE}\n`,
  );
  const cola = Array.from({ length: PETICIONES }, (_, i) => RUTAS[i % RUTAS.length]);
  const inicio = Date.now();
  const resultados: Resultado[] = [];

  let indice = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCIA, PETICIONES) }, async () => {
    for (;;) {
      const i = indice++;
      if (i >= cola.length) return;
      resultados.push(await una(cola[i]));
    }
  });
  await Promise.all(workers);
  const total = Date.now() - inicio;

  const porEstado = new Map<number, number>();
  for (const r of resultados) porEstado.set(r.estado, (porEstado.get(r.estado) ?? 0) + 1);
  for (const [estado, n] of [...porEstado].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${estado === 0 ? "timeout" : `HTTP ${estado}`}: ${n}/${PETICIONES}`);
  }

  const porRuta = new Map<string, { ok: number; fallo: number }>();
  for (const r of resultados) {
    const e = porRuta.get(r.ruta) ?? { ok: 0, fallo: 0 };
    if (r.estado >= 200 && r.estado < 400) e.ok++;
    else e.fallo++;
    porRuta.set(r.ruta, e);
  }
  console.log("");
  for (const [ruta, e] of porRuta) {
    console.log(`  ${ruta.padEnd(14)} ok=${e.ok} fallos=${e.fallo}`);
  }
  console.log(`\n  total: ${total} ms\n`);
}

main();

// Al final para que este archivo sea un módulo y sus variables no choquen
// con las de otros scripts del directorio (sin esto, TypeScript las trata
// como globales y el build falla con "Cannot redeclare block-scoped
// variable 'BASE'").
export {};
