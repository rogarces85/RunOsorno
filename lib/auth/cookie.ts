/**
 * Nombre de la cookie de sesión.
 *
 * Vive en su propio módulo, **sin imports**, a propósito: el nombre se usa
 * desde sitios que no deben arrastrar la base de datos. Si se leyera de
 * `lib/auth` (que importa `drizzle-orm` y `mysql2`), cualquier bundle donde se
 * usara se llevaría la capa de base de datos encima.
 *
 * El valor es el que usa Lucia por defecto (`auth_session`); se declara
 * explícito para que las dos puntas no puedan desincronizarse.
 */
export const SESSION_COOKIE_NAME = "auth_session";
