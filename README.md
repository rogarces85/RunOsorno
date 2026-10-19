# RunOsorno

Plataforma web de gestión de entrenamiento de running: el coach planifica la
semana de sus atletas, el atleta registra lo que realmente hizo y ambos ven el
cumplimiento y las métricas. Hay un administrador global y un director técnico
por grupo/escuela.

SSR con Next.js (App Router, React Server Components), autenticación por sesión
con cookies y despliegue en Cloudflare Workers con MySQL en Aiven vía Hyperdrive.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.3.x (App Router, RSC, Turbopack) |
| UI | Tabler (`@tabler/core` + `@tabler/icons-react`) |
| Base de datos | MySQL 8.4 (producción, Aiven) / MariaDB 10.4 (desarrollo, XAMPP) |
| ORM | Drizzle ORM + `drizzle-kit` |
| Auth | Lucia (sesiones en base de datos, cookie `HttpOnly`/`Secure`) |
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

# 5. Opcional: escenario de demostración (3 coaches, 5 atletas, 8 semanas)
npm run db:seed:demo

# 6. Servidor
npm run dev
```

Abre http://localhost:3000.

Credenciales de desarrollo:

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@runosorno.cl` | `Admin1234!` |
| Coach (demo) | `coach.demo@runosorno.cl` | `Demo1234!` |
| Director técnico (demo) | `director.demo@runosorno.cl` | `Demo1234!` |
| Atleta (demo) | `maria.fernandez@demo.runosorno.cl` | `Demo1234!` |

`npm run db:seed:demo:clean` borra el escenario de demostración y deja la base
como estaba. **Nunca ejecutes el seed de demo contra producción.**

## Scripts

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción (Node) |
| `npm run preview` | Build de OpenNext y vista previa en `workerd` (puerto 8787) |
| `npm run deploy` | Build y despliegue manual a Cloudflare Workers |
| `npm run deploy:calentamiento` | Despliega el Worker de calentamiento (cron cada 2 min) |
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
npx tsx scripts/verify-accesibilidad.ts    # axe sobre 21 páginas (WCAG AA)
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

`verify-sentry.ts` compila la app y levanta su propio servidor. `verify-health.ts`
apunta a producción por defecto y sirve de blanco del ping de calentamiento
([`docs/calentamiento.md`](./docs/calentamiento.md)).

## Despliegue

El pipeline (`.github/workflows/deploy.yml`) corre en cada push a `main`:
instala, lint, pruebas unitarias, build de OpenNext y despliegue a Cloudflare
Workers. Necesita los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`
en GitHub.

Detalle de servicios, dominios, R2 y correo: [`docs/setup-servicios.md`](./docs/setup-servicios.md).
Flujo de despliegue, verificación y vuelta atrás: [`docs/despliegue.md`](./docs/despliegue.md).
Modelo de datos: [`docs/base-de-datos.md`](./docs/base-de-datos.md).

## Estructura

```
app/            rutas (grupos (app) y (auth)), API de avatar y exportaciones
components/     UI por dominio (admin, coach, atleta, director, calendar, metrics)
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
- [`docs/setup-servicios.md`](./docs/setup-servicios.md) — Aiven, Hyperdrive, R2, Resend, Sentry.
- [`docs/despliegue.md`](./docs/despliegue.md) — pipeline, secretos y verificación.
- [`docs/base-de-datos.md`](./docs/base-de-datos.md) — tablas, relaciones e índices.
- [`docs/configurar-sentry.md`](./docs/configurar-sentry.md) — observabilidad.
- [`docs/recuperar-acceso-aiven.md`](./docs/recuperar-acceso-aiven.md) — incidentes de base de datos.
- [`specs/mvp.md`](./specs/mvp.md), [`plan/mvp.md`](./plan/mvp.md) y [`tasks/mvp.md`](./tasks/mvp.md) — alcance y seguimiento.
