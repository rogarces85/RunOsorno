# Tareas del MVP — RunOsorno

Hoja de ruta de implementación del MVP. Generada a partir de `AGENTS.md`, `specs/mvp.md` y `plan/mvp.md`.

Cada tarea usa formato checkbox. Marcar `[x]` al completar. Las tareas están ordenadas por dependencias: una tarea que requiere otra debe aparecer después.

---

# 1. Preparación del proyecto

- [x] 1.1 Crear proyecto Next.js 14+ con App Router, TypeScript y `npm create next-app@latest`
- [x] 1.2 Configurar estilos Tabler: eliminar Tailwind e importar CSS de `@tabler/core` (verificar integración)
- [x] 1.3 Configurar ESLint + Prettier con reglas del proyecto
- [x] 1.4 Configurar `tsconfig.json` con path aliases (`@/` → raíz del proyecto)
- [x] 1.5 Crear estructura base de carpetas según `plan/mvp.md` Sección 3 (`app/`, `components/`, `lib/`, `db/`, `emails/`, `tests/`)
- [x] 1.6 Instalar Tabler (`@tabler/core` + `@tabler/icons-react`) y verificar que renderiza un componente básico
- [x] 1.7 Crear `.env.local` con variables de entorno vacías (`DATABASE_URL`, Resend API key, R2 credentials, Lucia secret)
- [x] 1.8 Crear `.gitignore` completo (node_modules, .env.local, .next, etc.)
- [x] 1.9 Inicializar repositorio Git y hacer commit inicial
- [x] 1.10 Crear `README.md` con instrucciones de setup (install, dev, build)

---

# 2. Layout y estructura de interfaz base

- [x] 2.1 Crear root layout `app/layout.tsx` con `<html lang="es-CL">`, metadata base, importación de `globals.css`
- [x] 2.2 Crear `app/globals.css` con imports de `@tabler/core` y variables de tema Tabler
- [x] 2.3 Crear route group `app/(auth)/` con layout minimalista (sin sidebar)
- [x] 2.4 Crear route group `app/(app)/` con layout de aplicación: `AppShell` de Tabler con sidebar y header
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

- [ ] 34.1 Crear servicio con `getSetting(key)` y `updateSetting(key, value)` — lectura/escritura de tabla `settings`
- [ ] 34.2 Crear esquemas Zod para cada tipo de setting (límites, motivos, tipos, email)
- [ ] 34.3 Crear Server Actions: `updateSetting` (solo admin)
- [ ] 34.4 Crear página `app/(app)/admin/settings/page.tsx` con Tabs: Límites, Motivos, Tipos de sesión, Email
- [ ] 34.5 Tab "Límites": form para `max_teams_per_coach`, `max_athletes_per_team`, `edit_window_hours`, `alert_no_record_days`
- [ ] 34.6 Tab "Motivos no realizada": lista editable de motivos (agregar, editar, eliminar)
- [ ] 34.7 Tab "Tipos de sesión": lista de tipos base (agregar, editar, eliminar)
- [ ] 34.8 Tab "Email": form para `email_from`, edición de templates HTML de email
- [ ] 34.9 Verificar: admin edita límites → los límites se aplican en las acciones correspondientes
- [ ] 34.10 Verificar: admin edita motivos → aparecen en el select del atleta
- [ ] 34.11 Verificar: admin edita `edit_window_hours` → cambia la ventana de edición de registros
- [ ] 34.12 Verificar: no-admin no puede acceder a `/admin/settings`

---

# 35. Logs de auditoría (Admin)

- [ ] 35.1 Crear `audit.service.ts` con `log({ userId, action, entityType, entityId?, details?, ipAddress })` — inserta en `audit_logs`
- [ ] 35.2 Integrar `audit.log()` en todas las acciones críticas: crear/editar/eliminar usuarios, grupos, teams, atletas, plantillas, asignaciones, solicitudes, exports, config
- [ ] 35.3 Crear servicio con `getLogs(filters)` — listado con filtros por fecha, usuario, tipo de acción
- [ ] 35.4 Crear página `app/(app)/admin/logs/page.tsx` — tabla de logs con filtros
- [ ] 35.5 Crear componente `LogsTable` — tabla con columnas: fecha, usuario, acción, entidad, detalles, IP
- [ ] 35.6 Capturar IP del request: `request.headers.get('cf-connecting-ip')` o `x-forwarded-for`
- [ ] 35.7 Verificar: crear un coach genera log con `action='coach_created'`
- [ ] 35.8 Verificar: aprobar solicitud genera log con `action='request_approved'`
- [ ] 35.9 Verificar: transferir atleta genera log con datos del traslado
- [ ] 35.10 Verificar: admin puede filtrar logs por fecha y usuario

---

# 36. Dashboard Admin — Stats

- [x] 36.1 Crear servicio con `getAdminStats()` — conteo de coaches activos/inactivos, grupos, atletas, solicitudes pendientes
- [x] 36.2 Crear componente `StatsCards` — grid de cards con número + label
- [x] 36.3 Integrar en `app/(app)/admin/dashboard/page.tsx`
- [x] 36.4 Verificar: contadores reflejan datos reales de la DB

---

# 37. Página de perfil de usuario (todos los roles)

- [ ] 37.1 Crear página `app/(app)/profile/page.tsx` — datos personales, avatar, cambio de contraseña
- [ ] 37.2 Crear componente `ProfileForm` — nombre y email (read-only o editable según configuración)
- [ ] 37.3 Crear componente `PasswordChange` — contraseña actual, nueva, confirmación (React Hook Form + Zod)
- [ ] 37.4 Crear Server Action `changePassword` — verifica contraseña actual, actualiza hash, invalida sesiones anteriores
- [ ] 37.5 Integrar `AvatarUpload` en página de perfil
- [ ] 37.6 Verificar: usuario cambia contraseña → debe usar la nueva en el próximo login
- [ ] 37.7 Verificar: usuario actualiza avatar → se refleja en header inmediatamente

---

# 38. Estados vacíos y mensajes de error (UI)

- [ ] 38.1 Crear componente `EmptyState` en `components/ui/EmptyState.tsx` — icono + mensaje + acción opcional
- [ ] 38.2 Aplicar `EmptyState` a listados vacíos: "No hay coaches registrados", "No hay atletas en este team", "No hay plantillas", "No hay notificaciones"
- [ ] 38.3 Crear componente `Alert` wrapper de Tabler para mensajes de error y éxito
- [ ] 38.4 Integrar mensajes de error de Server Actions en formularios (field-level errors)
- [ ] 38.5 Verificar: cada listado vacío muestra mensaje orientativo con acción posible
- [ ] 38.6 Verificar: errores de validación se muestran bajo el campo correspondiente
- [ ] 38.7 Verificar: errores de negocio muestran `Alert` con mensaje claro
- [ ] 38.8 Verificar: acciones destructivas piden confirmación con `ConfirmDialog`

---

# 39. Responsive (mobile, tablet, desktop)

- [ ] 39.1 Verificar login responsive en mobile, tablet, desktop
- [ ] 39.2 Verificar sidebar colapsa en mobile (hamburger menu de Tabler)
- [ ] 39.3 Verificar calendario es usable en mobile (celdas legibles, tap para detalle)
- [ ] 39.4 Verificar tablas/listados son responsive (scroll horizontal o layout adaptado)
- [ ] 39.5 Verificar formularios son usables en mobile (inputs full width)
- [ ] 39.6 Verificar gráficas de métricas se adaptan al tamaño de pantalla
- [ ] 39.7 Verificar drag & drop funciona en tablet (o fallback a click-to-assign)
- [ ] 39.8 Corregir cualquier problema de responsive detectado

---

# 40. Validaciones y manejo de errores (completación)

- [ ] 40.1 Revisar que todas las Server Actions validan con Zod antes de ejecutar
- [ ] 40.2 Revisar que todas las Server Actions verifican sesión y permisos
- [ ] 40.3 Verificar que `login` no revela si el email existe (mensaje genérico)
- [ ] 40.4 Verificar que sesión expirada redirige a login con mensaje
- [ ] 40.5 Verificar email duplicado → "Ya existe un usuario con este email"
- [ ] 40.6 Verificar límite de teams por coach → mensaje de error
- [ ] 40.7 Verificar límite de atletas por team → mensaje de error
- [ ] 40.8 Verificar ventana de edición de registro → mensaje correcto fuera de ventana
- [ ] 40.9 Verificar registro de sesión futura → bloqueado
- [ ] 40.10 Verificar RPE fuera de rango → validación en cliente y servidor
- [ ] 40.11 Verificar motivo "Otro" vacío → validación
- [ ] 40.12 Verificar plantilla vacía → no se guarda
- [ ] 40.13 Verificar solicitud duplicada a grupo → bloqueada
- [ ] 40.14 Verificar copiar semana sin datos → mensaje "No hay semana anterior"
- [ ] 40.15 Verificar error inesperado → pantalla `error.tsx` con opción volver al inicio

---

# 41. Pruebas unitarias (Vitest)

- [ ] 41.1 Instalar y configurar Vitest (`vitest`, `@vitest/coverage-v8`)
- [ ] 41.2 Configurar `vitest.config.ts` con path aliases
- [ ] 41.3 Tests de `lib/metrics/compliance.ts` — casos: 100%, 50%, 0%, con datos vacíos
- [ ] 41.4 Tests de `lib/metrics/load.ts` — suma correcta de km/tiempo, con/sin FC
- [ ] 41.5 Tests de `lib/metrics/progression.ts` — serie temporal correcta
- [ ] 41.6 Tests de `lib/metrics/distribution.ts` — porcentajes correctos
- [ ] 41.7 Tests de `lib/metrics/streaks.ts` — racha con interrupción, racha vacía, racha larga
- [ ] 41.8 Tests de `lib/metrics/heart-rate.ts` — zonas FC con datos de prueba, TRIMP
- [ ] 41.9 Tests de `lib/metrics/alerts.ts` — genera alerta cuando corresponde, no genera cuando no
- [ ] 41.10 Tests de `session.service.canEditRecord` — dentro/fuera de ventana, fecha futura, usuario incorrecto
- [ ] 41.11 Tests de validaciones Zod — esquemas válidos e inválidos
- [ ] 41.12 Tests de `lib/auth/guards.ts` — permisos por rol
- [ ] 41.13 Tests de `lib/permissions/index.ts` — todas las funciones de permiso
- [ ] 41.14 Ejecutar `npm run test` → todos los tests pasan
- [ ] 41.15 Configurar cobertura mínima (≥ 80% en `lib/metrics/` y `lib/permissions/`)

---

# 42. Pruebas E2E (Playwright)

- [ ] 42.1 Instalar y configurar Playwright (`@playwright/test`)
- [ ] 42.2 Configurar `playwright.config.ts` con URL base (dev server o preview)
- [ ] 42.3 Test E2E: login con credenciales válidas → redirige a dashboard según rol
- [ ] 42.4 Test E2E: login con credenciales inválidas → muestra error genérico
- [ ] 42.5 Test E2E: logout → redirige a login, rutas protegidas bloqueadas
- [ ] 42.6 Test E2E flujo Admin: crear coach → crear grupo → aprobar solicitud → asignar Director Técnico
- [ ] 42.7 Test E2E flujo Coach: crear team → crear plantilla → asignar a atleta en calendario
- [ ] 42.8 Test E2E flujo Atleta: ver calendario → registrar sesión → ver métricas
- [ ] 42.9 Test E2E flujo Coach: ver registro del atleta → dejar feedback → atleta ve notificación
- [ ] 42.10 Test E2E: atleta marca sesión "no realizada" con motivo
- [ ] 42.11 Test E2E: campanita muestra notificaciones no leídas
- [ ] 42.12 Ejecutar `npx playwright test` → todos los tests pasan

---

# 43. Integración y configuración Cloudflare

- [ ] 43.1 Instalar `@cloudflare/next-on-pages` y `wrangler`
- [ ] 43.2 Configurar `wrangler.toml` con nombre del proyecto, R2 bucket binding, Hyperdrive binding
- [ ] 43.3 Configurar variables de entorno en Cloudflare Pages (`DATABASE_URL` de MySQL producción, Resend key, R2 credentials, Lucia secret)
- [ ] 43.4 Configurar Hyperdrive en Cloudflare Dashboard apuntando al MySQL de producción (PlanetScale u otro)
- [ ] 43.5 Verificar build local con `npx @cloudflare/next-on-pages@latest`
- [ ] 43.6 Conectar repositorio GitHub a Cloudflare Pages
- [ ] 43.7 Configurar GitHub Actions workflow (`.github/workflows/deploy.yml`): install → lint → test → build → deploy
- [ ] 43.8 Hacer primer deploy a Cloudflare Pages
- [ ] 43.9 Verificar sitio accesible en `*.pages.dev`
- [ ] 43.10 Verificar login funciona en producción (cookies Secure, HTTPS)
- [ ] 43.11 Verificar conexión a DB funciona desde edge (Hyperdrive)
- [ ] 43.12 Verificar R2 funciona (subir y ver avatar)
- [ ] 43.13 Verificar Resend envía emails en producción

---

# 44. Sentry (Observabilidad de errores)

- [ ] 44.1 Instalar `@sentry/nextjs`
- [ ] 44.2 Configurar Sentry con DSN en variables de entorno
- [ ] 44.3 Configurar source maps para errores legibles
- [ ] 44.4 Verificar que errores de Server Actions se reportan a Sentry
- [ ] 44.5 Verificar que errores de rendering se reportan a Sentry
- [ ] 44.6 Configurar alertas básicas en Sentry (errores nuevos)

---

# 45. Seguridad — Completación

- [ ] 45.1 Verificar que todas las cookies de sesión tienen flags `HttpOnly`, `Secure`, `SameSite=Lax`
- [ ] 45.2 Verificar que contraseñas se almacenan con argon2id (o bcrypt ≥ 12 rounds)
- [ ] 45.3 Verificar que todas las queries usan Drizzle (parametrizadas, sin concatenación SQL)
- [ ] 45.4 Verificar que no hay `dangerouslySetInnerHTML` con datos de usuario
- [ ] 45.5 Implementar rate limiting en login (máx 5 intentos por IP en 15 min)
- [ ] 45.6 Verificar que R2 bucket es privado y solo accesible con URLs firmadas
- [ ] 45.7 Verificar que variables de entorno (secrets) no están en código fuente
- [ ] 45.8 Verificar que `.env.local` está en `.gitignore`
- [ ] 45.9 Verificar que el upload de avatar valida MIME type real y tamaño
- [ ] 45.10 Verificar que CORS no está abierto innecesariamente (SSR lo maneja, pero verificar API routes)

---

# 46. i18n y localización

- [ ] 46.1 Instalar y configurar `next-intl` con locale `es-CL`
- [ ] 46.2 Crear estructura de mensajes en `messages/es-CL.json` (textos de UI comunes)
- [ ] 46.3 Configurar formateo de fechas con timezone `America/Santiago`
- [ ] 46.4 Verificar que fechas y horas se muestran en formato chileno
- [ ] 46.5 Verificar que números (distancias, tiempos) se formatean correctamente

---

# 47. Rendimiento y optimización

- [ ] 47.1 Verificar que las páginas principales son Server Components (no `"use client"` innecesario)
- [ ] 47.2 Verificar que solo componentes interactivos son Client Components
- [ ] 47.3 Verificar que las queries de DB tienen índices adecuados (EXPLAIN en MySQL)
- [ ] 47.4 Verificar que el calendario carga datos de un mes (no todos los históricos)
- [ ] 47.5 Verificar que las métricas no cargan todos los registros históricos para periodos largos (usar límites)
- [ ] 47.6 Verificar `next build` no tiene warnings de tamaño de bundle excesivos
- [ ] 47.7 Verificar imágenes (avatars) cargan con `loading="lazy"` donde corresponde
- [ ] 47.8 Optimizar re-renders en componentes de calendario (memo donde sea necesario)

---

# 48. Accesibilidad

- [ ] 48.1 Verificar navegación por teclado en formularios y botones principales
- [ ] 48.2 Verificar contraste de colores adecuado (WCAG AA) en estados del calendario
- [ ] 48.3 Verificar que iconos tienen `aria-label` o `alt` text
- [ ] 48.4 Verificar que modales/paneles pueden cerrarse con Escape
- [ ] 48.5 Verificar que formularios tienen labels asociados a inputs
- [ ] 48.6 Verificar que la campanita de notificaciones tiene aria-label descriptivo

---

# 49. Documentación necesaria

- [ ] 49.1 Actualizar `README.md` con: descripción del proyecto, stack, setup, comandos dev/build/test
- [ ] 49.2 Documentar variables de entorno requeridas en `.env.example`
- [ ] 49.3 Documentar proceso de setup de servicios externos: MySQL de producción (PlanetScale u otro), Cloudflare, Resend, R2, Sentry
- [ ] 49.4 Documentar flujo de deploy (GitHub → Cloudflare Pages)
- [ ] 49.5 Documentar estructura de DB (schema referenciado)

---

# 50. Revisión final y preparación del MVP

- [ ] 50.1 Revisar que todas las funcionalidades de `specs/mvp.md` Sección 11 "Incluido en el MVP" están implementadas (checklist de 20 funcionalidades)
- [ ] 50.2 Revisar que los criterios de aceptación de `specs/mvp.md` Sección 10 se cumplen (checklist completo)
- [ ] 50.3 Revisar que los flujos principales de `specs/mvp.md` Sección 5 funcionan de extremo a extremo (8 flujos)
- [ ] 50.4 Verificar que NO se implementaron funcionalidades fuera del MVP (lista "Fuera del MVP" de Sección 11)
- [ ] 50.5 Ejecutar `npm run lint` → sin errores
- [ ] 50.6 Ejecutar `npm run build` → build exitoso sin errores
- [ ] 50.7 Ejecutar `npm run test` → todos los tests unitarios pasan
- [ ] 50.8 Ejecutar `npx playwright test` → todos los tests E2E pasan
- [ ] 50.9 Hacer deploy final a Cloudflare Pages
- [ ] 50.10 Verificar flujo completo en producción: admin crea coach → coach crea team y plantilla → coach planifica → atleta registra → coach revisa y comenta → métricas se calculan → notificaciones llegan
- [ ] 50.11 Revisar que el sitio es responsive en dispositivos reales (mobile, tablet)
- [ ] 50.12 Revisar que no hay errores en consola del navegador
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
| 34. Configuración global | 12 | 0 |
| 35. Logs de auditoría | 10 | 0 |
| 36. Dashboard Admin stats | 4 | 4 |
| 37. Perfil de usuario | 7 | 0 |
| 38. Estados vacíos y errores | 8 | 0 |
| 39. Responsive | 8 | 0 |
| 40. Validaciones (completación) | 15 | 0 |
| 41. Pruebas unitarias | 15 | 0 |
| 42. Pruebas E2E | 12 | 0 |
| 43. Cloudflare | 13 | 0 |
| 44. Sentry | 6 | 0 |
| 45. Seguridad | 10 | 0 |
| 46. i18n y localización | 5 | 0 |
| 47. Rendimiento | 8 | 0 |
| 48. Accesibilidad | 6 | 0 |
| 49. Documentación | 5 | 0 |
| 50. Revisión final | 15 | 0 |
| **TOTAL** | **~578** | **426** |

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

Los scripts requieren el servidor de desarrollo corriendo (`npm run dev`).

Los datos de demostración se limpian con `npm run db:seed:demo:clean`, que
deja la base exactamente como estaba antes del seed.
