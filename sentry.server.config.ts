import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/observability/scrub";

/**
 * Configuración de Sentry en el servidor (Fase 44).
 *
 * Se importa desde `instrumentation.ts` cuando `NEXT_RUNTIME === "nodejs"`,
 * que en este proyecto es también el runtime del Worker: OpenNext despliega
 * sobre Cloudflare Workers con `nodejs_compat`, así que no hace falta una
 * configuración aparte para `edge`.
 *
 * Sin `SENTRY_DSN` el SDK queda deshabilitado y la app funciona igual: es lo
 * que permite desarrollar, testear y compilar sin tener cuenta en Sentry.
 */
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment:
    process.env.SENTRY_ENVIRONMENT ??
    (process.env.NODE_ENV === "production" ? "production" : "development"),
  release: process.env.SENTRY_RELEASE || undefined,

  // El proyecto es SSR, sin API pública ni tiempo real: lo que importa es
  // saber qué petición falló, no la latencia. El muestreo en 0 evita pagar
  // trazas que nadie revisa.
  tracesSampleRate: 0,

  /**
   * Privacidad (lo más importante de esta configuración).
   *
   * En Sentry v11 `sendDefaultPii` ya no existe y los valores por defecto de
   * `dataCollection` son **permisivos**: se adjuntan las cookies, las cabeceras
   * HTTP, los cuerpos de la petición, los parámetros de la URL y los datos de
   * las consultas a la base. En esta app eso significa subir la cookie de
   * sesión y los correos de los usuarios a un servicio externo. Por eso se
   * apaga categoría por categoría en vez de confiar en el valor por defecto.
   *
   * Lo que se conserva es lo que hace falta para entender una incidencia: la
   * ruta, el método, el código de estado, el mensaje del error y el stack.
   */
  dataCollection: {
    userInfo: false, // ni id ni correo del usuario
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [], // sin cuerpos: ahí viajan contraseñas y formularios
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },

  // Segunda capa: `dataCollection` evita que Sentry añada esos datos, y el
  // scrub limpia lo que ya venía dentro del mensaje o del contexto.
  // Solo `beforeSend`: en Sentry v11 las transacciones usan `traceLifecycle:
  // "stream"` y el hook `beforeSendTransaction` ya no se aplica (el SDK avisa
  // por consola si se declara). Las trazas están apagadas aquí, así que no hay
  // nada que limpiar del lado del rendimiento.
  beforeSend: scrubEvent,

  // Los errores de negocio de los Server Actions (los `fail()` de
  // `runAction`) son respuestas esperadas, no incidencias.
  ignoreErrors: ["ActionFailure", "ChunkLoadError"],
});