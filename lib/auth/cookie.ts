/**
 * Nombre de la cookie de sesión.
 *
 * Vive en su propio módulo, **sin imports**, a propósito: `proxy.ts` (el
 * middleware) solo necesita el nombre para leer la cookie, y si lo sacara de
 * `lib/auth` se arrastraría ese módulo entero —con la base de datos
 * (`drizzle-orm` + `mysql2`)— al bundle del middleware, que OpenNext compila
 * aparte para el runtime de Node y que se parsea entero en cada arranque en
 * frío. Ese bundle es el que se paga en cada petición que llega a un isolate
 * nuevo.
 *
 * El valor es el que usa Lucia por defecto (`auth_session`); se declara
 * explícito para que las dos puntas no puedan desincronizarse.
 */
export const SESSION_COOKIE_NAME = "auth_session";
