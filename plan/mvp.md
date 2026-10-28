# Plan Técnico del MVP — RunOsorno

Documento de plan técnico de implementación del MVP de RunOsorno. Transforma las especificaciones funcionales de `specs/mvp.md` en un plan concreto de construcción, respetando las restricciones de `AGENTS.md`.

---

## Ambigüedades detectadas en `specs/mvp.md`

Antes de definir el plan, se señalan tres puntos que requieren decisión:

1. **Eliminar coach con datos**: `specs/mvp.md` recomienda soft delete. **Decisión**: se implementa soft delete (`is_active = false`) por defecto. La eliminación definitiva solo aplica a coaches sin teams, atletas ni historial. Esto preserva la integridad referencial de registros históricos.

2. **Ventana de edición 24-48h**: el spec dice "24-48 horas". **Decisión**: se implementa como parámetro configurable en la tabla de configuración global (default: 48 horas). Así el admin puede ajustarla sin cambiar código.

3. **Grupo del Team**: el spec lista `grupo_id` como opcional en Team. **Decisión**: se elimina `grupo_id` de Team. La relación team → grupo es **transitiva** a través del coach (coach ∈ grupo → coach → team). Esto simplifica el modelo y evita ambigüedad cuando un coach pertenece a múltiples grupos. Un Director Técnico ve los teams de su grupo a través de la membresía de los coaches.

---

## 1. Arquitectura general

### Visión de capas

```
┌─────────────────────────────────────────────────┐
│                  Navegador (Cliente)            │
│  React Server Components + Client Components    │
│  AdminLTE UI (admin-lte CSS + React wrappers)   │
└──────────────────────┬──────────────────────────┘
                       │ HTTP (cookies de sesión)
┌──────────────────────▼──────────────────────────┐
│           Cloudflare Pages (Edge Runtime)       │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Next.js App Router (SSR / RSC)           │  │
│  │                                           │  │
│  │  Middleware → Auth guard (cookie check)    │  │
│  │  Server Actions → Mutaciones (POST interno)│  │
│  │  RSC Pages → Renderizado servidor          │  │
│  └────────────┬──────────────┬───────────────┘  │
│               │              │                   │
│  ┌────────────▼───┐  ┌───────▼──────────────┐   │
│  │  Drizzle ORM   │  │  Servicios           │   │
│  │  + Hyperdrive   │  │  - Auth (Lucia)      │   │
│  │  (pooling)      │  │  - Email (Resend)    │   │
│  └────────────┬───┘  │  - Avatar (R2)       │   │
│               │      │  - Métricas           │   │
│               │      │  - Notificaciones     │   │
│               │      │  - Export (PDF/Excel) │   │
│               │      └──────────────────────┘   │
└───────────────┼─────────────────────────────────┘
                │ HTTPS (connection pooling)
┌───────────────▼─────────────────────────────────┐
│         MySQL (dev local / PlanetScale prod)     │
└─────────────────────────────────────────────────┘

Cloudflare R2 (Avatares) ←── Presigned PUT desde cliente
Resend API ←── Email saliente
```

### Principios arquitectónicos

| Principio | Aplicación |
|-----------|-----------|
| **SSR primero** | Todas las páginas se renderizan en servidor (RSC). El JavaScript cliente se usa solo donde hay interactividad (formularios, drag & drop, calendario). |
| **Server Actions para mutaciones** | No hay API REST pública. Las mutaciones se hacen vía Server Actions de Next.js (endpoints internos protegidos por sesión). |
| **Cierre de sesión** | ~~`proxy.ts` verifica la cookie de sesión en cada request y redirige al login si no existe o expiró.~~ **Actualizado (2026-10-22):** el middleware se eliminó; la protección vive en los layouts (`requireAuth()` en `app/(app)/layout.tsx`, `usuarioSiHaySesion()` en los layouts público y de entrada). En Cloudflare Workers el middleware se compila aparte (5,5 MB), corre en el runtime de Node y salta al Worker principal por un service binding: cada petición pagaba un bundle entero y un salto extra. |
| **Lógica de negocio en servicios** | Server Actions orquestan; la lógica de negocio (cálculos, validaciones, reglas) vive en módulos de servicio independientes, testeables con Vitest. |
| **Sin estado global de cliente** | El estado vive en el servidor (base de datos). El cliente solo maneja estado local de UI (modal abierto, mes seleccionado, etc.). No se usa Redux/Zustand. |
| **Edge-compatible** | Todas las dependencias críticas (Drizzle, Lucia, Resend SDK) funcionan en Cloudflare Workers (Edge Runtime). |

---

## 2. Tecnologías

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| Framework | **Next.js 14+ (App Router)** | SSR, RSC, Server Actions, proxy, routing por carpetas. |
| UI | **AdminLTE 4** (`admin-lte` + `bootstrap`) | AdminLTE sobre Bootstrap 5; componentes React propios en `components/ui/` con clases Bootstrap/AdminLTE (`btn`, `card`, `modal`...). Iconos Bootstrap Icons vía `components/ui/BIcon`. |
| Estilos | **Bootstrap 5 + AdminLTE CSS** | Un solo framework CSS base. Tema claro/oscuro y personalización con CSS custom properties (`--app-*`, `--bs-*`). |
| Base de datos | **MySQL** (dev: XAMPP local · prod: PlanetScale u otro MySQL) | Persistencia relacional. Misma compatibilidad MySQL en ambos entornos vía `DATABASE_URL`. |
| Conexión DB | **Cloudflare Hyperdrive** | Connection pooling global + query cache en edge. |
| ORM | **Drizzle ORM** | Queries type-safe, migraciones SQL nativas, compatible con edge. |
| Auth | **Lucia Auth** | Sesiones con cookies HttpOnly, usuarios y sesiones en DB. Multi-runtime. |
| Validación | **Zod** + **React Hook Form** | Esquemas compartidos server/client, validación de formularios. |
| Email | **Resend** + **React Email** | Envío de emails transaccionales con templates HTML responsive. |
| Almacenamiento | **Cloudflare R2** | Bucket privado para avatares. Presigned URLs. |
| Drag & Drop | **@dnd-kit/core** | Drag & drop accesible para planificación de calendario. (Ligero, funciona en RSC/client components). |
| Gráficas | **Recharts** | Gráficas de progresión, distribución por tipo, carga semanal. (Compatible con client components). |
| Export PDF | **@react-pdf/renderer** | Generación de PDF en servidor (métricas, reportes). |
| Export Excel | **exceljs** | Generación de archivos XLSX en servidor. |
| i18n | **next-intl** | Internacionalización. Solo `es-CL` en MVP, preparado para futuro. |
| Testing unit | **Vitest** | Tests de servicios, utilidades, cálculos de métricas. |
| Testing E2E | **Playwright** | Tests end-to-end contra preview deployments. |
| CI/CD | **GitHub Actions** | Build, test, deploy automático a Cloudflare Pages. |
| Errores | **Sentry** | Captura y reporte de errores en producción. |

### Dependencias de desarrollo adicionales
- `typescript` — tipado estático
- `eslint` + `prettier` — linting y formato
- `drizzle-kit` — CLI de migraciones de Drizzle
- `@cloudflare/next-on-pages` — adaptador Next.js → Cloudflare Pages
- `wrangler` — CLI de Cloudflare para deploy y secrets

### Nota sobre Server Actions y "sin API pública"
Las Server Actions de Next.js generan endpoints POST internos. **No son API pública**: no están documentados para consumo externo, están protegidos por sesión y CSRF token. Esto es consistente con la restricción de `AGENTS.md`.

---

## 3. Estructura del proyecto

```
runosorno/
├── app/
│   ├── (auth)/                    # Rutas sin layout de app (solo login)
│   │   ├── login/
│   │   │   └── page.tsx           # Pantalla de login
│   │   └── layout.tsx             # Layout minimalista (sin sidebar)
│   │
│   ├── (app)/                     # Rutas con layout de app (sidebar + header)
│   │   ├── layout.tsx             # Layout principal: sidebar + header + campanita
│   │   │
│   │   ├── admin/                 # Secciones exclusivas Admin
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── coaches/page.tsx
│   │   │   ├── groups/page.tsx
│   │   │   ├── groups/[id]/page.tsx
│   │   │   ├── athletes/page.tsx
│   │   │   ├── templates/page.tsx    # Plantillas oficiales (CRUD)
│   │   │   ├── settings/page.tsx     # Configuración global
│   │   │   ├── logs/page.tsx
│   │   │   └── exports/page.tsx
│   │   │
│   │   ├── coach/                 # Secciones Coach
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── teams/page.tsx
│   │   │   ├── teams/[id]/page.tsx   # Detalle team + atletas
│   │   │   ├── templates/page.tsx    # Biblioteca de plantillas
│   │   │   ├── templates/[id]/page.tsx
│   │   │   ├── templates/new/page.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── page.tsx          # Selector team → atleta → calendario
│   │   │   │   └── [teamId]/[athleteId]/page.tsx
│   │   │   ├── athletes/page.tsx
│   │   │   ├── athletes/[id]/page.tsx
│   │   │   ├── metrics/page.tsx
│   │   │   ├── groups/page.tsx       # Solicitar unirse a grupo
│   │   │   └── exports/page.tsx
│   │   │
│   │   ├── athlete/                # Secciones Atleta
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── calendar/page.tsx     # Calendario mensual
│   │   │   ├── metrics/page.tsx      # Mis métricas
│   │   │   └── profile/page.tsx      # Perfil + avatar
│   │   │
│   │   ├── director/               # Secciones Director Técnico
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── teams/page.tsx        # Comparativa teams del grupo
│   │   │   ├── athletes/page.tsx     # Atletas del grupo (lectura)
│   │   │   ├── announcements/page.tsx # Anuncios masivos
│   │   │   └── exports/page.tsx
│   │   │
│   │   ├── notifications/
│   │   │   └── page.tsx              # Centro de notificaciones
│   │   │
│   │   └── profile/
│   │       └── page.tsx              # Perfil (todos los roles)
│   │
│   ├── api/
│   │   └── avatar/
│   │       ├── route.ts              # GET: URL firmada del avatar
│   │       └── upload/route.ts       # POST: recibe archivo, sube a R2
│   │
│   ├── layout.tsx                    # Root layout (providers, html lang)
│   ├── page.tsx                      # Redirect → /login o dashboard según rol
│   ├── globals.css                   # Bootstrap/AdminLTE CSS + variables tema
│   └── error.tsx                     # Error boundary global
│
├── components/
│   ├── ui/                           # Wrappers React con clases Tabler
│   │   ├── Avatar.tsx                # Avatar con fallback de iniciales
│   │   ├── ConfirmDialog.tsx         # Diálogo de confirmación
│   │   ├── EmptyState.tsx            # Estado vacío con mensaje + acción
│   │   ├── DataTable.tsx             # Tabla con filtros y paginación
│   │   ├── StatusBadge.tsx           # Badge de color por estado
│   │   └── NotificationBell.tsx      # Campanita con contador
│   │
│   ├── calendar/
│   │   ├── MonthCalendar.tsx         # Calendario mensual (client comp.)
│   │   ├── CalendarDay.tsx           # Celda de día con código color
│   │   ├── SessionDetailPanel.tsx    # Panel detalle sesión + registro
│   │   ├── SessionForm.tsx           # Formulario registro atleta
│   │   ├── FeedbackForm.tsx          # Formulario feedback coach
│   │   └── WeekGenerator.tsx         # Generador de semana tipo
│   │
│   ├── templates/
│   │   ├── TemplateList.tsx          # Listado de plantillas
│   │   ├── TemplateEditor.tsx        # Editor de plantilla (secciones)
│   │   ├── TemplateCard.tsx          # Card de plantilla (para drag)
│   │   └── SectionEditor.tsx         # Editor de sección individual
│   │
│   ├── layout/
│   │   ├── AppSidebar.tsx            # Menú lateral (varía por rol)
│   │   ├── AppHeader.tsx             # Header con logo, campanita, avatar
│   │   └── RoleGuard.tsx             # Guard de rol en layout
│   │
│   ├── charts/
│   │   ├── ProgressChart.tsx         # Gráfica progresión (Recharts)
│   │   ├── TypeDistributionChart.tsx # Distribución por tipo
│   │   ├── LoadChart.tsx             # Carga semanal
│   │   └── ComplianceChart.tsx       # Cumplimiento
│   │
│   └── metrics/
│       ├── AthleteMetricsPanel.tsx   # Panel métricas atleta
│       ├── TeamMetricsPanel.tsx      # Panel métricas team
│       └── GroupMetricsPanel.tsx     # Panel métricas grupo
│
├── lib/
│   ├── auth/
│   │   ├── index.ts                  # Setup Lucia (createLucia)
│   │   ├── session.ts                # createSession, validateSession, invalidate
│   │   └── guards.ts                 # requireAuth, requireRole, requireOwnership
│   │
│   ├── db/
│   │   ├── index.ts                  # Conexión Drizzle + Hyperdrive
│   │   └── schema.ts                 # Definición de todas las tablas
│   │
│   ├── actions/                      # Server Actions (mutaciones)
│   │   ├── auth.actions.ts           # login, logout
│   │   ├── user.actions.ts           # CRUD coaches (admin)
│   │   ├── group.actions.ts          # CRUD grupos, solicitudes, director
│   │   ├── team.actions.ts           # CRUD teams, asignar atletas
│   │   ├── athlete.actions.ts        # CRUD atletas, traslados
│   │   ├── template.actions.ts       # CRUD plantillas, clonar, compartir
│   │   ├── plan.actions.ts           # Asignar, copiar semana, generar
│   │   ├── session.actions.ts        # Registrar resultado, feedback
│   │   ├── notification.actions.ts   # Marcar leída, enviar anuncio
│   │   ├── avatar.actions.ts         # Subir, eliminar avatar
│   │   ├── settings.actions.ts       # Configuración global
│   │   └── export.actions.ts         # Exportar PDF/Excel/CSV
│   │
│   ├── services/                     # Lógica de negocio (testable)
│   │   ├── auth.service.ts           # Login, hash, validación
│   │   ├── user.service.ts           # Lógica de usuarios
│   │   ├── group.service.ts          # Lógica de grupos y solicitudes
│   │   ├── team.service.ts           # Lógica de teams
│   │   ├── template.service.ts       # Lógica de plantillas
│   │   ├── plan.service.ts           # Lógica de planificación semanal
│   │   ├── session.service.ts        # Lógica de registro de sesiones
│   │   ├── metric.service.ts         # Cálculo de métricas
│   │   ├── notification.service.ts   # Creación y envío de notificaciones
│   │   ├── email.service.ts          # Envío de emails (Resend)
│   │   ├── avatar.service.ts         # Subida/borrado en R2
│   │   ├── export.service.ts         # Generación de PDF/Excel
│   │   └── audit.service.ts          # Registro de logs de auditoría
│   │
│   ├── validations/                  # Esquemas Zod
│   │   ├── auth.schemas.ts           # Login, registro, password
│   │   ├── user.schemas.ts
│   │   ├── group.schemas.ts
│   │   ├── team.schemas.ts
│   │   ├── template.schemas.ts
│   │   ├── plan.schemas.ts
│   │   ├── session.schemas.ts
│   │   ├── avatar.schemas.ts
│   │   └── settings.schemas.ts
│   │
│   ├── metrics/                      # Fórmulas y cálculos puros
│   │   ├── compliance.ts             # Cálculo cumplimiento %
│   │   ├── load.ts                   # Carga semanal (km, tiempo, TSS/TRIMP)
│   │   ├── progression.ts            # Serie temporal progresión
│   │   ├── distribution.ts           # Distribución por tipo
│   │   ├── streaks.ts                # Rachas consecutivas
│   │   ├── vo2max.ts                 # VO2max estimado
│   │   ├── heart-rate.ts             # Zonas FC, umbral, TRIMP
│   │   └── alerts.ts                 # Alertas (sin registrar, caída carga, RPE alto)
│   │
│   ├── permissions/                   # Verificación de permisos
│   │   ├── index.ts                  # canAccess, isOwner, isSameGroup, etc.
│   │   └── roles.ts                  # Definición de capacidades por rol
│   │
│   ├── utils/
│   │   ├── date.ts                   # Utilidades de fecha (zona Chile, ISO week)
│   │   ├── initials.ts               # Generar iniciales para avatar
│   │   └── format.ts                 # Formateo de números, distancias, tiempos
│   │
│   └── config/
│       ├── index.ts                  # Config central (env vars, defaults)
│       └── constants.ts              # Estados de sesión, tipos, colores
│
├── db/
│   ├── migrations/                   # Archivos SQL de Drizzle
│   └── seed.ts                       # Datos iniciales (admin, plantillas oficiales)
│
├── emails/                           # Templates React Email
│   ├── layout.tsx                    # Layout base responsive
│   ├── welcome.tsx
│   ├── plan-published.tsx
│   ├── session-completed.tsx
│   └── announcement.tsx
│
├── tests/
│   ├── unit/
│   │   ├── metrics.test.ts
│   │   ├── plan.test.ts
│   │   ├── session.test.ts
│   │   └── ...
│   └── e2e/
│       ├── auth.spec.ts
│       ├── coach-flow.spec.ts
│       └── athlete-flow.spec.ts
│
├── (sin proxy.ts)                    # el cierre de sesion lo hacen los layouts (ver M1)
├── next.config.mjs
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── wrangler.toml                     # Config Cloudflare (R2, Hyperdrive)
└── .github/
    └── workflows/
        └── deploy.yml                # GitHub Actions → Cloudflare Pages
```

### Responsabilidad de carpetas clave

| Carpeta | Responsabilidad |
|---------|----------------|
| `app/` | Rutas y páginas. Server Components por defecto. Route groups `(auth)` y `(app)` para layouts distintos. |
| `components/` | Componentes React reutilizables. Los que usan estado de navegador (drag & drop, modales, gráficas) son Client Components (`"use client"`). |
| `lib/actions/` | Server Actions: punto de entrada de mutaciones. Validan con Zod, verifican permisos, llaman a servicios. |
| `lib/services/` | Lógica de negocio pura. No importa de React. Testeable con Vitest. |
| `lib/metrics/` | Funciones de cálculo puras (entrada → salida). Sin acceso a DB directo — reciben datos ya cargados. |
| `lib/validations/` | Esquemas Zod compartidos entre cliente y servidor. |
| `lib/auth/` | Setup de Lucia, gestión de sesiones, guards de rol. |
| `db/` | Schema de Drizzle y migraciones. |
| `emails/` | Templates React Email para envío vía Resend. |

---

## 4. Arquitectura de datos

### Diagrama de entidades (conceptual)

```
users ──────────┐
  │             │
  │ 1:1         │ N:M
  ▼             ▼
athlete_profiles  group_members ◄──── groups
                     │
                     │ 1:N (solicitudes)
                     ▼
                 group_requests

users (coach)
  │ 1:N
  ▼
teams ──────┐
  │         │ N:M
  │ 1:N     ▼
  │    team_members ◄──── users (athlete)
  │
  │ 1:N
  ▼
templates ──────┐
  │ 1:N         │
  ▼             │
template_sections│
                 │
users (coach)    │
  │ 1:N          │
  ▼              │
session_assignments ──► templates
  │ 1:1
  ▼
session_records
  │ 1:N
  ▼
session_feedback

users ────► notifications
users ────► audit_logs
```

### Tablas

#### `users`
| Campo | Tipo | Constraints | Descripción |
|-------|------|-------------|-------------|
| `id` | `varchar(36)` | PK (UUID) | Identificador único |
| `name` | `varchar(100)` | NOT NULL | Nombre completo |
| `email` | `varchar(255)` | NOT NULL, UNIQUE | Email (lowercase) |
| `password_hash` | `varchar(255)` | NOT NULL | Hash bcrypt/argon2 |
| `role` | `enum('admin','coach','athlete')` | NOT NULL | Rol principal |
| `avatar_key` | `varchar(255)` | NULL | Clave del archivo en R2 (ej. `avatars/{id}.webp`) |
| `is_active` | `boolean` | DEFAULT true | Soft delete flag |
| `must_change_password` | `boolean` | DEFAULT false | Forzar cambio en primer login (contraseña temporal) |
| `created_at` | `timestamp` | DEFAULT NOW() | |
| `last_login_at` | `timestamp` | NULL | Último acceso |

**Índice**: `email` UNIQUE.

#### `groups`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `name` | `varchar(100)` | NOT NULL |
| `description` | `text` | NULL |
| `logo_key` | `varchar(255)` | NULL |
| `created_at` | `timestamp` | DEFAULT NOW() |

#### `group_members`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `group_id` | `varchar(36)` | FK → groups.id |
| `user_id` | `varchar(36)` | FK → users.id |
| `is_director` | `boolean` | DEFAULT false |
| `joined_at` | `timestamp` | DEFAULT NOW() |

**PK compuesta**: (`group_id`, `user_id`).

#### `group_requests`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `group_id` | `varchar(36)` | FK → groups.id |
| `coach_id` | `varchar(36)` | FK → users.id |
| `status` | `enum('pending','approved','rejected')` | DEFAULT 'pending' |
| `requested_at` | `timestamp` | DEFAULT NOW() |
| `resolved_at` | `timestamp` | NULL |
| `resolved_by` | `varchar(36)` | FK → users.id (admin) |

**Índice**: UNIQUE(`group_id`, `coach_id`) — evita solicitudes duplicadas.

#### `teams`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `name` | `varchar(100)` | NOT NULL |
| `coach_id` | `varchar(36)` | FK → users.id (coach) |
| `created_at` | `timestamp` | DEFAULT NOW() |

**Índice**: `coach_id`.

#### `team_members`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `team_id` | `varchar(36)` | FK → teams.id |
| `athlete_id` | `varchar(36)` | FK → users.id (athlete) |
| `joined_at` | `timestamp` | DEFAULT NOW() |

**PK compuesta**: (`team_id`, `athlete_id`).

#### `athlete_profiles`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `user_id` | `varchar(36)` | PK, FK → users.id |
| `birth_date` | `date` | NULL |
| `weight_kg` | `decimal(5,2)` | NULL |
| `height_cm` | `decimal(5,1)` | NULL |
| `max_hr` | `int` | NULL — FC máxima (bpm) |
| `resting_hr` | `int` | NULL — FC reposo (bpm) |

#### `templates`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `coach_id` | `varchar(36)` | FK → users.id, NULL si es oficial |
| `group_id` | `varchar(36)` | FK → groups.id, NULL — grupo al que se compartió |
| `name` | `varchar(150)` | NOT NULL |
| `session_type` | `varchar(50)` | NOT NULL — 'series','intervalos','fondos','tempo','recuperacion','descanso' o tipo libre |
| `is_official` | `boolean` | DEFAULT false |
| `is_shared` | `boolean` | DEFAULT false |
| `structure` | `json` | NOT NULL — Array de secciones (ver abajo) |
| `created_at` | `timestamp` | DEFAULT NOW() |
| `updated_at` | `timestamp` | DEFAULT NOW() |

**Estructura JSON de `structure`**:
```json
[
  {
    "id": "uuid",
    "order": 1,
    "title": "Calentamiento",
    "type": "warmup",
    "content": "10 min trote suave + movilidad articular"
  },
  {
    "id": "uuid",
    "order": 2,
    "title": "Entrenamiento específico",
    "type": "main",
    "content": "8x400m en 1'45\" con 200m trote entre series"
  },
  {
    "id": "uuid",
    "order": 3,
    "title": "Enfriamiento",
    "type": "cooldown",
    "content": "10 min trote suave + estiramientos"
  }
]
```

**Tipos de sección**: `warmup`, `main`, `cooldown`, `stretching`, `recovery`, `strength`, `custom`. El coach puede reordenar, añadir o eliminar secciones.

**Visibilidad**: 
- `coach_id` seteado + `is_shared=false` → solo el coach creador.
- `coach_id` seteado + `is_shared=true` + `group_id` → coaches del grupo (clonable).
- `is_official=true` → todos los coaches (clonable).

#### `session_assignments`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `athlete_id` | `varchar(36)` | FK → users.id |
| `template_id` | `varchar(36)` | FK → templates.id |
| `session_date` | `date` | NOT NULL — fecha específica (ej. 2026-10-15) |
| `week_start` | `date` | NOT NULL — lunes de la semana (identificador de semana) |
| `status` | `enum('planned','in_progress','completed','partial','not_done')` | DEFAULT 'planned' |
| `created_by` | `varchar(36)` | FK → users.id (coach que planificó) |
| `created_at` | `timestamp` | DEFAULT NOW() |

**Índices**: 
- (`athlete_id`, `session_date`) — consulta calendario por atleta.
- (`athlete_id`, `week_start`) — consulta por semana.
- (`created_by`) — consulta por coach.

**Nota**: `status = 'in_progress'` se determina automáticamente: si `session_date = hoy` y `status = 'planned'`, se muestra como "en curso" en la UI (sin necesidad de stored procedure — se calcula en la query o en la capa de servicio).

#### `session_records`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `assignment_id` | `varchar(36)` | FK → session_assignments.id, UNIQUE (1:1) |
| `distance_km` | `decimal(6,2)` | NULL — requerido si status='completed' |
| `duration_minutes` | `int` | NULL — requerido si status='completed' |
| `rpe` | `int` | NULL, CHECK (rpe >= 1 AND rpe <= 10) |
| `comments` | `text` | NULL |
| `not_done_reason` | `varchar(50)` | NULL — motivo predefinido ('lesion','trabajo','enfermedad','personal','otro') |
| `custom_reason` | `text` | NULL — motivo libre si not_done_reason='otro' |
| `recorded_at` | `timestamp` | DEFAULT NOW() |
| `updated_at` | `timestamp` | DEFAULT NOW() |

**Regla de negocio**: `session_assignments.status` se actualiza en función del registro:
- Registro con distancia+tiempo → `completed`
- Registro con distancia+tiempo pero parcial → `partial`
- Registro con `not_done_reason` → `not_done`
- Sin registro → `planned` (o `in_progress` si es hoy)

#### `session_feedback`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `assignment_id` | `varchar(36)` | FK → session_assignments.id |
| `author_id` | `varchar(36)` | FK → users.id |
| `message` | `text` | NOT NULL |
| `created_at` | `timestamp` | DEFAULT NOW() |

#### `notifications`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `user_id` | `varchar(36)` | FK → users.id — destinatario |
| `type` | `varchar(50)` | NOT NULL — ej. 'plan_published','session_completed','feedback','announcement','welcome','group_request' |
| `title` | `varchar(200)` | NOT NULL |
| `message` | `text` | NOT NULL |
| `is_read` | `boolean` | DEFAULT false |
| `entity_type` | `varchar(50)` | NULL — 'session','plan','group', etc. |
| `entity_id` | `varchar(36)` | NULL — ID de la entidad relacionada |
| `created_at` | `timestamp` | DEFAULT NOW() |

**Índice**: (`user_id`, `is_read`) — para el contador de campanita.

#### `audit_logs`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | `varchar(36)` | PK |
| `user_id` | `varchar(36)` | FK → users.id, NULL si es sistema |
| `action` | `varchar(100)` | NOT NULL — ej. 'user_created','group_deleted','athlete_transferred' |
| `entity_type` | `varchar(50)` | NOT NULL |
| `entity_id` | `varchar(36)` | NULL |
| `details` | `json` | NULL — datos adicionales |
| `ip_address` | `varchar(45)` | NULL |
| `created_at` | `timestamp` | DEFAULT NOW() |

#### `settings`
| Campo | Tipo | Constraints |
|-------|------|-------------|
| `key` | `varchar(100)` | PK |
| `value` | `json` | NOT NULL |
| `updated_at` | `timestamp` | DEFAULT NOW() |

**Claves predefinidas**:
| Key | Valor default | Descripción |
|-----|---------------|-------------|
| `max_teams_per_coach` | `10` | Límite de teams por coach |
| `max_athletes_per_team` | `50` | Límite de atletas por team |
| `edit_window_hours` | `48` | Ventana de edición de registro (horas) |
| `not_done_reasons` | `["lesion","trabajo","enfermedad","personal","otro"]` | Motivos predefinidos |
| `base_session_types` | `["series","intervalos","fondos","tempo","recuperacion","descanso"]` | Tipos de sesión base |
| `email_from` | `"RunOsorno <no-reply@runosorno.pages.dev>"` | Remitente de email |
| `email_templates` | `{...}` | Templates HTML de email (editables por admin) |
| `alert_no_record_days` | `3` | Días sin registrar para alerta |

---

## 5. Componentes y módulos

### 5.1 Módulo de Autenticación

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Login, logout, gestión de sesiones, guards de rol y propiedad. |
| **Componentes** | `LoginPage`, `proxy`, `RoleGuard` |
| **Servicios** | `auth.service` (hash, validación), `session` (Lucia: create, validate, invalidate) |
| **Relación** | Base de todos los módulos. Middleware protege todas las rutas `(app)`. |
| **Funcionalidades** | Login con email/contraseña → cookie de sesión. Logout → destruye sesión. Guard: sin sesión → redirect `/login`. Guard rol: `/admin/*` solo admin, `/coach/*` solo coach, etc. |

### 5.2 Módulo Admin — Usuarios

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | CRUD de coaches (y atletas globales). |
| **Componentes** | `CoachesList`, `CoachForm`, `AthletesGlobalList`, `TransferDialog` |
| **Servicios** | `user.service`, `audit.service` |
| **Funcionalidades** | Crear coach (email + pwd temporal → envía invitación). Editar, desactivar (soft delete), eliminar (solo sin dependencias). Reset password. Ver huérfanos. Trasladar atletas entre teams/coaches. |

### 5.3 Módulo Admin — Grupos

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | CRUD grupos, solicitudes, Director Técnico. |
| **Componentes** | `GroupsList`, `GroupForm`, `RequestsPending`, `DirectorToggle` |
| **Servicios** | `group.service` |
| **Funcionalidades** | Crear/editar/eliminar grupo. Ver y resolver solicitudes (aprobar/rechazar). Asignar/quitar Director Técnico. |

### 5.4 Módulo Coach — Teams

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | CRUD teams, asignación de atletas. |
| **Componentes** | `TeamsList`, `TeamForm`, `TeamAthletesManager` |
| **Servicios** | `team.service` |
| **Funcionalidades** | Crear team (nombre default = apellido). Renombrar. Asignar/quitar atletas. Ver atletas del team con estado de cumplimiento. |

### 5.5 Módulo Coach — Plantillas

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | CRUD de plantillas de sesiones. |
| **Componentes** | `TemplateList`, `TemplateEditor`, `SectionEditor`, `TemplateCard` |
| **Servicios** | `template.service` |
| **Funcionalidades** | Crear plantilla (nombre, tipo, estructura de secciones). Editar. Clonar (propia, oficial, compartida). Compartir al grupo. Eliminar (con verificación de uso). Listar: propias + oficiales + compartidas del grupo. |

### 5.6 Módulo Coach — Planificación

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Asignar plantillas a días del calendario. |
| **Componentes** | `MonthCalendar` (modo edición), `WeekGenerator`, `MultiAssignDialog` |
| **Servicios** | `plan.service` |
| **Funcionalidades** | Drag & drop plantilla → día. Generador semana tipo. Multi-asignación. Copiar semana anterior. Reemplazar plantilla en día ocupado. Eliminar asignación. |

### 5.7 Módulo Calendario (Atleta + Coach)

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Vista mensual, detalle de sesión, registro de resultados, feedback. |
| **Componentes** | `MonthCalendar`, `CalendarDay`, `SessionDetailPanel`, `SessionForm`, `FeedbackForm` |
| **Servicios** | `session.service` |
| **Funcionalidades** | Vista mes con código color. Click día → panel detalle. Atleta: registrar (distancia, tiempo, RPE, comentarios), marcar no realizada (motivo), editar (ventana 24-48h). Coach: ver registro, dejar feedback. |

### 5.8 Módulo Métricas

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Cálculo y visualización de métricas a 3 niveles. |
| **Componentes** | `AthleteMetricsPanel`, `TeamMetricsPanel`, `GroupMetricsPanel`, charts (Recharts) |
| **Servicios** | `metric.service` (orquestación), `lib/metrics/*` (fórmulas puras) |
| **Funcionalidades** | Calcular cumplimiento, carga semanal, progresión, distribución, rachas, VO2max, zonas FC. Alertas de team. Comparativa de grupo. Actualización al guardar registro. |

### 5.9 Módulo Notificaciones

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Crear notificaciones in-app, enviar emails, centro de notificaciones. |
| **Componentes** | `NotificationBell`, `NotificationCenter` |
| **Servicios** | `notification.service` (crear), `email.service` (Resend) |
| **Funcionalidades** | Crear notificación in-app por evento. Enviar email para eventos críticos. Contador de no leídas en campanita. Marcar como leída. Anuncios masivos. |

### 5.10 Módulo Avatar

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Subida, procesamiento, almacenamiento y visualización de avatares. |
| **Componentes** | `AvatarUpload`, `Avatar` (con fallback iniciales) |
| **Servicios** | `avatar.service` (R2), API route para presigned URL |
| **Funcionalidades** | Subida client-side (resize a 256×256, strip EXIF) → presigned PUT → R2. GET URL firmada para visualización. Eliminación → avatar de iniciales. |

### 5.11 Módulo Director Técnico

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Vista agregada del grupo, anuncios masivos. |
| **Componentes** | `GroupMetricsPanel`, `AnnouncementForm`, read-only calendars |
| **Servicios** | `metric.service` (nivel grupo), `notification.service` (masivas) |
| **Funcionalidades** | Comparativa teams. Cumplimiento por coach. Enviar anuncio (in-app + email). Exportar. No edita planes ni registros. |

### 5.12 Módulo Export

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Generación de archivos PDF, Excel y CSV. |
| **Componentes** | `ExportButton` con selector de formato y periodo |
| **Servicios** | `export.service` (PDF: react-pdf, Excel: exceljs, CSV: generación nativa) |
| **Funcionalidades** | Exportar métricas de atleta, team, grupo o global. Periodo: temporada, año, rango personalizado. Formato: PDF, Excel, CSV. |

### 5.13 Módulo Auditoría

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Registro y consulta de logs. |
| **Componentes** | `LogsTable` (con filtros) |
| **Servicios** | `audit.service` |
| **Funcionalidades** | Registrar acción crítica (user_id, action, entity, details, IP). Consultar con filtros por fecha, usuario, tipo. |

### 5.14 Módulo Configuración Global

| Aspecto | Detalle |
|---------|---------|
| **Responsabilidad** | Gestión de settings, plantillas oficiales, templates de email. |
| **Componentes** | `SettingsPanel` con secciones (límites, motivos, tipos, email) |
| **Servicios** | `settings.actions`, `template.service` (oficiales) |
| **Funcionalidades** | Editar settings en tabla `settings`. CRUD plantillas oficiales. Editar templates HTML de email. |

---

## 6. Funciones y lógica

### 6.1 Server Actions (punto de entrada de mutaciones)

Cada Server Action sigue el patrón:
1. Verificar sesión (Lucia).
2. Verificar permiso (rol/propiedad).
3. Validar datos (Zod).
4. Llamar a servicio.
5. Registrar auditoría (si aplica).
6. Crear notificación (si aplica).
7. Retornar resultado o error.

#### auth.actions.ts
| Función | Parámetros | Resultado | Notas |
|---------|-----------|-----------|-------|
| `login` | `{ email, password }` | `{ ok: boolean, error?: string }` | Crea sesión, redirige según rol. Mensaje genérico de error. |
| `logout` | — | `{ ok: boolean }` | Destruye sesión, redirect `/login`. |

#### user.actions.ts
| Función | Parámetros | Resultado |
|---------|-----------|-----------|
| `createCoach` | `{ name, email }` | Crea usuario, genera pwd temporal, envía email invitación, registra auditoría. |
| `updateCoach` | `{ id, name?, email? }` | Actualiza datos. |
| `deactivateCoach` | `{ id }` | `is_active = false`. No puede loguearse. |
| `deleteCoach` | `{ id }` | Hard delete solo si no tiene teams/registros. Si los tiene, retorna error sugiriendo desactivación. |
| `resetPassword` | `{ id }` | Nueva pwd temporal, `must_change_password = true`, envía email. |
| `resendInvitation` | `{ id }` | Reenvía email de invitación. |
| `transferAthlete` | `{ athleteId, fromTeamId, toTeamId }` | Mueve atleta de team, registra auditoría. |

#### group.actions.ts
| Función | Parámetros | Resultado |
|---------|-----------|-----------|
| `createGroup` | `{ name, description?, logo? }` | Crea grupo. |
| `updateGroup` | `{ id, name?, description?, logo? }` | Actualiza grupo. |
| `deleteGroup` | `{ id }` | Elimina grupo (con confirmación). |
| `requestJoin` | `{ groupId }` | Crea solicitud pendiente. Verifica no duplicada. |
| `approveRequest` | `{ requestId }` | Crea `group_members`, actualiza solicitud, notifica al coach. |
| `rejectRequest` | `{ requestId }` | Actualiza solicitud, notifica al coach. |
| `toggleDirector` | `{ groupId, userId }` | Alterna `is_director` en `group_members`. |

#### team.actions.ts
| Función | Parámetros | Resultado |
|---------|-----------|-----------|
| `createTeam` | `{ name? }` | Crea team. Default name = apellido del coach de sesión. |
| `updateTeam` | `{ id, name }` | Renombra team. |
| `deleteTeam` | `{ id }` | Elimina team (con confirmación). |
| `assignAthlete` | `{ teamId, athleteId }` | Agrega atleta a team. Verifica límite. |
| `removeAthlete` | `{ teamId, athleteId }` | Quita atleta del team. |

#### template.actions.ts
| Función | Parámetros | Resultado |
|---------|-----------|-----------|
| `createTemplate` | `{ name, sessionType, structure }` | Crea plantilla privada. |
| `updateTemplate` | `{ id, name?, sessionType?, structure? }` | Actualiza plantilla propia. |
| `deleteTemplate` | `{ id }` | Elimina si no tiene asignaciones activas. |
| `cloneTemplate` | `{ sourceId, name }` | Duplica como plantilla propia del coach. |
| `shareTemplate` | `{ id, groupId }` | Marca `is_shared=true`, setea `group_id`. |
| `unshareTemplate` | `{ id }` | Marca `is_shared=false`. |

#### plan.actions.ts
| Función | Parámetros | Resultado |
|---------|-----------|-----------|
| `assignSession` | `{ athleteId, templateId, date }` | Crea `session_assignments`. Si día ocupado → retorna `{ needsConfirm: true }`. Con `replace: true` → reemplaza. |
| `bulkAssign` | `{ athleteIds[], templateId, date }` | Multi-asignación. Retorna count. |
| `removeAssignment` | `{ id }` | Elimina asignación (y registro asociado si existe). |
| `copyPreviousWeek` | `{ athleteId, weekStart }` | Copia asignaciones de la semana anterior. Retorna count o error si no hay semana anterior. |
| `generateWeek` | `{ athleteId, weekStart, pattern: { type, count }[] }` | Genera semana según patrón. Distribuye en días. |

#### session.actions.ts
| Función | Parámetros | Resultado |
|---------|-----------|-----------|
| `recordSession` | `{ assignmentId, distanceKm, durationMin, rpe?, comments?, status }` | Crea/actualiza `session_records`. Actualiza `session_assignments.status`. Verifica ventana de edición. Verifica no futuro. Notifica al coach (in-app + email). |
| `markNotDone` | `{ assignmentId, reason, customReason? }` | Registra motivo, setea status='not_done'. Notifica al coach. |
| `addFeedback` | `{ assignmentId, message }` | Crea `session_feedback`. Notifica al autor. |

#### notification.actions.ts
| Función | Parámetros | Resultado |
|---------|-----------|-----------|
| `markAsRead` | `{ id }` | `is_read = true`. |
| `markAllAsRead` | — | Marca todas como leídas. |
| `sendAnnouncement` | `{ groupId, title, message }` | Crea notificaciones in-app para todos los miembros + envía email. |

#### avatar.actions.ts
| Función | Parámetros | Resultado |
|---------|-----------|-----------|
| `getAvatarUploadUrl` | — | Retorna presigned PUT URL para R2. |
| `confirmAvatarUpload` | `{ key }` | Actualiza `users.avatar_key`. |
| `deleteAvatar` | — | Elimina archivo de R2, limpia `avatar_key`. |

### 6.2 Servicios de lógica de negocio

#### auth.service.ts
| Función | Descripción |
|---------|-------------|
| `hashPassword(password)` | Hash con argon2 o bcrypt. |
| `verifyPassword(password, hash)` | Verifica hash. |
| `authenticate(email, password)` | Busca usuario, verifica password, verifica `is_active`. Retorna usuario o error genérico. |

#### plan.service.ts
| Función | Descripción |
|---------|-------------|
| `getWeekPlan(athleteId, weekStart)` | Retorna asignaciones de la semana con plantillas. |
| `getMonthPlan(athleteId, year, month)` | Retorna asignaciones del mes. |
| `canEditWeek(athleteId, weekStart)` | Verifica si el coach es dueño del atleta. |

#### session.service.ts
| Función | Descripción |
|---------|-------------|
| `canEditRecord(assignmentId, userId)` | Verifica: es el atleta dueño, la fecha es pasada (no futura), y está dentro de la ventana de edición (24-48h configurable). |
| `validateRecord(data)` | Valida Zod: distancia y tiempo requeridos para 'completed', RPE 1-10, motivo requerido para 'not_done'. |
| `updateAssignmentStatus(assignmentId, recordStatus)` | Sincroniza `session_assignments.status` con el registro. |

#### metric.service.ts
| Función | Descripción |
|---------|-------------|
| `getAthleteMetrics(athleteId, period)` | Retorna todas las métricas del atleta para un periodo. |
| `getTeamMetrics(teamId, period)` | Resumen del team: % por bucket de cumplimiento, carga media, alertas. |
| `getGroupMetrics(groupId, period)` | Comparativa de teams + cumplimiento por coach. |
| `recalculateOnRecord(assignmentId)` | Disparado al guardar registro — recalcula métricas afectadas (en memoria/respuesta). |

### 6.3 Funciones de cálculo puro (`lib/metrics/`)

| Función | Entrada | Salida | Fórmula/Descripción |
|---------|---------|--------|---------------------|
| `calcCompliance(assignments)` | Lista de asignaciones con status | `%` | `completed / total * 100` |
| `calcWeeklyLoad(records, weekStart)` | Registros de la semana | `{ km, minutes, tss?, trimp? }` | Suma de km, minutos. TSS/TRIMP si hay FC. |
| `calcProgression(records, weeks)` | Registros históricos | `Array<{ week, km, minutes }>` | Serie temporal de carga semanal. |
| `calcTypeDistribution(assignments, records)` | Asignaciones + plantillas | `{ type: % }` | Distribución porcentual por `session_type`. |
| `calcStreak(records)` | Registros ordenados | `number` | Días/semanas consecutivos con sesión completada. |
| `estimateVO2max(records, profile)` | Registros + perfil atleta | `number?` | Estimación basada en ritmos recientes (fórmula simplificada). Solo si hay datos suficientes. |
| `calcHRZones(maxHr, restingHr)` | FC máx y reposo | `Array<{ zone, min, max }>` | Zonas 1-5 por método Karvonen o % FC máx. |
| `calcTRIMP(records, profile)` | Registros con FC + perfil | `number` | TRIMP basado en FC y duración. Solo si hay datos de FC. |
| `detectAlerts(teamAthletes, records)` | Atletas + registros | `Array<Alert>` | Sin registrar > X días, caída carga > X%, RPE > 8 por > Y sesiones. |

---

## 7. Flujo de funcionamiento

### Flujo: Atleta registra una sesión

```
1. Atleta abre /athlete/calendar
   → RSC carga session_assignments del mes vía metric.service
   → MonthCalendar renderiza días con colores

2. Atleta hace click en un día
   → Client component abre SessionDetailPanel
   → Carga detalle: session_assignments + template.structure + session_records

3. Atleta llena SessionForm (distancia, tiempo, RPE, comentarios)
   → React Hook Form valida con Zod (client-side)

4. Atleta presiona "Guardar"
   → Server Action `recordSession` se invoca
   → Verifica sesión de usuario (Lucia)
   → Verifica propiedad (es su asignación)
   → Verifica fecha (no futura) y ventana de edición
   → Valida datos con Zod (server-side)
   → INSERT session_records + UPDATE session_assignments.status
   → metric.service recalcula métricas
   → notification.service crea notificación in-app para el coach
   → email.service envía email al coach (evento crítico)
   → audit.service registra la acción
   → Retorna { ok: true, status: 'completed' }

5. UI actualiza el color del día a verde + muestra confirmación
```

### Flujo: Coach planifica una semana

```
1. Coach abre /coach/calendar/[teamId]/[athleteId]
   → RSC carga: plantillas del coach + asignaciones de la semana

2. Coach arrastra TemplateCard → CalendarDay
   → @dnd-kit detecta drop
   → Client llama Server Action `assignSession`
   → Si día ocupado: muestra ConfirmDialog "¿Reemplazar?"
   → Server Action crea session_assignments
   → Retorna ok → UI actualiza

3. O: Coach usa WeekGenerator
   → Selecciona patrón (3F, 1S, 1T, 2D)
   → Client llama `generateWeek`
   → Server crea asignaciones para los 7 días
   → Retorna count → UI actualiza

4. Coach pulsa "Copiar semana anterior"
   → Client llama `copyPreviousWeek`
   → Server copia asignaciones de week-1
   → Retorna count o error "No hay semana anterior"
```

### Flujo: Admin crea coach

```
1. Admin abre /admin/coaches → "Nuevo coach"
2. Llena form (nombre, email)
3. Client llama Server Action `createCoach`
4. Server Action:
   a. Verifica sesión + rol admin
   b. Valida email único (Zod + DB check)
   c. Genera contraseña temporal
   d. INSERT users (role='coach', must_change_password=true)
   e. audit.service: 'coach_created'
   f. email.service: envía invitación con link de activación
5. UI muestra "Coach creado. Email de invitación enviado."
```

### Flujo: Notificación in-app + email

```
Evento (ej. atleta completa sesión):
  session.actions.recordSession()
    → notification.service.create({
        userId: coachId,
        type: 'session_completed',
        title: 'Sesión completada',
        message: '{atleta} completó {tipo} el {fecha}',
        entityType: 'session',
        entityId: assignmentId
      })
    → email.service.send({
        to: coach.email,
        template: 'session-completed',
        data: { athlete, session, date }
      })

En UI (cualquier pantalla):
  AppHeader → NotificationBell
    → RSC lee notifications WHERE user_id = session.userId AND is_read = false
    → Muestra contador
    → Click → abre dropdown con lista → marca leída
```

### Flujo: Avatar

```
1. Usuario selecciona imagen en AvatarUpload (client)
2. Client-side: canvas.resize(256, 256) + strip EXIF → Blob
3. Client llama getAvatarUploadUrl → retorna presigned PUT URL
4. Client hace PUT directo a R2 con el Blob
5. Client llama confirmAvatarUpload(key)
   → Server actualiza users.avatar_key
6. Visualización: GET /api/avatar?id={userId}
   → Server genera signed URL temporal de R2 → redirect
   → Si no hay avatar_key → retorna SVG de iniciales (fallback)
```

---

## 8. Interfaz

### Layout general

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo    🔔 Campanita (3)    [Avatar ▼]      │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   Sidebar    │           Contenido principal        │
│              │                                      │
│  Dashboard   │   (varía según ruta y rol)           │
│  Teams       │                                      │
│  Calendario  │                                      │
│  Plantillas  │                                      │
│  Atletas     │                                      │
│  Métricas    │                                      │
│  Exportes    │                                      │
│  ...         │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Componentes a construir (clases Bootstrap/AdminLTE)

> **Nota:** AdminLTE se construye sobre Bootstrap 5 y no publica librería React propia. Escribimos los wrappers en `components/ui/` con clases Bootstrap/AdminLTE (`btn`, `card`, `modal`...) y los iconos con Bootstrap Icons (`bi bi-*`) vía `components/ui/BIcon`.

| Wrapper React (nuestro) | Clases Bootstrap/AdminLTE | Uso en RunOsorno |
|-------------------------|---------------------------|------------------|
| `AppShell` (layout) | `.app-sidebar`, `.app-header`, `.sidebar-brand`, `.brand-link`, `.nav-link`, `.nav-link-icon` | Layout principal con sidebar + header |
| `NavLink` | `.nav-link`, `.nav-link-icon` | Navegación del sidebar |
| `Avatar` | `.avatar`, `.avatar-img` | Avatares en header, listas, perfiles |
| `StatusBadge` | `.badge`, `.text-bg-success` / `.text-bg-danger`... | Estados de sesión (colores), contador campanita |
| `Button` | `.btn`, `.btn-primary`, `.btn-ghost` | Acciones |
| Campos de formulario | `.form-control`, `.form-select`, `.form-label` | TextInput, Select, Textarea, NumberInput |
| `Modal` / `Drawer` | `.modal`, `.modal-dialog`, `.modal-content` (estado React) | Detalle de sesión, confirmaciones |
| `DataTable` | `.table`, `.table-hover` | Listados (coaches, atletas, logs) |
| `Tabs` | `.nav-tabs` (estado React) | Secciones dentro de pantallas (config, perfil) |
| `Alert` | `.alert`, `.alert-success`, `.alert-danger` | Mensajes de error, éxito, advertencia |
| `Card` | `.card`, `.card-body`, `.card-title` | Dashboards, métricas, plantillas |
| `Progress` | `.progress`, `.progress-bar` | Barras de cumplimiento |
| `ThemeSwitch` | atributo `data-bs-theme` (estado React) | Toggle dark/light |
| `Breadcrumb` | `.breadcrumb`, `.breadcrumb-item` | Navegación secundaria |
| `EmptyState` | `.card-body` con `BIcon` | Estados vacíos |
| `Tooltip` | `[data-bs-toggle="tooltip"]` + init en `useEffect` | Ayuda contextual |

> Iconos: Bootstrap Icons (`bi bi-*`) vía `components/ui/BIcon`. Los modales, dropdowns y tabs se manejan con estado React (no se carga el JS de AdminLTE/Bootstrap).

### Colores por estado de sesión

| Estado | Color Bootstrap/AdminLTE | Clase |
|--------|--------------------------|-------|
| Completada | `success` | `.text-bg-success` |
| Parcial | `warning` | `.text-bg-warning` |
| No realizada | `danger` | `.text-bg-danger` |
| Planificada (futuro) | `primary` | `.text-bg-primary` |
| En curso (hoy) | `cyan` | `.bg-cyan-lt` / `.text-cyan` |
| Descanso / sin asignar | `gray` | `.bg-secondary-lt` / `.text-secondary` |

### Pantallas principales y sus componentes

| Pantalla | Ruta | Componentes clave |
|----------|------|-------------------|
| Login | `/login` | `LoginForm` (email, password) |
| Dashboard Admin | `/admin/dashboard` | `StatsCards` (coaches, grupos, solicitudes pendientes) |
| Gestión Coaches | `/admin/coaches` | `CoachesList`, `CoachForm` (modal), `ConfirmDialog` |
| Gestión Grupos | `/admin/groups` | `GroupsList`, `GroupForm`, `RequestsPending`, `DirectorToggle` |
| Configuración | `/admin/settings` | `Tabs` (límites, motivos, tipos, email) + forms |
| Logs | `/admin/logs` | `LogsTable` con filtros de fecha/usuario/acción |
| Dashboard Coach | `/coach/dashboard` | `TeamSelector`, `StatsCards` (cumplimiento, alertas), `TodaySessions` |
| Teams | `/coach/teams` | `TeamsList`, `TeamForm`, `TeamAthletesManager` |
| Biblioteca Plantillas | `/coach/templates` | `TemplateList` (tabs: propias, oficiales, grupo) |
| Editor Plantilla | `/coach/templates/[id]` | `TemplateEditor`, `SectionEditor` (reordenable) |
| Calendario Coach | `/coach/calendar/...` | `MonthCalendar` (modo edición + drag), `WeekGenerator`, `SessionDetailPanel` |
| Métricas Team | `/coach/metrics` | `TeamMetricsPanel`, `ComplianceChart`, `LoadChart` |
| Dashboard Atleta | `/athlete/dashboard` | `TodaySession`, `WeekSummary`, `StreakBadge` |
| Calendario Atleta | `/athlete/calendar` | `MonthCalendar` (modo solo lectura + registro), `SessionForm` |
| Mis Métricas | `/athlete/metrics` | `AthleteMetricsPanel`, `ProgressChart`, `TypeDistributionChart` |
| Perfil | `/profile` | `ProfileForm`, `AvatarUpload`, `PasswordChange` |
| Centro Notificaciones | `/notifications` | `NotificationList` con filtros leídas/no leídas |
| Dashboard Director | `/director/dashboard` | `GroupMetricsPanel`, `TeamComparisonChart` |
| Anuncios | `/director/announcements` | `AnnouncementForm` (título, mensaje, preview) |

---

## 9. Persistencia y estado

### Persistencia

| Aspecto | Decisión |
|---------|----------|
| **Base de datos** | MySQL. Dev local (XAMPP), prod PlanetScale u otro MySQL. Acceso vía Drizzle ORM; en Cloudflare vía Hyperdrive. |
| **Migraciones** | `drizzle-kit generate` crea archivos SQL. `drizzle-kit migrate` aplica contra `DATABASE_URL` (local en desarrollo). Producción se configura en Fase 43. |
| **Gotcha `timestamp` nullable** | drizzle-kit no emite el keyword `NULL` para columnas MySQL: genera `resolved_at timestamp,` y MySQL/MariaDB (`NO_ZERO_DATE`) lo rechaza con `ERROR1067`. Tras cada `generate`, revisar migraciones con `timestamp,` sin `NOT NULL` y corregir a `timestamp NULL DEFAULT NULL` a mano antes de `migrate`. |
| **Seed** | `db/seed.ts` crea: usuario admin inicial, plantillas oficiales de ejemplo, configuración default en `settings`. |
| **Archivos** | Avatares en Cloudflare R2 (bucket privado). No se usa filesystem. |
| **Sesiones** | Tabla `sessions` de Lucia en MySQL. Cookie HttpOnly en navegador. |

### Estado de la aplicación

| Nivel | Estrategia |
|-------|-----------|
| **Persistente** | Todo vive en MySQL. No hay caché de cliente. |
| **Server-side (por request)** | RSC cargan datos directamente de DB en cada render. Next.js App Router cachea por request (no entre requests sin revalidación explícita). |
| **Client-side (UI local)** | Estado de componentes con `useState`/`useReducer`: mes seleccionado, modal abierto, tab activo, formulario en progreso. Se resetea al navegar. |
| **Entre páginas** | No hay estado global. Cada página RSC carga lo que necesita. La sesión (usuario, rol) vive en cookie y se lee en proxy + RSC. |
| **Actualización tras mutación** | Server Actions usan `revalidatePath()` o `revalidateTag()` de Next.js para refrescar los datos de la página después de una mutación. No se usa polling ni WebSockets. |
| **Rutas con sesión (Cache Components)** | Páginas que leen la sesión (cookie) usan `export const instant = false` (opt-out oficial de Next.js 16) para render dinámico en el servidor; adopción progresiva de `use cache: private` por ruta en fases futuras. |

### Flujo de datos típico

```
Página RSC (server)
  → readFromDB() con Drizzle
  → renderiza HTML con datos
  → envía al navegador

Usuario interactúa (client component)
  → Llama Server Action
    → Validación + lógica + escritura en DB
    → revalidatePath('/ruta/actual')
    → Retorna resultado
  → Next.js re-renderiza la RSC con datos frescos
  → HTML actualizado (sin refresh completo de página)
```

---

## 10. Validaciones y errores

### Estrategia de validación en dos capas

| Capa | Herramienta | Momento |
|------|-------------|---------|
| **Cliente** | React Hook Form + Zod | Al interactuar con formularios. Feedback inmediato sin roundtrip. |
| **Servidor** | Zod (mismo esquema) | En cada Server Action. Nunca confiar en el cliente. |

### Esquemas Zod clave

```typescript
// Ejemplo de esquemas compartidos (lib/validations/)

// Registro de sesión
sessionRecordSchema = z.object({
  assignmentId: z.string().uuid(),
  status: z.enum(['completed', 'partial']),
  distanceKm: z.number().positive().max(200),
  durationMinutes: z.number().int().positive().max(1440),
  rpe: z.number().int().min(1).max(10).optional(),
  comments: z.string().max(2000).optional(),
})

// Marcar no realizada
notDoneSchema = z.object({
  assignmentId: z.string().uuid(),
  reason: z.enum(['lesion', 'trabajo', 'enfermedad', 'personal', 'otro']),
  customReason: z.string().max(500).optional(),
}).refine(data => {
  if (data.reason === 'otro') return !!data.customReason
  return true
}, { message: 'Describe el motivo.' })

// Crear plantilla
templateSchema = z.object({
  name: z.string().min(1).max(150),
  sessionType: z.string().min(1).max(50),
  structure: z.array(sectionSchema).min(1),
})

sectionSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  title: z.string().min(1).max(100),
  type: z.enum(['warmup', 'main', 'cooldown', 'stretching', 'recovery', 'strength', 'custom']),
  content: z.string().min(1),
})
```

### Manejo de errores

| Tipo | Estrategia |
|------|-----------|
| **Error de validación (Zod)** | Server Action retorna `{ ok: false, errors: fieldErrors }`. Cliente muestra errores en el formulario correspondiente. |
| **Error de permiso** | Server Action retorna `{ ok: false, error: 'No autorizado' }`. UI muestra `Alert` con mensaje. |
| **Error de regla de negocio** | Server Action retorna `{ ok: false, error: 'mensaje específico' }` (ej. "Has alcanzado el límite de teams"). |
| **Error de DB (constraint, timeout)** | Server Action retorna `{ ok: false, error: 'Error interno. Intenta de nuevo.' }`. Se registra en Sentry. |
| **Error inesperado** | Error boundary de Next.js (`app/error.tsx`) muestra pantalla de error genérica con botón "Volver al inicio". Se registra en Sentry. |
| **Email fallido** | No bloquea la acción principal. Se registra en `audit_logs` con action='email_failed'. Se reintenta una vez. |

### Mensajes de error (alineados con `specs/mvp.md`)

| Situación | Mensaje |
|-----------|---------|
| Credenciales inválidas | "Email o contraseña incorrectos." |
| Cuenta desactivada | "Tu cuenta está desactivada. Contacta al administrador." |
| Sesión expirada | "Tu sesión ha expirado, inicia sesión nuevamente." |
| Email duplicado | "Ya existe un usuario con este email." |
| Edición fuera de ventana | "No puedes editar este registro. La ventana de edición (48h) ha expirado." |
| RPE fuera de rango | "El RPE debe estar entre 1 y 10." |
| Motivo "Otro" vacío | "Describe el motivo." |
| Límite teams | "Has alcanzado el límite de teams permitidos." |
| Límite atletas | "Has alcanzado el límite de atletas en este team." |
| Avatar muy grande | "La imagen es muy grande. El máximo es 2 MB." |
| Formato avatar | "Formato no soportado. Usa JPG, PNG o WebP." |
| Sesión futura | "No puedes registrar sesiones de días futuros." |
| Copiar sin semana anterior | "No hay semana anterior para copiar." |
| Multi-asignación vacía | "Selecciona al menos un atleta." |
| Solicitud duplicada | "Ya tienes una solicitud pendiente o aprobada para este grupo." |

---

## 11. Seguridad

| Aspecto | Medida |
|---------|--------|
| **Autenticación** | Lucia Auth. Sesiones en DB + cookie `HttpOnly; Secure; SameSite=Lax`. Expiración configurable. |
| **Autorización** | Middleware verifica sesión en cada request. Server Actions verifican rol + propiedad antes de cada operación. `lib/permissions/` centraliza las reglas. |
| **Contraseñas** | Hash con argon2id (o bcrypt con factor 12+). Nunca almacenar en texto plano. Contraseña temporal forzada a cambio (`must_change_password`). |
| **CSRF** | Server Actions de Next.js incluyen token CSRF automáticamente. |
| **SQL Injection** | Drizzle ORM usa queries parametrizadas. Nunca concatenar SQL manualmente. |
| **XSS** | React escapa output por defecto. No usar `dangerouslySetInnerHTML` con datos de usuario. Content Security Policy headers en Cloudflare. |
| **Rate limiting** | En login: limitar intentos fallidos (ej. 5 por IP en 15 min). En email: limitar envíos por usuario. Implementar con Cloudflare Rate Limiting (WAF) o contador en DB. |
| **Validación de archivos** | Avatar: verificar MIME type real (no solo extensión), tamaño máximo, dimensiones. |
| **Variables de entorno** | Secrets en Cloudflare Pages env vars (nunca en código). `.env.local` para desarrollo, `.gitignore` incluido. |
| **IP en auditoría** | Registrar `request.headers.get('cf-connecting-ip')` (Cloudflare) o `x-forwarded-for`. |
| **Acceso a R2** | Bucket privado. Solo URLs firmadas (expiran). Nunca exponer credenciales R2. |
| **HTTPS** | Cloudflare Pages fuerza HTTPS. Cookies con flag `Secure`. |

---

## 12. Orden de implementación

### Fase 1 — Fundación (sin dependencias)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 1.1 | Proyecto Next.js + TypeScript + ESLint/Prettier | `npm run dev` funciona, linting pasa |
| 1.2 | Configurar AdminLTE (`admin-lte`) + Bootstrap + AppShell layout | Layout con sidebar y header renderiza |
| 1.3 | Configurar Drizzle + schema de DB + migración inicial | Tablas creadas en MySQL local |
| 1.4 | Configurar Lucia Auth + proxy + login/logout | Login funciona, rutas protegidas redirigen |
| 1.5 | Seed: admin inicial + configuración default | Admin puede loguearse |
| 1.6 | Configurar Zod + React Hook Form + primer Server Action | Formulario login con validación |

**Hitos**: Usuario admin se loguea y ve el layout con sidebar.

### Fase 2 — Admin: Usuarios y Grupos (depende de Fase 1)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 2.1 | CRUD coaches (listado, crear, editar, desactivar) | Admin gestiona coaches |
| 2.2 | Email de invitación (Resend + React Email) | Coach recibe email |
| 2.3 | Reset password + must_change_password | Funciona el flujo de invitación |
| 2.4 | CRUD grupos | Admin crea/edita/elimina grupos |
| 2.5 | Solicitudes de unión (enviar, aprobar, rechazar) | Flujo completo coach→admin |
| 2.6 | Asignación/quitar Director Técnico | Admin gestiona directores |
| 2.7 | Auditoría básica (logs en acciones admin) | Logs visibles en `/admin/logs` |

**Hitos**: Admin da de alta un coach, crea un grupo, aprueba solicitud, asigna Director Técnico.

### Fase 3 — Teams y Atletas (depende de Fase 2)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 3.1 | CRUD teams (coach) con nombre default | Coach crea teams |
| 3.2 | Gestión de atletas (crear, asignar a teams) | Coach gestiona atletas |
| 3.3 | Listado de atletas con filtros (coach y admin) | Listados funcionan |
| 3.4 | Traslado de atletas entre teams (admin) | Traslado con auditoría |
| 3.5 | Perfiles de atletas (datos físicos opcionales) | Perfil editable |

**Hitos**: Coach crea team, registra atletas, los asigna. Admin los ve globalmente.

### Fase 4 — Plantillas (depende de Fase 3)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 4.1 | Schema de templates + template_sections (JSON) | DB lista |
| 4.2 | CRUD plantillas (crear, editar, eliminar) | Coach crea plantillas |
| 4.3 | Editor de secciones (reordenar, añadir, eliminar) | Estructura flexible funciona |
| 4.4 | Clonar plantilla (propia, oficial) | Clon crea copia editable |
| 4.5 | Compartir al grupo + visibilidad | Coach comparte, otro coach ve y clona |
| 4.6 | Plantillas oficiales (CRUD admin + seed) | Admin gestiona oficiales, coaches clonan |
| 4.7 | Validación de plantilla (nombre + al menos 1 sección) | No se guardan vacías |

**Hitos**: Coach crea, edita, clona y comparte plantillas. Ve las oficiales.

### Fase 5 — Calendario y Planificación (depende de Fase 4)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 5.1 | Schema de session_assignments | DB lista |
| 5.2 | Vista calendario atleta (solo lectura, colores) | Atleta ve su calendario |
| 5.3 | Vista calendario coach (con badge cumplimiento) | Coach ve calendario de atletas |
| 5.4 | Drag & drop plantillas → días (@dnd-kit) | Asignación funciona |
| 5.5 | Generador de semana tipo | Genera semana según patrón |
| 5.6 | Multi-asignación (varios atletas) | Asigna a N atletas de una vez |
| 5.7 | Copiar semana anterior | Copia con opción de editar |
| 5.8 | Panel detalle de sesión (planificado) | Click día → detalle completo |

**Hitos**: Coach planifica una semana completa con drag & drop. Atleta ve el plan.

### Fase 6 — Registro de Sesiones (depende de Fase 5)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 6.1 | Schema de session_records + session_feedback | DB lista |
| 6.2 | Formulario de registro atleta (distancia, tiempo, RPE, comentarios) | Atleta registra sesión |
| 6.3 | Estados automáticos (completada, parcial, en curso, no realizada) | Colores correctos en calendario |
| 6.4 | Marcar "no realizada" con motivo predefinido + libre | Motivo funciona |
| 6.5 | Ventana de edición 24-48h (configurable) | Bloqueo fuera de ventana |
| 6.6 | Validaciones server-side (RPE, futuro, distancia/tiempo) | Errores correctos |
| 6.7 | Feedback del coach en sesión | Coach comenta, atleta ve |
| 6.8 | Notificaciones in-app al registrar + feedback | Campanita funciona |
| 6.9 | Email al coach al completar sesión | Email se envía |

**Hitos**: Flujo completo atleta registra → coach ve → coach comenta → atleta recibe notificación.

### Fase 7 — Métricas (depende de Fase 6)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 7.1 | Funciones puras: cumplimiento, carga, distribución, rachas | Tests unitarios pasan |
| 7.2 | Panel métricas atleta (cards + gráficas Recharts) | Atleta ve sus métricas |
| 7.3 | Progresión semanal (gráfica línea) | Gráfica renderiza datos reales |
| 7.4 | VO2max estimado + zonas FC (si perfil completo) | Métricas fisiológicas calculadas |
| 7.5 | Panel métricas team (buckets cumplimiento + alertas) | Coach ve resumen team |
| 7.6 | Panel métricas grupo (comparativa teams) | Director Técnico ve comparativa |
| 7.7 | Actualización al guardar registro | Métricas frescas sin recargar |
| 7.8 | Fórmulas TRIMP/TSS (si hay datos FC) | Calculadas cuando hay datos |

**Hitos**: Las 3 vistas de métricas funcionan con datos reales.

### Fase 8 — Notificaciones completas (depende de Fase 6)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 8.1 | Schema de notifications | DB lista |
| 8.2 | Centro de notificaciones (lista, marcar leída) | Campanita + página funciona |
| 8.3 | Todos los triggers in-app (plan, cambio, feedback, etc.) | Eventos generan notificaciones |
| 8.4 | Email templates (React Email): bienvenida, plan, sesión, anuncio | Emails se envían |
| 8.5 | Anuncios masivos (Admin/DT → grupo) | Anuncio llega a todos |
| 8.6 | Contador no leídas en header | Badge actualizado |

**Hitos**: Todos los eventos generan notificaciones in-app. Emails críticos se envían.

### Fase 9 — Avatar (independiente, puede hacerse en paralelo)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 9.1 | Configurar R2 + presigned URLs | Upload funciona |
| 9.2 | Client-side resize (canvas) + strip EXIF | Imagen se redimensiona |
| 9.3 | Avatar con fallback de iniciales (SVG) | Muestra iniciales sin foto |
| 9.4 | Subir/eliminar avatar en perfil | Flujo completo |
| 9.5 | Mostrar avatar en header, listas, perfiles | Consistencia visual |

**Hitos**: Usuario sube foto, se muestra en header y listas.

### Fase 10 — Export (depende de Fase 7)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 10.1 | Export PDF de métricas atleta (react-pdf) | PDF descargable |
| 10.2 | Export Excel de métricas atleta/team (exceljs) | XLSX descargable |
| 10.3 | Export CSV de listados globales (admin) | CSV descargable |
| 10.4 | Selector de periodo (temporada, año, personalizado) | Filtro funciona |

**Hitos**: Coach exporta métricas de atleta a PDF y Excel.

### Fase 11 — Panel Admin completo (depende de Fase 2)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 11.1 | Configuración global (settings: límites, motivos, tipos) | Admin edita settings |
| 11.2 | Plantillas de email editables | Admin edita HTML de email |
| 11.3 | Logs de auditoría con filtros | Admin consulta logs |
| 11.4 | Mantenimiento (limpieza avatares huérfanos) | Función disponible |
| 11.5 | Dashboard admin (stats cards) | Resumen visible |

**Hitos**: Admin tiene control total del sistema.

### Fase 12 — Director Técnico completo (depende de Fase 7)

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 12.1 | Dashboard Director Técnico | Resumen del grupo |
| 12.2 | Vista solo lectura de atletas del grupo | DT ve atletas en modo lectura |
| 12.3 | Comparativa teams + cumplimiento por coach | Gráficas del grupo |
| 12.4 | Anuncios masivos (ya en Fase 8) | Completado |
| 12.5 | Export del grupo | PDF/Excel del grupo |

**Hitos**: Director Técnico tiene visibilidad total de su grupo.

### Fase 13 — Pulido y testing

| # | Tarea | Resultado verificable |
|---|-------|-----------------------|
| 13.1 | Tests unitarios de métricas y servicios (Vitest) | Cobertura de lógica crítica |
| 13.2 | Tests E2E de flujos principales (Playwright) | Flujo coach, atleta, admin |
| 13.3 | Responsive (mobile, tablet) | Todas las pantallas adaptan |
| 13.4 | Estados vacíos y mensajes de error | UX completa |
| 13.5 | Sentry configurado | Errores reportados |
| 13.6 | CI/CD (GitHub Actions → Cloudflare Pages) | Deploy automático en push |
| 13.7 | Rate limiting en login | Protección implementada |

**Hitos**: MVP listo para producción.

---

## 13. Consideraciones técnicas

### Decisiones técnicas importantes

| Decisión | Justificación |
|----------|---------------|
| **Server Actions en vez de API routes** | Coherente con "sin API pública". Next.js maneja CSRF y validación. Menos boilerplate. |
| **Drizzle en vez de Prisma** | Prisma tiene problemas conocidos con Cloudflare Workers (necesita engine binario). Drizzle es puro JS/TS, funciona en edge. |
| **Lucia Auth en vez de NextAuth** | NextAuth está orientado a OAuth/Next.js. Lucia es más simple para credenciales + sesiones en DB propia, y es multi-runtime. |
| **Estructura JSON en `templates.structure`** | La estructura de plantillas es flexible (coach reordena, añade, elimina secciones). Una tabla normalizada por sección añade complejidad innecesaria para el MVP. JSON con schema Zod es suficiente. |
| **Métricas calculadas on-the-fly** | No se almacenan métricas precalculadas (evita problemas de consistencia). Drizzle + índices hacen las queries rápidas. Si hay problemas de performance, se puede añadir caché después. |
| **`week_start` como identificador de semana** | Campo `date` con el lunes de la semana. Simplifica consultas por semana sin funciones de fecha complejas. |
| **Soft delete para coaches** | Preserva historial de entrenamientos y métricas. La eliminación definitiva es solo para coaches sin datos. |
| **@dnd-kit para drag & drop** | Alternativa ligera a react-dnd. Accesible (teclado), compatible con React 18+, funciona en client components. |

### Limitaciones del runtime Edge

| Limitación | Impacto | Solución |
|-----------|---------|----------|
| No hay `fs` | No se puede leer/escribir archivos localmente | R2 para avatares |
| No hay `net`/`dns` | No se puede usar SMTP directo | Resend API (HTTPS) |
| Timeout de funciones ~50s | Queries muy lentas pueden fallar | Hyperdrive (pooling + cache), índices en DB |
| No hay cron jobs nativos | No se puede ejecutar tareas programadas | Cloudflare Workers Cron Triggers (para recordatorios futuros) |
| `crypto` limitado | Algunos módulos de Node no disponibles | Usar Web Crypto API (disponible en Workers) |

### Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Prisma/Drizzle incompatibilidad con Cloudflare** | Baja (Drizzle es compatible) | Alto | Elegir Drizzle desde el inicio. Probar conexión temprano en Fase 1. |
| **Rendimiento de métricas con muchos datos** | Media (con el tiempo) | Medio | Índices en DB. Si es necesario, caché en Redis/Upstash (fase futura). |
| **@dnd-kit + calendario complejo** | Media | Medio | Empezar con click-to-assign como fallback. Drag & drop como mejora. |
| **Resend límites de email (3k/mes)** | Baja (MVP pequeño) | Bajo | Monitorear uso. Escalar a plan pago si es necesario. |
| **PlanetScale sin free tier** (ocurrió: eliminado abril 2024) | Ya materializado | Alto | Dev con MySQL local (XAMPP); Drizzle es ORM-agnostic. Producción: PlanetScale de pago u otro MySQL (Aiven, Railway) vía `DATABASE_URL`. |
| **Lucia Auth depreca cambios** | Baja | Medio | Lucia es una librería pequeña y estable. Si cambia, la capa de auth está aislada en `lib/auth/`. |
| **Zona horaria de Chile** | Baja | Bajo | Usar `date-fns-tz` o `Intl.DateTimeFormat` con timezone `America/Santiago` para fechas. |

### Preparación para futuro (no en MVP pero no bloquear)

| Aspecto | Preparación |
|---------|-------------|
| **Multi-idioma** | next-intl configurado con locale `es-CL`. Estructura de mensajes en JSON. |
| **Dominio propio** | Cloudflare Pages soporta custom domains. Solo cambiar DNS. |
| **Pagos** | El modelo de datos no asume un solo plan/tenant. Se puede añadir tabla `subscriptions` después. |
| **Integraciones (Strava, etc.)** | La estructura de `session_records` es compatible con importar datos externos (distancia, tiempo, FC). |
| **D1 como DB alternativa** | Drizzle soporta MySQL y SQLite/D1. Si se migra, cambiar solo el driver. |

---

*Documento generado a partir de `AGENTS.md` y `specs/mvp.md` — RunOsorno. Define cómo se construirá el MVP. Puede dividirse en tareas pequeñas, independientes y verificables siguiendo el orden de implementación de la Sección 12.*
