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
| `npm run test` | 185/185 |
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
| Producción | login OK, cookie `Secure`+`HttpOnly`, sesión persistente; 10 rutas y 30 peticiones en paralelo sin 5xx (`verify-produccion.ts`) |
| Deploy automático | **OK**: token cargado; 4 runs consecutivos en verde |
| Avatares en R2 | OK: subida prefirmada, servido por URL firmada y borrado, con el bucket privado |
| Emails (Resend) | **Verificado**: envío directo y correo de bienvenida de la app recibidos en la cuenta de pruebas |

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

**Despliegue:** el pipeline ya funciona. Tras cargar el token de Cloudflare, los
últimos runs de `deploy.yml` están en verde y producción sirve el build de
`main`. Verificado después: login, 10 rutas con 200, 30 peticiones en paralelo
sin 5xx.

**Pendiente de P0:** nada funcional.

## P1 — Deploy automático (resuelto el 2026-10-19)

Los runs de GitHub Actions fallaban con `403 Authentication error` al provisionar
`runosorno-cache`. El diagnóstico con las credenciales del propio CI mostró que
el token guardado **no era válido** (`/user/tokens/verify` →
`{"code":1000,"message":"Invalid API Token"}`): se había regenerado en el panel
y el secreto de GitHub seguía con el valor viejo.

**Qué se hizo:** se cargó un token nuevo de cuenta (Workers Scripts, Workers R2
Storage, Hyperdrive y Account Settings) con `gh secret set`, se confirmó
`CLOUDFLARE_ACCOUNT_ID = 519a5439103b90fb074dc2204ef5175e` y se relanzó el
workflow. **Cuatro despliegues consecutivos en verde**, incluidos el del arreglo
de conexiones y el de avatares.

Nota: el paso "Reintentar el deploy si la subida de R2 dio tiempo de espera"
sigue en el workflow; ya no hace falta, pero es inocuo. Se puede borrar en la
fase 50.

## P1.5 — 503 y cuelgues del Worker (resuelto, 19-10)

Al verificar el despliegue aparecieron dos síntomas: *prefetch* con 503
"Worker exceeded resource limits" y una petición que se quedó **10 minutos**
abierta (luego cancelada por Cloudflare) consumiendo solo 9 ms de CPU.

La pista decisiva fue esa petición colgada: no era CPU. `lib/db/index.ts` crea
un pool de mysql2 **por petición** (Workers no permite compartir I/O), pero con
el límite por defecto del driver: **10 conexiones**. Hyperdrive tiene
`origin_connection_limit: 20`, así que con tres o cuatro *prefetch* simultáneos
el origen se agotaba y las peticiones se quedaban esperando; el resto de la
ráfaga moría como `exceededCpu` (el corte se mide en la invocación, pero el
trabajo ya no era el problema).

**Solución:**

- **`lib/db/index.ts`**: `connectionLimit: 1` en el pool de cada petición (cada
  una consulta en serie) y la cadena de Hyperdrive sin *query string*, que
  además quitó el aviso de `ssl-mode` en cada conexión.
- **Carga bajo demanda** de `@sentry/nextjs` (solo si hay `SENTRY_DSN`),
  `@react-pdf/renderer` y `@aws-sdk/client-s3`: se evaluaban en cada isolate
  aunque no se usaran.
- **Sin *prefetch* en el menú lateral**: al abrir una página, Next pedía de
  golpe las 10 rutas del menú (10 renders SSR en paralelo) y esa ráfaga era la
  que el Worker no sostenía. La navegación sigue siendo RSC.

**Verificación final (versión con los tres cambios):**

- 3 rondas de 10 peticiones en paralelo: **30/30 OK**, sin cuelgues.
- Navegación por las 10 rutas de administración con `networkidle` dos veces
  seguidas: **todas 200 y sin ningún 5xx** (antes fallaban 4-6 *prefetch*).
- `verify-produccion.ts` completo.
- Sin regresiones en local: 185/185 unitarias, lint 0 errores, `verify-roles`
  60/60.

**Seguimiento sugerido:** si el tráfico crece, subir `origin_connection_limit`
de Hyperdrive (hoy 20); y medir con `wrangler tail --format json` (los campos
`cpuTime` y `outcome` por petición son la mejor señal).

## P2 — Servicios externos sin configurar

| Tarea | Estado | Detalle |
|---|---|---|
| **43.12** | **Hecho** | Secretos de R2 en el Worker, CORS del bucket para el origen del sitio y URL prefirmada corregida. Verificado: subir, servir por URL firmada (200 `image/webp`) y borrar. |
| **45.6** | **Hecho** | `GET` del objeto sin firma → **400 `InvalidArgument`**; el bucket no es público. |
| **43.13** | **Hecho** | Key cargada; envío directo y correo de bienvenida de la app **recibidos** en la cuenta de pruebas, sin `email_failed`. El remitente es `onboarding@resend.dev`. |
| **Dominio de correo** | Pendiente | `runosorno.cl` no existe en DNS, así que Resend no puede verificarlo. Hoy se envía desde `onboarding@resend.dev`, que **solo entrega al correo dueño de la cuenta**. Para que atletas y coaches reciban correos hay que registrar/verificar un dominio (SPF, DKIM, DMARC) y actualizar `RESEND_FROM`. |
| **44.6** | Pendiente | Cuenta de Sentry y alertas (procedimiento en `docs/configurar-sentry.md`). El SDK ya no se carga si no hay DSN. |

## P3 — Documentación (fase 49) — completada

| Tarea | Estado |
|---|---|
| 49.1 README | **Hecho**: descripción, stack, requisitos, puesta en marcha, credenciales de demo, scripts, verificadores, despliegue y estructura |
| 49.2 `.env.example` | **Hecho**: cada variable documentada; se quitaron `LUCIA_SECRET` (Lucia 3 no la usa) y `R2_PUBLIC_URL` (los avatares van por URL firmada) |
| 49.3 Servicios externos | **Hecho**: `docs/setup-servicios.md` (Aiven, Hyperdrive, R2 + CORS, Resend, token de CI) |
| 49.4 Deploy | **Hecho**: `docs/despliegue.md` (pipeline, secretos, migraciones, verificación, rollback y problemas conocidos) |
| 49.5 Estructura de la base | **Hecho**: `docs/base-de-datos.md` (tablas, relaciones, índices y migraciones) |

## P4 — Revisión final (fase 50)

| Tarea | Estado |
|---|---|
| 50.1 Checklist de las 20 funcionalidades del MVP | **Hecho**: las 20 implementadas, con evidencia en `docs/revision-mvp.md` |
| 50.2 Criterios de aceptación (§10) | **Hecho**: cubiertos por E2E/verificadores/manual; se cerró el hueco de mantenimiento |
| 50.3 Los 8 flujos de extremo a extremo | **Hecho**: flujos 1–6 en E2E; 7–8 por verificadores (detalle en `docs/revision-mvp.md`) |
| 50.4 Sin funcionalidades fuera del MVP | **Hecho**: no hay rastros de pagos, wearables, WebSockets ni API pública |
| 50.5 lint | **Hecho** (2026-10-19) |
| 50.6 build | **Hecho** (2026-10-19) |
| 50.7 pruebas unitarias | **Hecho**: 185/185 |
| 50.8 pruebas E2E | **Hecho**: 15/15 |
| 50.9 deploy final | **Hecho** el 19-10 por CI (varios runs en verde); repetir al cerrar la entrega |
| 50.10 flujo completo en producción | Pendiente: el login y las 10 rutas de admin están verificados; falta el recorrido coach → atleta → feedback con datos reales |
| 50.11 responsive en dispositivos reales | Pendiente: hay medición a 375/768/1400 px, falta el dispositivo físico |
| 50.12 sin errores de consola | **Hecho en local y en producción**: `verify-rendimiento` cubre cinco páginas y la navegación real por 10 rutas no deja 5xx ni errores |
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

- **`.dev.vars` incompleto**: solo tiene `DATABASE_URL`; `npm run preview`
  arranca sin `APP_URL` ni `RESEND_FROM`, así que los correos y enlaces locales
  no representan producción. (En Windows `preview` además falla por `EPERM
  symlink`, limitación conocida de OpenNext.)
- **Aviso de lint en `Avatar.tsx`**: el `<img>` es intencional (URLs firmadas
  que caducan, no aptas para el optimizador de Next). Conviene dejarlo
  documentado con un `eslint-disable-next-line` y el motivo.
- **Textos en el JSX**: la fase 46 centralizó el formateo, no los textos. Se
  migran a `t()` cuando haya un segundo idioma.
- **`.env.local` sin R2 ni Resend**: en producción los secretos de R2 y Resend ya
  están cargados; en desarrollo se sigue usando el fallback local y los correos
  por consola. El remitente de producción es `onboarding@resend.dev` hasta que
  haya un dominio verificado (ver P2).
- **Hyperdrive cachea las consultas sueltas** (se vio al aplicar migraciones: un
  `SELECT` después de un `INSERT` devolvía el estado anterior). Las lecturas
  dentro de una transacción sí son frescas. Conviene comprobar en 50.10 si un
  atleta que registra una sesión y recarga el calendario ve el dato al instante;
  si no, hay que envolver esas lecturas o desactivar el caché para esa ruta.
- **`npm run format:check` no sirve en Windows**: falla en 148 archivos porque
  `core.autocrlf=true` deja el árbol de trabajo en CRLF y `.prettierrc` pide
  `endOfLine: "lf"`. En Linux (CI) pasaría; el workflow no lo ejecuta, así que
  no rompe nada, pero conviene añadir un `.gitattributes` con `* text=auto
  eol=lf` para que el resultado sea el mismo en ambos sistemas.

