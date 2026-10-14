import * as Sentry from "@sentry/nextjs";

/**
 * Instrumentación del servidor (Fase 44).
 *
 * `register()` corre una vez por instancia del servidor y es el punto de entrada
 * del SDK en el backend. `onRequestError` es lo que hace que las tareas 44.4 y
 * 44.5 funcionen: Next lo invoca con cada error de servidor que captura —
 * render de un Server Component, una ruta de API o un Server Action que lanza
 * una excepción no controlada— y Sentry lo convierte en un evento.
 *
 * Por qué basta una sola rama y no una para `edge`: el proyecto despliega con
 * OpenNext sobre Cloudflare Workers con `nodejs_compat`, así que el runtime de
 * todo el servidor es `nodejs`, incluido el middleware (`proxy.ts`). Añadir la
 * rama `edge` solo traería un bundle que nunca se ejecuta.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;