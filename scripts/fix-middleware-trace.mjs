/**
 * Agrega al trace del middleware los archivos ESM de `@opentelemetry/api`.
 *
 * Por qué hace falta, y por qué no lo arregla nada de Next ni de OpenNext:
 *
 * - `next/dist/server/lib/trace/tracer.js` hace `require("@opentelemetry/api")`
 *   dentro de un try/catch. El trazador de Next (`@vercel/nft`) sigue ese
 *   `require`, así que en `.next/server/middleware.js.nft.json` solo aparece la
 *   versión **CommonJS** del paquete (`build/src/…`), que es la que resuelve
 *   `require`.
 * - `@opennextjs/cloudflare` compila el middleware de Node con
 *   `mainFields: ["module", "main"]` y `conditions: ["module"]`
 *   (`dist/cli/build/open-next/bundle-node-middleware.js`). Con esas opciones
 *   esbuild no mira `main`: sigue el campo `module` del `package.json`, que
 *   apunta a `build/esm/index.js`. Como el copiador es fiel al trace y en el
 *   trace solo está `build/src`, el archivo no existe y el build muere con
 *   `Could not resolve "@opentelemetry/api"`.
 * - El propio OpenNext contempla el caso de que la app **no** tenga el paquete
 *   instalado: entonces lo sustituye por la copia que Next ya trae compilada
 *   (`next/dist/compiled/@opentelemetry/api`). Aquí el paquete sí está, pero
 *   solo como dependencia transitiva de `@sentry/nextjs`, y nadie lo importa.
 *
 * La salida más limpia sería no tener el paquete instalado; la que no toca las
 * dependencias es completar el trace, que es lo que hace este script. Son 195
 * archivos y 314 KB, y solo se copian al middleware.
 *
 * Hace falta **lo que hacen las dos cosas**, porque `copyTracedFiles` de
 * `@opennextjs/aws` no copia desde `node_modules`: arma
 * `src = .next/standalone/<…>/.next/<subDir>/<ruta del trace>` y lo lee de ahí.
 * Si el archivo no está en el standalone, la copia falla y el error se guarda
 * en `erroredFiles` y se descarta en silencio (`copyTracedFiles.js:249`), así
 * que agregar la ruta al trace sin copiar el archivo no sirve de nada. Por eso
 * el script copia el árbol ESM al standalone y además lo anota en el trace.
 *
 * Se ejecuta después de `next build` (que es lo que escribe el trace) y antes
 * de que OpenNext copie y empaquete. Va enganchado en el `buildCommand` de
 * `open-next.config.ts`, así que también se aplica en el deploy de GitHub
 * Actions.
 *
 * Si el trace, el standalone o el paquete no están, avisa y sale con 0: es un
 * arreglo, no un requisito del build.
 */

import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";

const PAQUETE = "@opentelemetry/api";
const SUBCARPETA = "build/esm";
const TRACE = join(".next", "server", "middleware.js.nft.json");
const STANDALONE = join(
  ".next",
  "standalone",
  "node_modules",
  ...PAQUETE.split("/"),
);

/** Archivos de un directorio, en recursión, como rutas relativas a `dir`. */
function listarJs(dir, base = dir) {
  const salida = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      salida.push(...listarJs(ruta, base));
    } else if (entrada.name.endsWith(".js")) {
      salida.push(relative(base, ruta));
    }
  }
  return salida;
}

function principal(mensaje) {
  console.log(`[trace-middleware] ${mensaje}`);
}

if (!existsSync(TRACE)) {
  principal(`no existe ${TRACE}: nada que hacer`);
  process.exit(0);
}

const esm = join(
  "node_modules",
  ...PAQUETE.split("/"),
  ...SUBCARPETA.split("/"),
);
if (!existsSync(join("node_modules", ...PAQUETE.split("/")))) {
  // Sin el paquete instalado, OpenNext lo sustituye por la copia compilada de
  // Next y no hay nada que completar.
  principal(`${PAQUETE} no está instalado: OpenNext usará la copia de Next`);
  process.exit(0);
}
if (!existsSync(esm)) {
  principal(`${SUBCARPETA} no existe en ${PAQUETE}: nada que completar`);
  process.exit(0);
}
if (!existsSync(STANDALONE)) {
  // `copyTracedFiles` lee del standalone; si Next no lo dejó, no hay a qué
  // copiar. Se avisa en vez de fallar: puede que la configuración de OpenNext
  // no necesite el standalone para este proyecto.
  principal(
    `no existe ${STANDALONE}: sin standalone no se puede completar el trace`,
  );
  process.exit(0);
}

// 1) Poner los archivos en el standalone, que es de donde copia OpenNext.
cpSync(esm, join(STANDALONE, ...SUBCARPETA.split("/")), { recursive: true });

// 2) Anotarlos en el trace del middleware, que es lo que decide qué se copia.
const trace = JSON.parse(readFileSync(TRACE, "utf8"));
const antes = trace.files.length;

// Las rutas del trace son relativas a la carpeta que lo contiene y llevan "/".
const prefijo = relative(join(".next", "server"), "node_modules")
  .split(sep)
  .join("/");
const anadidos = listarJs(esm).map(
  (ruta) => `${prefijo}/${PAQUETE}/${SUBCARPETA}/${ruta.split(sep).join("/")}`,
);

const yaEstaban = anadidos.filter((ruta) => trace.files.includes(ruta)).length;
if (yaEstaban === anadidos.length) {
  principal(`el trace ya incluia los ${anadidos.length} archivos ESM`);
  process.exit(0);
}

trace.files = [...new Set([...trace.files, ...anadidos])].sort();
writeFileSync(TRACE, JSON.stringify(trace, null, 2));

principal(
  `${anadidos.length} archivos ESM copiados al standalone y anotados en el trace ` +
    `(trace: ${antes} -> ${trace.files.length})`,
);
