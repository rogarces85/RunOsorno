import { createFormatter, createTranslator, type NestedKeyOf } from "next-intl";
import type { DateTimeFormatOptions } from "use-intl";
import { LOCALE, TIME_ZONE, type AppMessages } from "./config";
import messages from "@/messages/es-CL.json";

/**
 * Formateo centralizado de fechas, horas y números (Fase 46).
 *
 * Todo pasa por `createFormatter` de next-intl con la configuración de
 * `lib/i18n/config.ts`. Es una función pura —recibe el locale, la zona horaria y
 * los mensajes— así que funciona igual en un Server Component, en un Client
 * Component, en un Server Action y en un script, sin `NextIntlClientProvider` ni
 * contexto.
 *
 * Regla del proyecto: **ningún componente crea su propio `Intl.DateTimeFormat`
 * ni llama a `toLocaleString()`**. Todas las fechas de la app se formatean en
 * `America/Santiago`; si se escribe a mano, se está introduciendo un desfase de
 * horas (y un bug) en cuanto el servidor no esté en Chile.
 */

const config = {
  locale: LOCALE,
  timeZone: TIME_ZONE,
  messages: messages as AppMessages,
};

/**
 * `createFormatter` formatea fechas, horas y números; `createTranslator` traduce
 * los mensajes. Son dos funciones distintas en next-intl (el formateador no
 * traduce), y este módulo necesita las dos.
 */
const format = createFormatter(config);
const translate = createTranslator(config);

/**
 * Espacios que ICU usa según quién lo ejecute.
 *
 * En `es-CL` la hora se escribe `06:09 a. m.` con un espacio duro (U+00A0) o
 * estrecho (U+202F) delante de `m.`, y el motor que lo genera no es el mismo en
 * el servidor (Node) que en el navegador (Chromium). El texto se ve igual pero
 * los caracteres son distintos, y React lo detecta como error de hidratación:
 * "server rendered text didn't match the client". Se normalizan a un espacio
 * normal en el propio formateador, que es el único sitio por el que pasan todas
 * las fechas y números de la app.
 */
const ESPACIOS_ICU = /[\u00A0\u202F\u2007\u2060]/g;

function normalizarEspacios(texto: string): string {
  return texto.replace(ESPACIOS_ICU, " ");
}

/** `format.dateTime` con los espacios normalizados. */
function fecha(value: Date | string, options: DateTimeFormatOptions): string {
  return normalizarEspacios(format.dateTime(asDate(value), options));
}


export { format };

/**
 * Claves válidas de `messages/es-CL.json`. El tipo sale del propio JSON, así que
 * una clave mal escrita rompe el `tsc` en vez de devolver el texto de la clave
 * en pantalla (que es lo que hace `IntlMessageFormat` cuando no la encuentra).
 */
export type MessageKey = NestedKeyOf<AppMessages>;

/**
 * El traductor de next-intl tipa sus claves de una forma más estrecha que
 * `NestedKeyOf` (no admite el nombre del espacio junto con la clave completa),
 * así que el ajuste se hace una sola vez aquí en lugar de ensuciar cada
 * llamada con un cast.
 */
const traducir = translate as unknown as (
  key: string,
  values?: Record<string, unknown>,
) => string;

/** Traduce una clave de `messages/es-CL.json` con los valores indicados. */
export function t(key: MessageKey, values?: Record<string, unknown>): string {
  return values ? traducir(key, values) : traducir(key);
}

/** `15/10/2026` */
export function formatDate(value: Date | string): string {
  return fecha(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** `15/10/2026, 21:30` */
export function formatDateTime(value: Date | string): string {
  return fecha(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `15/10/2026, 21:30:05` — para logs y auditoría, donde el segundo importa. */
export function formatDateTimeSeconds(value: Date | string): string {
  return fecha(value, {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

/** `15/10, 21:30` — sin año, para listas de lo reciente (campanita). */
export function formatDateTimeShort(value: Date | string): string {
  return fecha(value, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `21:30` */
export function formatTime(value: Date | string): string {
  return fecha(value, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * `octubre de 2026` — encabezado del calendario.
 *
 * El día se ancla a las 12:00 UTC a propósito. Con `new Date(year, month, 1)`
 * (medianoche local) el Worker, que corre en UTC, entrega `2026-10-01T00:00Z`,
 * que en Santiago es `2026-09-30T20:00`: el encabezado del mes mostraba
 * *septiembre*. El mediodía UTC deja el instante dentro del mismo día en Chile.
 */
export function formatMonthYear(year: number, month: number): string {
  return fecha(new Date(Date.UTC(year, month, 1, 12)), {
    month: "long",
    year: "numeric",
  });
}

/**
 * Abreviaturas de día de la semana, desde el lunes: `["lun", "mar", ...]`.
 *
 * Se generan con `Intl` en vez de escribirlas a mano porque el calendario es
 * precisamente el sitio donde importa que coincidan con el locale: si mañana
 * hubiera otro idioma, cambiarían solas. Se parte de un domingo conocido y se
 * avanza en días, para no depender de la zona horaria.
 */
export function formatWeekdays(): string[] {
  const domingo = new Date(Date.UTC(2026, 0, 4, 12));
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(domingo);
    dia.setUTCDate(domingo.getUTCDate() + ((i + 1) % 7));
    return fecha(dia, { weekday: "short" });
  });
}

/** `lun 15` — día suelto en un resumen semanal. */
export function formatDayShort(value: Date | string): string {
  return fecha(value, {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

/** `lun` — solo el día de la semana (tira semanal del dashboard). */
export function formatWeekdayShort(value: Date | string): string {
  return fecha(value, { weekday: "short" });
}

/** `15` — solo el número del día del mes (tira semanal del dashboard). */
export function formatDayOfMonth(value: Date | string): string {
  return fecha(value, { day: "numeric" });
}

/**
 * Formatea un número en formato chileno: punto de miles y coma decimal
 * (`1.234,5`). `maximumFractionDigits` se fija en el llamador porque cada dato
 * tiene su precisión: los kilómetros admiten decimales, los minutos no.
 */
export function formatNumber(
  value: number,
  options: { maximumFractionDigits?: number; minimumFractionDigits?: number } = {},
): string {
  return normalizarEspacios(
    format.number(value, {
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
    }),
  );
}

/**
 * `82%` a partir del porcentaje **ya calculado en base 100**, que es como lo
 * devuelven `calcCompliance` y los servicios de métricas. Se divide por 100
 * porque el estilo `percent` de `Intl` espera una fracción, y redondea a entero
 * porque en pantalla un `82,3%` no aporta nada.
 */
export function formatPercent(value: number): string {
  return normalizarEspacios(
    format.number(value / 100, {
      style: "percent",
      maximumFractionDigits: 0,
    }),
  );
}

/**
 * Convierte a `Date`. Acepta `"2026-10-15"` (fecha pura) y lo interpreta a las
 * 12:00 hora de Chile: sin esa hora, un `"2026-10-15"` se parsea como UTC y en
 * Chile aparece como el 14.
 */
function asDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00-03:00`);
  }
  return new Date(value);
}
