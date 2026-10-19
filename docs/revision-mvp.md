# Revisión del MVP (fase 50.1–50.4)

Revisión hecha el 2026-10-19 contra el código, las suites automatizadas y el
Worker desplegado. Cada fila indica cómo está comprobado: **E2E**
(`e2e/`, Playwright), **verificador** (`scripts/verify-*`), **unitaria**
(`tests/unit/`), **manual** (probado en producción durante la revisión) o
**código** (implementado y revisado, sin prueba específica).

## 50.1 — Las 20 funcionalidades de `specs/mvp.md` §11

| # | Funcionalidad | Dónde | Cómo está comprobado |
|---|---|---|---|
| 1 | Autenticación por sesión | `lib/auth`, `proxy.ts` | E2E `auth.spec.ts`, `verify-roles`, `verify-produccion` |
| 2 | Admin gestiona coaches | `lib/services/user.service.ts`, `/admin/coaches` | E2E `admin-flow`, `verify-validations` 40.5, manual (alta real) |
| 3 | Admin gestiona grupos y solicitudes | `group.service.ts`, `/admin/groups/[id]` | E2E `admin-flow`, `verify-audit-logs` |
| 4 | Coach solicita unirse; admin aprueba/rechaza | `group.service.ts` | E2E `admin-flow` (aprobar), verificación de rechazo con notificación |
| 5 | Teams (nombre por defecto = apellido, asignar atletas) | `team.service.ts`, `/coach/teams` | E2E `coach-flow`, `verify-validations` 40.6/40.7 |
| 6 | Atletas: alta y gestión global con filtros/traslados | `athlete.service.ts`, `/admin/athletes` | `verify-audit-logs` (traslado real), `verify-validations` |
| 7 | Plantillas: crear, editar, clonar, compartir, oficiales | `template.service.ts`, `/coach/templates` | E2E `coach-flow` (crear), `verify-validations` 40.12, UI revisada (clonar/compartir) |
| 8 | Planificación: drag & drop, generador, multi-asignación, copiar semana | `plan.service.ts`, `CoachCalendar`, `WeekGenerator`, `MultiAssignDialog` | E2E `coach-flow` (asignar), `verify-validations` 40.14, `verify-responsive` (arrastre táctil) |
| 9 | Calendario mensual del atleta | `MonthCalendar`, `/athlete/calendar` | E2E `athlete-flow`, `verify-i18n`, `verify-rendimiento` 47.4 |
| 10 | Registro de sesiones (distancia, tiempo, RPE, motivo, ventana) | `session.service.ts`, `SessionForm` | E2E `athlete-flow`, `verify-validations` 40.8–40.11 |
| 11 | Calendario del coach: badges y feedback | `/coach/calendar/[team]/[athlete]` | E2E `feedback.spec.ts` |
| 12 | Métricas atleta, team y grupo | `lib/metrics`, `/athlete/metrics`, `/coach/metrics`, `/director/*` | E2E atleta, `verify-dashboards`, `verify-rendimiento` |
| 13 | Exportación PDF y Excel | `export.service.ts`, `/api/exports` | `verify-exports`, `verify-export-files`, `verify-exports-ui` |
| 14 | Notificaciones in-app | `notification.service.ts`, campanita | E2E `feedback`, `verify-dashboards`, `verify-empty-states` |
| 15 | Email automático (plan, sesión, anuncios) | `email.service.ts`, `emails/` | **Manual en producción**: bienvenida recibida; envío directo con Resend |
| 16 | Avatar (subida, 256×256, R2, iniciales) | `avatar.service.ts`, `AvatarUpload` | **Manual en producción**: subir, servir por URL firmada y borrar; unitaria de firma de imagen |
| 17 | Panel admin de configuración | `/admin/settings`, `settings.service.ts` | `verify-settings` |
| 18 | Logs / auditoría | `audit.service.ts`, `/admin/logs` | `verify-audit-logs` |
| 19 | Exportes globales del admin | `/exports`, `export.service.ts` | `verify-exports`, `verify-exports-ui` |
| 20 | Vista Director Técnico | `/director/*` | `verify-roles`, `verify-dashboards` (incluye anuncios) |

Las 20 están implementadas. No hay funcionalidades de la lista "Fuera del MVP"
(50.4): no existe API pública, WebSockets, pagos, wearables ni app nativa.

## 50.2 — Criterios de aceptación (`specs/mvp.md` §10)

| Área | Cobertura | Observaciones |
|---|---|---|
| Autenticación | E2E `auth.spec.ts`, `verify-login`, `verify-roles`, `verify-produccion` | Incluye mensaje genérico, redirección sin sesión y logout |
| Gestión de usuarios | E2E `admin-flow`, `verify-validations` 40.5 | Alta real con email recibido; desactivar/eliminar cubiertos por UI y auditoría; huérfanos visibles ("Sin grupo") |
| Grupos | E2E `admin-flow`, `verify-audit-logs` | Aprobar y rechazar; el rechazo crea notificación `join_request_rejected` |
| Teams | E2E `coach-flow`, `verify-validations` 40.6/40.7 | Límites reales desde configuración |
| Plantillas | E2E (crear), revisión de UI (clonar/compartir), unitarias | Las oficiales se clonan pero no se editan (comprobado en servicio/UI) |
| Planificación | E2E (asignar), `verify-validations` (copiar semana), `verify-responsive` (táctil) | Generador y multi-asignación implementados; sin E2E específico |
| Calendario del atleta | E2E `athlete-flow`, `verify-validations` 40.8/40.9, `verify-accesibilidad` 48.2/48.3 | Estados con forma y color, ventana de edición y sesión futura |
| Calendario del coach | E2E `feedback.spec.ts` | Badges, registro real y feedback con notificación |
| Métricas | E2E (atleta), `verify-dashboards`, `verify-rendimiento` | VO2max, umbral y zonas de FC en el panel; exportaciones verificadas |
| Notificaciones | E2E `feedback`, `verify-dashboards`, manual de correo | In-app + email de bienvenida comprobado |
| Avatar | **Manual en producción**, unitaria de validación de imagen | Subida con redimensionado en cliente, servido y borrado; bucket privado |
| Admin | `verify-settings`, `verify-audit-logs`, `verify-exports`, manual | Incluye **mantenimiento**: limpieza de avatares huérfanos (ver abajo) |
| Accesibilidad y UX | `verify-accesibilidad` (21 páginas, axe), `verify-responsive`, `verify-empty-states` | 0 violaciones WCAG A/AA |

**Hueco encontrado y cerrado durante la revisión:** el criterio de
mantenimiento ("limpieza de avatares huérfanos") no estaba implementado. Se añadió
en `avatar.service.ts` + `MaintenanceCard` en Configuración, con acción solo para
admin, registro `avatars_cleaned` en auditoría y pruebas unitarias del filtrado.
Verificado en producción: creó un objeto suelto en R2, la limpieza lo encontró y
lo borró (`encontrados 1, eliminados 1`) y quedó el registro en `/admin/logs`.

## 50.3 — Los 8 flujos principales (`specs/mvp.md` §5)

| Flujo | Cobertura |
|---|---|
| 1. Alta de coach y grupo (admin) | E2E `admin-flow.spec.ts` + alta real con email |
| 2. Coach crea team y registra atletas | E2E `coach-flow.spec.ts` |
| 3. Plantillas y planificación semanal | E2E `coach-flow.spec.ts` (crear y asignar) |
| 4. Atleta consulta y registra sesión | E2E `athlete-flow.spec.ts` |
| 5. Atleta marca "no realizada" | E2E `athlete-flow.spec.ts` |
| 6. Coach revisa y deja feedback | E2E `feedback.spec.ts` |
| 7. Director Técnico revisa el grupo y anuncia | `verify-dashboards` (métricas agregadas y envío de anuncios), `verify-exports` |
| 8. Admin configura y audita | `verify-settings`, `verify-audit-logs`, `verify-exports` |

Los flujos 1–6 se recorren de punta a punta en Playwright. Los flujos 7–8 no
tienen un E2E único, pero sus pasos están cubiertos por los verificadores
citados. El recorrido completo en **producción** (50.10) sigue pendiente.

## 50.4 — Sin funcionalidades fuera del MVP

Revisado: no hay rastros de API pública, WebSockets/tiempo real, pagos, wearables,
app móvil, evidencia fotográfica, chat en tiempo real ni IA. La única pieza
"extra" es el formateo i18n centralizado, que la propia especificación contempla
como preparación para un segundo idioma.
