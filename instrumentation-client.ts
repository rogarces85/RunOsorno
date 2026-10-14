import * as Sentry from "@sentry/nextjs";

/**
 * Instrumentación del navegador (Fase 44).
 *
 * Next ejecuta este archivo antes de montar la aplicación. Sirve para dos cosas:
 * iniciar el SDK del cliente y enganchar el seguimiento de navegaciones del App
 * Router, que es lo que permite que un error de una transición de página quede
 * asociado a la ruta que lo provocó.
 *
 * Va envuelto en try/catch a propósito: si el SDK falla al inicializar (por
 * ejemplo, por un bloqueador que rompa un script), la app tiene que seguir
 * funcionando igual. Un error de observabilidad no puede romper la aplicación.
 */
try {
  await import("./sentry.client.config");
} catch {
  // Sin observabilidad, pero con aplicación.
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;