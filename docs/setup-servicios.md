# Alta y configuración de servicios externos

Esta guía describe cómo dejar operativos los servicios que la app necesita fuera
del código: base de datos, Cloudflare (Hyperdrive, R2, Workers) y correo. Sentry
tiene su propia guía en [`configurar-sentry.md`](./configurar-sentry.md).

Valores actuales del proyecto:

| Dato | Valor |
|---|---|
| Cuenta Cloudflare | `519a5439103b90fb074dc2204ef5175e` |
| Worker | `runosorno` |
| URL | `https://runosorno.rodrigo-garces-guerrero.workers.dev` |
| Hyperdrive | `1bffd76cc20d423690c4079891d596eb` (`runosorno-db`) |
| Bucket de caché | `runosorno-cache` |
| Bucket de avatares | `runosorno-avatars` |
| MySQL de producción | Aiven, base `defaultdb` |

## 1. MySQL de producción (Aiven)

1. Crear un servicio MySQL (Aiven u otro proveedor). El proyecto usa **MySQL 8.4**
   en producción y **MariaDB 10.4** en desarrollo.
2. Crear la base `defaultdb` y un usuario con permisos sobre ella. Anotar host,
   puerto, usuario y contraseña en texto (no desde una captura).
3. El esquema **no se importa desde el volcado de desarrollo**: se crea con las
   migraciones de Drizzle:

```bash
DATABASE_URL="mysql://usuario:clave@host:puerto/defaultdb" npx drizzle-kit migrate
```

4. Datos base (admin, ajustes y plantillas oficiales):

```bash
DATABASE_URL="mysql://usuario:clave@host:puerto/defaultdb" npx tsx db/seed.ts
```

> **Trampa del DNS local:** desde algunas redes el hostname de Aiven no resuelve
> (`ENOTFOUND`) aunque DNS públicos sí. Cloudflare no tiene ese problema. Si
> necesitas conectarte desde el equipo, usa la IP que devuelve
> `Resolve-DnsName` desde otra red. Ver [`recuperar-acceso-aiven.md`](./recuperar-acceso-aiven.md).

## 2. Hyperdrive (Cloudflare → MySQL)

Hyperdrive da pooling y caché de consultas en el edge. El Worker lee
`env.HYPERDRIVE.connectionString`, no `DATABASE_URL`.

```bash
npx wrangler hyperdrive create runosorno-db \
  --connection-string="mysql://usuario:clave@host:puerto/defaultdb"
```

El id resultante va en `wrangler.jsonc` (`hyperdrive[0].id`). Para cambiar las
credenciales cuando se rotan en Aiven:

```bash
npx wrangler hyperdrive update 1bffd76cc20d423690c4079891d596eb \
  --user=<usuario> --password=<contraseña>
```

Notas:

- `wrangler.jsonc` declara `localConnectionString` porque wrangler no resuelve los
  bindings en local sin ella; apunta al MySQL de XAMPP.
- El origen admite **20 conexiones** (`origin_connection_limit`). La app abre
  **una por petición** (`connectionLimit: 1` en `lib/db/index.ts`); si se sube el
  límite de la app, hay que subir también el de Hyperdrive.
- Hyperdrive **cachea las consultas sueltas**. Las lecturas dentro de una
  transacción son frescas. Si un flujo necesita leer lo que acaba de escribir, hay
  que tenerlo en cuenta.

## 3. R2 (avatares y caché)

Dos buckets:

- `runosorno-cache`: caché incremental de Next/OpenNext. Lo usa el adaptador.
- `runosorno-avatars`: avatares. **Privado**, se sirve con URLs firmadas.

### Credenciales S3 (para la app)

En Cloudflare → R2 → **Manage R2 API Tokens** → crear token con permiso de
lectura/escritura sobre `runosorno-avatars`. Devuelve:

- Access Key ID
- Secret Access Key
- Endpoint S3: `https://<account_id>.r2.cloudflarestorage.com`

Se cargan como secretos del Worker (no van en el repositorio):

```bash
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_BUCKET_NAME   # runosorno-avatars
```

Si faltan, la app guarda los avatares en `.data/avatars/`, que en Workers es
efímero: en producción no sirve.

### CORS del bucket de avatares

El navegador sube directo a R2 con una URL prefirmada, así que el bucket necesita
CORS para el origen del sitio. Sin esto la subida falla con `Failed to fetch`:

```json
[{
  "AllowedOrigins": ["https://runosorno.rodrigo-garces-guerrero.workers.dev"],
  "AllowedMethods": ["PUT", "GET", "HEAD"],
  "AllowedHeaders": ["Content-Type"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}]
```

Se aplica con `PutBucketCors` (SDK S3) o desde el panel de R2.

> **Detalle del SDK:** al prefirmar un `PutObject`, el SDK de AWS añade por
> defecto un checksum CRC32 del cuerpo vacío y firma `content-length`. El
> navegador sube otros bytes y R2 responde `SignatureDoesNotMatch`. Por eso
> `avatar.service.ts` usa `requestChecksumCalculation: "WHEN_REQUIRED"` y no firma
> `ContentLength`.

### Comprobar que es privado

Un `GET` al objeto sin firma debe fallar:

```bash
curl -i "https://runosorno-avatars.<account_id>.r2.cloudflarestorage.com/avatars/<id>.webp"
# HTTP 400, <Code>InvalidArgument</Code>
```

## 4. Resend (correo)

1. Crear cuenta en https://resend.com (plan gratuito: 3.000 correos/mes).
2. **API Keys → Create API Key** con permiso **Sending access**.
3. Cargar la key en el Worker:

```bash
wrangler secret put RESEND_API_KEY
```

4. Remitente (`RESEND_FROM` en `wrangler.jsonc`):

- **Pruebas:** `RunOsorno <onboarding@resend.dev>`. Resend solo entrega al correo
  dueño de la cuenta; sirve para verificar la integración, no para usuarios
  reales.
- **Producción:** `RunOsorno <no-reply@runosorno.online>`, con el dominio
  verificado en Resend (registros SPF, DKIM y DMARC). Ver `docs/dominio.md`.

`RESEND_REPLY_TO` indica a qué buzón llegan las respuestas. Un Gmail **no puede
ser `from`** en Resend (el dominio no es verificable), así que se usa como
destino de respuestas (`RunOsorno <rodrigo.garces.guerrero@gmail.com>`).

> **Sin dominio propio no hay envío real.** `*.workers.dev` **no se puede
> verificar** (Cloudflare controla ese DNS). Para que atletas y coaches reciban
> correos hay que verificar en Resend los registros SPF/DKIM/DMARC de un dominio
> propio. El de RunOsorno es `runosorno.online` (registrado en Nominalia): el
> procedimiento completo está en `docs/dominio.md`. Hasta que se verifique, el
> único remitente válido es `onboarding@resend.dev`, que solo entrega al correo
> dueño de la cuenta de Resend.

`runosorno.online` ya existe en DNS, pero su zona todavía no está en Cloudflare
ni tiene los registros de Resend publicados, así que hoy no se puede verificar;
mientras tanto el remitente es el de pruebas.

Sin `RESEND_API_KEY` los correos se registran en consola y la app sigue
funcionando (los envíos son best-effort: se reintentan una vez y un fallo queda en
`audit_logs` como `email_failed`, sin bloquear la acción).

## 5. Token de Cloudflare para CI

GitHub Actions necesita un token de **cuenta** con:

- Workers Scripts: Edit
- Workers R2 Storage: Edit
- Hyperdrive: Edit
- Account Settings: Read

Se guarda como secreto del repositorio:

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

Un token revocado produce `403 Authentication error` al provisionar el bucket de
caché; `/user/tokens/verify` responde `Invalid API Token`.

## 6. Dónde vive cada valor

| Valor | Desarrollo | Producción |
|---|---|---|
| `DATABASE_URL` | `.env.local` | No se usa: Hyperdrive |
| `RESEND_API_KEY` | `.env.local` (opcional) | Secreto del Worker |
| `RESEND_FROM` | `.env.local` | Variable en `wrangler.jsonc` |
| `APP_URL` | `.env.local` | Variable en `wrangler.jsonc` |
| `R2_*` | `.env.local` (opcional) | Secretos del Worker |
| `SENTRY_DSN` | `.env.local` (opcional) | Secreto del Worker |
| `CLOUDFLARE_API_TOKEN` / `ACCOUNT_ID` | — | Secretos de GitHub |
