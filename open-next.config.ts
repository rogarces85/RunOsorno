import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

/**
 * Configuración de OpenNext para Cloudflare Workers (Fase 43).
 *
 * R2 como caché incremental: sin esto, `/login` y los recursos estáticos
 * quedarían sin persistencia entre despliegues.
 */
const config = defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});

/**
 * `next build` y después el arreglo del trace del middleware.
 *
 * **Hoy el proyecto no tiene middleware** (la protección vive en los layouts),
 * así que este script no hace nada: sale con 0 al no encontrar el trace. Se
 * deja enganchado porque es la red de seguridad del día que haya que añadir un
 * middleware otra vez: OpenNext empaqueta el middleware de Node con
 * `mainFields: ["module", "main"]`, así que esbuild resuelve
 * `@opentelemetry/api` por su campo `module` (`build/esm`), pero el trace que
 * escribe Next solo trae la versión CommonJS que alcanza el `require`. Como el
 * copiador es fiel al trace, el archivo no está y el build muere con
 * `Could not resolve "@opentelemetry/api"` — tanto en Windows como en el runner
 * de GitHub Actions.
 *
 * Se escribe así, y no como una propiedad de `defineCloudflareConfig`, porque
 * el tipo `CloudflareOverrides` no declara `buildCommand` (sí está en
 * `OpenNextConfig`, que es lo que devuelve la función, y el runtime lo lee de
 * ahí). Ponerlo en el objeto de entrada no compila.
 */
const openNextConfig = {
  ...config,
  buildCommand: "npm run build && node scripts/fix-middleware-trace.mjs",
};

export default openNextConfig;
