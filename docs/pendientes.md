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
| Producción | login OK, cookie `Secure`+`HttpOnly`, sesión persistente; 10 rutas y 30 peticiones en paralelo sin 5xx (`verify-produccion.ts`) — pero el login da 503 intermitente por CPU (P1.5) |
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

## P1.5 — 503 y cuelgues del Worker (parcialmente resuelto, 19-10)

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

### Queda: login intermitente por límite de CPU (estrategia de costo cero)

Al recorrer el flujo 50.10 en producción, **el POST de login falla ~50% de las
veces** con `503 Worker exceeded CPU time limit`. El tail lo corta con
`outcome: exceededCpu` y `cpuTime: 12 ms` / `wallTime: 92 ms`, **justo después
de conectar con Hyperdrive y antes del hashing** (los `diagnosticsChannelEvents`
llegan a `pool:connect:end` y ahí muere). No es un bug de la app.

**Causa:** Workers **Free** = **10 ms de CPU por invocación**. Un login por
contraseña (conexión a Hyperdrive + KDF + ~7 consultas + sesión) no entra en
10 ms ni en caliente.

**Hecho (2026-10-19):** se migró el hashing de `bcryptjs` (Blowfish interpretado,
~450-770 ms) a **PBKDF2-HMAC-SHA512 nativo vía WebCrypto** (210 000 iteraciones,
~50-100× menos CPU), con migración transparente de los hashes bcrypt heredados
en el primer login. También se simplificó el rate-limit (lectura por
`LAST_INSERT_ID` en vez de una segunda consulta con `WHERE`). Ver
`lib/security/hashing.ts` y `lib/services/rate-limit.service.ts`.

**Decisión del dueño:** **Workers Paid ($5/mes) NO es viable** — se busca un
sistema **gratis o de costo mínimo**. El corte de CPU hay que resolverlo sin
subir de plan.

### Medición del 2026-10-21 (M1, datos reales)

Se midió en producción con `npx wrangler tail runosorno --format json` y
`scripts/medir-login-cpu.ts`. **El límite de Workers Free es 10 ms de CPU por
petición** (documentación de Cloudflare) y esto es lo que consume la app:

| Petición | CPU en caliente | CPU en arranque en frío |
|---|---|---|
| `GET /api/health` (endpoint trivial, sin BD) | 5-6 ms | 120-290 ms |
| `GET /login` (render SSR) | 21-34 ms | 680 ms |
| `GET /` (landing) | 30-98 ms | 372 ms |
| `POST /login` (7 consultas + PBKDF2) | 9-15 ms | 244 ms |

Fallos medidos: **~25-30 % de las peticiones morían con 503 `exceededCpu`**, y
otro ~12-30 % con **500** (ver más abajo). Hoy, tras las correcciones de esta
sección, `/api/health` y `/login` responden **30/30**.

**Por qué no es un problema de afinación:**

1. **El piso es 5-6 ms.** Una ruta que solo devuelve `NextResponse.json({ok:true})`
   ya usa más de la mitad del presupuesto: ese costo es el arranque de OpenNext
   y Next, no el código de la app.
2. **El arranque en frío cuesta 120-680 ms.** Los bundles son de **17,6 MB** (la
   función de servidor) y **6,9 MB** (el middleware, que OpenNext compila
   siempre para el runtime de Node). workerd parsea el bundle entero en cada
   isolate nuevo: 12-68× el presupuesto. Da igual cuántas consultas se quiten,
   una petición que caiga en un isolate frío se cuelga.
3. **El KDF se come el presupuesto entero.** PBKDF2-HMAC-SHA512 con 100 000
   iteraciones son **64 ms de CPU** medidos en un portátil (en el edge, con
   SHA-NI, entre 6 y 10 ms). Bajar las iteraciones está descartado: OWASP pide
   210 000 y `workerd` además rechaza más de 100 000.
4. **Las páginas con sesión son dinámicas por naturaleza** (tableros, calendario,
   métricas): 20-90 ms cada una, y nunca están en la caché.

**Bugs encontrados y corregidos en la misma medición (valen en cualquier
plataforma):**

- **500 `components.ComponentMod.handler is not a function`:** la caché
  incremental de R2 acumulaba **1199 objetos** de builds anteriores y OpenNext
  nunca la limpia. Ahora el pipeline **purga la caché ANTES de desplegar**
  (después del deploy, el bucket quedaba vacío y las páginas públicas se
  colgaban: sin prerender en caché, el render en runtime no termina en
  workerd). Ver `.github/workflows/deploy.yml`.
- **Doble conexión MySQL por petición:** el middleware validaba la sesión
  contra la base, y el render abría otra. El proxy ya no toca la base: solo
  mira si la cookie existe. La validación real quedó en `requireAuth()` (layout
  de la app) y en `usuarioSiHaySesion()` (layouts público y de entrada), que
  además reemiten la cookie renovada.

**Qué queda para cerrar M1:** la decisión de plataforma. Con estos números, la
optimización puede reducir el porcentaje de fallos, pero **no puede hacer que
este stack quepa en 10 ms**: el suelo de 5-6 ms y el arranque en frío de
120-680 ms son del framework, no de la app. Las opciones, con su coste real,
están en `docs/roadmap.md` (M1).

**Pendiente (estrategia de costo cero):**

1. Desplegar la migración a PBKDF2 y **re-medir** el login en frío
   (`npx wrangler tail runosorno --format json`). Puede que ya no corte tanto,
   pero 10 ms sigue siendo un techo muy bajo para un login con base de datos.
2. Si sigue cortando, evaluar las opciones de "Estrategia de costo cero" al
   final de este documento: cron de calentamiento y/o reubicar la autenticación
   en un runtime con más CPU (sin coste).


## P2 — Servicios externos sin configurar

| Tarea | Estado | Detalle |
|---|---|---|
| **43.12** | **Hecho** | Secretos de R2 en el Worker, CORS del bucket para el origen del sitio y URL prefirmada corregida. Verificado: subir, servir por URL firmada (200 `image/webp`) y borrar. |
| **45.6** | **Hecho** | `GET` del objeto sin firma → **400 `InvalidArgument`**; el bucket no es público. |
| **43.13** | **Hecho** | Key cargada; envío directo y correo de bienvenida de la app **recibidos** en la cuenta de pruebas, sin `email_failed`. El remitente es `onboarding@resend.dev`. |
| **Dominio de correo** | **Hecho** | `runosorno.online` registrado el 2026-10-21 en Nominalia (expira 2027-10-21), zona DNS migrada a Cloudflare y dominio propio del Worker. En Resend está **verified** (región `sa-east-1`): los correos salen de `no-reply@runosorno.online` y llegan a cualquier destinatario. Plan y renovación en `docs/dominio.md`. Pendiente: `www` (404) y editar el SPF raíz para incluir a Resend. |
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
| 50.10 flujo completo en producción | Casi: el flujo coach → atleta → feedback → métricas → notificaciones funciona en producción, pero el login falla ~50% por límite de CPU (ver P1.5); pendiente re-medir tras subir de plan |
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

## Estrategia de costo cero para el login (P1.5)

Workers Paid ($5/mes) está descartado por el dueño. El objetivo es que el login
deje de caer por `exceededCpu` **sin gasto**, o con el mínimo posible. Las
opciones, en orden de esfuerzo:

1. **Calentamiento con ping externo (gratis, sin migrar nada).** Ya está
   desplegada la ruta `GET /api/health` (sin base de datos y fuera del
   middleware). Un cron externo gratuito (cron-job.org o UptimeRobot) la golpea
   cada 1-5 minutos y mantiene el isolate caliente, reduciendo el fallo en frío.
   No elimina el techo de 10 ms por invocación. Procedimiento completo:
   `docs/calentamiento.md`. La variante **nativa de Cloudflare** ya está
   implementada como un Worker aparte (`workers/calentamiento.mjs`, config
   `wrangler.calentamiento.jsonc`) con Cron Trigger cada 2 min y service binding
   al Worker principal; se despliega junto con la app y no toca su entry.

2. **Reubicar la autenticación en un runtime con más CPU (fondo del problema).**
   Un KDF seguro no cabe en 10 ms; la solución de raíz es ejecutar el login en
   un entorno con presupuesto de CPU real, manteniendo la app en Workers si
   conviene. Candidatos sin coste o de costo mínimo:
   - **Oracle Cloud Always Free**: VM ARM (4 OCPU, 24 GB RAM) gratis de por
     vida; correr `next start` (Node) sin límite de CPU.
   - **VPS de bajo costo** (~$3-5/mes: Hetzner, Racknerd, etc.) si Oracle no
     alcanza.
   - **Tiers gratuitos de Render/Fly/Railway**: con limitaciones (spin-down,
     horas mensuales).
   Implica decidir entre: (a) mover **todo** el despliegue de Workers → VM, o
   (b) dejar la app en Workers y exponer solo `/login` (o una mini API de
   autenticación) desde la VM. La opción (b) es más quirúrgica pero parte la
   sesión entre dos runtimes.

3. **Seguir apretando la CPU dentro de Workers.** Ya se hizo lo razonable
   (PBKDF2 nativo, menos round-trips, imports diferidos). Bajar las iteraciones
   de PBKDF2 por debajo de OWASP no es aceptable, y el resto de la CPU del login
   es I/O de base de datos que no se puede eliminar.

**Siguiente paso concreto:** PBKDF2, `/api/health` y el Worker de calentamiento
(`runosorno-calentamiento`, Cron Trigger cada 2 min) ya están desplegados en
producción. Falta **re-medir el login en frío** y, según el resultado, decidir si
hace falta el KDF en el cliente o mover la autenticación. Esto no bloquea el
resto del MVP: el corte afecta solo al POST de login en frío.


