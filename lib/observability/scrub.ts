/**
 * Limpieza de datos personales antes de enviar un evento a Sentry (Fase 44).
 *
 * El SDK se configura con `dataCollection` en modo restrictivo (eso evita que
 * Sentry *añada* cabeceras, cookies e IP), pero los valores que el propio error
 * lleva dentro —el mensaje de una excepción de MySQL con un correo, los `extra`
 * que pone la app— siguen ahí. Este módulo es la segunda capa: normaliza
 * cualquier cadena antes de que salga del servidor.
 *
 * Se exporta aparte de `sentry.server.config.ts` para poder probarlo sin
 * levantar Sentry (`tests/unit/observability.test.ts`).
 */

/** Correo electrónico en cualquier texto. */
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/** IPv4 (4 octetos separados por puntos). */
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/** Claves que nunca deben salir, aunque el error las traiga en su `request`. */
const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-forwarded-for",
  "cf-connecting-ip",
  "x-api-key",
  "password",
  "token",
]);

/**
 * Profundidad a partir de la cual se deja de limpiar.
 *
 * El número importa más de lo que parece. Con un límite bajo (6, que fue el
 * primer valor) el recorrido se cortaba justo en los frames del stack trace —
 * `exception.values[].stacktrace.frames[]` está a ese nivel— y todos acababan
 * como `"[truncado]"`. El evento llegaba a Sentry sin ninguna información útil,
 * que es justo lo contrario de lo que se quiere. Un evento de Sentry es poco
 * profundo: los anidamientos reales llegan a 8-10 niveles.
 */
const MAX_DEPTH = 20;

/** Longitud a partir de la cual se trunca una cadena. */
const MAX_STRING = 8000;

function scrubString(value: string): string {
  const sinCorreos = value.replace(EMAIL, "[email]");
  const sinIps = sinCorreos.replace(IPV4, "[ip]");
  return sinIps.length > MAX_STRING
    ? `${sinIps.slice(0, MAX_STRING)}…`
    : sinIps;
}

function scrubValue(value: unknown, depth: number, vistos: WeakSet<object>): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return value;
  // Un evento con referencias circulares (o un `Error` que se apunta a sí mismo
  // en `cause`) no debe hacer el recorrido infinito.
  if (vistos.has(value)) return "[circular]";
  vistos.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1, vistos));
  }
  const salida: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    salida[key] = SENSITIVE_KEYS.has(key.toLowerCase())
      ? "[redactado]"
      : scrubValue(item, depth + 1, vistos);
  }
  return salida;
}

/**
 * `beforeSend` del SDK: recibe el evento y devuelve el que se va a enviar.
 *
 * Es genérica a propósito porque en `beforeSend` el SDK pasa un `ErrorEvent` y
 * en `beforeSendTransaction` un `TransactionEvent`. El tipo se deja abierto
 * (`object`) porque `@sentry/nextjs` reexporta `ErrorEvent` pero no
 * `TransactionEvent`, y solo por tipado no vale la pena importar de
 * `@sentry/core`, que es dependencia transitiva.
 */
export const scrubEvent = <T extends object>(event: T): T =>
  scrubValue(event, 0, new WeakSet()) as T;