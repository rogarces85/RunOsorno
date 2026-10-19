# Despliegue y operación

Producción corre en **Cloudflare Workers** con OpenNext. La base es MySQL en
Aiven a través de **Hyperdrive** y los archivos viven en **R2**.

- Worker: `runosorno`
- URL: https://runosorno.rodrigo-garces-guerrero.workers.dev
- Workflow: `.github/workflows/deploy.yml`

## Pipeline automático

En cada push a `main` (o a mano con `gh workflow run deploy.yml`):

1. `npm ci` con Node 24 (el lock está generado con npm 11; con Node 22 falla).
2. `npm run lint`.
3. `npm test` (Vitest).
4. `npx opennextjs-cloudflare build`.
5. `npx opennextjs-cloudflare deploy`.

Secretos del repositorio necesarios:

| Secreto | Para qué |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Desplegar el Worker y provisionar R2/Hyperdrive |
| `CLOUDFLARE_ACCOUNT_ID` | Cuenta destino |

El token necesita **Workers Scripts: Edit**, **Workers R2 Storage: Edit**,
**Hyperdrive: Edit** y **Account Settings: Read**. Un token revocado da
`403 Authentication error` al crear el bucket de caché.

> El workflow conserva un paso que reintenta el deploy si R2 tarda. Ya no es
> necesario, pero no estorba.

## Antes de desplegar: migraciones

El código nuevo puede necesitar tablas o columnas nuevas. **Aplica las
migraciones primero**, o el login y otras rutas devolverán 500 (pasó con
`login_attempts`):

```bash
DATABASE_URL="mysql://usuario:clave@host:puerto/defaultdb" npx drizzle-kit migrate
```

Comprobación rápida del estado:

```bash
DATABASE_URL="mysql://..." npx drizzle-kit generate   # "No schema changes"
```

## Despliegue manual

```bash
npm run deploy        # build + deploy
npm run preview       # build + preview local en http://127.0.0.1:8787
```

En Windows, `preview`/`deploy` pueden fallar con `EPERM symlink` si no está el
Modo desarrollador activo: OpenNext recrea las *junctions* de Turbopack con
`fs.symlinkSync`. En CI (Linux) no ocurre.

## Verificación después de desplegar

```bash
# Login real, cookie Secure/HttpOnly, sesión persistente y rutas protegidas
npx tsx scripts/verify-produccion.ts

# Misma suite E2E pero dentro de workerd (requiere `npm run preview` en otra terminal)
BASE_URL=http://127.0.0.1:8787 npx playwright test
```

Además conviene revisar a mano:

- `/login` y un listado por rol (sin 5xx).
- `npx wrangler tail runosorno` mientras se navega: busca `exceededCpu`,
  `ER_*` o `email_failed`.
- `gh run list --workflow=deploy.yml` en verde.

## Vuelta atrás

Cloudflare conserva las versiones del Worker:

```bash
npx wrangler versions list
npx wrangler rollback [<version-id>]
```

El rollback cambia el código, **no el esquema**: si la versión anterior no conoce
una tabla nueva, seguirá funcionando; si la nueva migración borró algo, hay que
restaurarlo aparte. Por eso las migraciones deben ser compatibles hacia atrás
cuando sea posible.

## Problemas conocidos

| Síntoma | Causa | Solución |
|---|---|---|
| `403 Authentication error` al desplegar | Token de Cloudflare inválido o sin permisos de R2 | Crear token de cuenta y actualizar `CLOUDFLARE_API_TOKEN` |
| Login 500 con la página "Algo salió mal" | Migraciones sin aplicar (tabla que falta) | `drizzle-kit migrate` contra producción |
| 503 `Worker exceeded resource limits` | Ráfaga de renders o pool de conexiones agotado | Ver `connectionLimit: 1`, prefetch del menú y `origin_connection_limit` |
| Peticiones colgadas minutos con poco CPU | Pool de MySQL esperando conexiones | No subir `connectionLimit` sin subir Hyperdrive |
| `Could not resolve "@opentelemetry/api"` al compilar | Trace del middleware desactualizado | Lo arregla `scripts/fix-middleware-trace.mjs` en el `buildCommand` |
| Correos no llegan | `RESEND_API_KEY` ausente o remitente no verificado | Ver [`setup-servicios.md`](./setup-servicios.md) |
| `npm ci` falla pidiendo esbuild | Node/npm distintos al del lock | Usar Node 24 |
