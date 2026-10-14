import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

/**
 * Configuración de OpenNext para Cloudflare Workers (Fase 43).
 *
 * R2 como caché incremental: sin esto, `/login` y los recursos estáticos
 * quedarían sin persistencia entre despliegues.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
