# Entorno local y continuidad del trabajo

Cómo levantar el proyecto en un equipo nuevo y cómo retomar el trabajo que quedó
pendiente. Todo lo que hace falta está en el repositorio: no hay archivos que
transferir a mano.

## Requisitos

- **Node.js 24** y npm 11 (el `package-lock.json` lo genera npm 11, el mismo de
  CI y del despliegue; con Node 22 / npm 10, `npm ci` reconstruye el árbol de
  otra forma y falla).
- **MySQL/MariaDB local**: en Windows, XAMPP con MariaDB 10.4 (el motor de desarrollo
  es MariaDB; producción es MySQL 8.4 — el esquema se genera siempre con las
  migraciones de Drizzle, nunca importando un volcado entre motores).
- **Git** y una cuenta con acceso a `github.com/rogarces85/RunOsorno`.

## Puesta en marcha

```bash
git clone https://github.com/rogarces85/RunOsorno.git
cd RunOsorno
npm ci

cp .env.example .env.local
# En .env.local, lo único indispensable en desarrollo:
#   DATABASE_URL="mysql://root:@localhost:3306/runosorno"
#   APP_URL="http://localhost:3000"
# R2_* y RESEND_API_KEY pueden quedar vacíos: los avatares se guardan en
# .data/avatars/ y los correos se registran en consola.

npm run db:migrate      # esquema (migraciones de Drizzle)
npm run db:seed         # admin, 5 ajustes y 5 plantillas oficiales
npm run db:seed:demo    # grupo, coaches, teams, atletas y 8 semanas de plan
npm run dev             # http://localhost:3000
```

`npm run db:seed:demo` es **idempotente**: si el escenario ya existe, se omite.
`npm run db:seed:demo:clean` lo borra.

## Cuentas de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@runosorno.cl` | `Admin1234!` |
| Coach | `coach.demo@runosorno.cl` | `Demo1234!` |
| Director técnico | `director.demo@runosorno.cl` | `Demo1234!` |
| Coach con solicitud pendiente | `coach.pendiente@runosorno.cl` | `Demo1234!` |
| Atleta | `maria.fernandez@demo.runosorno.cl` | `Demo1234!` |

El detalle de qué se puede probar con cada una está en `docs/roadmap.md` §4.

## Verificadores

```bash
npm run lint
npm run build
npm run test
npx playwright test
npx tsx scripts/verify-tokens.ts         # contraste del sistema visual, ambos temas
npx tsx scripts/verify-accesibilidad.ts  # axe sobre 23 rutas, claro y oscuro
npx tsx scripts/verify-roles.ts          # rutas por rol y frontera pública
npx tsx scripts/verify-responsive.ts      # 375/768/1400 px, incluida la landing
npx tsx scripts/verify-rendimiento.ts
npx tsx scripts/verify-i18n.ts
npx tsx scripts/verify-empty-states.ts
```

## Retomar el trabajo con OpenSpec

El estado vive en el repositorio, en `openspec/changes/`:

```bash
npx openspec list
```

Los cambios en vuelo se consultan con `npx openspec list`. Los cerrados están
en `openspec/changes/archive/` — a la fecha: `landing-publica` y
`ui-atletico-editorial` (completos, 2026-10-22) y `shell-atletico-interactivo`
(completo, con el acento por rol, el menú de usuario, el confeti y las tarjetas
stamp). Para abrir uno nuevo: `/opsx new`.

Los verificadores que abren páginas resuelven los ids del escenario DEMO en la
base de datos: los UUID cambian en cada `db:seed:demo`, así que no están
clavados en los scripts.

## Trabajar desde otro equipo

Lo que viaja con el repositorio cubre el desarrollo completo. Lo que **no**
viaja por git y conviene revisar al sentarse en casa:

| Qué | Cómo se resuelve en el equipo nuevo |
|---|---|
| `.env.local` (gitignored) | Se recrea con `cp .env.example .env.local`; solo `DATABASE_URL` y `APP_URL` son indispensables en desarrollo. |
| `LUCIA_SECRET` en `.env.local` | Vestigio: Lucia 3 ya no la usa (ver `docs/pendientes.md` 49.2). Si está no hace daño; no hace falta recrearla. |
| `RESEND_API_KEY` | Opcional en desarrollo (los correos se registran en consola). Si se quiere enviar de verdad, copiarla del equipo original a mano — nunca al repositorio. |
| Permisos de Cloudflare / deploy | El despliegue de producción es el push a `main` con GitHub Actions: no hace falta `wrangler login` en el equipo nuevo para publicar. Solo si se piensa correr `npm run preview` o debuggear bindings hace falta iniciar sesión (`npx wrangler login`). |

Con eso, `npm run dev` en casa replica el entorno de este equipo; las mismas
cuentas de prueba y el mismo escenario DEMO se regeneran con los seeds.

## Marca

- Fuente: `assets/brand/logo-original.png` (1,1 MB, fuera de `public/`).
- Derivados: `public/brand/*.webp`, `app/icon.png`, `app/apple-icon.png`.
- Para regenerarlos tras cambiar el original: `node scripts/generar-marca.mjs`.

## Despliegue

El despliegue a Cloudflare Workers es automático con GitHub Actions (`deploy.yml`):
cualquier `push` a `main` construye y publica. La verificación posterior se hace con
`npx tsx scripts/verify-produccion.ts` y, si se toca el login, con
`npx wrangler tail runosorno --format json` para medir el `cpuTime` de la petición.
