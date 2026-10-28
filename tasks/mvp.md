# Tareas del MVP — RunOsorno

Hoja de ruta de implementación del MVP. Generada a partir de `AGENTS.md`, `specs/mvp.md` y `plan/mvp.md`.

Cada tarea usa formato checkbox. Marcar `[x]` al completar. Las tareas están ordenadas por dependencias: una tarea que requiere otra debe aparecer después.

---

# 1. Preparación del proyecto

- [x] 1.1 Crear proyecto Next.js 14+ con App Router, TypeScript y `npm create next-app@latest`
- [x] 1.2 Configurar estilos AdminLTE: importar CSS de `admin-lte` y `bootstrap` (verificar integración)
- [x] 1.3 Configurar ESLint + Prettier con reglas del proyecto
- [x] 1.4 Configurar `tsconfig.json` con path aliases (`@/` → raíz del proyecto)
- [x] 1.5 Crear estructura base de carpetas según `plan/mvp.md` Sección 3 (`app/`, `components/`, `lib/`, `db/`, `emails/`, `tests/`)
- [x] 1.6 Instalar AdminLTE (`admin-lte` + `bootstrap`) y Bootstrap Icons, verificar que renderiza un componente básico
- [x] 1.7 Crear `.env.local` con variables de entorno vacías (`DATABASE_URL`, Resend API key, R2 credentials, Lucia secret)
- [x] 1.8 Crear `.gitignore` completo (node_modules, .env.local, .next, etc.)
- [x] 1.9 Inicializar repositorio Git y hacer commit inicial
- [x] 1.10 Crear `README.md` con instrucciones de setup (install, dev, build)

---

# 2. Layout y estructura de interfaz base

- [x] 2.1 Crear root layout `app/layout.tsx` con `<html lang="es-CL">`, metadata base, importación de `globals.css`
- [x] 2.2 Crear `app/globals.css` con imports de `bootstrap` y `admin-lte` y variables de tema
- [x] 2.3 Crear route group `app/(auth)/` con layout minimalista (sin sidebar)
- [x] 2.4 Crear route group `app/(app)/` con layout de aplicación: `AppShell` de AdminLTE con sidebar y header
- [x] 2.5 Implementar componente `AppSidebar` en `components/layout/AppSidebar.tsx` con items de menú placeholder
- [x] 2.6 Implementar componente `AppHeader` en `components/layout/AppHeader.tsx` con logo, espacio para campanita, avatar placeholder
- [x] 2.7 Crear componente `RoleGuard` en `components/layout/RoleGuard.tsx` que redirige según rol (placeholder hasta tener auth)
- [x] 2.8 Crear `app/page.tsx` raíz que redirige a `/login` (o dashboard si ya autenticado)
- [x] 2.9 Crear `app/error.tsx` con pantalla de error genérica y botón "Volver al inicio"
- [x] 2.10 Verificar que el layout renderiza en desktop, tablet y móvil (responsive)

---

# 3. Base de datos y modelos de datos

- [x] 3.1 Instalar y configurar Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- [x] 3.2 Crear base de datos local `runosorno` en MySQL (XAMPP) — producción (PlanetScale u otro) se conecta en Fase 43
- [x] 3.3 Configurar `drizzle.config.ts` con `DATABASE_URL` (MySQL local en dev)
- [x] 3.4 Crear `lib/db/index.ts` con conexión Drizzle
- [x] 3.5 Definir tabla `users` en `lib/db/schema.ts` (id, name, email UNIQUE, password_hash, role ENUM, avatar_key, is_active, must_change_password, created_at, last_login_at)
- [x] 3.6 Definir tabla `groups` (id, name, description, logo_key, created_at)
- [x] 3.7 Definir tabla `group_members` (PK compuesta group_id + user_id, is_director, joined_at)
- [x] 3.8 Definir tabla `group_requests` (id, group_id, coach_id, status ENUM, requested_at, resolved_at, resolved_by, UNIQUE group_id + coach_id)
- [x] 3.9 Definir tabla `teams` (id, name, coach_id FK, created_at)
- [x] 3.10 Definir tabla `team_members` (PK compuesta team_id + athlete_id, joined_at)
- [x] 3.11 Definir tabla `athlete_profiles` (PK user_id, birth_date, weight_kg, height_cm, max_hr, resting_hr)
- [x] 3.12 Definir tabla `templates` (id, coach_id FK NULL, group_id FK NULL, name, session_type, is_official, is_shared, structure JSON, created_at, updated_at)
- [x] 3.13 Definir tabla `session_assignments` (id, athlete_id FK, template_id FK, session_date, week_start, status ENUM, created_by FK, created_at)
- [x] 3.14 Definir tabla `session_records` (id, assignment_id FK UNIQUE, distance_km, duration_minutes, rpe CHECK 1-10, comments, not_done_reason, custom_reason, recorded_at, updated_at)
- [x] 3.15 Definir tabla `session_feedback` (id, assignment_id FK, author_id FK, message, created_at)
- [x] 3.16 Definir tabla `notifications` (id, user_id FK, type, title, message, is_read, entity_type, entity_id, created_at)
- [x] 3.17 Definir tabla `audit_logs` (id, user_id FK NULL, action, entity_type, entity_id, details JSON, ip_address, created_at)
- [x] 3.18 Definir tabla `settings` (PK key, value JSON, updated_at)
- [x] 3.19 Definir tabla `sessions` de Lucia Auth (id, user_id, expires_at — columnas requeridas por `@lucia-auth/adapter-drizzle`)
- [x] 3.20 Generar primera migración con `drizzle-kit generate`
- [x] 3.21 Aplicar migración a MySQL local con `drizzle-kit migrate` (producción en Fase 43)
- [x] 3.22 Crear índices: `users.email` UNIQUE, `session_assignments(athlete_id, session_date)`, `session_assignments(athlete_id, week_start)`, `notifications(user_id, is_read)`, `group_requests(group_id, coach_id)` UNIQUE
- [x] 3.23 Crear `db/seed.ts` que inserta: usuario admin inicial (email + password), configuración default en `settings` (límites, motivos, tipos de sesión, ventana edición=48h)
- [x] 3.24 Ejecutar seed y verificar que el admin puede ser encontrado en DB

---

# 4. Autenticación y sesión

- [x] 4.1 Instalar Lucia Auth (`lucia@3.2.2`) y adapter Drizzle (`@lucia-auth/adapter-drizzle`)
- [x] 4.2 Crear `lib/auth/index.ts` con setup de Lucia (definición de tablas users + sessions)
- [x] 4.3 Crear `lib/auth/session.ts` con funciones: `createSession(userId)`, `validateSession(sessionId)`, `invalidateSession(sessionId)`
- [x] 4.4 Implementar hash de contraseñas con argon2id (o bcrypt) en `lib/services/auth.service.ts`
- [x] 4.5 Implementar `authenticate(email, password)` en `auth.service`: busca usuario, verifica hash, verifica `is_active`, retorna usuario o error genérico "Email o contraseña incorrectos"
- [x] 4.6 Crear Server Action `login` en `lib/actions/auth.actions.ts`: valida Zod, autentica, crea sesión, redirige según rol (admin → `/admin/dashboard`, coach → `/coach/dashboard`, athlete → `/athlete/dashboard`)
- [x] 4.7 Crear Server Action `logout`: invalida sesión, redirige a `/login`
- [x] 4.8 Crear esquema Zod `loginSchema` en `lib/validations/auth.schemas.ts`
- [x] 4.9 Crear página `app/(auth)/login/page.tsx` con formulario React Hook Form + Zod
- [x] 4.10 Crear `proxy.ts` en raíz (Next.js 16: la convención `middleware` fue renombrada a `proxy`): verifica cookie de sesión en cada request de `(app)`. Sin sesión → redirect `/login`. Con sesión pero ruta de auth → redirect a dashboard según rol
- [x] 4.11 Crear `lib/auth/guards.ts` con `requireAuth()` y `requireRole(role)` para usar en Server Actions
- [x] 4.12 Verificar: login con credenciales válidas redirige al dashboard del rol correcto
- [x] 4.13 Verificar: credenciales inválidas muestran mensaje genérico sin revelar si el email existe
- [x] 4.14 Verificar: acceder a `/admin/...` sin sesión redirige a `/login`
- [x] 4.15 Verificar: logout destruye sesión y redirige a `/login`
- [x] 4.16 Verificar: sesión expirada redirige a `/login` con mensaje "Tu sesión ha expirado"

---

# 5. Permisos y roles

- [x] 5.1 Crear `lib/permissions/roles.ts` con definición de capacidades por rol (qué rol puede acceder a qué rutas/acciones)
- [x] 5.2 Crear `lib/permissions/index.ts` con funciones: `isAdmin(user)`, `isCoach(user)`, `isAthlete(user)`, `isDirector(user, groupId)`
- [x] 5.3 Crear función `canManageTeam(user, teamId)` — solo el coach creador del team
- [x] 5.4 Crear función `canPlanFor(user, athleteId)` — coach dueño del atleta vía team
- [x] 5.5 Crear función `canViewAthlete(user, athleteId)` — atleta propio, coach dueño, o director del grupo
- [x] 5.6 Crear función `canEditRecord(user, assignmentId)` — solo el atleta dueño, dentro de ventana de edición, fecha no futura
- [x] 5.7 Verificar: un coach no puede acceder a rutas `/admin/*`
- [x] 5.8 Verificar: un atleta no puede acceder a rutas `/coach/*` ni `/admin/*`
- [x] 5.9 Verificar: un Director Técnico no puede editar planes (solo lectura)

---

# 6. Server Actions base y utilidades

- [x] 6.1 Crear patrón base de Server Action en `lib/actions/` con: verificar sesión → verificar permiso → validar Zod → llamar servicio → retornar resultado
- [x] 6.2 Crear `lib/utils/date.ts` con utilidades: `getWeekStart(date)` (lunes de la semana), `isSameWeek(a, b)`, `formatDateChile(date)` (timezone `America/Santiago`)
- [x] 6.3 Crear `lib/utils/initials.ts` con `getInitials(name)` para avatar de iniciales
- [x] 6.4 Crear `lib/utils/format.ts` con `formatDistance(km)`, `formatDuration(minutes)`, `formatRpe(rpe)`
- [x] 6.5 Crear `lib/config/constants.ts` con estados de sesión, colores por estado, tipos de sesión base, motivos default
- [x] 6.6 Crear `lib/config/index.ts` con lectura de variables de entorno y valores default de settings

---

# 7. Módulo Admin — Gestión de coaches

- [x] 7.1 Crear esquema Zod `createCoachSchema` (name, email) en `lib/validations/user.schemas.ts`
- [x] 7.2 Crear servicio `user.service.ts` con `createCoach(data)` — genera contraseña temporal, crea usuario con `role='coach'`, `must_change_password=true`
- [x] 7.3 Crear servicio con `updateCoach(id, data)`, `deactivateCoach(id)` (is_active=false), `deleteCoach(id)` (solo si no tiene teams/registros, si los tiene retorna error)
- [x] 7.4 Crear servicio con `resetPassword(id)` — nueva contraseña temporal, `must_change_password=true`
- [x] 7.5 Crear servicio con `getCoaches(filters)` — listado con filtros por estado, grupo, búsqueda
- [x] 7.6 Crear servicio con `getOrphanCoaches()` — coaches sin grupo asignado
- [x] 7.7 Crear Server Actions en `lib/actions/user.actions.ts`: `createCoach`, `updateCoach`, `deactivateCoach`, `deleteCoach`, `resetPassword`, `resendInvitation`
- [x] 7.8 Integrar `audit.service` — registrar `coach_created`, `coach_updated`, `coach_deactivated`, `coach_deleted`, `password_reset` con user_id, details, IP
- [x] 7.9 Crear componente `CoachesList` en `components/admin/CoachesList.tsx` — tabla con nombre, email, estado, grupo, acciones
- [x] 7.10 Crear componente `CoachForm` en `components/admin/CoachForm.tsx` — modal con nombre, email (alta/edición)
- [x] 7.11 Crear página `app/(app)/admin/coaches/page.tsx` que renderiza listado + botón nuevo coach
- [x] 7.12 Crear componente `ConfirmDialog` en `components/ui/ConfirmDialog.tsx` para acciones destructivas
- [x] 7.13 Verificar: admin crea coach → aparece en listado → recibe email de invitación
- [x] 7.14 Verificar: admin edita coach → datos actualizados
- [x] 7.15 Verificar: admin desactiva coach → coach no puede iniciar sesión
- [x] 7.16 Verificar: admin intenta eliminar coach con teams → recibe error sugiriendo desactivación
- [x] 7.17 Verificar: admin resetea contraseña → coach recibe email y `must_change_password=true`

---

# 8. Integración de email (Resend)

- [x] 8.1 Instalar Resend SDK (`resend`) y React Email (`@react-email/components`, `@react-email/render`)
- [x] 8.2 Configurar Resend con API key en variables de entorno
- [x] 8.3 Crear `lib/services/email.service.ts` con `sendEmail({ to, subject, html })` — envío vía Resend
- [x] 8.4 Implementar reintento: si falla, reintentar una vez. Si vuelve a fallar, registrar en `audit_logs` con `action='email_failed'`. No bloquear acción principal
- [x] 8.5 Crear `emails/layout.tsx` — layout base responsive HTML para emails
- [x] 8.6 Crear `emails/welcome.tsx` — email de bienvenida/invitación con link de activación y contraseña temporal
- [x] 8.7 Crear `emails/plan-published.tsx` — email "Tu coach publicó un plan"
- [x] 8.8 Crear `emails/session-completed.tsx` — email "Tu atleta completó una sesión"
- [x] 8.9 Crear `emails/announcement.tsx` — email de anuncio masivo
- [x] 8.10 Integrar `sendEmail` en `createCoach` — enviar email de invitación al crear coach
- [x] 8.11 Verificar: al crear un coach, se envía email de invitación con el contenido correcto
- [x] 8.12 Verificar: si Resend falla, la acción no se bloquea y el error queda registrado en logs

---

# 9. Módulo Admin — Gestión de grupos

- [x] 9.1 Crear esquema Zod `createGroupSchema` (name, description opcional) en `lib/validations/group.schemas.ts`
- [x] 9.2 Crear `group.service.ts` con `createGroup(data)`, `updateGroup(id, data)`, `deleteGroup(id)`
- [x] 9.3 Crear servicio con `getGroups()` — listado con conteo de coaches, teams, atletas
- [x] 9.4 Crear servicio con `requestJoin(groupId, coachId)` — crea solicitud pendiente, verifica no duplicada (UNIQUE constraint)
- [x] 9.5 Crear servicio con `approveRequest(requestId, adminId)` — crea `group_members`, actualiza solicitud, notifica al coach
- [x] 9.6 Crear servicio con `rejectRequest(requestId, adminId)` — actualiza solicitud, notifica al coach
- [x] 9.7 Crear servicio con `toggleDirector(groupId, userId)` — alterna `is_director` en `group_members`
- [x] 9.8 Crear servicio con `getPendingRequests(groupId)` — solicitudes pendientes para admin
- [x] 9.9 Crear Server Actions en `lib/actions/group.actions.ts`: `createGroup`, `updateGroup`, `deleteGroup`, `requestJoin`, `approveRequest`, `rejectRequest`, `toggleDirector`
- [x] 9.10 Integrar auditoría para todas las acciones de grupo
- [x] 9.11 Crear componente `GroupsList` — tabla con nombre, coaches, teams, atletas, acciones
- [x] 9.12 Crear componente `GroupForm` — modal alta/edición (nombre, descripción, logo placeholder)
- [x] 9.13 Crear componente `RequestsPending` — listado de solicitudes con botones aprobar/rechazar
- [x] 9.14 Crear componente `DirectorToggle` — checkbox para asignar/quitar Director Técnico
- [x] 9.15 Crear página `app/(app)/admin/groups/page.tsx` — listado de grupos + botón nuevo
- [x] 9.16 Crear página `app/(app)/admin/groups/[id]/page.tsx` — detalle del grupo: coaches miembros, solicitudes pendientes, toggle director
- [x] 9.17 Verificar: admin crea grupo → aparece en listado
- [x] 9.18 Verificar: coach envía solicitud → admin la ve en pendientes
- [x] 9.19 Verificar: admin aprueba → coach queda en `group_members` y recibe notificación
- [x] 9.20 Verificar: admin rechaza → coach recibe notificación de rechazo
- [x] 9.21 Verificar: coach con solicitud duplicada → recibe error "Ya tienes una solicitud pendiente o aprobada"
- [x] 9.22 Verificar: admin asigna Director Técnico → coach tiene `is_director=true`

---

# 10. Módulo Coach — Unirse a grupo

- [x] 10.1 Crear servicio con `getAvailableGroups()` — grupos donde el coach aún no es miembro ni tiene solicitud pendiente
- [x] 10.2 Crear página `app/(app)/coach/groups/page.tsx` — listado de grupos disponibles + solicitud de unión
- [x] 10.3 Crear componente `GroupRequestCard` — nombre del grupo, descripción, botón "Solicitar unirse"
- [x] 10.4 Verificar: coach ve grupos disponibles y puede enviar solicitud
- [x] 10.5 Verificar: grupo donde ya es miembro o tiene solicitud pendiente no aparece en disponibles

---

# 11. Módulo Coach — Teams

- [x] 11.1 Crear esquema Zod `createTeamSchema` (name opcional) en `lib/validations/team.schemas.ts`
- [x] 11.2 Crear `team.service.ts` con `createTeam(coachId, name?)` — default name = apellido del coach
- [x] 11.3 Crear servicio con `updateTeam(id, name)`, `deleteTeam(id)` (con verificación de dependencias)
- [x] 11.4 Crear servicio con `getTeamsByCoach(coachId)` — listado con conteo de atletas
- [x] 11.5 Crear servicio con `assignAthlete(teamId, athleteId)` — verifica límite de atletas por team desde settings
- [x] 11.6 Crear servicio con `removeAthlete(teamId, athleteId)`
- [x] 11.7 Crear servicio con `getTeamAthletes(teamId)` — atletas con último registro, cumplimiento básico
- [x] 11.8 Crear Server Actions en `lib/actions/team.actions.ts`: `createTeam`, `updateTeam`, `deleteTeam`, `assignAthlete`, `removeAthlete`
- [x] 11.9 Verificar límite: si `max_athletes_per_team` alcanzado → error "Has alcanzado el límite de atletas en este team"
- [x] 11.10 Crear componente `TeamsList` — cards o tabla con nombre, atletas, acciones
- [x] 11.11 Crear componente `TeamForm` — modal alta/edición con nombre (default = apellido)
- [x] 11.12 Crear componente `TeamAthletesManager` — listado de atletas del team con botón asignar/quitar
- [x] 11.13 Crear página `app/(app)/coach/teams/page.tsx` — listado de teams del coach + botón nuevo team
- [x] 11.14 Crear página `app/(app)/coach/teams/[id]/page.tsx` — detalle team: atletas, acciones
- [x] 11.15 Verificar: coach crea team → nombre por defecto es su apellido
- [x] 11.16 Verificar: coach renombra team → nombre actualizado
- [x] 11.17 Verificar: coach asigna atleta al team → atleta aparece en listado
- [x] 11.18 Verificar: coach quita atleta → atleta desaparece del team
- [x] 11.19 Verificar: límite de atletas alcanzado → mensaje de error

---

# 12. Gestión de atletas

- [x] 12.1 Crear esquema Zod `createAthleteSchema` (name, email, datos físicos opcionales)
- [x] 12.2 Crear `athlete.service.ts` con `createAthlete(data, teamId)` — crea usuario con role='athlete', crea `athlete_profiles`, asigna al team
- [x] 12.3 Crear servicio con `getAthletesByCoach(coachId)` — atletas de todos los teams del coach con estado
- [x] 12.4 Crear servicio con `getAthleteDetail(athleteId)` — perfil, teams, último registro, cumplimiento
- [x] 12.5 Crear servicio con `getAllAthletes(filters)` — listado global para admin (filtros: coach, team, grupo, estado)
- [x] 12.6 Crear servicio con `transferAthlete(athleteId, fromTeamId, toTeamId)` — mueve atleta entre teams, registra auditoría
- [x] 12.7 Crear servicio con `getOrphanAthletes()` — atletas sin coach asignado (admin)
- [x] 12.8 Crear Server Actions: `createAthlete`, `updateAthleteProfile`, `transferAthlete`
- [x] 12.9 Crear componente `AthletesList` — tabla con nombre, email, team, cumplimiento, última actividad, acciones
- [x] 12.10 Crear componente `AthleteForm` — alta/edición de atleta con datos físicos opcionales (birth_date, weight, height, max_hr, resting_hr)
- [x] 12.11 Crear componente `TransferDialog` — mover atleta entre teams (solo admin)
- [x] 12.12 Crear página `app/(app)/coach/athletes/page.tsx` — atletas del coach
- [x] 12.13 Crear página `app/(app)/coach/athletes/[id]/page.tsx` — perfil del atleta: datos, historial, métricas básicas
- [x] 12.14 Crear página `app/(app)/admin/athletes/page.tsx` — listado global con filtros
- [x] 12.15 Verificar: coach da de alta atleta → aparece en su team
- [x] 12.16 Verificar: admin ve listado global con filtros funcionando
- [x] 12.17 Verificar: admin transfiere atleta entre teams → cambio registrado con auditoría

---

# 13. Módulo Coach — Biblioteca de plantillas

- [x] 13.1 Crear esquema Zod `templateSchema` (name, sessionType, structure array de secciones) en `lib/validations/template.schemas.ts`
- [x] 13.2 Crear esquema Zod `sectionSchema` (id, order, title, type ENUM, content) — al menos 1 sección requerida
- [x] 13.3 Crear `template.service.ts` con `createTemplate(coachId, data)` — crea plantilla privada
- [x] 13.4 Crear servicio con `updateTemplate(id, data)` — solo plantilla propia (no oficial, no de otro coach)
- [x] 13.5 Crear servicio con `deleteTemplate(id)` — verifica que no tenga `session_assignments` activos; si tiene, retorna error
- [x] 13.6 Crear servicio con `cloneTemplate(sourceId, coachId, newName)` — duplica como plantilla propia, estructura copiada
- [x] 13.7 Crear servicio con `shareTemplate(id, groupId)` — setea `is_shared=true`, `group_id`
- [x] 13.8 Crear servicio con `unshareTemplate(id)` — setea `is_shared=false`
- [x] 13.9 Crear servicio con `getTemplatesByCoach(coachId)` — propias + oficiales + compartidas del grupo
- [x] 13.10 Crear servicio con `getTemplateVisibility(template, user)` — determina si el usuario puede ver/editar/clonar
- [x] 13.11 Crear Server Actions: `createTemplate`, `updateTemplate`, `deleteTemplate`, `cloneTemplate`, `shareTemplate`, `unshareTemplate`
- [x] 13.12 Verificar: plantilla privada solo visible para su creador
- [x] 13.13 Verificar: plantilla compartida visible y clonable para coaches del grupo (no editable)
- [x] 13.14 Verificar: plantilla oficial clonable pero no editable directamente
- [x] 13.15 Verificar: no se puede guardar plantilla vacía (nombre + al menos 1 sección con contenido)
- [x] 13.16 Verificar: eliminar plantilla con asignaciones activas → retorna error
- [x] 13.17 Crear componente `TemplateList` — grid de cards de plantillas con tabs (mías, oficiales, grupo)
- [x] 13.18 Crear componente `TemplateCard` — card con nombre, tipo, acciones (editar, clonar, compartir, eliminar)
- [x] 13.19 Crear componente `SectionEditor` — editor de sección: título, tipo, contenido; reordenable (arriba/abajo), eliminar sección, añadir sección
- [x] 13.20 Crear componente `TemplateEditor` — formulario completo: nombre, tipo de sesión, lista de secciones editables
- [x] 13.21 Crear página `app/(app)/coach/templates/page.tsx` — biblioteca con listado y botón nueva plantilla
- [x] 13.22 Crear página `app/(app)/coach/templates/new/page.tsx` — formulario de creación
- [x] 13.23 Crear página `app/(app)/coach/templates/[id]/page.tsx` — formulario de edición
- [x] 13.24 Verificar: coach crea plantilla con estructura (calentamiento + específico + enfriamiento) → se guarda correctamente
- [x] 13.25 Verificar: coach edita plantilla → cambios persisten
- [x] 13.26 Verificar: coach clona plantilla oficial → aparece como plantilla propia editable
- [x] 13.27 Verificar: coach comparte plantilla → otro coach del grupo la ve y puede clonar

---

# 14. Plantillas oficiales (Admin)

- [x] 14.1 Crear seed con 3-5 plantillas oficiales de ejemplo (Series, Intervalos, Fondo, Tempo, Recuperación)
- [x] 14.2 Crear servicio con `getOfficialTemplates()` — plantillas con `is_official=true`
- [x] 14.3 Crear servicio con `createOfficialTemplate(data)`, `updateOfficialTemplate(id, data)`, `deleteOfficialTemplate(id)` — CRUD admin
- [x] 14.4 Crear Server Actions para CRUD de plantillas oficiales (solo admin)
- [x] 14.5 Crear página `app/(app)/admin/templates/page.tsx` — listado + CRUD de plantillas oficiales
- [x] 14.6 Verificar: admin crea/edita/elimina plantillas oficiales
- [x] 14.7 Verificar: coach ve plantillas oficiales en su biblioteca y puede clonarlas

---

# 15. Planificación semanal (Coach)

- [x] 15.1 Crear esquema Zod `assignSessionSchema` (athleteId, templateId, date) en `lib/validations/plan.schemas.ts`
- [x] 15.2 Crear `plan.service.ts` con `assignSession(athleteId, templateId, date, coachId)` — crea `session_assignments`, verifica permiso (`canPlanFor`)
- [x] 15.3 Crear servicio con `assignSessionReplace(...)` — reemplaza plantilla en día ocupado
- [x] 15.4 Crear servicio con `bulkAssign(athleteIds, templateId, date, coachId)` — multi-asignación
- [x] 15.5 Crear servicio con `removeAssignment(assignmentId)` — elimina asignación y registro asociado
- [x] 15.6 Crear servicio con `copyPreviousWeek(athleteId, weekStart, coachId)` — copia asignaciones de `weekStart - 7 días`. Retorna count o error "No hay semana anterior para copiar"
- [x] 15.7 Crear servicio con `generateWeek(athleteId, weekStart, pattern, coachId)` — recibe array `[{ type, count }]` y distribuye plantillas en los 7 días de la semana
- [x] 15.8 Crear servicio con `getWeekPlan(athleteId, weekStart)` — asignaciones de la semana con plantillas incluidas
- [x] 15.9 Crear servicio con `getMonthPlan(athleteId, year, month)` — asignaciones del mes
- [x] 15.10 Crear Server Actions: `assignSession`, `bulkAssign`, `removeAssignment`, `copyPreviousWeek`, `generateWeek`
- [x] 15.11 Verificar: asignar plantilla a día libre → `session_assignments` creado con status='planned'
- [x] 15.12 Verificar: asignar plantilla a día ocupado → retorna `needsConfirm: true`
- [x] 15.13 Verificar: reemplazar en día ocupado → asignación anterior eliminada, nueva creada
- [x] 15.14 Verificar: multi-asignación a 3 atletas → 3 asignaciones creadas
- [x] 15.15 Verificar: copiar semana anterior → copia todas las asignaciones de la semana previa
- [x] 15.16 Verificar: copiar semana sin datos → error "No hay semana anterior para copiar"
- [x] 15.17 Verificar: generador de semana → distribuye plantillas según patrón
- [x] 15.18 Verificar: coach sin permiso sobre atleta → error de autorización

---

# 16. Calendario mensual — Componente base

- [x] 16.1 Crear componente `MonthCalendar` en `components/calendar/MonthCalendar.tsx` (Client Component) — grid de mes, navegación anterior/siguiente, marca día actual
- [x] 16.2 Crear componente `CalendarDay` en `components/calendar/CalendarDay.tsx` — celda de día con: número de día, badge de estado con código color, indicador de sesión planificada
- [x] 16.3 Implementar código de color: verde (completed), amarillo (partial), rojo (not_done), gris (rest/no asignado), azul (planned futuro), cyan (in_progress/hoy)
- [x] 16.4 Crear componente `SessionDetailPanel` — panel lateral o modal que muestra detalle de sesión al hacer click en un día
- [x] 16.5 Verificar: calendario muestra mes actual con días correctos
- [x] 16.6 Verificar: navegación mes anterior/siguiente funciona
- [x] 16.7 Verificar: día actual está resaltado visualmente
- [x] 16.8 Verificar: código de color se aplica correctamente según estado

---

# 17. Calendario — Vista Atleta

- [x] 17.1 Crear página `app/(app)/athlete/calendar/page.tsx` (RSC) — carga `getMonthPlan` para el atleta de sesión
- [x] 17.2 Renderizar `MonthCalendar` con datos de asignaciones + registros
- [x] 17.3 Al hacer click en día → abrir `SessionDetailPanel` con: plantilla planificada (calentamiento, específico, enfriamiento), registro actual si existe, estado
- [x] 17.4 Verificar: atleta ve su calendario con sesiones planificadas y colores correctos
- [x] 17.5 Verificar: click en día muestra detalle completo de la sesión planificada
- [x] 17.6 Verificar: días sin asignación muestran "Descanso" en gris

---

# 18. Calendario — Vista Coach

- [x] 18.1 Crear página `app/(app)/coach/calendar/page.tsx` — selector de Team → Atleta → calendario
- [x] 18.2 Crear página `app/(app)/coach/calendar/[teamId]/[athleteId]/page.tsx` (RSC) — carga plan del atleta seleccionado
- [x] 18.3 Renderizar `MonthCalendar` en modo edición (coach puede asignar plantillas)
- [x] 18.4 Implementar badge de cumplimiento por día: % de atletas del team que completaron esa sesión
- [x] 18.5 Al hacer click en día → `SessionDetailPanel` muestra registro real del atleta + campo de feedback
- [x] 18.6 Verificar: coach ve calendario de cada atleta de su team
- [x] 18.7 Verificar: badges de cumplimiento muestran porcentaje correcto
- [x] 18.8 Verificar: click en sesión completada muestra registro real (distancia, tiempo, RPE, comentarios)

---

# 19. Drag & drop y herramientas de planificación

- [x] 19.1 Instalar `@dnd-kit/core` y `@dnd-kit/sortable`
- [x] 19.2 Integrar `DndContext` en `MonthCalendar` modo coach — plantillas arrastrables de sidebar a días
- [x] 19.3 Crear componente `TemplateSidebar` — lista de plantillas del coach para arrastrar (visible en modo edición)
- [x] 19.4 Implementar drop en `CalendarDay` — al soltar plantilla, llama Server Action `assignSession`
- [x] 19.5 Implementar diálogo de confirmación al soltar en día ocupado — "¿Reemplazar la plantilla existente?"
- [x] 19.6 Crear componente `WeekGenerator` — modal con selectors: cuántos Fondos, Series, Tempo, Descanso, etc. → botón "Generar semana"
- [x] 19.7 Integrar `WeekGenerator` con Server Action `generateWeek`
- [x] 19.8 Crear botón "Copiar semana anterior" en toolbar del calendario coach
- [x] 19.9 Crear diálogo `MultiAssignDialog` — seleccionar varios atletas + plantilla + fecha → `bulkAssign`
- [x] 19.10 Verificar: drag & drop asigna plantilla al día correcto
- [x] 19.11 Verificar: drop en día ocupado pregunta confirmación y reemplaza
- [x] 19.12 Verificar: generador crea semana completa según patrón
- [x] 19.13 Verificar: copiar semana anterior duplica el plan
- [x] 19.14 Verificar: multi-asignación selecciona atletas y asigna a todos
- [x] 19.15 Verificar: atleta no puede modificar el plan (no hay controles de edición en su vista)

---

# 20. Registro de sesiones — Atleta

- [x] 20.1 Crear esquema Zod `recordSessionSchema` (assignmentId, distanceKm, durationMinutes, rpe opcional, comments opcional, status enum) en `lib/validations/session.schemas.ts`
- [x] 20.2 Crear esquema Zod `notDoneSchema` (assignmentId, reason enum, customReason opcional) con refine: si reason='otro' → customReason requerido
- [x] 20.3 Crear `session.service.ts` con `canEditRecord(assignmentId, userId)` — verifica: es el atleta dueño, fecha pasada (no futura), dentro de ventana de edición (settings `edit_window_hours`, default 48h)
- [x] 20.4 Crear servicio con `recordSession(data, athleteId)` — crea `session_records`, actualiza `session_assignments.status` a 'completed' o 'partial'
- [x] 20.5 Crear servicio con `markNotDone(data, athleteId)` — crea registro con motivo, setea status='not_done'
- [x] 20.6 Crear servicio con `getRecord(assignmentId)` — retorna registro existente
- [x] 20.7 Crear Server Actions: `recordSession`, `markNotDone`
- [x] 20.8 Integrar auditoría: registrar `session_recorded` con datos del registro
- [x] 20.9 Verificar: registrar sesión con distancia+tiempo → status cambia a 'completed', día se pone verde
- [x] 20.10 Verificar: registrar con datos parciales → status 'partial', día amarillo
- [x] 20.11 Verificar: marcar "no realizada" con motivo predefinido → status 'not_done', día rojo
- [x] 20.12 Verificar: marcar "Otro" sin descripción → error "Describe el motivo"
- [x] 20.13 Verificar: RPE fuera de 1-10 → error de validación
- [x] 20.14 Verificar: intentar registrar sesión futura → error "No puedes registrar sesiones de días futuros"
- [x] 20.15 Verificar: intentar editar registro fuera de ventana 48h → error "La ventana de edición ha expirado"
- [x] 20.16 Verificar: sin distancia/tiempo al marcar completada → error "La distancia y el tiempo son requeridos"

---

# 21. Formulario de registro de sesión (UI)

- [x] 21.1 Crear componente `SessionForm` en `components/calendar/SessionForm.tsx` — React Hook Form + Zod con campos: distancia (km), tiempo (min), RPE (select 1-10), comentarios (textarea)
- [x] 21.2 Crear toggle "Completada" vs "Parcial" vs "No realizada" en el formulario
- [x] 21.3 Al seleccionar "No realizada": mostrar select de motivos (desde settings) + campo texto si motivo="otro"
- [x] 21.4 Integrar `SessionForm` en `SessionDetailPanel` para rol atleta
- [x] 21.5 Manejar estados de edición: si registro existe y dentro de ventana → editable; si fuera de ventana → solo lectura con mensaje
- [x] 21.6 Mostrar confirmación de éxito tras guardar ("Sesión registrada correctamente")
- [x] 21.7 Actualizar el color del día en calendario tras guardar (sin refresh de página completo)
- [x] 21.8 Verificar: formulario valida en cliente con Zod (feedback inmediato)
- [x] 21.9 Verificar: formulario valida en servidor (Server Action rechaza datos inválidos)
- [x] 21.10 Verificar: al guardar, el día cambia de color inmediatamente

---

# 22. Feedback en sesiones (Coach)

- [x] 22.1 Crear esquema Zod `feedbackSchema` (assignmentId, message)
- [x] 22.2 Crear servicio con `addFeedback(assignmentId, authorId, message)` — crea `session_feedback`
- [x] 22.3 Crear servicio con `getFeedback(assignmentId)` — retorna mensajes ordenados por fecha
- [x] 22.4 Crear Server Action `addFeedback` — verifica permiso (coach dueño o atleta dueño)
- [x] 22.5 Crear componente `FeedbackForm` — textarea + botón enviar
- [x] 22.6 Crear componente `FeedbackThread` — lista de mensajes (coach y atleta) con autor y fecha
- [x] 22.7 Integrar `FeedbackThread` + `FeedbackForm` en `SessionDetailPanel` para ambos roles
- [x] 22.8 Verificar: coach deja feedback en sesión → atleta lo ve en su panel de detalle
- [x] 22.9 Verificar: atleta ve feedback del coach → marcado como no leído en notificaciones
- [x] 22.10 Verificar: atleta también puede comentar en la sesión (pregunta al coach)

---

# 23. Notificaciones in-app

- [x] 23.1 Crear `notification.service.ts` con `create({ userId, type, title, message, entityType?, entityId? })` — inserta en `notifications`
- [x] 23.2 Crear servicio con `getUnread(userId)` — notificaciones no leídas del usuario
- [x] 23.3 Crear servicio avec `markAsRead(id)`, `markAllAsRead(userId)`
- [x] 23.4 Crear servicio con `getNotifications(userId, { unreadOnly?, limit })` — lista paginada
- [x] 23.5 Crear Server Actions: `markAsRead`, `markAllAsRead`
- [x] 23.6 Integrar `create()` en `recordSession` → notificar al coach: "Tu atleta {nombre} completó {tipo} el {fecha}"
- [x] 23.7 Integrar `create()` en `markNotDone` → notificar al coach: "{nombre} marcó {tipo} como no realizada"
- [x] 23.8 Integrar `create()` en `addFeedback` → notificar al autor original: "Nuevo comentario en tu sesión"
- [x] 23.9 Integrar `create()` en `approveRequest` / `rejectRequest` → notificar al coach
- [x] 23.10 Integrar `create()` en cambio de team, bienvenida, etc. (eventos de sistema)
- [x] 23.11 Crear componente `NotificationBell` en `components/ui/NotificationBell.tsx` — icono de campanita con badge de contador de no leídas
- [x] 23.12 Crear dropdown/lista de notificaciones recientes al hacer click en campanita
- [x] 23.13 Crear página `app/(app)/notifications/page.tsx` — centro de notificaciones completo con filtros (todas, no leídas)
- [x] 23.14 Integrar `NotificationBell` en `AppHeader`
- [x] 23.15 Verificar: al completar sesión, el coach ve la campanita con contador incrementado
- [x] 23.16 Verificar: click en notificación → marca como leída y navega a la entidad relacionada
- [x] 23.17 Verificar: "Marcar todas como leídas" limpia el contador

---

# 24. Notificaciones email (eventos críticos)

- [x] 24.1 Integrar `email.service.sendEmail` con template `plan-published` en acción de publicar plan → email al atleta
- [x] 24.2 Integrar template `session-completed` en `recordSession` → email al coach
- [x] 24.3 Crear Server Action `sendAnnouncement` — crea notificaciones in-app + envía email a todos los miembros del grupo
- [x] 24.4 Integrar en `createCoach` → email de bienvenida/invitación (ya hecho en Fase 8)
- [x] 24.5 Verificar: coach publica plan → atleta recibe email
- [x] 24.6 Verificar: atleta completa sesión → coach recibe email
- [x] 24.7 Verificar: grupo vacío → aviso "El grupo no tiene miembros"
- [x] 24.8 Verificar: email fallido no bloquea la acción principal

---

# 25. Métricas — Funciones de cálculo

- [x] 25.1 Crear `lib/metrics/compliance.ts` con `calcCompliance(assignments)` → `% completadas / total planificadas * 100`
- [x] 25.2 Crear `lib/metrics/load.ts` con `calcWeeklyLoad(records, weekStart)` → `{ km, minutes, tss?, trimp? }`
- [x] 25.3 Crear `lib/metrics/progression.ts` con `calcProgression(records, numberOfWeeks)` → array `[{ week, km, minutes }]`
- [x] 25.4 Crear `lib/metrics/distribution.ts` con `calcTypeDistribution(assignments)` → `{ type: percentage }`
- [x] 25.5 Crear `lib/metrics/streaks.ts` con `calcStreak(records)` → días consecutivos con sesión completada
- [x] 25.6 Crear `lib/metrics/heart-rate.ts` con `calcHRZones(maxHr, restingHr)` → zonas 1-5 (método Karvonen)
- [x] 25.7 Crear `lib/metrics/heart-rate.ts` con `calcTRIMP(records, profile)` → TRIMP si hay datos de FC
- [x] 25.8 Crear `lib/metrics/vo2max.ts` con `estimateVO2max(records, profile)` → VO2max estimado si hay datos suficientes
- [x] 25.9 Crear `lib/metrics/alerts.ts` con `detectAlerts(athletes, records, settings)` → array de alertas (sin registrar > X días, caída carga, RPE alto sostenido)
- [x] 25.10 Escribir tests unitarios con Vitest para cada función de cálculo (`tests/unit/metrics.test.ts`)
- [x] 25.11 Verificar: `calcCompliance` retorna % correcto con datos de prueba
- [x] 25.12 Verificar: `calcWeeklyLoad` suma correctamente km y minutos
- [x] 25.13 Verificar: `calcStreak` detecta racha consecutiva correctamente
- [x] 25.14 Verificar: `calcHRZones` genera zonas correctas con FC máx y reposo dados
- [x] 25.15 Verificar: `detectAlerts` genera alerta cuando atleta lleva > X días sin registrar

---

# 26. Métricas — Servicio y Server Actions

- [x] 26.1 Crear `metric.service.ts` con `getAthleteMetrics(athleteId, period)` — carga registros + asignaciones, llama funciones de cálculo, retorna objeto completo
- [x] 26.2 Crear servicio con `getTeamMetrics(teamId, period)` — buckets de cumplimiento (>80/50-80/<50), carga media, alertas
- [x] 26.3 Crear servicio con `getGroupMetrics(groupId, period)` — comparativa de teams + cumplimiento por coach
- [x] 26.4 Crear servicio con `getMetricsPeriod(period)` — resuelve temporada/año/rango personalizado a fechas
- [x] 26.5 Crear Server Actions o funciones RSC para obtener métricas de cada nivel
- [x] 26.6 Integrar actualización de métricas: al guardar registro (`recordSession`), las métricas se refrescan via `revalidatePath`
- [x] 26.7 Verificar: métricas del atleta se calculan correctamente con datos reales
- [x] 26.8 Verificar: métricas del team muestran buckets correctos
- [x] 26.9 Verificar: métricas del grupo comparan teams correctamente
- [x] 26.10 Verificar: métricas se actualizan al guardar registro (sin refresh manual)

---

# 27. Métricas — Interfaz y gráficas

- [x] 27.1 Instalar `recharts`
- [x] 27.2 Crear componente `AthleteMetricsPanel` — cards con cumplimiento %, carga semanal, racha, distribución
- [x] 27.3 Crear componente `ProgressChart` — gráfica de línea: volumen semanal últimas 4-12 semanas (Recharts)
- [x] 27.4 Crear componente `TypeDistributionChart` — gráfica circular o barra: distribución por tipo de sesión
- [x] 27.5 Crear componente `LoadChart` — gráfica de carga semanal (km + tiempo)
- [x] 27.6 Crear componente `ComplianceChart` — gráfica de cumplimiento
- [x] 27.7 Crear componente `TeamMetricsPanel` — cards con % atletas por bucket, carga media, lista de alertas
- [x] 27.8 Crear componente `GroupMetricsPanel` — tabla comparativa de teams, cumplimiento por coach
- [x] 27.9 Crear página `app/(app)/athlete/metrics/page.tsx` — métricas personales del atleta con gráficas
- [x] 27.10 Crear página `app/(app)/coach/metrics/page.tsx` — métricas del team con gráficas y alertas
- [x] 27.11 Crear página `app/(app)/director/teams/page.tsx` — comparativa de teams del grupo
- [x] 27.12 Verificar: atleta ve gráfica de progresión con datos reales
- [x] 27.13 Verificar: coach ve resumen de team con buckets y alertas
- [x] 27.14 Verificar: Director Técnico ve comparativa de teams
- [x] 27.15 Verificar: todas las gráficas renderizan correctamente en desktop y móvil

---

# 28. Métricas fisiológicas (VO2max, zonas FC, umbrales)

- [x] 28.1 Mostrar VO2max estimado en panel de métricas del atleta (si hay datos suficientes)
- [x] 28.2 Mostrar zonas de FC en panel del atleta (si tiene max_hr y resting_hr en perfil)
- [x] 28.3 Mostrar FC de umbral estimada (si hay datos de FC)
- [x] 28.4 Mostrar RPE medio vs RPE planificado en panel del atleta
- [x] 28.5 Si no hay datos suficientes → mostrar mensaje "Datos insuficientes. Completa tu perfil con FC máx y FC reposo."
- [x] 28.6 Verificar: atleta con perfil completo ve VO2max y zonas FC
- [x] 28.7 Verificar: atleta sin datos fisiológicos ve mensaje de datos insuficientes

---

# 29. Avatar / Foto de perfil

- [x] 29.1 Instalar SDK de Cloudflare R2 (`@aws-sdk/client-s3` compatible con R2 o `@cloudflare/r2` client)
- [x] 29.2 Configurar bucket R2 privado + credentials en variables de entorno
- [x] 29.3 Crear API route `app/api/avatar/upload/route.ts` — genera presigned PUT URL para R2
- [x] 29.4 Crear API route `app/api/avatar/route.ts` — genera signed GET URL para visualizar avatar (o retorna SVG de iniciales si no hay avatar_key)
- [x] 29.5 Crear `avatar.service.ts` con `getUploadUrl(userId)` — presigned PUT, key = `avatars/{userId}.webp`
- [x] 29.6 Crear servicio con `confirmUpload(userId, key)` — actualiza `users.avatar_key`
- [x] 29.7 Crear servicio con `deleteAvatar(userId)` — elimina archivo de R2, limpia `avatar_key`
- [x] 29.8 Crear componente `AvatarUpload` — input file, valida formato (JPG/PNG/WebP), valida tamaño (≤ 2MB)
- [x] 29.9 Implementar resize client-side a 256×256 px usando canvas
- [x] 29.10 Implementar strip EXIF (el resize via canvas ya elimina EXIF)
- [x] 29.11 Subida: resize → Blob → presigned PUT → confirm → actualizar UI
- [x] 29.12 Crear componente `Avatar` en `components/ui/Avatar.tsx` — muestra imagen si existe, si no muestra iniciales generadas con SVG
- [x] 29.13 Integrar `Avatar` en `AppHeader`, listados de atletas, página de perfil
- [x] 29.14 Crear botón "Eliminar foto" en perfil → vuelve a avatar de iniciales
- [x] 29.15 Verificar: subir foto JPG/PNG/WebP → se redimensiona a 256×256 y se muestra en header
- [x] 29.16 Verificar: subir imagen > 2MB → error "La imagen es muy grande. El máximo es 2 MB."
- [x] 29.17 Verificar: formato no soportado → error "Formato no soportado. Usa JPG, PNG o WebP."
- [x] 29.18 Verificar: sin foto → se muestra avatar de iniciales
- [x] 29.19 Verificar: eliminar foto → vuelve a iniciales

---

# 30. Dashboard por roles

- [x] 30.1 Crear `app/(app)/admin/dashboard/page.tsx` — stats cards: total coaches, total grupos, total atletas, solicitudes pendientes
- [x] 30.2 Crear `app/(app)/coach/dashboard/page.tsx` — selector de team, stats: cumplimiento promedio, alertas, sesiones de hoy
- [x] 30.3 Crear `app/(app)/athlete/dashboard/page.tsx` — sesión de hoy, resumen de semana, racha actual, cumplimiento del mes
- [x] 30.4 Crear `app/(app)/director/dashboard/page.tsx` — resumen del grupo: comparativa teams, alertas, cumplimiento por coach
- [x] 30.5 Verificar: cada rol ve su dashboard con datos reales
- [x] 30.6 Verificar: admin ve contadores correctos
- [x] 30.7 Verificar: coach ve alertas de sus teams
- [x] 30.8 Verificar: atleta ve su sesión de hoy y su racha

---

# 31. Menú lateral por rol

- [x] 31.1 Actualizar `AppSidebar` para mostrar items según rol de usuario en sesión
- [x] 31.2 Menú Admin: Dashboard, Coaches, Grupos, Atletas, Plantillas oficiales, Configuración, Logs, Exportes
- [x] 31.3 Menú Coach: Dashboard, Mis Teams, Calendario, Biblioteca de plantillas, Atletas, Métricas, Grupos (solicitud), Exportes
- [x] 31.4 Menú Atleta: Dashboard, Calendario, Mis métricas, Perfil
- [x] 31.5 Menú Director Técnico: Dashboard, Teams (comparativa), Atletas (lectura), Anuncios, Exportes
- [x] 31.6 Verificar: cada rol solo ve los items de su menú
- [x] 31.7 Verificar: items de menú navegan a las rutas correctas

> Nota 31.x: los items Configuración, Logs y Exportes están definidos en `components/layout/nav.ts` con flag `pending: true` y se muestran cuando sus páginas existan (Fases 33–35). "Anuncios" se desbloqueó en la Fase 32. El menú Director Técnico se agrega debajo del menú Coach (los directores inician sesión como coaches).

---

# 32. Director Técnico — Funcionalidades

- [x] 32.1 Crear servicio con `getDirectorGroups(userId)` — grupos donde `is_director=true`
- [x] 32.2 Crear página `app/(app)/director/athletes/page.tsx` — atletas del grupo en modo solo lectura
- [x] 32.3 Crear página `app/(app)/director/announcements/page.tsx` — formulario de anuncio masivo (título, mensaje)
- [x] 32.4 Crear componente `AnnouncementForm` — con preview y botón enviar
- [x] 32.5 Integrar `sendAnnouncement` — crea notificaciones in-app + email para todos los miembros del grupo
- [x] 32.6 Verificar: Director Técnico ve atletas del grupo en modo lectura (sin botones de edición)
- [x] 32.7 Verificar: Director Técnico envía anuncio → todos los miembros reciben notificación in-app y email
- [x] 32.8 Verificar: Director Técnico no puede editar planes ni registros

---

# 33. Exportación de datos

- [x] 33.1 Instalar `exceljs` y `@react-pdf/renderer`
- [x] 33.2 Crear `export.service.ts` con `exportAthletePDF(athleteId, period)` — genera PDF con métricas del atleta
- [x] 33.3 Crear servicio con `exportAthleteExcel(athleteId, period)` — genera XLSX con registros y métricas
- [x] 33.4 Crear servicio con `exportTeamExcel(teamId, period)` — genera XLSX con resumen del team
- [x] 33.5 Crear servicio con `exportGroupExcel(groupId, period)` — genera XLSX con métricas agregadas del grupo
- [x] 33.6 Crear servicio con `exportGlobalCSV(entityType)` — genera CSV de coaches, atletas o grupos (admin)
- [x] 33.7 Crear Server Actions `exportData` — recibe entityType, format, period, retorna archivo
- [x] 33.8 Crear componente `ExportButton` — dropdown con formato (PDF, Excel, CSV) y selector de periodo (temporada, año, personalizado)
- [x] 33.9 Integrar `ExportButton` en páginas de métricas y listados
- [x] 33.10 Verificar: coach exporta métricas de atleta a PDF → archivo descargable con datos correctos
- [x] 33.11 Verificar: coach exporta a Excel → XLSX descargable
- [x] 33.12 Verificar: admin exporta listado global a CSV → CSV descargable
- [x] 33.13 Verificar: exportar sin datos → mensaje "No hay datos para exportar en el periodo seleccionado"

> Nota 33.x: los archivos se generan íntegramente en memoria (sin `fs`), para
> no romper el runtime edge de Cloudflare Workers donde el sistema de archivos
> es efímero. PDF con `@react-pdf/renderer` (documento en `lib/exports/athlete-report.tsx`,
> separado del servicio porque usa JSX), XLSX con `exceljs` (workbook en memoria)
> y CSV con BOM UTF-8 para que Excel lo abra bien. La página `/exports`
> centraliza los botones y desbloquea el item del menú para Admin, Coach y
> Director Técnico. Cada exportación queda registrada en `audit_logs` con
> `action='data_exported'`, y los permisos se validan con `canViewAthlete`,
> `canManageTeam` e `isDirector`.

---

# 34. Configuración global (Admin)

- [x] 34.1 Crear servicio con `getSetting(key)` y `updateSetting(key, value)` — lectura/escritura de tabla `settings`
- [x] 34.2 Crear esquemas Zod para cada tipo de setting (límites, motivos, tipos, email)
- [x] 34.3 Crear Server Actions: `updateSetting` (solo admin)
- [x] 34.4 Crear página `app/(app)/admin/settings/page.tsx` con Tabs: Límites, Motivos, Tipos de sesión, Email
- [x] 34.5 Tab "Límites": form para `max_teams_per_coach`, `max_athletes_per_team`, `edit_window_hours`, `alert_no_record_days`
- [x] 34.6 Tab "Motivos no realizada": lista editable de motivos (agregar, editar, eliminar)
- [x] 34.7 Tab "Tipos de sesión": lista de tipos base (agregar, editar, eliminar)
- [x] 34.8 Tab "Email": form para `email_from`, edición de templates HTML de email
- [x] 34.9 Verificar: admin edita límites → los límites se aplican en las acciones correspondientes
- [x] 34.10 Verificar: admin edita motivos → aparecen en el select del atleta
- [x] 34.11 Verificar: admin edita `edit_window_hours` → cambia la ventana de edición de registros
- [x] 34.12 Verificar: no-admin no puede acceder a `/admin/settings`

> Nota 34.x: la columna `settings.value` es `longtext`, no `JSON`, así que
> Drizzle devuelve siempre el contenido como string aunque sea JSON válido.
> `settings.service.ts` lo parsea explícitamente; sin eso, una lista guardada
> como `'[{"id":...}]'` se descartaba en silencio y la app volvía a los
> valores por defecto. Los motivos y tipos de sesión pasan a ser
> configurables de verdad: `SessionForm` los recibe desde el servidor y
> `markNotDone` valida contra la configuración, en lugar de usar el enum
> fijo `DEFAULT_NOT_DONE_REASONS`.

---

# 35. Logs de auditoría (Admin)

- [x] 35.1 Crear `audit.service.ts` con `log({ userId, action, entityType, entityId?, details?, ipAddress })` — inserta en `audit_logs`
- [x] 35.2 Integrar `audit.log()` en todas las acciones críticas: crear/editar/eliminar usuarios, grupos, teams, atletas, plantillas, asignaciones, solicitudes, exports, config
- [x] 35.3 Crear servicio con `getLogs(filters)` — listado con filtros por fecha, usuario, tipo de acción
- [x] 35.4 Crear página `app/(app)/admin/logs/page.tsx` — tabla de logs con filtros
- [x] 35.5 Crear componente `LogsTable` — tabla con columnas: fecha, usuario, acción, entidad, detalles, IP
- [x] 35.6 Capturar IP del request: `request.headers.get('cf-connecting-ip')` o `x-forwarded-for`
- [x] 35.7 Verificar: crear un coach genera log con `action='coach_created'`
- [x] 35.8 Verificar: aprobar solicitud genera log con `action='request_approved'`
- [x] 35.9 Verificar: transferir atleta genera log con datos del traslado
- [x] 35.10 Verificar: admin puede filtrar logs por fecha y usuario

> Nota 35.x: la IP ahora se resuelve **dentro de `logAudit`** (en
> `lib/utils/request.ts`) en lugar de pasarse desde cada acción. Antes solo
> `createCoach` la registraba, así que de las 44 llamadas a `logAudit`
> únicamente 2 guardaban IP; ahora las 44 la registran. El helper valida el
> formato (IPv4 con octetos 0-255 o IPv6) porque los headers los controla el
> cliente y el valor va a una columna `varchar(45)`. Si la auditoría corre
> fuera de un request (seeds, tests) se registra `null` sin romper la acción.
>
> La tarea 35.8 nombra la acción `request_approved`, pero la app la registra
> como `join_approved`; la verificación comprueba el nombre real.

---

# 36. Dashboard Admin — Stats

- [x] 36.1 Crear servicio con `getAdminStats()` — conteo de coaches activos/inactivos, grupos, atletas, solicitudes pendientes
- [x] 36.2 Crear componente `StatsCards` — grid de cards con número + label
- [x] 36.3 Integrar en `app/(app)/admin/dashboard/page.tsx`
- [x] 36.4 Verificar: contadores reflejan datos reales de la DB

---

# 37. Página de perfil de usuario (todos los roles)

- [x] 37.1 Crear página `app/(app)/profile/page.tsx` — datos personales, avatar, cambio de contraseña
- [x] 37.2 Crear componente `ProfileForm` — nombre y email (read-only o editable según configuración)
- [x] 37.3 Crear componente `PasswordChange` — contraseña actual, nueva, confirmación (React Hook Form + Zod)
- [x] 37.4 Crear Server Action `changePassword` — verifica contraseña actual, actualiza hash, invalida sesiones anteriores
- [x] 37.5 Integrar `AvatarUpload` en página de perfil
- [x] 37.6 Verificar: usuario cambia contraseña → debe usar la nueva en el próximo login
- [x] 37.7 Verificar: usuario actualiza avatar → se refleja en header inmediatamente

> Nota 37.x: al cambiar la contraseña se revocan **todas** las sesiones
> salvo la actual (decisión explícita del proyecto, no un efecto secundario).
> El servicio usa `ne(sessions.id, currentSessionId)` para conservar la
> sesión desde la que se hace el cambio; si no, el usuario perdería el
> acceso de inmediato. El hash sube a bcrypt con 12 rondas (antes 10) y se
> limpia `must_change_password`. También se añadió `pruneOldSessions` al
> login: la tabla `sessions` crecía sin límite y ahora conserva 5 por
> usuario.
>
> El email **no** es editable desde el perfil: cambiarlo afectaría al
> login y a los registros ya enviados, así que se muestra deshabilitado
> con una nota que lo explique.
>
> `changePasswordAction` se escribe a mano (necesita el id de sesión) y no
> pasa por `runAction`, por lo que convierte el fallo a `{ok:false}`
> explícitamente: si lanzara `ActionFailure` el usuario vería la pantalla
> de error 500 en vez del mensaje "La contraseña actual no es correcta".

---

# 38. Estados vacíos y mensajes de error (UI)

- [x] 38.1 Crear componente `EmptyState` en `components/ui/EmptyState.tsx` — icono + mensaje + acción opcional
- [x] 38.2 Aplicar `EmptyState` a listados vacíos: "No hay coaches registrados", "No hay atletas en este team", "No hay plantillas", "No hay notificaciones"
- [x] 38.3 Crear componente `Alert` wrapper de Tabler para mensajes de error y éxito
- [x] 38.4 Integrar mensajes de error de Server Actions en formularios (field-level errors)
- [x] 38.5 Verificar: cada listado vacío muestra mensaje orientativo con acción posible
- [x] 38.6 Verificar: errores de validación se muestran bajo el campo correspondiente
- [x] 38.7 Verificar: errores de negocio muestran `Alert` con mensaje claro
- [x] 38.8 Verificar: acciones destructivas piden confirmación con `ConfirmDialog`

> Nota 38.x: `runAction` ahora devuelve `fieldErrors` (mapa
> `campo → mensaje`) cuando el fallo viene del esquema Zod, y
> `applyServerErrors` los marca con `setError` en React Hook Form. Antes
> toda validación del servidor colapsaba en un único "Datos inválidos".
>
> El error de negocio del servidor se guarda en `root.server` en vez de
> en un `useState` aparte: así `reset()` lo limpia al reabrir el modal, sin
> un segundo efecto. Los modales (`CoachForm`, `GroupForm`, `TeamForm`,
> `AthleteForm`, `OfficialTemplateForm`) muestran el `Alert` **dentro** del
> modal; antes se delegaba en el `notice` del listado, que queda detrás del
> backdrop y el usuario nunca veía.
>
> `EmptyState` se aplica a coaches, grupos, equipos, atletas, atletas de un
> team, plantillas (pestañas Mías/Oficiales/Grupo), plantillas oficiales,
> notificaciones (centro y aviso de la campanita) y solicitudes pendientes.
> La acción es opcional a propósito: en el centro de notificaciones el
> vacío no es "crea algo", es "estás al día".

---

# 39. Responsive (mobile, tablet, desktop)

- [x] 39.1 Verificar login responsive en mobile, tablet, desktop
- [x] 39.2 Verificar sidebar colapsa en mobile (hamburger menu de Tabler)
- [x] 39.3 Verificar calendario es usable en mobile (celdas legibles, tap para detalle)
- [x] 39.4 Verificar tablas/listados son responsive (scroll horizontal o layout adaptado)
- [x] 39.5 Verificar formularios son usables en mobile (inputs full width)
- [x] 39.6 Verificar gráficas de métricas se adaptan al tamaño de pantalla
- [x] 39.7 Verificar drag & drop funciona en tablet (o fallback a click-to-assign)
- [x] 39.8 Corregir cualquier problema de responsive detectado

> Nota 39.x: la revisión encontró cinco problemas reales, todos corregidos:
>
> 1. **El sidebar no era un panel, era una franja.** Tabler solo saca el
>    navbar vertical del flujo normal desde `lg`
>    (`@media (min-width: 992px) { .navbar-vertical.navbar-expand-lg … }`).
>    Por debajo seguía `position: relative`, así que ocupaba 56 px sobre el
>    header en todas las páginas, y su hamburguesa —que estaba dentro del
>    propio `<aside>`— no aparecía en móvil. Ahora el botón vive en
>    `AppHeader` (`NavToggle`), el estado se comparte con `NavProvider`, y
>    por debajo de `lg` el sidebar es un panel flotante: entra desde la
>    izquierda, oscurece el fondo, bloquea el scroll, cierra con `Escape`,
>    con el fondo o al navegar. El header pasó de `navbar-expand-md` a
>    `navbar-expand-lg` para que el breakpoint coincida con el del sidebar.
> 2. **El contador de notificaciones era invisible en todos los tamaños.**
>    `NotificationBell` usaba `badge-danger`, clase que ya no existe en
>    Tabler 1.6 (los colores de badge son `text-bg-*`): el contador se
>    pintaba blanco sobre blanco. Además flotaba en línea y empujaba el
>    ícono; ahora va anclado a la esquina con `position: absolute`.
> 3. **Los anillos de las métricas no se veían en ninguna pantalla.**
>    Con `ResponsiveContainer`, recharts 3.10.1 suma el `outerRadius` del
>    `Pie` al offset izquierdo del gráfico polar, así que `cx="50%"` caía en
>    `ancho/2 + radio` y el círculo se dibujaba medio fuera del SVG (con un
>    contenedor de 317 px el centro quedaba en x=243). Compensarlo con
>    `margin.left` negativo tampoco daba un centro estable. Se sustituyó por
>    `components/metrics/DonutChart.tsx`, un SVG propio con `viewBox` fijo:
>    el centro es siempre el centro geométrico, escala con el contenedor y
>    ya no necesita JavaScript. La leyenda pasa a HTML, que además se
>    envuelve en móvil. Afectaba a `ComplianceChart` y
>    `TypeDistributionChart`.
> 4. **En móvil el calendario era ilegible.** En una celda de ~42 px el tipo
>    de sesión se cortaba a "Te…" y el badge de cumplimiento se comía la
>    celda. Por debajo de `sm` se ocultan las etiquetas, se compactan celdas
>    y badges, y quedan el número del día y el punto de estado (que es lo que
>    anuncia el `aria-label`).
> 5. **El arrastre con el dedo no arrancaba.** dnd-kit necesita
>    `touch-action: none` en el elemento arrastrable; sin eso el primer
>    toque desplazaba la página. Además, en móvil la bandeja queda encima del
>    calendario, así que arrastrar es imposible: por debajo de `lg` se
>    oculta y se muestra el aviso de que basta con tocar el día
>    (`AssignTemplateForm`). Por encima de `lg` el arrastre funciona con
>    dedo, verificado con eventos táctiles reales vía CDP.

---

# 40. Validaciones y manejo de errores (completación)

- [x] 40.1 Revisar que todas las Server Actions validan con Zod antes de ejecutar
- [x] 40.2 Revisar que todas las Server Actions verifican sesión y permisos
- [x] 40.3 Verificar que `login` no revela si el email existe (mensaje genérico)
- [x] 40.4 Verificar que sesión expirada redirige a login con mensaje
- [x] 40.5 Verificar email duplicado → "Ya existe un usuario con este email"
- [x] 40.6 Verificar límite de teams por coach → mensaje de error
- [x] 40.7 Verificar límite de atletas por team → mensaje de error
- [x] 40.8 Verificar ventana de edición de registro → mensaje correcto fuera de ventana
- [x] 40.9 Verificar registro de sesión futura → bloqueado
- [x] 40.10 Verificar RPE fuera de rango → validación en cliente y servidor
- [x] 40.11 Verificar motivo "Otro" vacío → validación
- [x] 40.12 Verificar plantilla vacía → no se guarda
- [x] 40.13 Verificar solicitud duplicada a grupo → bloqueada
- [x] 40.14 Verificar copiar semana sin datos → mensaje "No hay semana anterior"
- [x] 40.15 Verificar error inesperado → pantalla `error.tsx` con opción volver al inicio

> Nota 40.x: 40.1 y 40.2 no se comprueban leyendo el código, sino con una
> auditoría que recorre `lib/actions/*.ts`: cada Server Action exportada tiene
> que pasar por `runAction` (que dentro ya hace `requireAuth` + `safeParse`) o
> declarar su propio `requireAuth`/`requireRole` y `safeParse`. Hoy son 54
> acciones: 48 por `runAction` y 6 escritas a mano (`exportDataAction`,
> `changePasswordAction` y las cuatro de configuración, que necesitan el id de
> sesión o el usuario para auditar). Se comprueba también que el propio
> `runAction` siga exigiendo sesión y parseando: si el helper dejara de
> hacerlo, las 48 que lo usan caerían a la vez.
>
> La revisión encontró dos defectos reales, ya corregidos:
>
> - **`max_teams_per_coach` no se aplicaba.** El admin podía configurarlo en
>   Configuración → Límites y `getMaxTeamsPerCoach()` existía, pero
>   `createTeam` nunca lo consultaba: un coach podía crear teams sin límite
>   (el de atletas por team sí se comprobaba). Ahora `createTeam` cuenta los
>   teams del coach y corta con "Has alcanzado el límite de N teams…".
> - **La ventana de edición estaba fija en 48 h en el formulario.**
>   `SessionForm` traía `EDIT_WINDOW_HOURS = 48` en el cliente mientras el
>   servicio leía `edit_window_hours` de la tabla `settings`. Con la ventana
>   en 24 h la UI ofrecía un formulario que el servidor iba a rechazar, y con
>   72 h lo bloqueaba antes de tiempo. Ahora la página del calendario del
>   atleta lee el ajuste y lo pasa al formulario.
>
> También se corrigió que el botón "Volver al inicio" de `app/error.tsx`
> llamara a `reset()` —reintentando la ruta que ya había fallado— en vez de
> navegar al inicio; ahora hay "Reintentar" para eso. La pantalla se comprobó
> en vivo con una ruta que lanza, verificando el 500, el texto y que el botón
> lleva al dashboard del usuario.
>
> Dos tareas se verifican por servicio y no por interfaz, porque su error solo
> es alcanzable con una petición falsificada: la 40.13 (la interfaz oculta a
> propósito los grupos con solicitud pendiente) y la 40.14 (el botón del
> calendario copia siempre hacia la semana en curso, que en una base con datos
> siempre tiene semana previa). La 40.5 nombra "este email" y la app responde
> "ese email"; la verificación acepta ambas formas y comprueba el texto real.

---

# 41. Pruebas unitarias (Vitest)

- [x] 41.1 Instalar y configurar Vitest (`vitest`, `@vitest/coverage-v8`)
- [x] 41.2 Configurar `vitest.config.ts` con path aliases
- [x] 41.3 Tests de `lib/metrics/compliance.ts` — casos: 100%, 50%, 0%, con datos vacíos
- [x] 41.4 Tests de `lib/metrics/load.ts` — suma correcta de km/tiempo, con/sin FC
- [x] 41.5 Tests de `lib/metrics/progression.ts` — serie temporal correcta
- [x] 41.6 Tests de `lib/metrics/distribution.ts` — porcentajes correctos
- [x] 41.7 Tests de `lib/metrics/streaks.ts` — racha con interrupción, racha vacía, racha larga
- [x] 41.8 Tests de `lib/metrics/heart-rate.ts` — zonas FC con datos de prueba, TRIMP
- [x] 41.9 Tests de `lib/metrics/alerts.ts` — genera alerta cuando corresponde, no genera cuando no
- [x] 41.10 Tests de `session.service.canEditRecord` — dentro/fuera de ventana, fecha futura, usuario incorrecto
- [x] 41.11 Tests de validaciones Zod — esquemas válidos e inválidos
- [x] 41.12 Tests de `lib/auth/guards.ts` — permisos por rol
- [x] 41.13 Tests de `lib/permissions/index.ts` — todas las funciones de permiso
- [x] 41.14 Ejecutar `npm run test` → todos los tests pasan
- [x] 41.15 Configurar cobertura mínima (≥ 80% en `lib/metrics/` y `lib/permissions/`)

> Nota 41.x: `npm test` pasa de 41 a **123 pruebas** en siete archivos.
> `lib/metrics/` ya venía cubierta de la Fase 25 (41.3-41.9), y se le
> añadieron los dos casos que faltaban de la lista: 0 % con sesiones pero
> ninguna completada, y racha larga de 21 días.
>
> Lo nuevo de la fase:
>
> - **`session.service.canEditRecord`** con los cuatro casos de la tarea, más el
>   camino feliz: qué filas escribe al registrar (inserta en `session_records`,
>   actualiza el estado de la asignación) y que solo avisa al coach la primera
>   vez, no al editar. También se comprueba que la ventana sale de la
>   configuración: con `edit_window_hours: 2` la misma sesión de hace 10 horas
>   deja de ser editable, que es exactamente el defecto corregido en la Fase 40.
> - **Los 13 esquemas Zod** con sus mensajes exactos, que es lo que el
>   formulario muestra bajo cada campo: RPE fuera de rango, "Otro" sin
>   descripción, plantilla sin secciones, límites con cero o fuera de rango,
>   rangos de métricas invertidos, coherencia de `kind`/`format` en las
>   exportaciones, etc.
> - **`lib/auth/guards.ts`** al 100 %: qué devuelve con sesión válida, a dónde
>   manda sin cookie, a dónde manda con sesión caducada (`/login?expired=1`) y
>   que un rol no llega al dashboard de otro.
> - **`lib/permissions/index.ts`** al 97,8 %: las cinco funciones puras de rol,
>   las seis que consultan la base (admin, director, grupo, team, atleta,
>   feedback) y `canAccessRoute` / `canPerformAction`.
>
> Para probar los servicios sin depender de MySQL se añadió
> `tests/helpers/fakeDb.ts`: un doble de `db` que devuelve, para cada tabla, las
> filas que la prueba preparó, y que registra las escrituras. Si lo preparado
> para una tabla es una lista de listas, la trata como cola (una respuesta
> distinta por consulta), que es lo que hace falta cuando el mismo código
> pregunta dos veces por `team_members` con criterios distintos. El doble no
> evalúa condiciones SQL: por eso los tests afirman sobre la *decisión* que
> toma el servicio a partir del contenido de la fila.
>
> La cobertura se mide con `@vitest/coverage-v8` (`npm run test:coverage`) y
> los umbrales son obligatorios, no informativos: 80 % en `lib/metrics/` y
> `lib/permissions/`, 90 % en `lib/auth/guards.ts` y 80 % en
> `session.service.ts` (líneas, sentencias y funciones; 75/70 % en ramas).
> Cobertura medida hoy: métricas 98,9 %, permisos 97,8 %, guards 100 %,
> session.service 93,5 %; el conjunto de archivos incluidos, 89,5 % de líneas.
> `lib/validations/` se mide pero no se exige umbral (67 %): son esquemas
> declarativos y no contienen lógica.
>
> `coverage/`, `playwright-report/` y `test-results/` se agregaron a los ignores
> de ESLint, que antes recorría el informe HTML generado.

---

# 42. Pruebas E2E (Playwright)

- [x] 42.1 Instalar y configurar Playwright (`@playwright/test`)
- [x] 42.2 Configurar `playwright.config.ts` con URL base (dev server o preview)
- [x] 42.3 Test E2E: login con credenciales válidas → redirige a dashboard según rol
- [x] 42.4 Test E2E: login con credenciales inválidas → muestra error genérico
- [x] 42.5 Test E2E: logout → redirige a login, rutas protegidas bloqueadas
- [x] 42.6 Test E2E flujo Admin: crear coach → crear grupo → aprobar solicitud → asignar Director Técnico
- [x] 42.7 Test E2E flujo Coach: crear team → crear plantilla → asignar a atleta en calendario
- [x] 42.8 Test E2E flujo Atleta: ver calendario → registrar sesión → ver métricas
- [x] 42.9 Test E2E flujo Coach: ver registro del atleta → dejar feedback → atleta ve notificación
- [x] 42.10 Test E2E: atleta marca sesión "no realizada" con motivo
- [x] 42.11 Test E2E: campanita muestra notificaciones no leídas
- [x] 42.12 Ejecutar `npx playwright test` → todos los tests pasan

> Nota 42.x: `@playwright/test` se instala aparte de `playwright` (que ya se
> usaba en los scripts `verify-*`); los binarios de Chromium ya estaban
> descargados. La suite vive en `e2e/` y corre con `npm run test:e2e`.
>
> `playwright.config.ts` levanta `npm run dev` y reutiliza el servidor si ya está
> corriendo; con `BASE_URL` definido no arranca nada y apunta a donde se le diga
> (preview o staging). Fija `locale: es-CL` y `timezoneId: America/Santiago`
> porque la app formatea fechas en esa zona: sin eso, las pruebas de calendario
> ven días distintos a los que ve un usuario en Chile. `workers: 1` y
> `fullyParallel: false` son deliberados, porque los flujos crean datos reales.
>
> Los tests no dependen del orden: cada uno crea la sesión que necesita con
> `addSession()`. La primera versión dejó las sesiones en el fixture
> compartido y falló de dos maneras que conviene recordar: al crear una sesión
> en un día que ya tenía otra, el calendario muestra una de las dos (la última
> que llega en el `Map` por fecha) y la assertion mira a la equivocada; y si un
> worker se reinicia a mitad de suite, `beforeAll` corre otra vez y el test
> hereda datos de una fixture anterior.
>
> El fixture crea coach, atleta, equipo y plantilla con inserciones directas, no
> con los servicios, por dos razones concretas: `user.service` y
> `athlete.service` importan las plantillas de email (`.tsx`), que el
> transformador de Playwright no resuelve, y el alta de coach dispararía un
> envío real a Resend. Todo lo que sí se prueba (los flujos de las tareas
> 42.6-42.11) va por la interfaz.
>
> Cada ejecución usa un sufijo único en nombres y emails y `cleanupRun()` borra
> al final todo lo creado (usuarios, equipos, plantillas, sesiones, feedback,
> avisos), en cascada para no chocar con las claves foráneas. Verificado tras la
> corrida: 0 filas residuales con el sufijo.
>
> `npm run test:e2e` → 15/15. Aparte de las 12 tareas, la suite cubre también
> que un rol no entra en el dashboard de otro, que el atleta no abre el
> calendario del coach, y que el detalle de una sesión muestra el registro
> guardado.

---

# 43. Integración y configuración Cloudflare

> **Nota de la fase (43.0): el adaptador del plan estaba obsoleto.** La tarea
> 43.1 pedía `@cloudflare/next-on-pages`, que está deprecado, no soporta
> Next 16 y despliega a Pages. El adaptador vigente es **OpenNext Cloudflare**
> (`@opennextjs/cloudflare`), que despliega a **Workers**, no a Pages. Se
> corrigieron las tareas 43.2, 43.5, 43.6, 43.8 y 43.9 para reflejarlo, y
> `AGENTS.md` se actualizó en la misma línea. `wrangler.jsonc` reemplaza al
> `wrangler.toml` de 43.2: es el formato actual y admite comentarios.

- [x] 43.1 Instalar `@opennextjs/cloudflare` y `wrangler` — `1.20.11` y `4.151.0`
- [x] 43.2 Configurar `wrangler.jsonc` con nombre del proyecto, R2 bucket binding y Hyperdrive binding
- [x] 43.3 Configurar secretos del Worker — `LUCIA_SECRET` (nuevo, 48 caracteres), `APP_URL` y `RESEND_FROM` como variables. Credenciales de R2 cargadas el 19-10; `RESEND_API_KEY` sigue pendiente (43.13)
- [x] 43.4 Configurar Hyperdrive apuntando al MySQL de producción (Aiven `defaultdb`, MySQL 8.4.11)
- [x] 43.5 Verificar build local con `npx opennextjs-cloudflare build`
- [x] 43.6 Conectar el repositorio de GitHub a Cloudflare Workers — token de cuenta cargado en los secretos; `deploy.yml` desplegó en verde (19-10)
- [x] 43.7 Configurar GitHub Actions workflow (`.github/workflows/deploy.yml`): install → lint → test → build → deploy
- [x] 43.8 Hacer primer deploy a Cloudflare Workers — versión `f7aca525-ff2e-4cab-993a-e460f39b2e87`
- [x] 43.9 Verificar el sitio accesible en `*.workers.dev` — `https://runosorno.rodrigo-garces-guerrero.workers.dev`
- [x] 43.10 Verificar login funciona en producción (cookies Secure, HTTPS) — `auth_session` con `secure=true`, `httpOnly=true`, `sameSite=Lax`
- [x] 43.11 Verificar conexión a DB funciona desde edge (Hyperdrive) — login real contra Aiven y la sesión sobrevive a una recarga
- [x] 43.12 Verificar R2 funciona (subir y ver avatar) — secretos cargados, CORS configurado y URL prefirmada corregida; subida, servido y borrado comprobados
- [x] 43.13 Verificar Resend envía emails en producción — key cargada; envío directo y correo de bienvenida de la app recibidos en tesoreriaor@gmail.com, sin `email_failed`. Remitente de pruebas `onboarding@resend.dev` hasta verificar un dominio

> **Un cuarto defecto, ya en el despliegue.** `NEXT_PUBLIC_APP_URL` se usaba para
> armar los enlaces de los correos, pero el prefijo `NEXT_PUBLIC_` hace que Next
> lo incruste en el bundle **durante el build**: los correos de producción
> habrían apuntado a `http://localhost:3000`. Como solo se usa en el servidor,
> se renombró a `APP_URL` y pasa a ser una variable del Worker, cambiable sin
> recompilar.
>
> **Dos cosas del entorno que conviene saber.** El DNS del router no resuelve
> los hostnames de Aiven (`ENOTFOUND`), aunque los DNS públicos sí; desde este
> equipo hay que conectar por IP (`167.172.139.215`). Y `wrangler.jsonc` necesita
> `localConnectionString` en el binding de Hyperdrive, porque wrangler no puede
> resolver bindings en local sin ella y el deploy falla.

> **Avería de infraestructura (2026-10-14): el login en producción quedó
> caído y se resolvió.** Al rotar la credencial de Aiven se creó un usuario
> nuevo (`admin`) en lugar de cambiar la clave del que Hyperdrive tenía
> configurado (`avnadmin`). MySQL respondía bien pero ambos usuarios daban
> `ER_ACCESS_DENIED_ERROR`, así que el sitio cargaba sin que nadie pudiera
> autenticarse. **No era un defecto del código**: no se cambió ninguna línea de
> la aplicación. Se resolvió actualizando el binding de Hyperdrive con
> `admin` y redesplegando; `verify-produccion.ts` volvió a dar login, cookie
> `Secure` + `HttpOnly`, sesión persistente y cero 5xx. El procedimiento quedó
> escrito en `docs/recuperar-acceso-aiven.md`.
>
> **Un segundo fallo de CI, distinto del anterior.** Con `npm ci` ya resuelto,
> el deploy automático fallaba en `Failed to populate remote R2 bucket
> "runosorno-cache"` tras 15 reintentos con `aborted due to timeout`. La causa
> no es el código: OpenNext sube la caché incremental a R2 antes de publicar, y
> desde los runners de GitHub esa intermittently da tiempo de espera. Como la
> caché es regenerable, el workflow reintenta el deploy una vez.
>
> **Lección sobre contraseñas en capturas:** la contraseña leída de un pantallazo
> no coincidió con ninguna de las variantes de lectura plausible (`l/1`, `O/0`,
> `S/5`, `Z/2`, `B/8`), así que a la próxima hay que pasarla escrita en texto.
>
> **Un fallo de CI que sólo aparece en GitHub.** Los dos deploys automáticos
> fallaron con `Missing: esbuild@0.28.2 from lock file`, aunque el lock sí
> contiene esa versión. Es una diferencia de npm: el lock lo genera npm 11
> (Node 24) y el workflow corría con Node 22 (npm 10), que construye el árbol
> buscando esas entradas por su cuenta. En local `npm ci` pasaba sin problema.
> El workflow quedó en Node 24 para que compile e instale el mismo npm.

> **Tres defectos reales encontrados al ejecutar la app dentro de `workerd`.**
> Compilar no es lo mismo que funcionar: los tres solo aparecen en el runtime
> de Cloudflare, nunca en `next dev` ni en `npm run build`.
>
> **1. Next 16.4.0 es incompatible con OpenNext 1.20.11.** La release de 16.4.0
> incluye *"Move preview props into separate manifest"* (#96004), que genera
> `.next/server/preview-props.json`. El parche de OpenNext solo inlinea
> manifiestos que casan con `*-manifest`, `required-server-files` o
> `prefetch-hints`, así que ese archivo no viaja al bundle y **toda petición
> devolvía 500** con `Unexpected loadManifest(/.next/server/preview-props.json)
> call!`. El peer dependency de OpenNext es `next >=16.3.8`, y 16.3.8 no genera
> ese manifiesto: se fijó Next en `16.3.8`.
>
> **2. `mysql2` genera código en tiempo de ejecución y `workerd` lo prohíbe.**
> `mysql2` compila el parser de filas con `generate-function`, que usa
> `new Function`; `workerd` responde `Code generation from strings disallowed for
> this context` y **ninguna consulta a la base funciona**. La salida es la
> opción `disableEval` que el propio `mysql2` ofrece para entornos sin `eval`:
> usa su parser estático en vez del compilado. Sin esto, Hyperdrive tampoco
> habría servido de nada, porque el fallo está en el parser, no en la conexión.
>
> **3. La conexión a la base no puede sobrevivir entre peticiones.** El cliente
> de Drizzle se memorizaba a nivel de módulo; en Workers, un socket creado en la
> petición A no puede usarse en la B y `mysql2` falla con `Cannot perform I/O on
> behalf of a different request`. Ahora `lib/db/index.ts` memoriza el cliente
> junto al contexto de Cloudflare, que OpenNext construye nuevo en cada
> petición, y lo rehace en cuanto cambia. Fuera de Workers el contexto siempre
> es `null`, así que la comparación da igual y se reutiliza una sola instancia.
>
> **Verificación.** `BASE_URL=http://127.0.0.1:8787 npx playwright test` ejecuta
> las 15 pruebas E2E contra el bundle servido por `opennextjs-cloudflare preview`,
> es decir, dentro de `workerd`: **15/15**. En `next dev` también **15/15**, y
> `npm test` **123/123**. La misma suite que valida el desarrollo local valida
> el runtime de producción.
>
> **Pendiente de infraestructura** (no depende del código): 43.3, 43.4, 43.6 y
> 43.8 a 43.13 necesitan el MySQL de producción, Hyperdrive, los secretos del
> Worker y el primer deploy. Los buckets R2 `runosorno-cache` y
> `runosorno-avatars` ya están creados.
>
> **Aviso de la Fase 44:** la migración `0001_tiresome_thunderbolts.sql`
> (`login_attempts`, de la Fase 45) **no estaba aplicada** en la base de
> desarrollo, y eso rompía el login con un 500 (`Table 'runosorno.login_attempts'
> doesn't exist`). Se aplicó con `npm run db:migrate`. Lo mismo hay que hacer
> contra el MySQL de Aiven antes del próximo deploy, porque allí el rate
> limiting del login fallaría igual.

---

# 44. Sentry (Observabilidad de errores)

- [x] 44.1 Instalar `@sentry/nextjs` — `11.7.0`
- [x] 44.2 Configurar Sentry con DSN en variables de entorno
- [x] 44.3 Configurar source maps para errores legibles
- [x] 44.4 Verificar que errores de Server Actions se reportan a Sentry
- [x] 44.5 Verificar que errores de rendering se reportan a Sentry
- [ ] 44.6 Configurar alertas básicas en Sentry (errores nuevos) — procedimiento escrito en `docs/configurar-sentry.md`; falta la cuenta para crearlas

> **Sentry v11 cambia las reglas del juego y el proyecto tiene que adaptarse.**
> `sendDefaultPii` ya no existe y, en su lugar, `dataCollection` decide qué se
> recoge **por defecto de forma permisiva**: cookies, cabeceras HTTP, cuerpos de
> la petición, parámetros de la URL y datos de las consultas. Es decir, la
> configuración por defecto de Sentry subiría a un servicio externo la cookie de
> sesión y los correos de los usuarios. Por eso la configuración apaga categoría
> por categoría (`userInfo`, `cookies`, `httpHeaders`, `httpBodies`,
> `urlQueryParams`, `databaseQueryData`, `stackFrameVariables`) en vez de confiar
> en el valor por defecto, y encima pasa todo el evento por un segundo filtro
> (`lib/observability/scrub.ts`) que sustituye correos e IPs por marcadores y
> redacta `authorization`, `cookie` y compañía.
>
> **Turbopack, no webpack.** El proyecto compila con Turbopack, y con Turbopack
> Sentry no puede hacer la instrumentación automática de App Router, middleware y
> Server Functions que documenta para webpack. No afecta a las tareas 44.4 y
> 44.5: los errores llegan igual por `onRequestError` (declarado en
> `instrumentation.ts`) y por el SDK del cliente. Lo que sí hace Sentry con
> Turbopack es activar `productionBrowserSourceMaps` y subir los mapas al
> compilar, borrándolos después del upload para que no queden servidos.
> `sourcemaps.disable` se ata a `SENTRY_AUTH_TOKEN`: sin token no hay a quién
> subirlos y activarlos solo dejaría los `.map` en `.next`.
>
> **Dos defectos encontrados verificando, los dos ya corregidos.**
>
> 1. **El scrub se comía el stack trace.** El recorrido se cortaba a 6 niveles de
>    profundidad y los frames de `exception.values[].stacktrace.frames[]` están a
>    ese nivel: todos llegaban a Sentry como `"[truncado]"`. El evento pasaba la
>    verificación de "llega el error" y no servía para nada. Ahora el límite es 20
>    niveles y hay detección de ciclos; hay una prueba que lo fija
>    (`tests/unit/observability.test.ts`) y el script comprueba que el evento
>    conserva su `stacktrace`.
> 2. **La migración de `login_attempts` nunca se aplicó.** Venía de la Fase 45 y
>    faltaba en la base de desarrollo, así que el login devolvía 500
>    (`Table 'runosorno.login_attempts' doesn't exist`). Al usar el login
>    para las comprobaciones apareció de inmediato: ningún usuario, ni el
>    administrador, podía entrar. Aplicada con `npm run db:migrate`. **Queda
>    pendiente aplicarla en el MySQL de Aiven**, donde el fallo sería el mismo.
>
> **En `next dev` los eventos no salen.** Se capturan (lo confirma el log del SDK,
> con `Captured error event`) pero ningún envelope llega al colector, ni después
> de un `Sentry.flush()` que devuelve `true`; un `fetch` normal desde la misma
> ruta sí llega, así que no es la red. En el build de producción funciona. Por
> eso `verify-sentry.ts` compila y arranca `next start`: el servidor de
> desarrollo habría dado un falso negativo en las cuatro comprobaciones.
>
> **Verificación.** `npx tsx scripts/verify-sentry.ts` → **18/18**. El script
> levanta un colector falso en `127.0.0.1:8789`, compila la app, la arranca en el
> puerto 3111 con `SENTRY_DSN` apuntando al colector, inicia sesión de verdad y
> provoca tres errores reales: un fallo de render (comprueba el 500 y que se vea
> `error.tsx`), una excepción sin controlar en un Server Action y una llamada a
> `captureException`. Para provocarlos crea `app/sentry-probe/` y lo borra al
> terminar. Dos detalles que costaron tiempo: el directorio de la sonda **no**
> puede empezar por `_` (Next trata esas carpetas como privadas y no las
> compila), y con `cacheComponents` una página que lee `searchParams` necesita
> `export const instant = false`.
>
> Además comprueba que los eventos no llevan la cookie de sesión, ni correos, ni
> cabeceras HTTP; que un `ActionFailure` (error de negocio) no se reporta como
> incidencia; y que el stack trace llega intacto.
>
> **El SDK dentro de `workerd`.** Al no poder repetir la E2E dentro del runtime de
> Cloudflare (el build de OpenNext falla en Windows, ver más abajo), se comprobó
> con un Worker mínimo que inicializa el SDK con **las mismas opciones** de
> `sentry.server.config.ts` y captura una excepción: dentro de `workerd` el SDK
> carga y entrega el evento. Es la duda que importaba —que el SDK no usara
> `new Function` o una API que `workerd` no tenga— y queda cubierta.
>
> **Lo que no se pudo verificar aquí, y no es del código:** `npm run preview`
> falla en esta máquina con `EPERM ... symlink` al copiar el bundle del
> middleware. No lo provoca Sentry: falla igual con `mysql2`, `prettier` y
> `@aws-sdk`, y la causa es que Turbopack crea *junctions* para los paquetes
> externos y OpenNext las reproduce con `fs.symlinkSync`, que en Windows exige el
> Modo desarrollador o permisos de administrador. En Linux funciona. Para repetir
> la comprobación completa hay que activar el Modo desarrollador de Windows o
> compilar desde WSL.

---

# 45. Seguridad — Completación

- [x] 45.1 Verificar que todas las cookies de sesión tienen flags `HttpOnly`, `Secure`, `SameSite=Lax`
- [x] 45.2 Verificar que contraseñas se almacenan con argon2id (o bcrypt ≥ 12 rounds)
- [x] 45.3 Verificar que todas las queries usan Drizzle (parametrizadas, sin concatenación SQL)
- [x] 45.4 Verificar que no hay `dangerouslySetInnerHTML` con datos de usuario
- [x] 45.5 Implementar rate limiting en login (máx 5 intentos por IP en 15 min)
- [x] 45.6 Verificar que R2 bucket es privado y solo accesible con URLs firmadas — un GET sin firma devuelve 400 `InvalidArgument`
- [x] 45.7 Verificar que variables de entorno (secrets) no están en código fuente
- [x] 45.8 Verificar que `.env.local` está en `.gitignore`
- [x] 45.9 Verificar que el upload de avatar valida MIME type real y tamaño
- [x] 45.10 Verificar que CORS no está abierto innecesariamente (SSR lo maneja, pero verificar API routes)

> **Dos defectos reales encontrados al auditar.** Las ocho tareas de
> "verificar" eran en su mayoría correctas, pero dos no lo eran y no se veían
> leyendo el código.
>
> **1. Contraseñas con 10 rondas en tres sitios (45.2).** El perfil del usuario
> usaba 12 rondas —el mínimo que recomienda OWASP— pero el alta de coach, el
> alta de atleta y la regeneración de contraseña usaban 10. Ahora las tres usan
> la constante compartida `BCRYPT_ROUNDS` en `lib/security/hashing.ts`, de modo
> que no pueden volver a divergir.
>
> **Actualización (P1.5, 2026-10-19):** esas 10-12 rondas de bcrypt (`bcryptjs`)
> no cabían en el límite de CPU de Workers Free (10 ms), así que se migró a
> **PBKDF2-HMAC-SHA512 nativo vía WebCrypto** (210 000 iteraciones), con
> reescritura automática de los hashes heredados al hacer login. La constante
> `BCRYPT_ROUNDS` ya no existe; ver `lib/security/hashing.ts`.
>
> **2. El avatar no validaba nada (45.9).** `AVATAR_ACCEPTED_TYPES` estaba
> declarado en `avatar.service.ts` pero **nunca se usaba**, y `storeLocalAvatar`
> solo miraba el tamaño. Como el `Content-Type` lo declara el cliente,
> cualquiera podía subir un HTML con un script haciéndose pasar por imagen. Se
> añadió `sniffImageMime`, que decide por la **firma binaria** del archivo
> (`FF D8 FF`, `89 50 4E 47`, `RIFF....WEBP`), y se aplicó también al camino de
> R2: con subida directa al bucket, `confirmUpload` ahora lee el objeto y
> descarta el archivo si no es una imagen de verdad.
>
> **Rate limiting (45.5).** Va en la base de datos y no en memoria: en
> Cloudflare Workers cada instancia vive poco y hay miles por el edge, así que
> un contador en memoria dejaría pasar casi todos los intentos. Se suma con
> `INSERT ... ON DUPLICATE KEY UPDATE` para que dos peticiones simultáneas no
> se cuelen un intento cada una. El intento se cuenta **antes** de validar la
> contraseña: si solo se contara al fallar, un atacante vería cómo se le
> desbloquea la cuenta y podría dosificar el login. Y el login correcto borra
> los intentos de esa IP, para no castigar a quien se equivocó de verdad.
>
> **Un bug que encontró una prueba, no la revisión.** La clave de la ventana se
> armaba con la hora al minuto (`toISOString().slice(0, 16)`), así que el
> contador se reiniciaba **cada minuto**, no cada 15: el límite real era 5
> intentos por minuto. Ahora la clave es el índice de la ventana
> (`floor(ahora / 15min)`), con las ventanas alineadas a bloques fijos. La
> regresión queda cubierta en `tests/unit/security.test.ts`.
>
> **Consecuencia práctica del rate limiting:** en desarrollo todo el tráfico
> viene de `127.0.0.1` / `::1`, así que fallar cinco veces bloquea al propio
> programador durante 15 minutos. Por eso `verify-seguridad.ts` purga la tabla
> `login_attempts` antes de empezar.
>
> **Verificación:** `npx tsx scripts/verify-seguridad.ts` → 30/30, con login
> real, bloqueo comprobado en pantalla **y respaldado por una fila en la base**,
> y detección de firmas contra HTML, SVG, PDF, ZIP y un WAV disfrazado de WebP.
> Unitarias 139/139 (16 nuevas). La cookie `Secure` se comprueba en producción
> con `verify-produccion.ts`, porque en `http://localhost` el navegador
> descarta esas cookies y la app las apaga a propósito.

---

# 46. i18n y localización

- [x] 46.1 Instalar y configurar `next-intl` con locale `es-CL`
- [x] 46.2 Crear estructura de mensajes en `messages/es-CL.json` (textos de UI comunes)
- [x] 46.3 Configurar formateo de fechas con timezone `America/Santiago`
- [x] 46.4 Verificar que fechas y horas se muestran en formato chileno
- [x] 46.5 Verificar que números (distancias, tiempos) se formatean correctamente

> **Qué es y qué no es esta fase.** El MVP tiene **un solo idioma** (es-CL), así
> que la fase se centró en la parte que importa de verdad: que **todas** las
> fechas, horas y números salgan por un único módulo y en hora de Chile. No se
> migró el texto de los ~60 componentes a `t()`: con un solo idioma eso no cambia
> nada en pantalla y sería un refactor grande sobre una app que hoy funciona. Lo
> que sí queda es la infraestructura para hacerlo después (mensajes tipados,
> claves validadas por el compilador) y la regla documentada de pasar por
> `lib/i18n`.
>
> **Sobre `next-intl` y por qué no se metió en `proxy.ts`.** Se usa su API de bajo
> nivel: `createFormatter` para fechas, horas y números, y `createTranslator` para
> los mensajes. Ambas reciben la configuración explícita y no necesitan
> `NextIntlClientProvider` ni un `middleware` de enrutado por locale. Enrutar por
> idioma aquí habría significado **meter un middleware encima de otro**:
> `proxy.ts` ya verifica la sesión en cada petición, y para un solo locale no
> aporta nada. Si mañana hay un segundo idioma, se cambia `LOCALE`, se agregan
> los mensajes y se conecta el enrutado; el resto de la app ya formatea a través
> de este módulo.
>
> **El defecto que motivó la fase: fechas en UTC.** `toLocaleString()` y
> `new Intl.DateTimeFormat("es-CL", …)` **sin `timeZone` usan la zona del
> servidor**, y en Cloudflare Workers el servidor corre en UTC. Una notificación
> creada a las 21:30 en Santiago se mostraba a las 00:30 del día siguiente.
> Afectaba a `LogsTable` (servidor), a `RequestsPending` y al encabezado del
> calendario: `new Date(2026, 9, 1)` a medianoche en UTC es `2026-09-30T20:00` en
> Santiago, así que **octubre se titulaba septiembre**. Ahora todo pasa por
> `lib/i18n/format.ts`, que fija `America/Santiago` siempre, y los tests fijan
> los dos casos que rompían.
>
> **Lo que encontró la verificación, y estaba roto.** El script comprobó que las
> distancias no aparecieran con punto decimal (el formato inglés) y encontró
> **cuatro paneles de métricas que imprimían el número crudo**: `AthleteMetricsPanel`
> (`{weeklyLoad.km} km`), `TeamMetricsPanel` (`{averageLoadKm} km` y `{athlete.km}`)
> y `GroupMetricsPanel` (`{team.km}`). Ahora usan `formatDistance`/`formatNumber`.
> Aprovechando el mismo paso, los porcentajes que se armaban a mano con
> `${x}%` en doce sitios pasaron por `formatPercent`, que redondea a entero y
> respeta el locale.
>
> **Las abreviaturas del calendario dejaron de estar escritas a mano.** Eran la
> lista `["Lun", "Mar", "Mié", …]`, que es exactamente lo que hay que mantener
> sincronizado a mano en cuanto existe un segundo idioma. Ahora salen de `Intl`
> (`formatWeekdays()`) y arrancan en lunes, que es como el calendario está
> construido en el resto del proyecto (`getWeekStart` usa lunes).
>
> **Sobre el formato de salida.** `Intl` en `es-CL` escribe las fechas con guion
> (`15-10-2026`) y las abreviaturas sin año con barra (`15/10`). Es la
> convención de CLDR para ese locale y es la que la app ya mostraba, así que no
> se tocó para no cambiar el aspecto de todas las pantallas del MVP.
>
> **Verificación en tres planos.**
>
> - **Unitaria** (`tests/unit/i18n.test.ts`, 15 pruebas): instantes concretos que
>   en UTC y en Santiago dan días distintos (`2026-10-15T00:30Z` es el **14** en
>   Chile), el cambio de hora chileno (enero UTC-3, julio UTC-4 con el mismo
>   instante UTC), la fecha pura `"2026-10-15"` que `new Date()` dejaría en el
>   día anterior, los plurales de ICU y el formato numérico.
> - **Auditoría de código** (`scripts/verify-i18n.ts`): recorre `app/`,
>   `components/`, `lib/` y `emails/` y falla si alguien vuelve a escribir
>   `new Intl.…` o `toLocaleString()` fuera de `lib/i18n`, o si el calendario
>   vuelve a declarar sus días a mano. Es la garantía que mantiene esto dentro de
>   seis meses, cuando nadie se acuerde de la fase.
> - **Interfaz** (`scripts/verify-i18n.ts`): login real del atleta de demo; el
>   calendario muestra el mes en español y los siete encabezados de día; las
>   métricas muestran porcentajes y distancias con coma decimal.
>
> Resultado: `npx tsx scripts/verify-i18n.ts` → **12/12**. Unitarias **162/162**
> (147 → 162), lint 0 errores, build correcto, E2E **15/15**.

---

# 47. Rendimiento y optimización

- [x] 47.1 Verificar que las páginas principales son Server Components (no `"use client"` innecesario)
- [x] 47.2 Verificar que solo componentes interactivos son Client Components
- [x] 47.3 Verificar que las queries de DB tienen índices adecuados (EXPLAIN en MySQL)
- [x] 47.4 Verificar que el calendario carga datos de un mes (no todos los históricos)
- [x] 47.5 Verificar que las métricas no cargan todos los registros históricos para periodos largos (usar límites)
- [x] 47.6 Verificar `next build` no tiene warnings de tamaño de bundle excesivos
- [x] 47.7 Verificar imágenes (avatars) cargan con `loading="lazy"` donde corresponde
- [x] 47.8 Optimizar re-renders en componentes de calendario (memo donde sea necesario)

> **Las ocho tareas eran de "verificar", y tres estaban rotas.** 47.3, 47.5
> y 47.6 encontraron defectos reales; en 47.8 resultó que el `memo` que se
> pedía no habría servido de nada tal como estaba el componente.
>
> **Next 16 ya no imprime la tabla de tamaños (47.6).** Con Turbopack el
> `next build` sale sin la columna de JavaScript por ruta, así que no había
> nada que mirar. El script mide el bundle por su cuenta, y al hacerlo
> apareció lo grande que era.
>
> **`recharts` costaba 387 KB y no se pintaba en el servidor.** Las tres
> gráficas que quedaban (`ProgressChart`, `LoadChart`,
> `AthleteComplianceChart`) eran Client Components: el HTML que llegaba al
> navegador **no tenía ningún `<svg>`** y las gráficas aparecían recién
> después de hidratar. Ahora son SVG propio con `viewBox` y son componentes
> de servidor, siguiendo el camino que `DonutChart` ya había abierto en la
> Fase 39. Se desinstaló `recharts`: el bundle del cliente pasó de **2.627 KB
> a 1.574 KB** (−40 %), y `/athlete/metrics` descarga **37 KB** de
> JavaScript. Lo importante no es el tamaño sino que las gráficas ahora
> existen en el HTML de la primera respuesta.
>
> El detalle que evita repetir los problemas de `DonutChart`: **el texto no
> vive dentro del SVG**. El SVG se estira con `preserveAspectRatio="none"` y
> los rótulos de los ejes son HTML posicionados con porcentajes sobre la misma
> caja. Con el texto dentro del SVG, en un móvil de 375 px se leería a la
> mitad de tamaño.
>
> **Un error que solo apareció en consola.** La primera versión pasaba la
> traza de la línea en el atributo `points` de un `<polyline>`, que espera
> pares de coordenadas y no un `M … L …`. El navegador avisaba por consola
> (`<polyline> attribute points: Expected number`) y la línea no se
> dibujaba: la página se veía bien y la gráfica no estaba. Ahora es un
> `<path d=…>`, y `verify-rendimiento.ts` falla si las páginas revisadas
> dejan **cualquier** error en la consola.
>
> **`audit_logs` no tenía ningún índice (47.3).** `/admin/logs` filtra por
> rango de fechas, por usuario y por acción y ordena por `created_at DESC`,
> así que MySQL recorría la tabla entera y ordenaba el resultado en memoria
> (`EXPLAIN`: `type = ALL`, `key = NULL`, `Using where; Using filesort`).
> Es la tabla que más crece, porque cada acción crítica inserta una fila.
> Se le añadieron tres índices (`created_at`, `(user_id, created_at)`,
> `(action, created_at)`) y se comparó con datos a escala: con 1.058 filas la
> misma consulta pasó de **0,88 ms escaneando a 0,44 ms con índice**, sin
> `filesort`. En `notifications` el índice `(user_id, is_read)` obligaba a
> ordenar aparte; con `created_at` al final desaparece.
>
> **Las métricas se traían el histórico entero (47.5).** `loadJoinedRows`
> filtraba el periodo **en memoria**, después de pedirle a la base todas las
> asignaciones de todos los atletas del equipo, de toda la historia. Ahora
> son tres consultas acotadas: la del periodo, la de una ventana de 21 días
> para las alertas, y un `MAX(session_date)` por atleta. Medido con un atleta
> de 2.600 días de historial: **13.862 filas antes, 30 después**.
>
> Eso obligó a tocar `detectAlerts`, que ahora acepta la fecha real del
> último registro por atleta. Sin eso, un atleta con el último registro hace
> tres meses saldría como "no tiene registros de sesiones" en vez de "lleva
> 90 días sin registrar sesiones": la ventana ya no alcanza su último
> registro. Hay cuatro pruebas unitarias que fijan este comportamiento.
>
> **`MAX(session_date)` no devuelve un `Date`.** Las columnas `date` las
> devuelve mysql2 como `Date`, pero al venir de una función de agregación el
> driver no aplica el conversor y devuelve texto. `tsx` no valida tipos, así
> que esto reventó en ejecución (`value.toISOString is not a function`) y no
> en el compilador.
>
> **La migración `0002` no se podía aplicar en el orden que generó
> drizzle-kit.** MySQL necesita un índice sobre `notifications.user_id` para
> la clave foránea, y ese índice era justamente el que la migración borraba
> primero: `ERROR 1553: Cannot drop index … needed in a foreign key
> constraint`. Los índices nuevos empiezan igual por `user_id`, así que la
> migración se reescribió para crearlos primero y borrar el viejo al final.
>
> **`memo` en el calendario (47.8) no habría servido de nada.** Cada
> `CalendarDay` recibía `onClick={() => onDayClick(dateISO, item)}`: una
> flecha nueva en cada render, así que la prop cambiaba siempre y React
> repintaba los 31 días igual. Ahora reciben un único `onSelect` creado con
> `useCallback`, y el índice fecha → sesión va en `useMemo`. Medido con un
> `MutationObserver` sobre el grid: seleccionar un día pasa de 165 a **1
> mutación** en el DOM.
>
> `DroppableDay` **no** lleva `memo` a propósito: su `children` es un
> elemento que el padre crea en cada render, así que la referencia siempre
> cambia y `memo` daría la impresión de estar optimizado sin estarlo.
>
> **Avatares (47.7).** El del header y el del perfil se piden con
> `loading="eager"` (siempre visibles); los del listado de atletas, que son
> decenas, con `loading="lazy"`, más `decoding="async"`.
>
> **`FeedbackThread` ya no es Client Component.** No tiene estado, ni
> eventos, ni importa nada del navegador: es markup con un `"use client"`
> olvidado.
>
> **Dos fallos anteriores, ajenos a esta fase, aparecieron al correr la
> suite.** No los causó la Fase 47, pero quedaban documentados y se
> corrigieron:
>
> 1. **`tests/unit/i18n.test.ts` fallaba en 3 casos desde antes de la
>    fase.** No por el proyecto: Node 24.11 trae ICU 77.1, que escribe
>    `p.\u00A0m.` con espacio duro entre "p." y "m.", donde las versiones
>    anteriores de ICU ponían un espacio normal. Las tres pruebas comparaban
>    el texto exacto y fallaban por un detalle de ICU, no por la hora de
>    Chile. Ahora normalizan el espacio y comparan los caracteres.
> 2. **`verify-settings.ts` fallaba en 34.10 y 34.11 por el paso del
>    tiempo.** Buscaba la sesión completada más reciente del seed de
>    demostración; cuando pasaron las 48 h quedó fuera de la ventana de
>    edición, el formulario salió en solo lectura y no había contra qué
>    comprobar nada. Ahora el script **crea la sesión que necesita** (ayer,
>    con el registro de hace 5 horas) y la borra al terminar. De paso, la
>    comprobación de "el servicio rechaza un motivo no configurado" pasaba
>    **por el motivo equivocado**: usaba una sesión vieja y `markNotDone`
>    fallaba antes por la ventana de edición, así que el motivo no llegó a
>    probarse nunca. Ahora usa la sesión editable y falla de verdad por el
>    motivo.
>
> **Verificación** (`npx tsx scripts/verify-rendimiento.ts` → **25/25**).
> El script siembra 2.600 asignaciones de prueba para que el `EXPLAIN` se
> mida sobre un volumen realista — con la base de demostración (284 filas)
> el optimizador elige planes distintos — y las borra al terminar. Comprueba
> por código que las 32 páginas siguen siendo RSC, que no queda ningún
> Client Component sin motivo, que las gráficas no importan una librería y
> que el calendario mantiene `memo` con props estables; con `EXPLAIN` que
> el calendario, las métricas, `/admin/logs` y la campanita usan índice; y
> en el navegador el tamaño del JavaScript, que las gráficas vienen en el
> HTML y que los avatares van diferidos donde toca.
>
> Además, sin regresiones: unitarias **182/182** (162 → 182), E2E **15/15**,
> `verify-roles` 60/60, `verify-dashboards` 19/19, `verify-validations`
> 18/18, `verify-audit-logs` 23/23, `verify-settings` 15/15,
> `verify-responsive` 31/31, `verify-i18n` 12/12, lint 0 errores, build
> correcto. Restos: 0.

---

# 48. Accesibilidad

- [x] 48.1 Verificar navegación por teclado en formularios y botones principales
- [x] 48.2 Verificar contraste de colores adecuado (WCAG AA) en estados del calendario
- [x] 48.3 Verificar que iconos tienen `aria-label` o `alt` text
- [x] 48.4 Verificar que modales/paneles pueden cerrarse con Escape
- [x] 48.5 Verificar que formularios tienen labels asociados a inputs
- [x] 48.6 Verificar que la campanita de notificaciones tiene aria-label descriptivo

> **Verificación** (`npx tsx scripts/verify-accesibilidad.ts` → **21/21**).
> El motor es **axe-core 4.14**, que ya venía como dependencia de
> `eslint-config-next`: escribir el contraste a mano habría sido medir mal.
> El script recorre 21 páginas de los tres roles y falla si queda **alguna**
> violación de WCAG 2.0/2.1 A y AA o de *best practice*. Antes de la fase eran
> **9 tipos de violación en unos 300 nodos**; ahora **0**.
>
> **El contraste no se arregla con `text-*` de Tabler (48.2).** Sus
> utilidades de color llevan `!important`, y `.bg-*-lt` fija además el color
> del texto, así que **ninguna** combinación `bg-*-lt` + `text-*` de Tabler
> llega a 4,5:1. Se definieron en `globals.css` las familias `text-*-ink`: el
> color de Tabler mezclado con negro en `oklab` hasta ~5:1. Se tocaron 33
> badges en 19 archivos, incluidos los que se pintan con `bg-${color}-lt` en
> tres páginas de dashboard. Los `Alert` se resuelven por otra vía: Tabler
> deriva el color de `--tblr-alert-variant-color`, que se redefinió por
> variante.
>
> **El estado del calendario no puede ser solo color (48.2, WCAG 1.4.1).**
> Cada estado tiene ahora una forma distinta —`border-radius`, triángulo,
> anillo o hueco— resuelta con `[data-state=…]` en CSS, y `DAY_STATE_META`
> solo guarda la familia de color.
>
> **`aria-label` en el día del calendario rompía WCAG 2.5.3 (48.3).** axe
> marking `label-content-name-mismatch`: el nombre accesible ("1 de octubre,
> completada") no contenía el texto visible concatenado ("1CompletadaTempo").
> Un `<button>` ya toma su texto visible como nombre, así que la solución fue
> **quitar el `aria-label`** y añadir un `<span className="visually-hidden">`
> con la etiqueta de estado. 103 nodos → 0.
>
> **Los modales eran 12 copias de lo mismo (48.4).** Cada uno repetía el
> `div.modal` + `role="dialog"` + `.modal-backdrop` a mano, y ninguno cerraba
> con `Escape` ni movía el foco. Ahora todos pasan por
> `components/ui/ModalShell.tsx`, que además hace la trampa de foco, pone el
> foco inicial y **lo devuelve al elemento que abrió el diálogo**. Se migraron
> de uno en uno con ediciones puntuales, no con un script: un reemplazo por
> expresiones regulares dejó 0 de 10 bien.
>
> **Los errores de los formularios no se anunciaban (48.5).** Los 36 campos con
> `.invalid-feedback` lo pintaban en rojo y nada más: cero `aria-invalid` y
> cero `aria-describedby` en todo el proyecto. Ahora cada control lleva
> `aria-invalid` y apunta con `aria-describedby` al `id` del mensaje. En
> `SettingsForms` el campo lo escribe el llamador (con su `register`), así que
> el componente `Field` se lo engancha con `cloneElement`.
>
> **Los encabezados no tenían jerarquía.** Los títulos de página eran `<h2>`
> (41 en 30 archivos) y no había ningún `<h1>` en las páginas de la app: ahora
> sí, con la clase `h1.page-title` para el aspecto. Los `card-title` pasaron de
> `<h3>` a `<h2>` (44) y de `<h4>` a `<h3>` (3), los `modal-title` de `<h5>` a
> `<h2>` (12) y el `alert-title` de `<h4>` a `<h3>`; los que suben de rango
> llevan la clase `h4`/`h5` de Tabler para que no se note el cambio.
>
> **La campanita (48.6).** El `aria-label` decía "Notificaciones" y el contador
> visible (5) quedaba fuera del nombre accesible. Ahora es "Notificaciones, 5
> sin leer", con `aria-haspopup`, `aria-expanded`, `Escape` que cierra y
> devuelve el foco, y el icono y el badge con `aria-hidden`.
>
> De paso: `<main id="contenido" tabIndex={-1}>` en los dos layouts y el
> enlace de salto **dentro** de `<main>` (fuera de él quedaba antes del
> contenido al que salta), `tabIndex` + `role="region"` en el contenedor con
> scroll de `/admin/logs`, y `aria-pressed` en vez de `role="tablist"` en
> `/coach/templates`, donde no hay panels asociados.
>
> Además, sin regresiones: unitarias **182/182**, E2E **15/15**,
> `verify-empty-states` 11/11, `verify-roles` 60/60, `verify-dashboards` 19/19,
> `verify-validations` 18/18, `verify-settings` 15/15, `verify-responsive`
> 31/31, `verify-i18n` 12/12, `verify-rendimiento` 25/25, lint 0 errores, build
> correcto. `verify-empty-states` fallaba en `/notifications` porque cualquier
> ejecución anterior que aprueba la solicitud del coach de demo le deja un
> aviso y la lista ya no está vacía: ahora el script purga sus notificaciones
> antes de comprobar el estado vacío.

---

# 49. Documentación necesaria

- [x] 49.1 Actualizar `README.md` con: descripción del proyecto, stack, setup, comandos dev/build/test
- [x] 49.2 Documentar variables de entorno requeridas en `.env.example` — se quitaron `LUCIA_SECRET` y `R2_PUBLIC_URL`, que ya no se usan
- [x] 49.3 Documentar proceso de setup de servicios externos: MySQL de producción, Cloudflare, Resend, R2, Sentry — `docs/setup-servicios.md`
- [x] 49.4 Documentar flujo de deploy (GitHub → Cloudflare Workers) — `docs/despliegue.md`
- [x] 49.5 Documentar estructura de DB (schema referenciado) — `docs/base-de-datos.md`

---

# 50. Revisión final y preparación del MVP

- [x] 50.1 Revisar que todas las funcionalidades de `specs/mvp.md` Sección 11 "Incluido en el MVP" están implementadas (checklist de 20 funcionalidades) — `docs/revision-mvp.md`
- [x] 50.2 Revisar que los criterios de aceptación de `specs/mvp.md` Sección 10 se cumplen (checklist completo) — se cerró el hueco de mantenimiento (limpieza de avatares huérfanos)
- [x] 50.3 Revisar que los flujos principales de `specs/mvp.md` Sección 5 funcionan de extremo a extremo (8 flujos) — 1–6 en E2E; 7–8 por verificadores
- [x] 50.4 Verificar que NO se implementaron funcionalidades fuera del MVP (lista "Fuera del MVP" de Sección 11)
- [x] 50.5 Ejecutar `npm run lint` → sin errores
- [x] 50.6 Ejecutar `npm run build` → build exitoso sin errores
- [x] 50.7 Ejecutar `npm run test` → todos los tests unitarios pasan
- [x] 50.8 Ejecutar `npx playwright test` → todos los tests E2E pasan
- [x] 50.9 Hacer deploy final a Cloudflare Workers — pipeline en verde; repetir al cerrar la entrega
- [ ] 50.10 Verificar flujo completo en producción: admin crea coach → coach crea team y plantilla → coach planifica → atleta registra → coach revisa y comenta → métricas se calculan → notificaciones llegan
- [ ] 50.11 Revisar que el sitio es responsive en dispositivos reales (mobile, tablet)
- [x] 50.12 Revisar que no hay errores en consola del navegador — local y producción (10 rutas, 0 5xx)
- [ ] 50.13 Revisar que no hay errores en Sentry
- [ ] 50.14 Tag `v0.1.0-mvp` en Git
- [ ] 50.15 MVP listo para entrega

---

## Resumen de progreso

| Fase | Tareas | Completadas |
|------|--------|-------------|
| 1. Preparación del proyecto | 10 | 10 |
| 2. Layout y estructura base | 10 | 10 |
| 3. Base de datos y modelos | 24 | 24 |
| 4. Autenticación y sesión | 16 | 16 |
| 5. Permisos y roles | 9 | 9 |
| 6. Server Actions base | 6 | 6 |
| 7. Admin — Coaches | 17 | 17 |
| 8. Email (Resend) | 12 | 12 |
| 9. Admin — Grupos | 22 | 22 |
| 10. Coach — Unirse a grupo | 5 | 5 |
| 11. Coach — Teams | 19 | 19 |
| 12. Gestión de atletas | 17 | 17 |
| 13. Coach — Plantillas | 27 | 27 |
| 14. Plantillas oficiales | 7 | 7 |
| 15. Planificación semanal | 18 | 18 |
| 16. Calendario — Base | 8 | 8 |
| 17. Calendario — Atleta | 6 | 6 |
| 18. Calendario — Coach | 8 | 8 |
| 19. Drag & drop y planificación | 15 | 15 |
| 20. Registro de sesiones | 16 | 16 |
| 21. Formulario registro (UI) | 10 | 10 |
| 22. Feedback en sesiones | 10 | 10 |
| 23. Notificaciones in-app | 17 | 17 |
| 24. Notificaciones email | 8 | 8 |
| 25. Métricas — Cálculo | 15 | 15 |
| 26. Métricas — Servicio | 10 | 10 |
| 27. Métricas — Interfaz | 15 | 15 |
| 28. Métricas fisiológicas | 7 | 7 |
| 29. Avatar | 19 | 19 |
| 30. Dashboard por roles | 8 | 8 |
| 31. Menú lateral por rol | 7 | 7 |
| 32. Director Técnico | 8 | 8 |
| 33. Exportación | 13 | 13 |
| 34. Configuración global | 12 | 12 |
| 35. Logs de auditoría | 10 | 10 |
| 36. Dashboard Admin stats | 4 | 4 |
| 37. Perfil de usuario | 7 | 7 |
| 38. Estados vacíos y errores | 8 | 8 |
| 39. Responsive | 8 | 8 |
| 40. Validaciones (completación) | 15 | 15 |
| 41. Pruebas unitarias | 15 | 15 |
| 42. Pruebas E2E | 12 | 12 |
| 43. Cloudflare | 13 | 12 |
| 44. Sentry | 6 | 5 |
| 45. Seguridad | 10 | 10 |
| 46. i18n y localización | 5 | 5 |
| 47. Rendimiento | 8 | 8 |
| 48. Accesibilidad | 6 | 6 |
| 49. Documentación | 5 | 5 |
| 50. Revisión final | 15 | 10 |
| **TOTAL** | **~578** | **574** |

---

## Herramientas de verificación

Las tareas marcadas `[x]` que dicen "Verificar" se comprobaron de forma automatizada contra la base de datos, no solo por lectura de código.

| Script | Qué comprueba |
|--------|---------------|
| `npm run db:seed:demo` | Crea un escenario completo: grupo, 3 coaches, 3 teams, 5 atletas, 8 semanas de planificaciones y registros, alertas y feedback |
| `npx tsx scripts/verify-roles.ts` | Login real por rol, rutas accesibles y bloqueadas, y items correctos del menú lateral (Fases 30-31) |
| `npx tsx scripts/verify-dashboards.ts` | Contrasta los números renderizados contra la DB: contadores, cumplimiento, alertas, permisos de lectura y envío de anuncios (Fases 30, 32, 36) |
| `npx tsx scripts/verify-login.ts` | Credenciales inválidas muestran mensaje genérico sin revelar si el email existe (Fases 4.13, 40.3) |
| `npx tsx scripts/verify-exports.ts` | Descarga los archivos por HTTP y valida firmas, permisos por rol y respuesta sin datos (Fase 33) |
| `npx tsx scripts/verify-export-files.ts` | Guarda los archivos en disco y valida que el PDF, XLSX y CSV tengan estructura y datos reales (Fase 33) |
| `npx tsx scripts/verify-exports-ui.ts` | Página `/exports` por rol y descarga real iniciada desde el botón (Fase 33) |
| `npx tsx scripts/verify-settings.ts` | Comprueba que la configuración se aplique de verdad: límites leídos de la DB, motivos reflejados en el select del atleta, ventana de edición cambiante y acceso restringido al admin (Fase 34) |
| `npx tsx scripts/verify-audit-logs.ts` | Genera acciones reales desde la interfaz (crear equipo, aprobar solicitud, trasladar atleta) y comprueba que el log guarde usuario, detalles e IP; valida los filtros por fecha, usuario y acción (Fase 35) |
| `npx tsx scripts/verify-profile.ts` | Perfil y cambio de contraseña: valida los formularios, que la nueva clave sirva y la anterior no, y que al cambiar queden revocadas todas las sesiones menos la actual (Fase 37) |
| `npx tsx scripts/verify-empty-states.ts` | Estados vacíos con mensaje orientativo y acción, errores de validación bajo su campo, `Alert` de negocio y `ConfirmDialog` en acciones destructivas (Fase 38) |
| `npx tsx scripts/verify-responsive.ts` | Mide la interfaz en 375 / 768 / 1400 px: menú lateral como panel en móvil, área de toque del calendario, scroll horizontal de tablas, ancho de los campos, tamaño real de las gráficas y arrastre con eventos táctiles (Fase 39) |
| `npx tsx scripts/verify-validations.ts` | Audita las 54 Server Actions (sesión + validación con Zod) y comprueba con datos reales los límites, la ventana de edición, el registro futuro, el RPE, el motivo "Otro", la plantilla vacía, la solicitud duplicada y la pantalla de error (Fase 40) |
| `npm run test:e2e` | Suite de Playwright en `e2e/`: login por rol, credenciales inválidas, logout, y los flujos completos de admin, coach y atleta con verificación en la base de datos (Fase 42) |
| `npm run test:coverage` | Vitest con umbral obligatorio: 80 % en `lib/metrics/` y `lib/permissions/`, 90 % en `lib/auth/guards.ts`, 80 % en `session.service.ts` (Fase 41) |
| `npx opennextjs-cloudflare build` | Compila el bundle de Cloudflare Workers. A diferencia de `npm run build`, aquí se detectan incompatibilidades entre Next y el adaptador (Fase 43) |
| `BASE_URL=http://127.0.0.1:8787 npx playwright test` | Corre la **misma** suite E2E dentro de `workerd`, con `opennextjs-cloudflare preview` en el puerto 8787. Es la única forma de detectar los fallos que solo existen en el runtime de Cloudflare: `new Function` prohibido, I/O que no cruza peticiones y rutas que dan 500 en todas las peticiones (Fase 43) |
| `npx tsx scripts/verify-produccion.ts` | Login real en el Worker desplegado: llega al dashboard, la cookie de sesión sale `Secure` + `HttpOnly`, la sesión sobrevive a una recarga (o sea, la base de Aiven guardó de verdad), una ruta protegida sin sesión redirige y no aparece ningún 5xx (Fase 43) |
| `npx tsx scripts/verify-seguridad.ts` | Las 10 tareas de seguridad: flags de la cookie, hashing, ausencia de SQL concatenado y de `dangerouslySetInnerHTML`, rate limiting (límite, ventana, bloqueo real comprobado en la base), firmas de imagen contra HTML/SVG/PDF/ZIP disfrazados, secretos fuera del código y CORS cerrado (Fase 45) |
| `npx tsx scripts/verify-sentry.ts` | Levanta un colector falso, compila la app y provoca tres errores reales (render, Server Action y `captureException`): comprueba que llegan a Sentry con su stack trace, sin cookie ni correos ni cabeceras, y que la configuración de build de los source maps depende del token (Fase 44) |
| `npx tsx scripts/verify-i18n.ts` | Audita que ninguna fecha se formatee fuera de `lib/i18n` (con `timeZone` fijo, nada sale en UTC) y que el calendario no declare sus días a mano; en la interfaz comprueba el mes y los encabezados en español, los porcentajes y las distancias con coma decimal (Fase 46) |
| `npx tsx scripts/verify-rendimiento.ts` | Las ocho tareas de la Fase 47: audita que las 32 páginas sigan siendo RSC y que no quede ningún Client Component sin motivo; mide el JavaScript que descarga el navegador y comprueba que las gráficas vienen en el HTML; con `EXPLAIN` sobre 2.600 asignaciones de prueba, que el calendario, las métricas, `/admin/logs` y la campanita usan índice; que la ventana de métricas (30 filas) es una fracción del histórico (13.862); que los avatares de listados van diferidos; y que ninguna de esas páginas deja errores en consola (Fase 47) |
| `npx tsx scripts/verify-accesibilidad.ts` | Las seis tareas de la Fase 48 con **axe-core** sobre 21 páginas de los tres roles (WCAG 2.0/2.1 A y AA y *best practice*): enlace de salto, alcance con teclado, tabla con scroll, `Escape` en los modales con devolución del foco, contraste medido de los estados del calendario, estados distinguibles sin depender del color, etiquetas de todos los controles visibles y `aria-invalid` + `aria-describedby` en un error real de validación, y nombre accesible de la campanita (Fase 48) |

Los scripts requieren el servidor de desarrollo corriendo (`npm run dev`),
salvo `verify-sentry.ts`, que compila la app y arranca su propio servidor porque
necesita el `SENTRY_DSN` desde el arranque.

Los datos de demostración se limpian con `npm run db:seed:demo:clean`, que
deja la base exactamente como estaba antes del seed.




