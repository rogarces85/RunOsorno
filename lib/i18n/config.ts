/**
 * Configuración de localización (Fase 46).
 *
 * RunOsorno es una app chilena y por una razón: el MVP tiene **un solo idioma**.
 * Aun así, el locale y la zona horaria viven en un solo sitio y no repartidos en
 * cada componente, por dos motivos concretos que ya han causado errores:
 *
 * 1. `toLocaleString()` sin `timeZone` usa la zona del **servidor**. En Cloudflare
 *    Workers el servidor corre en UTC, así que una notificación enviada a las
 *    21:30 en Santiago se mostraba como el día siguiente a las 00:30. Las fechas
 *    tienen que formatearse **siempre** en `America/Santiago`.
 * 2. Repetir `"es-CL"` en 30 archivos significa que el día que se agregue un
 *    idioma, hay que cazarlos todos.
 *
 * Sobre `next-intl`: se usa su API de bajo nivel (`createFormatter`), que recibe
 * la configuración explícita y no necesita el enrutado por locale ni un
 * `middleware`. La app no enruta por idioma (no tiene sentido con uno solo), y
 * montar `next-intl` en un middleware sería añadir una capa entera sin ganar
 * nada. Cuando haya un
 * segundo idioma, aquí se cambia `LOCALE`, se añaden los mensajes y se conecta
 * el enrutado; el resto de la app ya formatea a través de este módulo.
 */

import messages from "@/messages/es-CL.json";

/** Locale único de la aplicación. */
export const LOCALE = "es-CL";

/**
 * Zona horaria de Chile continental.
 *
 * Ojo: Chile cambia la hora dos veces al año (verano e invierno). `Intl` con
 * `America/Santiago` ya lo resuelve: un mismo instante se formatea con UTC-3 en
 * enero y con UTC-4 en julio, sin que nadie tenga que mantener una tabla de
 * cambios de hora.
 */
export const TIME_ZONE = "America/Santiago";

export type AppMessages = typeof messages;