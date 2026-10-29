# RunOsorno

Plataforma web de gestión de entrenamiento de running: el coach planifica la
semana de sus atletas, el atleta registra lo que realmente hizo y ambos ven el
cumplimiento y las métricas. Hay un administrador global y un director técnico
por grupo/escuela.

SSR con Next.js (App Router, React Server Components), autenticación por sesión
con cookies y despliegue en Cloudflare Workers con MySQL en Aiven vía Hyperdrive.

- **Producción:** <https://runosorno.online> (dominio propio con certificado de
  Let's Encrypt; `workers.dev` queda como respaldo).
- **Correo:** `no-reply@runosorno.online`, remitente propio con el dominio
  verificado en Resend. Los buzones `@runosorno.online` viven en el webmail de
  Nominalia.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.3.x (App Router, RSC, Turbopack) |
| UI | AdminLTE 4 (`admin-lte` + `bootstrap`) + Bootstrap Icons (`bi bi-*`) + sistema visual propio (`app/styles/tokens.css`) |
| Base de datos | MySQL 8.4 (producción, Aiven) / MariaDB 10.4 (desarrollo, XAMPP) |
| ORM | Drizzle ORM + `drizzle-kit` |
| Auth | Lucia (sesiones en base de datos, cookie `HttpOnly`/`Secure`) + PBKDF2-HMAC-SHA512 |
| Validación | Zod + React Hook Form |
| Correo | Resend + React Email |
| Avatares | Cloudflare R2 (bucket privado, URLs firmadas) |
| Despliegue | Cloudflare Workers + Hyperdrive + OpenNext (`@opennextjs/cloudflare`) |
| Pruebas | Vitest (unitarias) + Playwright (E2E) |
| Observabilidad | Sentry (errores) |
| Formato | `es-CL`, zona `America/Santiago`, centralizado en `lib/i18n/format.ts` |

## Requisitos

- **Node.js 24** (el `package-lock.json` está generado con npm 11; con Node 22
  `npm ci` falla).
- **MySQL/MariaDB**: XAMPP sirve para desarrollo; en producción se usa MySQL 8.4.
- Cuenta de Cloudflare solo si vas a desplegar.

## Puesta en marcha (desarrollo)

```bash
# 1. Dependencias
npm install

# 2. Base de datos local (XAMPP: MariaDB en 3306, usuario root sin clave)
#    Crea la base una vez:
#    mysql -u root -e "CREATE DATABASE runosorno CHARACTER SET utf8mb4;"

# 3. Variables de entorno
cp .env.example .env.local
#    Ajusta DATABASE_URL. Para desarrollo, deja vacíos R2_* y RESEND_API_KEY:
#    los avatares se guardan en .data/avatars/ y los correos se registran en
#    consola en vez de enviarse.

# 4. Esquema y datos base (admin, ajustes y 5 plantillas oficiales)
npm run db:migrate
npm run db:seed

# 5. Opcional: escenario de demostración (2 coaches, 5 atletas, 8 semanas)
npm run db:seed:demo

# 6. Servidor
npm run dev
```

Abre http://localhost:3000: la portada pública explica el producto y desde ahí
se entra al sistema (`/login`).

Credenciales de desarrollo:

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@runosorno.cl` | `Admin1234!` |
| Coach (demo) | `coach.demo@runosorno.cl` | `Demo1234!` |
| Director técnico (demo) | `director.demo@runosorno.cl` | `Demo1234!` |
| Atleta (demo) | `maria.fernandez@demo.runosorno.cl` | `Demo1234!` |

`npm run db:seed:demo:clean` borra el escenario de demostración y deja la base
como estaba.

## Producción

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `rodrigo.garces.guerrero@gmail.com` | `Admin1234!` (cámbiala al entrar) |
| Coach (demo) | `coach.demo@runosorno.cl` | `Demo1234!` |
| Director técnico (demo) | `director.demo@runosorno.cl` | `Demo1234!` |
| Coach con solicitud pendiente | `coach.pendiente@runosorno.cl` | `Demo1234!` |
| Atleta (demo) | `maria.fernandez@demo.runosorno.cl` | `Demo1234!` |
| Contacto (buzón del dominio) | `contacto@runosorno.online` | — |

> Las contraseñas de demo son públicas: sirven para revisar el producto, **no
> para datos de atletas reales**. Cuando entren usuarios de verdad, crea sus
> cuentas desde `/admin/coaches` y borra el escenario de demostración.

## Scripts

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción (Node) |
| `npm run preview` | Build de OpenNext y vista previa en `workerd` (puerto 8787) |
| `npm run deploy` | Build y despliegue manual a Cloudflare Workers |
| `npm run deploy:calentamiento` | Despliega el Worker de calentamiento (cron **cada minuto**) |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run test:coverage` | Vitest con umbrales de cobertura |
| `npm run test:e2e` | Playwright (requiere `npm run dev`) |
| `npm run format` / `format:check` | Prettier |
| `npm run db:generate` | Genera una migración desde `lib/db/schema.ts` |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Admin, ajustes y plantillas oficiales (idempotente) |
| `npm run db:seed:demo` | Escenario de demostración |
| `npm run db:seed:demo:clean` | Borra el escenario de demostración |

## Verificadores

Además de las suites, el proyecto tiene scripts que comprueban el sistema real
(interfaz y base de datos). Necesitan `npm run dev` corriendo, salvo los que se
indican:

```bash
npx tsx scripts/verify-roles.ts            # rutas y menú por rol
npx tsx scripts/verify-validations.ts      # 54 Server Actions y límites reales
npx tsx scripts/verify-accesibilidad.ts    # axe sobre 22 rutas en tema claro y oscuro (WCAG AA)
npx tsx scripts/verify-tokens.ts           # contraste de los tokens del sistema visual (ambos temas)
npx tsx scripts/verify-rendimiento.ts      # bundles, RSC, EXPLAIN, consola
npx tsx scripts/verify-seguridad.ts        # cookies, hashing, rate limit, R2
npx tsx scripts/verify-i18n.ts             # formato es-CL y fechas
npx tsx scripts/verify-settings.ts         # configuración global aplicada
npx tsx scripts/verify-audit-logs.ts       # auditoría con acciones reales
npx tsx scripts/verify-exports.ts          # PDF/XLSX/CSV por rol
npx tsx scripts/verify-responsive.ts       # 375/768/1400 px
npx tsx scripts/verify-empty-states.ts     # vacíos y errores
npx tsx scripts/verify-dashboards.ts       # cifras contra la base
npx tsx scripts/verify-profile.ts          # perfil y cambio de contraseña
npx tsx scripts/verify-produccion.ts       # login real contra el Worker
npx tsx scripts/verify-health.ts           # /api/health en producción (sin dev)
BASE_URL=http://127.0.0.1:8787 npx playwright test  # E2E dentro de workerd
```

Y los de **operación y diagnóstico** (no necesitan el dev server):

```bash
npx tsx scripts/verificar-render-autenticado.ts <email> <clave>  # login real y páginas con sesión
npx tsx scripts/medir-login-cpu.ts 20 https://runosorno.online    # coste y fallos del login
npx tsx scripts/medir-rafaga.ts 30 10                              # ráfaga con concurrencia real
npx tsx scripts/purgar-cache.ts                                    # vacía la caché incremental de R2
```

`verify-sentry.ts` compila la app y levanta su propio servidor. `verify-health.ts`
apunta a producción por defecto y sirve de blanco del ping de calentamiento
([`docs/calentamiento.md`](./docs/calentamiento.md)).

## Despliegue

El pipeline (`.github/workflows/deploy.yml`) corre en cada push a `main`:
instala, lint, pruebas unitarias, **purga la caché incremental de R2**, build de
OpenNext y despliegue a Cloudflare Workers. Necesita los secretos
`CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en GitHub.

> **El orden de la purga importa.** El deploy sube el prerender de la build
> nueva a esa misma caché; purgarla *después* la deja vacía y las páginas
> públicas se quedan colgadas (el render en runtime no termina en `workerd`).
> Por eso la purga va **antes** del despliegue.

Detalle de servicios, dominios, R2 y correo: [`docs/setup-servicios.md`](./docs/setup-servicios.md).
Flujo de despliegue, verificación y vuelta atrás: [`docs/despliegue.md`](./docs/despliegue.md).
Modelo de datos: [`docs/base-de-datos.md`](./docs/base-de-datos.md).

## Cómo está montado (decisiones que no se ven en el código)

- **La superficie pública es `/` (landing) y `/login`.** No hay lista blanca:
  todo lo que vive bajo `app/(app)/` exige sesión y lo valida
  `requireAuth()` en su layout; `/` y `/login` la validan con
  `usuarioSiHaySesion()` y, con sesión abierta, mandan al tablero del rol.
- **No hay middleware.** Un `proxy.ts` se compila aparte (5,5 MB), corre en el
  runtime de Node y salta al Worker principal por un service binding: cada
  petición pagaba un bundle entero y un salto extra. Con la validación en los
  layouts, el camino de la petición es uno solo.
- **El login es una ruta (`POST /api/login`), no una acción de servidor.** Así
  el formulario funciona **sin JavaScript**, la contraseña **nunca viaja en la
  URL** y el cliente puede **reintentar** cuando Cloudflare corta la petición.
- **El plan gratuito de Cloudflare da 10 ms de CPU por petición.** Está medido:
  una ruta trivial usa 3-8 ms, un render de página 12-58 ms y el KDF de
  contraseña 70-364 ms. Por eso el Worker de calentamiento (un cron que pinga
  `/api/health` **cada minuto**) mantiene vivo el isolate: sin él, la primera
  petición tras un rato de inactividad cae en un isolate frío y se corta con
  503. El detalle está en [`docs/pendientes.md`](./docs/pendientes.md).

## Estructura

```
app/            rutas: (app) con sesión, (auth) login, (public) landing, api/ (avatar, exports, health, login)
components/     UI por dominio (admin, coach, atleta, director, calendar, metrics) + primitivas en ui/
lib/            db, auth, permissions, services, metrics, actions, validations, i18n
db/             schema Drizzle, migraciones y seeds
emails/         plantillas React Email
scripts/        verificadores del sistema y utilidades de build
tests/          unitarias (Vitest)
e2e/            Playwright
docs/           guías de operación e informe de pendientes
```

## Documentación

- [`AGENTS.md`](./AGENTS.md) — reglas del proyecto y decisiones de arquitectura.
- [`docs/pendientes.md`](./docs/pendientes.md) — estado del sistema y tareas que quedan.
- [`docs/revision-mvp.md`](./docs/revision-mvp.md) — revisión de las 20 funcionalidades, criterios y flujos.
- [`docs/dominio.md`](./docs/dominio.md) — dominio propio, DNS, correo y renovación.
- [`docs/setup-servicios.md`](./docs/setup-servicios.md) — Aiven, Hyperdrive, R2, Resend, Sentry.
- [`docs/despliegue.md`](./docs/despliegue.md) — pipeline, secretos y verificación.
- [`docs/base-de-datos.md`](./docs/base-de-datos.md) — tablas, relaciones e índices.
- [`docs/calentamiento.md`](./docs/calentamiento.md) — el Worker que mantiene caliente el isolate.
- [`docs/configurar-sentry.md`](./docs/configurar-sentry.md) — observabilidad.
- [`docs/recuperar-acceso-aiven.md`](./docs/recuperar-acceso-aiven.md) — incidentes de base de datos.
- [`specs/mvp.md`](./specs/mvp.md), [`plan/mvp.md`](./plan/mvp.md) y [`tasks/mvp.md`](./tasks/mvp.md) — alcance y seguimiento.
