# Pendientes del MVP — revisión del 2026-10-19

Revisión del estado real del sistema (no del checklist): se ejecutaron las
suites, los verificadores y un login contra el Worker desplegado. El desarrollo
funcional del MVP está terminado; lo que queda es **producción, configuración
externa, documentación y la revisión final** de las fases 49 y 50.

## Estado verificado

| Comprobación | Resultado |
|---|---|
| `npm run lint` | 0 errores, 1 aviso (`<img>` en `components/ui/Avatar.tsx`) |
| `npm run build` (Next 16.3.8) | OK |
| `npm run test` | 182/182 |
| `npx playwright test` | 15/15 |
| `npx tsx scripts/verify-roles.ts` | 60/60 |
| `npx tsx scripts/verify-accesibilidad.ts` | 21/21 (axe, 0 violaciones) |
| `npx tsx scripts/verify-i18n.ts` | 12/12 (antes 11/12, ver correcciones) |
| `npx tsx scripts/verify-validations.ts` | 18/18 (antes 17/18, ver correcciones) |
| `npx tsx scripts/verify-seguridad.ts` | 30/30 |
| `npx tsx scripts/verify-rendimiento.ts` | 25/25 |
| Migraciones Drizzle | 4 aplicadas, `drizzle-kit generate` sin cambios |
| Funcionalidades del MVP (`specs/mvp.md` §11) | las 20 están implementadas |
| Funcionalidades fuera del MVP (§11) | ninguna implementada |
| Producción | login OK, cookie `Secure`+`HttpOnly`, sesión persistente y sin 5xx en navegación normal (`verify-produccion.ts`); 503 intermitentes en frío (P1.5) |
| Deploy manual | OK: versión 7 del Worker (`fe4013ed`), 19-10 |
| Deploy automático | **Roto**: el token de Cloudflare en GitHub está revocado (ver P1) |

## P0 — Producción caída (resuelto el 2026-10-19)

**Causa real:** no era Aiven ni las credenciales. La base de producción se quedó
en la **migración inicial**: le faltaba `login_attempts` (migración `0001`, fase
45) y los índices de `0002`/`0003` (fase 47). El rate limiting inserta en esa
tabla en **cada login**, así que toda autenticación devolvía 500. Las páginas
cargaban porque casi todas redirigen antes de tocar la base.

Se comprobó con un Worker temporal que usaba el mismo binding de Hyperdrive:

```
version: 8.4.11
migraciones aplicadas: [1]
login_attempts → ER_NO_SUCH_TABLE (1146)
```

**Qué se hizo:**

1. Se aplicaron las migraciones `0001` (tabla `login_attempts` + índice),
   `0002` (índices de `audit_logs` y `notifications`, incluido el orden correcto
   para no romper la clave foránea) y `0003` (índice compuesto de `audit_logs`),
   con los mismos `hash` y `created_at` que la base local, para que
   `drizzle-kit migrate` no intente repetirlas.
2. Se verificó el resultado: `__drizzle_migrations` con ids 1–4 y
   `login_attempts` presente; el Worker temporal se borró.
3. `verify-produccion.ts` pasa completo: login → dashboard, cookie `Secure` +
   `HttpOnly` + `SameSite=Lax`, sesión que sobrevive a una recarga y rutas
   protegidas que redirigen, sin 5xx.

**Despliegue:** se hizo **manual** (`npm run deploy`) el 19-10; versión 7 del
Worker (`fe4013ed`). Verificado después: login, 10 rutas de administración con
200 y sin 5xx en navegación normal. El deploy automático sigue roto (P1).

**Pendiente de P0:** nada funcional. Producción ya tiene el código de esta
revisión; queda la fiabilidad del arranque en frío (P1.5) y el pipeline (P1).

## P1 — El despliegue automático nunca ha funcionado (43.6)

**Comprobado de nuevo el 2026-10-19** (run 39274499517 y un diagnóstico con
credenciales del propio CI): sigue fallando, y la causa es más simple de lo que
parecía. El token guardado en los secretos **no es válido**:

```
GET /client/v4/user/tokens/verify
{"success":false,"errors":[{"code":1000,"message":"Invalid API Token"}]}
```

Por eso el deploy muere al crear el bucket de caché:

```
Failed to provision remote R2 bucket "runosorno-cache" for binding
"NEXT_INC_CACHE_R2_BUCKET": ... 403 {"code":10000,"message":"Authentication error"}
```

No es (solo) que falte el permiso de R2: el token fue revocado o regenerado en
el panel y el secreto de GitHub quedó con el valor viejo (su última
actualización es del 2026-10-14). Hasta que se reemplace no hay despliegue
automático posible.

Tareas:

1. En Cloudflare → **My Profile → API Tokens**, crear un token nuevo con:
   **Workers Scripts: Edit**, **Workers R2 Storage: Edit** (bucket y objetos),
   **Hyperdrive: Edit** y **Account Settings: Read**, limitado a la cuenta.
   Un token "plantilla" ya trae los permisos de Workers pero **no** los de R2.
2. Actualizar el secreto del repositorio:
   `gh secret set CLOUDFLARE_API_TOKEN` (y comprobar que `CLOUDFLARE_ACCOUNT_ID`
   es el de la cuenta donde viven `runosorno`, `runosorno-cache` y
   `runosorno-avatars`).
3. Relanzar `gh workflow run deploy.yml` y comprobar que llega al final.
4. Cuando pase, borrar el paso de reintento de R2 si ya no hace falta: hoy
   enmascara el error real durante un minuto más (el fallo es inmediato).
5. Mientras esto no pase, todo despliegue es manual desde local y la rama `main`
   puede quedar por delante de producción.

## P1.5 — 503 intermitentes por límite de CPU en arranque en frío (nuevo, 19-10)

Detectado al verificar el despliegue: algunas peticiones —sobre todo los
*prefetch* que hace Next (`?_rsc=…`)— devolvieron **503 "Worker exceeded
resource limits"**, y dos navegaciones completas fallaron justo después de
desplegar.

Evidencia recogida con `wrangler tail --format json`:

- Las peticiones que fallan se cortan con `outcome: exceededCpu` y
  `cpuTime: 10 ms` (una con 13 ms de pared, otra con 184 ms).
- En el **mismo** Worker, otras peticiones consumen 644–819 ms de CPU y
  responden 200; `/login` llegó a 644 ms por bcrypt.
- Un Worker de prueba con 100 000 000 de iteraciones responde 200, así que el
  límite real no es de 10 ms por petición: el corte ocurre en otra fase (arranque
  del isolate / concurrencia), no en el render.
- Con el Worker caliente y en serie: `/login` 20/20 (0,4–0,5 s) y las 10 rutas
  de administración en 200. El fallo se concentra en frío y en ráfagas.
- Una ráfaga de 20 peticiones paralelas no terminó en 10 minutos: con renders de
  0,5–0,8 s de CPU y Hyperdrive con `origin_connection_limit: 20`, la
  concurrencia no se sostiene.

Causa probable: el coste de arranque del bundle (32 MB, 6,9 MB gzip) más la
inicialización de Sentry y mysql2. En frío, ese trabajo se cobra contra el
presupuesto de CPU de la invocación y la petición muere antes de renderizar.

Mitigaciones propuestas, de menor a mayor riesgo:

1. **No cargar Sentry si no hay DSN.** Hoy `instrumentation.ts` importa
   `@sentry/nextjs` y ejecuta `Sentry.init` en cada isolate aunque
   `enabled: false`; el propio log avisa de que registra hooks.
2. **Importar bajo demanda las librerías que solo usan algunas rutas**:
   `exceljs` y `@react-pdf/renderer` (exportaciones) y
   `@aws-sdk/client-s3` + presigner (avatares). Hoy se evalúan en el arranque del
   Worker.
3. **Quitar los parámetros de la connection string de Hyperdrive** antes de
   pasársela a mysql2: evita el aviso `ssl-mode` y su parseo en cada conexión.
4. **Medir de nuevo con `wrangler tail`** tras cada cambio. Si persiste, revisar
   el plan/CPU del Worker en Cloudflare.
5. **Comprobar si ya ocurría en la versión anterior** (rollback temporal a la
   versión 6) antes de atribuirlo a este despliegue.

## P2 — Servicios externos sin configurar

| Tarea | Qué falta | Efecto actual |
|---|---|---|
| **43.12** | API token/keys de R2 y secretos `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | En el Worker el código cae al modo local (`node:fs` efímero): subir un avatar en producción no persiste |
| **43.13** | `RESEND_API_KEY` | `email.service` registra en consola y no envía: no salen los 3 correos críticos (plan publicado, sesión completada, anuncios) |
| **44.6** | Cuenta de Sentry y alertas (procedimiento en `docs/configurar-sentry.md`) | Los 500 de producción no generan aviso; hoy solo hay el digest |
| **45.6** | Comprobar contra Cloudflare que `runosorno-avatars` es privado y solo sirve URLs firmadas | Sin verificar en el bucket real |

## P3 — Documentación (fase 49)

| Tarea | Estado | Qué falta |
|---|---|---|
| 49.1 | Pendiente | `README.md` solo nombra el stack: falta descripción, requisitos reales, setup de DB, seed, scripts de verificación y enlace a los docs |
| 49.2 | Casi hecho | `.env.example` documenta todo, pero incluye **`LUCIA_SECRET`** y **`R2_PUBLIC_URL`**, que ya no se leen en ningún sitio (ver deuda técnica) |
| 49.3 | Pendiente | Guía de alta de servicios: Aiven/MySQL, Hyperdrive, R2, Resend, Sentry |
| 49.4 | Pendiente | Flujo de deploy (`.github/workflows/deploy.yml`, secretos, `preview` local, verificación posterior) |
| 49.5 | Pendiente | Estructura de la base: 14 tablas, relaciones, índices e historial de migraciones |

## P4 — Revisión final (fase 50)

| Tarea | Estado |
|---|---|
| 50.1 Checklist de las 20 funcionalidades del MVP | Pendiente (revisión funcional con el cliente) |
| 50.2 Criterios de aceptación (§10) | Pendiente |
| 50.3 Los 8 flujos de extremo a extremo | Pendiente: los E2E recorren los flujos 1–6; el 7 y el 8 están cubiertos por `verify-dashboards`, `verify-exports` y `verify-audit-logs`, pero no en una sola pasada |
| 50.4 Sin funcionalidades fuera del MVP | **Hecho**: no hay rastros de pagos, wearables, WebSockets ni API pública |
| 50.5 lint | **Hecho** (2026-10-19) |
| 50.6 build | **Hecho** (2026-10-19) |
| 50.7 pruebas unitarias | **Hecho**: 182/182 |
| 50.8 pruebas E2E | **Hecho**: 15/15 |
| 50.9 deploy final | Bloqueado por P0 y P1 |
| 50.10 flujo completo en producción | Bloqueado por P0 |
| 50.11 responsive en dispositivos reales | Pendiente: hay medición a 375/768/1400 px, falta el dispositivo físico |
| 50.12 sin errores de consola | **Hecho en local**: `verify-rendimiento` cubre cinco páginas, incluidas la campanita y el calendario con drag & drop; falta repetirlo en producción después de P0 |
| 50.13 sin errores en Sentry | Bloqueado por 44.6 |
| 50.14 tag `v0.1.0-mvp` | Pendiente, después de 50.9–50.12 |
| 50.15 MVP listo para entrega | Pendiente |

## Correcciones hechas durante esta revisión

1. **Bug de localización en métricas.** `/athlete/metrics` mostraba
   `438.21 km · 2206 min` y las fechas como `2026-08-01`
   (`app/(app)/athlete/metrics/page.tsx`); `/coach/metrics` mostraba también las
   fechas ISO. Pasaron a `formatDistance`, `formatDuration` y `formatDate`, que
   es la regla de la fase 46. `verify-i18n` vuelve a 12/12.
2. **Verificador frágil por datos.** `verify-validations` fallaba la tarea 40.9
   porque el seed de demostración solo planifica hasta el domingo en curso y ya
   no quedaba ningún día futuro para María. El script ahora crea la asignación
   que falta (mañana, con el `week_start` de su semana) y la borra al terminar,
   igual que hace `verify-settings` con la ventana de edición. Pasa a 18/18.
3. **Dos errores de hidratación que nadie estaba mirando.** El log de
   `npm run dev` durante la suite mostraba `Hydration failed because the server
   rendered text didn't match the client`:
   - En la campanita y en `/notifications`, ICU escribe `a. m.` con un espacio
     duro (U+00A0) en Node y estrecho (U+202F) en Chromium. Se ve idéntico, pero
     React regenera el árbol en el cliente. `lib/i18n/format.ts` normaliza ahora
     esos espacios, y es el único sitio por el que pasan fechas y números.
   - En el calendario del coach, `aria-describedby` alternaba entre
     `DndDescribedBy-0`, `-1`, `-2`… porque `@dnd-kit` generaba el id en cada
     render. `DndContext` recibe `id="coach-calendar"` y el id es estable.
   `verify-rendimiento` revisa ahora también `/notifications` y el calendario
   del coach (antes solo las tres páginas de métricas y atletas), así que la
   comprobación de consola de 50.12 cubre estos casos. De paso, el aviso de Next
   sobre `scroll-behavior: smooth` (lo pone Tabler en `<html>`) se silenció
   declarando `data-scroll-behavior="smooth"` en `app/layout.tsx`.

## Deuda técnica menor (no bloquea el MVP)

- **Configuración muerta**: `LUCIA_SECRET` y `R2_PUBLIC_URL` siguen en
  `.env.example` y en `lib/config/index.ts` pero no se leen en ningún sitio
  (Lucia 3 no usa secreto de sesión y los avatares van por URL firmada).
- **`.dev.vars` incompleto**: solo tiene `DATABASE_URL`; `npm run preview`
  arranca sin `APP_URL` ni `RESEND_FROM`, así que los correos y enlaces locales
  no representan producción. (En Windows `preview` además falla por `EPERM
  symlink`, limitación conocida de OpenNext.)
- **Aviso de lint en `Avatar.tsx`**: el `<img>` es intencional (URLs firmadas
  que caducan, no aptas para el optimizador de Next). Conviene dejarlo
  documentado con un `eslint-disable-next-line` y el motivo.
- **Textos en el JSX**: la fase 46 centralizó el formateo, no los textos. Se
  migran a `t()` cuando haya un segundo idioma.
- **`.env.local` sin R2 ni Resend**: el desarrollo usa el fallback local y los
  correos por consola, así que el camino real de R2/Resend solo se prueba en
  producción (por eso 43.12 y 43.13 están abiertos).
- **Hyperdrive cachea las consultas sueltas** (se vio al aplicar migraciones: un
  `SELECT` después de un `INSERT` devolvía el estado anterior). Las lecturas
  dentro de una transacción sí son frescas. Conviene comprobar en 50.10 si un
  atleta que registra una sesión y recarga el calendario ve el dato al instante;
  si no, hay que envolver esas lecturas o desactivar el caché para esa ruta.
  Además mysql2 avisa `Ignoring invalid configuration option passed to
  Connection: ssl-mode`; no rompe nada, pero es ruido que aparece en cada
  consulta y conviene quitar de la configuración.
- **`npm run format:check` no sirve en Windows**: falla en 148 archivos porque
  `core.autocrlf=true` deja el árbol de trabajo en CRLF y `.prettierrc` pide
  `endOfLine: "lf"`. En Linux (CI) pasaría; el workflow no lo ejecuta, así que
  no rompe nada, pero conviene añadir un `.gitattributes` con `* text=auto
  eol=lf` para que el resultado sea el mismo en ambos sistemas.
