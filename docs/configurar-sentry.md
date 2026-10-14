# Configurar Sentry (Fase 44)

La aplicación ya envía sus errores a Sentry: lo único que falta para verlo en un
proyecto real es la cuenta y las credenciales. Este documento es el procedimiento
completo, en el orden en que hay que hacerlo.

## Qué seiya está hecho

| Pieza | Archivo | Qué hace |
|-------|---------|----------|
| Arranque del SDK en el servidor | `instrumentation.ts` | `register()` carga `sentry.server.config.ts`; `onRequestError` recibe los errores de servidor |
| Configuración del servidor | `sentry.server.config.ts` | `dataCollection` restrictiva, `beforeSend` con el scrub, muestreo de trazas en 0 |
| Configuración del navegador | `sentry.client.config.ts` + `instrumentation-client.ts` | Errores del cliente y transiciones de navegación del App Router |
| Source maps | `next.config.ts` | `withSentryConfig` sube los mapas al compilar si hay `SENTRY_AUTH_TOKEN` |
| Limpieza de datos | `lib/observability/scrub.ts` | Sustituye correos e IPs y redacta cabeceras sensibles |

Sin `SENTRY_DSN` el SDK queda **deshabilitado**: la app compila, se despliega y
funciona igual. Esa es la razón de que la Fase 44 se pueda completar sin cuenta.

## 1. Crear el proyecto en Sentry

1. Crear una cuenta en <https://sentry.io> (o una organización autoalojada).
2. Crear un proyecto de tipo **Next.js** para RunOsorno. Sentry genera un DSN
   con esta forma:

   ```
   https://<clave-publica>@o<id-organizacion>.ingest.us.sentry.io/<id-proyecto>
   ```

   La clave pública solo admite caracteres alfanuméricos: un DSN con guiones en
   esa parte se descarta entero y el SDK solo avisa por consola con
   `Invalid Sentry Dsn`.

3. Anotar el **slug de la organización** y el **nombre del proyecto**, que
   necesita la subida de source maps.

## 2. Variables de entorno

### En desarrollo (`.env.local`)

```bash
SENTRY_DSN="https://<clave>@o<org>.ingest.us.sentry.io/<proyecto>"
SENTRY_ORG="<organizacion>"
SENTRY_PROJECT="runosorno"
SENTRY_AUTH_TOKEN="<auth token>"
SENTRY_ENVIRONMENT="development"
```

### En el Worker de Cloudflare

`SENTRY_DSN` es un secreto del Worker:

```bash
wrangler secret put SENTRY_DSN
```

El resto van como variables normales en `wrangler.jsonc`, porque no son
secretos:

```jsonc
"vars": {
  "APP_URL": "...",
  "RESEND_FROM": "...",
  "SENTRY_ORG": "<organizacion>",
  "SENTRY_PROJECT": "runosorno",
  "SENTRY_ENVIRONMENT": "production",
  "NEXT_PUBLIC_SENTRY_DSN": "https://<clave>@o<org>.ingest.us.sentry.io/<proyecto>",
  "NEXT_PUBLIC_SENTRY_ENVIRONMENT": "production"
}
```

**`NEXT_PUBLIC_SENTRY_DSN` sí tiene prefijo `NEXT_PUBLIC_`**, a diferencia del
resto (tarea 46.3 y la nota de `AGENTS.md`): es el único valor que necesita el
bundle del navegador y Next solo incrusta en ese bundle las variables con ese
prefijo. La contrapartida es que queda clavado en el build, así que **cambiar el
DSN del navegador obliga a recompilar y redesplegar**. El DSN no es un secreto:
es un identificador público de destino.

## 3. Source maps legibles (tarea 44.3)

Para que las trazashaul apunten al archivo y la línea, hay que crear un *auth
token* en Sentry (Configuración → API → Auth Tokens) con permiso `project:releases`
y guardarlo como `SENTRY_AUTH_TOKEN` en el entorno de compilación (local y en los
secretos de GitHub Actions, para que el deploy automático suba los mapas).

Sin el token, `withSentryConfig` deja los source maps desactivados a propósito:
generarlos sin quien los consuma dejaría `productionBrowserSourceMaps` activado y
los `.map` en `.next` sin subir a ninguna parte.

Con Turbopack, que es el bundler que usa este proyecto, Sentry genera los mapas
del navegador y los **borra después de subirlos**, así que no quedan servidos
públicamente.

## 4. Alertas básicas (tarea 44.6)

Sentry no avisa por sí solo: hay que crear las reglas. Las tres mínimas para este
proyecto, todas en *Settings → Alerts → Create Alert*:

1. **Errores nuevos.**
   - Condición: *When an issue is first seen* (o *Regressed*).
   - Acción: correo al responsable del equipo.
   - Filtro opcional: `environment = production`, para no enterarse de un error
     solo en desarrollo.
2. **Pico de errores.**
   - Condición: *When a project's error rate is above* 10 eventos en 5 minutos.
   - Acción: el mismo correo. Es la que avisa de un fallo que afecta a todo el
     mundo (por ejemplo, la tabla `login_attempts` faltando en la base de
     producción, que fue justo lo que pasó en la Fase 43 con el login).
3. **Incidencias sinOwner.**

En *Settings → Projects → runosorno → Alerts* conviene además activar
*Alert Rules* heredadas y dejar el filtro de `environment` puesto en cada regla.

## 5. Comprobar que funciona

```bash
# Levanta un colector falso, compila la app y provoca errores reales
npx tsx scripts/verify-sentry.ts
```

El script levanta su propio servidor (para tener `SENTRY_DSN` desde el arranque),
provoca un fallo de render, un error de Server Action y una captura explícita, y
comprueba que los tres llegan completos, con su stack trace y sin datos
personales.

## Problemas conocidos

- **En `next dev` los eventos no salen.** Se capturan (lo dice el log del SDK)
  pero ningún envelope llega al destino, ni siquiera con `Sentry.flush()`, que
  además devuelve `true`. En el build de producción sí funciona. Por eso
  `verify-sentry.ts` compila y arranca `next start` en lugar de usar el servidor
  de desarrollo.
- **`npm run preview` falla en Windows** con `EPERM ... symlink` al copiar el
  bundle del middleware. No tiene que ver con Sentry: ocurre igual con `mysql2`,
  `prettier` o `@aws-sdk`, y la causa es que OpenNext recrea con
  `fs.symlinkSync` las *junctions* que Turbopack crea para los paquetes externos,
  algo que en Windows exige el Modo desarrollador o permisos de administrador.
  En Linux (GitHub Actions) funciona con normalidad. Para verificar el
  comportamiento dentro de `workerd` en local hay que activar el Modo
  desarrollador de Windows o ejecutar el build desde WSL.