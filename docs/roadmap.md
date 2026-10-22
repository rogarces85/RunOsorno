# Roadmap — cierre del MVP y escalado

Revisión del **2026-10-20**. Fuente: `docs/pendientes.md` (19-10), `specs/mvp.md`
§11, `docs/revision-mvp.md` y consulta directa a la base local.

**Resumen:** el desarrollo funcional del MVP está terminado (20/20 funcionalidades,
185 pruebas unitarias, 15 E2E, 7 verificadores en verde). Lo que queda para
**entregar** es producción, configuración externa y la revisión final de la fase 50.
Lo que queda para **escalar** son las fases 51–59 de este documento.

## 1. Cerrar el MVP (bloqueantes de entrega)

| # | Pendiente | Detalle | Criterio de cierre | Esfuerzo |
|---|---|---|---|---|
| M1 | **Login intermitente 503** (P1.5) | **Cerrado en el plan Free (2026-10-22).** Causa: Workers Free da 10 ms de CPU por petición y la app gastaba 21-98 ms en las páginas y 120-680 ms en un arranque en frío. Tres correcciones: la caché de R2 se purga **antes** del deploy (los 500 por objetos viejos y los colgues por render en runtime), **el middleware se eliminó** (5,46 MB → 0,22 MB; la protección quedó en los layouts) y el calentador pings **cada minuto**. Resultado: **30/30 logins**, **30/30 en paralelo**, **60/60 secuenciales**, arranque en frío 202 → 98 ms. | — | Hecho |
| M2 | **Dominio de correo propio y URL propia** | **Hecho** (2026-10-21): `runosorno.online` registrado en Nominalia, DNS en Cloudflare, dominio propio del Worker (certificado Let's Encrypt) y dominio **verified** en Resend (`sa-east-1`). Los correos salen de `no-reply@runosorno.online` y la app vive en `https://runosorno.online`. Pendiente: `www` (404) y editar el SPF raíz. Detalle y renovación en `docs/dominio.md`. | — | Hecho |
| M3 | **Sentry (44.6 / 50.13)** | SDK integrado y con privacidad configurada, pero sin cuenta ni DSN, así que no se carga. | Cuenta creada, DSN en el Worker, un error provocado visible y 2 alertas configuradas (`docs/configurar-sentry.md`). | 2 h |
| M4 | **Flujo completo en producción (50.10)** | Coach → atleta → feedback → métricas → notificaciones funciona, pero se probó con el login fallando la mitad de las veces. | Recorrido manual de los 8 flujos con M1 resuelto y sin 5xx en `wrangler tail`. | 3 h |
| M5 | **Responsive en dispositivo físico (50.11)** | Solo hay medición emulada a 375/768/1400 px. | Un Android y un iPhone reales: login, calendario del atleta, calendario del coach con drag & drop y registro de sesión. | 2 h |
| M6 | **Sello de entrega (50.14 / 50.15)** | Tag `v0.1.0-mvp` pendiente de M1–M5. | Tag creado y `deploy.yml` en verde sobre ese commit; README actualizado con la URL. | 1 h |

## 2. Deuda técnica (no bloquea la entrega)

| # | Pendiente | Detalle | Esfuerzo |
|---|---|---|---|
| D1 | Aviso de lint en `components/ui/Avatar.tsx` | El `<img>` es intencional (URLs firmadas que caducan). Falta el `eslint-disable-next-line` con el motivo. | 5 min |
| D2 | `.gitattributes` con `* text=auto eol=lf` | `npm run format:check` falla en Windows por CRLF; en CI no se ejecuta. | 10 min |
| D3 | `.dev.vars` incompleto | Solo tiene `DATABASE_URL`; `npm run preview` arranca sin `APP_URL` ni `RESEND_FROM`. | 15 min |
| D4 | Caché de Hyperdrive en lectura tras escritura | Al aplicar migraciones un `SELECT` devolvía el estado anterior. Comprobar que el atleta que registra y recarga ve el dato al instante; si no, desactivar caché en esa ruta. | 2 h |
| D5 | Paso "reintentar deploy si R2 da timeout" | Ya no hace falta en `deploy.yml`; es inocuo pero confunde. | 10 min |
| D6 | Textos dentro del JSX | La fase 46 centralizó el formateo, no los textos (~60 componentes). Se migran a `t()` cuando exista un segundo idioma. | Fase 58 |
| D7 | Higiene de datos locales | **Hecho (2026-10-20)**: eliminados 5 usuarios de prueba y el grupo "Grupo Verificación" con sus teams, plantillas y planificaciones; borrado el team "Equipo por encima del límite"; ajustes devueltos a los valores por defecto y restauradas las 5 plantillas oficiales. Sin huérfanos. Queda: el admin sigue con `must_change_password = 1`. | 15 min |
| D8 | **Sistema visual unificado** | Tokens en `app/styles/tokens.css` (color, tipografía Archivo self-hosted, radios, sombras, espaciado, movimiento), tema claro/oscuro con `data-bs-theme` y cookie, shell y login rediseñados, primitivas en `components/ui/`, gráficas con tokens por tema, `verify-tokens.ts` y axe en 22 rutas × 2 temas. Cambio `openspec/changes/ui-atletico-editorial`. | Hecho en fase A–C |
| D9 | **Landing pública** | Portada en `/` con la oferta por rol (Atleta, Coach, Escuela/Club), tres pasos, funcionalidades reales, Running y Trail, FAQ y contacto por correo; superficie pública acotada por estructura de carpetas (`app/(public)/` y `app/(auth)/login/`, el resto bajo `app/(app)/` con `requireAuth()`), tema claro/oscuro, SEO con OG y sitemap. Cambio `openspec/changes/landing-publica`. | Hecho |

## 3. Escalar a un sistema completo (fases 51–59)

Orden pensado para que cada fase se apoye en la anterior. La columna *Depende*
evita adelantar trabajo que luego haya que rehacer.

| Fase | Objetivo | Alcance | Depende | Esfuerzo |
|---|---|---|---|---|
| **51 — Identidad** | Que la cuenta no dependa del admin | Recuperación de contraseña self-service (token por email), verificación de email, invitaciones con caducidad, 2FA TOTP opcional, historial de sesiones y cierre remoto | M2 (dominio) | 1 sprint |
| **52 — Notificaciones** | Que cada usuario reciba lo que le importa | Preferencias por usuario (tipo × canal), digest semanal, Web Push, plantillas editables desde el panel con vista previa | — | 1 sprint |
| **53 — Datos reales** | Dejar de escribir a mano lo que el reloj ya sabe | Subida de FIT/TCX/GPX con parser, relleno automático de distancia/tiempo/FC, zonas calculadas desde umbrales, TSS/TRIMP desde datos reales, luego integraciones Strava/Garmin | 51 (cuentas) | 2 sprints |
| **54 — Planificación avanzada** | Planes, no sesiones sueltas | Mesociclos y periodización, objetivos (10K, media, maratón) con plantilla de progresión, duplicar bloque de semanas, biblioteca compartida entre coaches con permisos, versionado de plantillas | — | 2 sprints |
| **55 — Analítica** | Responder "¿está mejorando?" | ACWR (carga aguda/crónica), readiness, comparativas team/grupo, alertas configurables por umbral, informes PDF programados por email | 53 (para que la carga sea real) | 1-2 sprints |
| **56 — Comunicación** | Menos WhatsApp | Chat coach-atleta, hilos sobre una sesión, acuse de lectura en anuncios, adjuntos, respuestas rápidas | 52 | 1 sprint |
| **57 — Operación** | Que aguante usuarios y un incidente | Runtime con CPU real (VM Oracle Always Free o Workers Paid), staging con base separada y migraciones probadas ahí, backups automáticos con restore verificado, colas para email, rate limiting distribuido, Logpush a R2 | M1 | 1-2 sprints |
| **58 — Producto** | Alcance fuera del MVP | PWA/offline, app móvil nativa, segundo idioma (i18n ya soportado por el stack), API/tokens para terceros, multi-tenant aislado por escuela, festivos automáticos, gestión de lesiones, módulo de competencias, recomendaciones con IA | 51 + 57 | 4+ sprints |
| **59 — Calidad** | Sostener el ritmo | E2E de los flujos 51–58, contract tests de servicios externos, accesibilidad continua (axe en cada pantalla nueva), presupuesto de bundle en CI, k6 para carga | 57 (staging) | Continuo |

### Recomendación de secuencia

1. **M1 decide todo.** Mientras el login caiga por CPU, no tiene sentido invertir en
   fases nuevas: cualquier demo pública falla una de cada dos veces.
2. **M2 + 51** desbloquean el resto: sin correo propio no hay recuperación de
   contraseña ni invitaciones reales, y las notificaciones por email dependen de eso.
3. **53 + 55** son las que más percibe el atleta (deja de cargar números a mano y ve
   evolución). **54** es la que más percibe el coach (deja de repetir semana a semana).
4. **57** antes de abrir a más de un grupo real: hoy no hay staging ni restore probado.

## 4. Usuarios para iniciar el sistema y probar

Base local `runosorno` (XAMPP) verificada el 2026-10-20. Entrada:
`http://localhost:3000/login` (producción: `https://runosorno.rodrigo-garces-guerrero.workers.dev/login`).

| Rol | Email | Contraseña | Qué probar |
|---|---|---|---|
| **Admin** | `admin@runosorno.cl` | `Admin1234!` | Grupos, solicitudes de coach, usuarios, plantillas oficiales, ajustes, auditoría, exports. Muestra el aviso de "cambiar contraseña" en `/profile`. |
| **Coach** | `coach.demo@runosorno.cl` | `Demo1234!` | Team Elite y Team Juvenil: planificar con drag & drop, generador, copiar semana, multi-asignación, feedback, métricas de team. |
| **Director técnico** | `director.demo@runosorno.cl` | `Demo1234!` | Team Base + vista agregada del grupo, comparativa entre teams y anuncio masivo. |
| **Coach con solicitud pendiente** | `coach.pendiente@runosorno.cl` | `Demo1234!` | Entra sin grupo; sirve para que el admin apruebe/rechace la solicitud en `/admin/groups`. |
| **Atleta (cumple ~95%)** | `maria.fernandez@demo.runosorno.cl` | `Demo1234!` | Calendario, registro de sesión, edición dentro de la ventana, métricas con progresión. |
| **Atleta (sobrecarga de RPE)** | `carlos.munoz@demo.runosorno.cl` | `Demo1234!` | Alertas de RPE alto sostenido y caída de carga en la vista del coach. |
| **Atleta (cumple ~88%)** | `sofia.reyes@demo.runosorno.cl` | `Demo1234!` | Team Juvenil, sesiones parciales. |
| **Atleta (inactivo 12 días)** | `matias.gonzalez@demo.runosorno.cl` | `Demo1234!` | Alerta "sin registrar > X días" y motivo de sesión no realizada. |
| **Atleta (Team Base)** | `javier.soto@demo.runosorno.cl` | `Demo1234!` | Atleta del director técnico; sirve para comparar permisos coach vs director. |
| **Tu cuenta** | `rodrigo.garces.guerrero@gmail.com` | la que definiste | Cuenta propia (atleta) dentro de Team Elite. |

Datos: 1 grupo (`RunOsorno Demo (DEMO)`), 3 teams (Elite 3, Juvenil 2, Base 1),
8 semanas de planificación, 9 plantillas de coach + 5 oficiales y 3 notificaciones
sin leer.

**Base local limpia desde el 2026-10-20**: se eliminaron los usuarios de prueba
(`*.test@runosorno.cl`, `*probe*@runosorno.cl`), el "Grupo Verificación" y el team
"Equipo por encima del límite", junto con sus teams, plantillas, planificaciones,
registros, avisos y auditoría. Verificado: ninguna clave huérfana. Respaldo previo
en `%TEMP%\runosorno-backup\runosorno-antes-limpieza.sql`.

### Levantar desde cero

```bash
npm run db:migrate      # esquema
npm run db:seed         # admin + ajustes + 5 plantillas oficiales
npm run db:seed:demo    # grupo, coaches, teams, atletas y 8 semanas
npm run dev             # http://localhost:3000
```

`npm run db:seed:demo:clean` borra el escenario de demostración.
**Nunca** ejecutar `db:seed:demo` contra producción.
