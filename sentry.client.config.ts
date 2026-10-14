import * as Sentry from "@sentry/nextjs";

/**
 * Configuración de Sentry en el navegador (Fase 44).
 *
 * Se ejecuta desde `instrumentation-client.ts`, antes de que la app sea
 * interactiva. El DSN va con prefijo `NEXT_PUBLIC_` porque Next solo incrusta
 * en el bundle del cliente las variables con ese prefijo, y es justamente el
 * bundle del cliente el que lo necesita. No es un secreto: es un identificador
 * público de destino, y el propio Sentry lo publica en el código de sus SDKs.
 *
 * La contrapartida es que queda clavado en el build: si se cambia el DSN hay que
 * volver a compilar. En el Worker eso significa redeployar.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    (process.env.NODE_ENV === "production" ? "production" : "development"),
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

  tracesSampleRate: 0,

  // Misma razón que en el servidor: en v11 los valores por defecto envían
  // cookies, cabeceras y cuerpos. Aquí además se apagaría el replay de
  // sesiones, que graba la pantalla y el DOM.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
  },
});