import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
};

/**
 * Envuelve la configuración de Sentry para la fase de build (Fase 44, tarea
 * 44.3: source maps legibles).
 *
 * El proyecto compila con Turbopack (Next 16 lo usa por defecto y así lo detecta
 * OpenNext), no con webpack, y eso cambia lo que se puede pedir aquí:
 *
 * - **Sin opciones `webpack`.** La instrumentación automática de App Router,
 *   middleware y Server Functions que Sentry documenta para webpack no existe
 *   con Turbopack. No es una pérdida real para lo que pide el MVP: los errores
 *   llegan igual por `onRequestError` y por el SDK del cliente, que es
 *   justamente el mecanismo de 44.4 y 44.5. Lo que sí se pierde es el nombre
 *   automático del archivo en el stack.
 * - **Con Turbopack, Sentry activa `productionBrowserSourceMaps`.** Es lo
 *   necesario para subir los mapas del cliente, y los borra del build una vez
 *   subidos (`deleteSourcemapsAfterUpload`), así que no quedan servidos.
 * - **`sourcemaps.disable` cuando no hay `SENTRY_AUTH_TOKEN`.** Sin token no
 *   hay a quién subirlos: activarlos igual dejaría
 *   `productionBrowserSourceMaps` en `true` y los `.map` en `.next`, y el
 *   propio upload fallaría haciendo fracasar el build.
 *
 * Los tres valores vienen de variables de entorno, no de constantes: el DSN y
 * la organización son del proyecto del que se fuese, y el token es un secreto
 * que solo existe en CI.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  release: {
    name: process.env.SENTRY_RELEASE,
  },
});