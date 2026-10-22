/**
 * Instrumentación del servidor (Fase 44).
 *
 * `register()` corre una vez por instancia del servidor y es el punto de entrada
 * del SDK en el backend. `onRequestError` es lo que hace que las tareas 44.4 y
 * 44.5 funcionen: Next lo invoca con cada error de servidor que captura —
 * render de un Server Component, una ruta de API o un Server Action que lanza
 * una excepción no controlada— y Sentry lo convierte en un evento.
 *
 * Importante para el arranque del Worker: **Sentry solo se importa si hay
 * `SENTRY_DSN`**. El `import` estático de `@sentry/nextjs` se evaluaba en cada
 * isolate aunque el SDK quedara deshabilitado (`enabled: false`), y ese trabajo
 * se paga en el arranque en frío. Sin DSN no hay nada que reportar, así que no
 * hay razón para cargarlo.
 *
 * Por qué basta una sola rama y no una para `edge`: el proyecto despliega con
 * OpenNext sobre Cloudflare Workers con `nodejs_compat`, así que el runtime de
 * todo el servidor es `nodejs` (el proyecto no tiene middleware). Añadir la
 * rama `edge` solo traería un bundle que nunca se ejecuta.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    await import("./sentry.server.config");
  }
}

/** Se importa el SDK solo cuando hay un error y hay DSN configurado. */
export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  await Sentry.captureRequestError(...args);
}
