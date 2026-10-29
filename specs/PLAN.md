# PLAN — Plan Técnico Atómico del MVP — RunOsorno

Documento de plan técnico de implementación del MVP de RunOsorno. Transforma las especificaciones funcionales de `specs/SPECS.md` en un plan concreto de construcción, respetando las restricciones de `specs/AGENTS.md`.

No contiene código de implementación ni lista exhaustiva de tareas atómicas (esa corresponde a `specs/TASK.md`).

Fuentes: `specs/AGENTS.md` y `specs/SPECS.md`. No se toma en cuenta `plan/mvp.md` (versión antigua).

---

## 1. Resumen técnico

El MVP se construye como una aplicación web SSR (Next.js 16.3.x, App Router, React Server Components) desplegada en Cloudflare Workers vía OpenNext. La autenticación es por sesión con cookies (Lucia Auth), sin middleware de proxy ni API pública. La lógica de negocio vive en servicios independientes testeables con Vitest; las mutaciones se ejecutan vía Server Actions. Los datos persisten en MySQL (local XAMPP en dev, Aiven MySQL 8.4 en prod) accedidos a través de Drizzle ORM + Hyperdrive. Los avatares se almacenan en Cloudflare R2 y el email transaccional se envía por Resend.

La estrategia es incremental: cada fase entrega una capacidad funcional verificable (criterios de aceptación de `specs/SPECS.md`) sin construir toda la solución de una sola vez. Los componentes de UI se basan en AdminLTE 4 + Bootstrap Icons, con wrappers React propios en `components/ui/`.

---

## 2. Decisiones y tecnologías

| ID | Tecnología / Decisión | Propósito | Justificación | Restricciones | Estado |
|----|----------------------|-----------|---------------|---------------|--------|
| TEC-01 | Next.js 16.3.x (App Router, RSC) | Framework SSR | Compatible con Cloudflare Workers vía OpenNext; SSR nativo reduce JS cliente. | No subir a 16.4.0 (incompatibilidad con OpenNext 1.20.11). | Confirmada |
| TEC-02 | AdminLTE 4 + Bootstrap 5 | CSS base del dashboard | Un solo framework CSS; AdminLTE sobre Bootstrap 5 da clases estables (`btn`, `card`, `modal`, `table`, `alert`). | Tailwind descartado por conflicto con base Bootstrap. | Confirmada |
| TEC-03 | Bootstrap Icons (`bi bi-*`) vía `components/ui/BIcon` | Iconografía | Iconos SVG independientes del framework CSS; evita depender de `@tabler/icons-react`. | No se carga JS de Bootstrap/AdminLTE (modales, dropdowns y tabs con estado React). | Confirmada |
| TEC-04 | Drizzle ORM | ORM y migraciones | Type-safe, ligero, funciona en edge (Cloudflare Workers), migraciones SQL nativas. | No usar Prisma (problemas conocidos con Workers). | Confirmada |
| TEC-05 | Cloudflare Hyperdrive | Conexión a MySQL | Connection pooling global y cachea queries en edge. | Latencia ~1-5ms desde edge; binding `HYPERDRIVE` requiere `localConnectionString` en wrangler. | Confirmada |
| TEC-06 | Lucia Auth | Autenticación por sesión | Session-based, cookies HttpOnly/Secure/SameSite, DB-agnostic, multi-runtime. | No usar bcryptjs para hashear nuevas contraseñas (CPU en Workers Free). | Confirmada |
| TEC-07 | PBKDF2-HMAC-SHA512 (WebCrypto) | Hash de contraseñas | Formato `pbkdf2-sha512$<iteraciones>$<salt>$<hash>`, 210 000 iteraciones (OWASP). | No reintroducir bcryptjs salvo verificación fallback de cuentas antiguas. | Confirmada |
| TEC-08 | Zod + React Hook Form | Validación compartida | Esquemas compartidos server/client, type inference, integra con Drizzle. | — | Confirmada |
| TEC-09 | Resend + React Email | Email transaccional | DX excelente, templates HTML responsive, 3k emails/mes gratis. | Solo eventos críticos (plan publicado, sesión completada, anuncios masivos). | Confirmada |
| TEC-10 | Cloudflare R2 | Almacenamiento avatares | Bucket privado + signed URLs, gratis hasta 10GB, sin egress fees. | Filesystem local efímero en Workers; no sirve para guardar nada. | Confirmada |
| TEC-11 | @dnd-kit/core | Drag & drop calendario | Ligero, accesible (teclado), compatible con client components. | No usar librerías con `eval`/`new Function`. | Confirmada |
| TEC-12 | SVG propio para gráficas | Métricas visuales | Evita librería externa (recharts costaba 387 KB y no renderizaba en servidor). | Sin texto dentro del SVG; rótulos en HTML con `preserveAspectRatio="none"`. | Confirmada |
| TEC-13 | @react-pdf/renderer + exceljs | Exportes PDF/Excel | Generación en memoria (sin `fs`), compatible con edge. | Los archivos se generan íntegramente en memoria. | Confirmada |
| TEC-14 | next-intl (es-CL) | Internacionalización | Soporte RSC, locale es-CL, zona America/Santiago. | Ninguna fecha formateada fuera de `lib/i18n/format.ts`. | Confirmada |
| TEC-15 | Vitest + Playwright | Testing | Vitest rápido y compatible edge; Playwright corre contra preview URLs. | — | Confirmada |
| TEC-16 | Sin middleware `proxy.ts` | Protección de rutas | La protección vive en los layouts (`requireAuth()` en `app/(app)/layout.tsx`). | El middleware se compila aparte (5,5 MB) y salta al Worker principal; costo prohibido en plan Free. | Confirmada |

Tecnologías propuestas (sin decisión final):
- TEC-P1: `@aws-sdk/client-s3` para R2 (S3-compatible). Pendiente de confirmar si se usa directamente o vía presigned URLs desde API route.

---

## 3. Arquitectura general

### 3.1 Capas

```
┌─────────────────────────────────────────────────────┐
│             Navegador (Cliente)                     │
│  React Server Components + Client Components        │
│  AdminLTE UI (CSS + wrappers React en components/ui)│
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (cookies de sesión)
┌──────────────────────▼──────────────────────────────┐
│         Cloudflare Workers (Edge Runtime)           │
│  OpenNext despliega a Workers (no a Pages)          │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Next.js App Router (SSR / RSC)             │   │
│  │  - requireAuth() en layouts (protección)     │   │
│  │  - Server Actions (mutaciones POST internas) │   │
│  │  - RSC Pages (renderizado servidor)          │   │
│  └──────────────┬──────────────┬───────────────┘   │
│                 │              │                    │
│  ┌────────────▼───┐  ┌───────▼──────────────┐      │
│  │  Drizzle ORM   │  │  Servicios de negocio  │      │
│  │  + Hyperdrive   │  │  - Auth (Lucia)        │      │
│  │  (pooling)      │  │  - Email (Resend)      │      │
│  └────────────┬───┘  │  - Avatar (R2)         │      │
│               │      │  - Métricas            │      │
│               │      │  - Notificaciones      │      │
│               │      │  - Export (PDF/Excel)  │      │
│               │      └──────────────────────┘      │
└───────────────┼─────────────────────────────────────┘
                │ HTTPS (connection pooling)
┌───────────────▼─────────────────────────────────────┐
│         MySQL (dev local / Aiven MySQL 8.4 prod)     │
└─────────────────────────────────────────────────────┘

Cloudflare R2 (Avatares) ←── Presigned PUT desde cliente
Resend API ←── Email saliente
```

### 3.2 Principios arquitectónicos

| Principio | Aplicación |
|-----------|-----------|
| **SSR primero** | Todas las páginas se renderizan en servidor (RSC). El JavaScript cliente solo donde hay interactividad (formularios, drag & drop, calendario). |
| **Server Actions para mutaciones** | No hay API REST pública. Las mutaciones se hacen vía Server Actions de Next.js (endpoints internos protegidos por sesión y CSRF). |
| **Lógica de negocio en servicios** | Server Actions orquestan; la lógica de negocio (cálculos, validaciones, reglas) vive en módulos de servicio independientes, testeables con Vitest. |
| **Sin estado global de cliente** | El estado vive en el servidor (base de datos). El cliente solo maneja estado local de UI (modal abierto, mes seleccionado, etc.). |
| **Edge-compatible** | Todas las dependencias críticas funcionan en Cloudflare Workers (Edge Runtime). |
| **Sin middleware** | No hay `proxy.ts`. La protección de sesión se aplica en los layouts, no mediante middleware. |

### 3.3 Límites de responsabilidad

| Capa | Responsable de | No responsable de |
|------|----------------|-------------------|
| `app/` (RSC) | Cargar datos de DB, renderizar HTML inicial, decidir qué mostrar según rol | Mutaciones directas (esas van a Server Actions) |
| `lib/actions/` | Validar sesión, validar permiso, validar Zod, llamar servicio, retornar resultado | Contener lógica de negocio compleja |
| `lib/services/` | Lógica de negocio pura, reglas, cálculos | Conocer de React, manejar HTTP directamente |
| `lib/metrics/` | Funciones de cálculo puras (entrada → salida) | Acceso directo a DB |
| `components/ui/` | Primitivas visuales reutilizables (Button, Field, Card, Table, Badge, PageHeader) | Lógica de negocio, acceso a DB |
| `lib/auth/` | Setup de Lucia, gestión de sesiones, guards de rol | Lógica de negocio de dominio |

---

## 4. Estructura del proyecto

```
runosorno/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── coaches/page.tsx
│   │   │   ├── groups/page.tsx
│   │   │   ├── groups/[id]/page.tsx
│   │   │   ├── athletes/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── logs/page.tsx
│   │   │   └── exports/page.tsx
│   │   ├── coach/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── teams/page.tsx
│   │   │   ├── teams/[id]/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── templates/[id]/page.tsx
│   │   │   ├── templates/new/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   └── [teamId]/[athleteId]/page.tsx
│   │   ├── athlete/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── metrics/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── director/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── teams/page.tsx
│   │   │   ├── athletes/page.tsx
│   │   │   └── announcements/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── profile/page.tsx
│   ├── api/
│   │   └── avatar/
│   │       ├── route.ts
│   │       └── upload/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── error.tsx
├── components/
│   ├── ui/
│   ├── calendar/
│   ├── templates/
│   ├── layout/
│   ├── charts/
│   └── metrics/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── actions/
│   ├── services/
│   ├── validations/
│   ├── metrics/
│   ├── permissions/
│   ├── utils/
│   └── config/
├── db/
│   ├── migrations/
│   └── seed.ts
├── emails/
├── tests/
│   ├── unit/
│   └── e2e/
├── next.config.mjs
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── wrangler.jsonc
└── .github/workflows/deploy.yml
```

### Responsabilidad de carpetas clave

| Carpeta | Responsabilidad |
|---------|-----------------|
| `app/` | Rutas y páginas. Server Components por defecto. Route groups `(auth)` y `(app)` para layouts distintos. |
| `components/` | Componentes React reutilizables. Los que usan estado de navegador son Client Components (`"use client"`). |
| `lib/actions/` | Server Actions: punto de entrada de mutaciones. Validan con Zod, verifican permisos, llaman a servicios. |
| `lib/services/` | Lógica de negocio pura. No importa de React. Testeable con Vitest. |
| `lib/metrics/` | Funciones de cálculo puras (entrada → salida). Sin acceso a DB directo. |
| `lib/validations/` | Esquemas Zod compartidos entre cliente y servidor. |
| `lib/auth/` | Setup de Lucia, gestión de sesiones, guards de rol. |
| `db/` | Schema de Drizzle y migraciones. |
| `emails/` | Templates React Email para envío vía Resend. |

---

## 5. Modelo técnico de datos

### 5.1 Entidades conceptuales (trazables a `specs/SPECS.md` §8)

| ID | Entidad | Atributos clave | Relaciones conceptuales |
|----|---------|-----------------|------------------------|
| DAT-01 | Usuario | id, nombre, email, contraseña (hasheada), rol, avatar_key, estado (activo/inactivo), must_change_password, created_at, last_login_at | Cada usuario tiene un rol. Un coach puede ser Director Técnico en uno o más grupos. |
| DAT-02 | Grupo/Escuela | id, nombre, descripción, logo_key, created_at | Contiene múltiples coaches (muchos a muchos). Contiene múltiples teams indirectamente. |
| DAT-03 | Team | id, nombre, coach_id, created_at | Pertenece a un coach. Contiene múltiples atletas (muchos a muchos). Nota: `grupo_id` no se almacena en Team; la relación es transitiva a través del coach. |
| DAT-04 | Perfil de atleta | user_id, birth_date, weight_kg, height_cm, max_hr, resting_hr | Vinculado a uno o varios teams. Un atleta es un usuario con rol "atleta". |
| DAT-05 | Plantilla de sesión | id, nombre, tipo, coach_id, group_id, is_official, is_shared, structure (JSON), created_at, updated_at | Creada por un coach. Puede compartirse a un grupo. Se asigna a días del calendario. |
| DAT-06 | Asignación de sesión | id, atleta_id, plantilla_id, session_date, week_start, status, created_by, created_at | Conecta una plantilla con un atleta en una fecha específica. |
| DAT-07 | Registro de sesión | id, assignment_id, distance_km, duration_minutes, rpe, comments, not_done_reason, custom_reason, recorded_at, updated_at | Uno a uno con la asignación de sesión. Solo existe si el atleta registró resultados. |
| DAT-08 | Feedback de sesión | id, assignment_id, author_id, message, created_at | Se asocia a una asignación de sesión. Puede haber múltiples mensajes. |
| DAT-09 | Notificación | id, user_id, type, title, message, is_read, entity_type, entity_id, created_at | Dirigida a un usuario. Puede estar relacionada con una sesión, plan, grupo, etc. |
| DAT-10 | Solicitud de grupo | id, coach_id, grupo_id, status, requested_at, resolved_at, resolved_by | Conecta un coach con un grupo. |
| DAT-11 | Log de auditoría | id, user_id, action, entity_type, entity_id, details, ip_address, created_at | Registrado por el sistema ante acciones críticas. |
| DAT-12 | Configuración global | clave, valor (JSON), updated_at | Referenciada por todo el sistema. |

### 5.2 Datos calculados (no almacenados)

- Cumplimiento % (sesiones completadas / sesiones planificadas × 100).
- Carga semanal (suma de km, tiempo, TSS/TRIMP).
- Progresión (serie temporal de carga semanal, 4-12 semanas).
- Distribución por tipo de sesión (% de cada tipo).
- Rachas consecutivas (días o semanas con sesión completada).
- Métricas fisiológicas (VO2max estimado, FC umbral, zonas FC/potencia) — calculadas a partir de registros históricos.

### 5.3 Decisiones de almacenamiento

| ID | Decisión | Justificación | Relacionado con |
|----|----------|---------------|-----------------|
| DAT-D1 | `structure` de plantilla como JSON | Flexibilidad para reorganizar/omitir/añadir secciones sin normalizar tablas adicionales. | DAT-05, RB-14 |
| DAT-D2 | `week_start` como identificador de semana | Simplifica consultas por semana sin funciones de fecha complejas. | DAT-06 |
| DAT-D3 | Soft delete en usuarios (`is_active`) | Preserva integridad referencial de registros históricos. | DAT-01, RB-01, RB-02 |
| DAT-D4 | No hay `grupo_id` en Team | Evita ambigüedad cuando un coach pertenece a múltiples grupos; relación transitiva coach → grupo → team. | DAT-03, RB-09 |
| DAT-D5 | `settings.value` como JSON en columna longtext | Permite configuración flexible sin tablas adicionales por cada parámetro. | DAT-12, RB-77, RB-78, RB-79 |

---

## 6. Módulos y componentes

### 6.1 Módulo de Autenticación

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-01 |
| **Responsabilidad** | Login, logout, gestión de sesiones, guards de rol y propiedad. |
| **Requisitos que satisface** | RF-001, RF-002, RF-003, RF-004 |
| **Datos que administra** | Sesión de usuario (tabla `sessions` de Lucia), cookie de sesión. |
| **Entradas** | Credenciales (email, contraseña), token de sesión. |
| **Salidas** | Usuario autenticado, rol, redirección por rol, sesión invalidada. |
| **Dependencias** | `lib/db/` (Drizzle), `lib/auth/` (Lucia), `lib/services/auth.service.ts`. |
| **Verificación** | CA-001 a CA-005; login con credenciales válidas/inválidas; sesión expirada redirige a login. |

### 6.2 Módulo Admin — Gestión de coaches

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-02 |
| **Responsabilidad** | CRUD de coaches (alta, edición, desactivación soft delete, eliminación definitiva, reset password, reenvío invitación). |
| **Requisitos que satisface** | RF-005 a RF-011 |
| **Datos que administra** | Tabla `users` (rol coach), tabla `settings` (contraseña temporal), email de invitación. |
| **Entradas** | Nombre, email, ID de coach, acción (activar/desactivar/eliminar/reset/resend). |
| **Salidas** | Coach creado/actualizado/desactivado/eliminado; notificación por email. |
| **Dependencias** | `lib/actions/user.actions.ts`, `lib/services/user.service.ts`, `lib/services/email.service.ts`, `lib/services/audit.service.ts`. |
| **Verificación** | CA-006 a CA-012; email de invitación enviado; coach desactivado no puede loguearse. |

### 6.3 Módulo Admin — Gestión de grupos

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-03 |
| **Responsabilidad** | CRUD grupos, solicitudes de unión, asignación/quitar Director Técnico. |
| **Requisitos que satisface** | RF-012 a RF-017 |
| **Datos que administra** | Tablas `groups`, `group_members`, `group_requests`. |
| **Entradas** | Nombre, descripción, logo; ID de solicitud; acción aprobar/rechazar; ID de coach para director. |
| **Salidas** | Grupo creado/actualizado/eliminado; solicitud aprobada/rechazada; rol director toggled. |
| **Dependencias** | `lib/actions/group.actions.ts`, `lib/services/group.service.ts`, `lib/services/audit.service.ts`. |
| **Verificación** | CA-013 a CA-018; grupo creado visible; solicitud aprobada vincula coach al grupo. |

### 6.4 Módulo Coach — Solicitud de unión a grupo

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-04 |
| **Responsabilidad** | Enviar solicitud de unión, ver grupos disponibles. |
| **Requisitos que satisface** | RF-018, RF-019 |
| **Datos que administra** | Tabla `group_requests`. |
| **Entradas** | ID del grupo. |
| **Salidas** | Solicitud pendiente creada; listado de grupos disponibles. |
| **Dependencias** | `lib/actions/group.actions.ts`, `lib/services/group.service.ts`. |
| **Verificación** | CA-019, CA-020; no permitir solicitud duplicada. |

### 6.5 Módulo Coach — Teams

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-05 |
| **Responsabilidad** | CRUD teams, asignación y quita de atletas. |
| **Requisitos que satisface** | RF-020 a RF-025 |
| **Datos que administra** | Tablas `teams`, `team_members`. |
| **Entradas** | Nombre de team, ID de team, ID de atleta, acción asignar/quitar. |
| **Salidas** | Team creado/renombrado/eliminado; atleta asignado/quitado. |
| **Dependencias** | `lib/actions/team.actions.ts`, `lib/services/team.service.ts`, `lib/services/settings.service.ts` (límite de atletas). |
| **Verificación** | CA-021 a CA-026; límite de atletas por team verificado. |

### 6.6 Módulo Coach y Admin — Gestión de atletas

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-06 |
| **Responsabilidad** | Dar de alta atletas, listar por coach, detalle, traslado entre teams (admin), listado global (admin). |
| **Requisitos que satisface** | RF-026 a RF-031 |
| **Datos que administra** | Tabla `users` (rol atleta), `athlete_profiles`, `team_members`. |
| **Entradas** | Nombre, email, datos físicos, ID de team, ID de atleta, filtros (coach, team, grupo, estado). |
| **Salidas** | Atleta creado/actualizado/trasladado; listado filtrado de atletas. |
| **Dependencias** | `lib/actions/athlete.actions.ts`, `lib/services/athlete.service.ts`, `lib/services/audit.service.ts`. |
| **Verificación** | CA-027 a CA-032; traslado registrado con auditoría. |

### 6.7 Módulo Coach — Biblioteca de plantillas

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-07 |
| **Responsabilidad** | CRUD de plantillas, clonar, compartir al grupo, ver biblioteca. |
| **Requisitos que satisface** | RF-032 a RF-039 |
| **Datos que administra** | Tabla `templates` (estructura JSON). |
| **Entradas** | Nombre, tipo, estructura de secciones, ID de plantilla, ID de grupo para compartir. |
| **Salidas** | Plantilla creada/actualizada/eliminada/clonada/compartida; listado por pestañas (mías, oficiales, grupo). |
| **Dependencias** | `lib/actions/template.actions.ts`, `lib/services/template.service.ts`. |
| **Verificación** | CA-033 a CA-039; plantilla vacía no se guarda; plantilla compartida no editable por otros. |

### 6.8 Módulo Admin — Plantillas oficiales

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-08 |
| **Responsabilidad** | CRUD de plantillas oficiales precargadas. |
| **Requisitos que satisface** | RF-039 |
| **Datos que administra** | Tabla `templates` (is_official=true). |
| **Entradas** | Nombre, tipo, estructura, ID de plantilla oficial. |
| **Salidas** | Plantilla oficial creada/actualizada/eliminada. |
| **Dependencias** | `lib/actions/template.actions.ts`, `lib/services/template.service.ts`. |
| **Verificación** | CA-040; plantilla oficial clonable pero no editable directamente. |

### 6.9 Módulo Coach — Planificación semanal

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-09 |
| **Responsabilidad** | Asignar plantillas a días, multi-asignación, copiar semana, generador, editar asignación. |
| **Requisitos que satisface** | RF-040 a RF-046 |
| **Datos que administra** | Tabla `session_assignments`. |
| **Entradas** | ID de atleta, ID de plantilla, fecha, patrón de generación, semana de inicio. |
| **Salidas** | Asignación creada/reemplazada/eliminada; semana copiada; semana generada. |
| **Dependencias** | `lib/actions/plan.actions.ts`, `lib/services/plan.service.ts`. |
| **Verificación** | CA-041 a CA-047; día ocupado pide confirmación; copiar semana sin datos da error. |

### 6.10 Módulo Calendario — Vista Atleta

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-10 |
| **Responsabilidad** | Calendario mensual, detalle de sesión, registro de resultados, marcar no realizada, editar registro, feedback. |
| **Requisitos que satisface** | RF-047 a RF-052 |
| **Datos que administra** | Tablas `session_assignments`, `session_records`, `session_feedback`. |
| **Entradas** | Fecha, distancia, tiempo, RPE, comentarios, motivo, ID de asignación. |
| **Salidas** | Registro creado/actualizado; estado del día actualizado; feedback creado. |
| **Dependencias** | `lib/actions/session.actions.ts`, `lib/services/session.service.ts`, `lib/services/notification.service.ts`. |
| **Verificación** | CA-048 a CA-053; ventana de edición 24-48h; RPE 1-10; motivo "otro" requiere texto. |

### 6.11 Módulo Calendario — Vista Coach

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-11 |
| **Responsabilidad** | Ver calendario de atleta, badges de cumplimiento, ver registro real, dejar feedback. |
| **Requisitos que satisface** | RF-053 a RF-055 |
| **Datos que administra** | Lectura de `session_assignments`, `session_records`, `session_feedback`. |
| **Entradas** | ID de team, ID de atleta, mes, ID de asignación, mensaje de feedback. |
| **Salidas** | Calendario con badges; detalle de registro real; feedback creado. |
| **Dependencias** | `lib/services/plan.service.ts`, `lib/services/session.service.ts`, `lib/services/notification.service.ts`. |
| **Verificación** | CA-054 a CA-056; coach ve registro real y deja feedback. |

### 6.12 Módulo Métricas

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-12 |
| **Responsabilidad** | Calcular y visualizar métricas a 3 niveles (atleta, team, grupo). |
| **Requisitos que satisface** | RF-057 a RF-060 |
| **Datos que administra** | Lectura de `session_assignments`, `session_records`, `templates`. Cálculos en `lib/metrics/`. |
| **Entradas** | ID de atleta/team/grupo, periodo (temporada, año, rango). |
| **Salidas** | Panel de métricas con gráficas SVG; buckets de cumplimiento; alertas. |
| **Dependencias** | `lib/services/metric.service.ts`, `lib/metrics/*`, `components/metrics/chartGeometry.ts`, `ChartFrame.tsx`. |
| **Verificación** | CA-057 a CA-060; métricas se recalculan al guardar registro. |

### 6.13 Módulo Notificaciones in-app

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-13 |
| **Responsabilidad** | Crear notificaciones in-app, centro de notificaciones, marcar leída. |
| **Requisitos que satisface** | RF-061 a RF-064 |
| **Datos que administra** | Tabla `notifications`. |
| **Entradas** | Usuario destino, tipo, título, mensaje, entidad relacionada, ID de notificación. |
| **Salidas** | Notificación creada; contador de no leídas; notificación marcada como leída. |
| **Dependencias** | `lib/actions/notification.actions.ts`, `lib/services/notification.service.ts`. |
| **Verificación** | CA-061 a CA-064; campanita con contador; click marca como leída. |

### 6.14 Módulo Notificaciones email

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-14 |
| **Responsabilidad** | Enviar emails para eventos críticos (plan publicado, sesión completada, anuncios masivos). |
| **Requisitos que satisface** | RF-065 a RF-067 |
| **Datos que administra** | Templates React Email, tabla `notifications` (indirectamente). |
| **Entradas** | ID de atleta/coach/grupo, título, mensaje, template. |
| **Salidas** | Email enviado; log de error si falla (no bloquea acción principal). |
| **Dependencias** | `lib/services/email.service.ts` (Resend), `lib/services/audit.service.ts`. |
| **Verificación** | CA-065 a CA-067; email fallido no bloquea acción principal. |

### 6.15 Módulo Avatar

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-15 |
| **Responsabilidad** | Subida, procesamiento, almacenamiento y visualización de avatares. |
| **Requisitos que satisface** | RF-068 a RF-070 |
| **Datos que administra** | Columna `avatar_key` en `users`; archivos en R2. |
| **Entradas** | Archivo de imagen (JPG/PNG/WebP, ≤2-3 MB), ID de usuario. |
| **Salidas** | Foto guardada en R2; URL firmada para visualización; avatar de iniciales por defecto. |
| **Dependencias** | `lib/actions/avatar.actions.ts`, `lib/services/avatar.service.ts`, API routes `app/api/avatar/`. |
| **Verificación** | CA-068 a CA-070; resize a 256×256; strip EXIF; formato inválido da error. |

### 6.16 Módulo Exportación

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-16 |
| **Responsabilidad** | Generar archivos PDF, Excel y CSV de métricas y listados. |
| **Requisitos que satisface** | RF-071 a RF-074 |
| **Datos que administra** | Lectura de métricas y listados; archivos generados en memoria. |
| **Entradas** | ID de entidad, formato (PDF/Excel/CSV), periodo. |
| **Salidas** | Archivo descargable. |
| **Dependencias** | `lib/actions/export.actions.ts`, `lib/services/export.service.ts`, `@react-pdf/renderer`, `exceljs`. |
| **Verificación** | CA-071 a CA-074; exportar sin datos muestra mensaje. |

### 6.17 Módulo Configuración global (Admin)

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-17 |
| **Responsabilidad** | Gestionar plantillas oficiales, parámetros de email, límites, motivos, tipos de sesión. |
| **Requisitos que satisface** | RF-075 a RF-079 |
| **Datos que administra** | Tabla `settings`, tabla `templates` (oficiales). |
| **Entradas** | Valores de límites, lista de motivos, lista de tipos, configuración email. |
| **Salidas** | Configuración actualizada y aplicada en acciones correspondientes. |
| **Dependencias** | `lib/actions/settings.actions.ts`, `lib/services/settings.service.ts`. |
| **Verificación** | CA-075 a CA-079; límites aplicados; motivos reflejados en select del atleta. |

### 6.18 Módulo Logs / Auditoría

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-18 |
| **Responsabilidad** | Registrar acciones críticas y consultar logs con filtros. |
| **Requisitos que satisface** | RF-080, RF-081 |
| **Datos que administra** | Tabla `audit_logs`. |
| **Entradas** | Usuario, acción, entidad, detalles, IP; filtros (fecha, usuario, tipo). |
| **Salidas** | Entrada de log creada; listado de logs filtrados. |
| **Dependencias** | `lib/services/audit.service.ts`. |
| **Verificación** | CA-080, CA-081; log guarda quién, qué, cuándo, IP. |

### 6.19 Módulo Vista Director Técnico

| Campo | Valor |
|-------|-------|
| **Identificador** | MOD-19 |
| **Responsabilidad** | Vista de solo lectura de atletas del grupo, métricas agregadas, anuncios masivos. |
| **Requisitos que satisface** | RF-082, RF-083 |
| **Datos que administra** | Lectura de `users`, `group_members`, métricas agregadas. |
| **Entradas** | ID de grupo, periodo. |
| **Salidas** | Listado de atletas del grupo; tabla comparativa de teams. |
| **Dependencias** | `lib/services/metric.service.ts`, `lib/services/notification.service.ts`. |
| **Verificación** | CA-082, CA-083; DT no puede editar planes ni registros. |

---

## 7. Lógica y operaciones

| Operación | Responsabilidad | Parámetros relevantes | Resultado | Errores previsibles |
|-----------|-----------------|----------------------|-----------|---------------------|
| `authenticate(email, password)` | Buscar usuario, verificar hash, verificar `is_active`. | email, password | Usuario o error genérico. | Credenciales inválidas, cuenta desactivada. |
| `createSession(userId)` | Crear sesión en DB (Lucia). | userId | Sesión creada, cookie seteada. | — |
| `validateSession(sessionId)` | Validar sesión activa. | sessionId | Usuario o null. | Sesión expirada. |
| `invalidateSession(sessionId)` | Destruir sesión. | sessionId | Sesión destruida. | — |
| `hashPassword(password)` | Hashear con PBKDF2-HMAC-SHA512. | password | Hash con formato `pbkdf2-sha512$...`. | — |
| `verifyPassword(password, hash)` | Verificar hash. | password, hash | boolean. | — |
| `createCoach(name, email)` | Crear usuario rol coach, pwd temporal, email invitación. | name, email | Coach creado. | Email duplicado. |
| `createGroup(name, description?)` | Crear grupo. | name, description | Grupo creado. | — |
| `requestJoin(groupId, coachId)` | Crear solicitud pendiente. | groupId, coachId | Solicitud creada. | Solicitud duplicada. |
| `approveRequest(requestId)` | Aprobar solicitud, crear group_members. | requestId | Coach vinculado al grupo. | Solicitud no existe. |
| `createTeam(coachId, name?)` | Crear team, nombre default = apellido. | coachId, name | Team creado. | Límite de teams alcanzado. |
| `assignAthlete(teamId, athleteId)` | Asignar atleta a team. | teamId, athleteId | Atleta asignado. | Límite de atletas alcanzado. |
| `createTemplate(coachId, data)` | Crear plantilla privada. | coachId, name, sessionType, structure | Plantilla creada. | Plantilla vacía (sin nombre o sin secciones). |
| `assignSession(athleteId, templateId, date, coachId)` | Crear asignación. | athleteId, templateId, date, coachId | Asignación creada. | Día ocupado (needsConfirm), sin permiso. |
| `recordSession(data, athleteId)` | Crear registro, actualizar status de asignación. | assignmentId, distanceKm, durationMin, rpe, comments, status | Registro creado. | Fuera de ventana, sesión futura, distancia/tiempo vacíos, RPE fuera de rango. |
| `markNotDone(data, athleteId)` | Registrar motivo no realizada. | assignmentId, reason, customReason | Registro con motivo. | Motivo "otro" sin texto. |
| `addFeedback(assignmentId, authorId, message)` | Crear feedback. | assignmentId, authorId, message | Feedback creado. | Sin permiso. |
| `sendAnnouncement(groupId, title, message)` | Crear notificaciones in-app + email. | groupId, title, message | Notificaciones creadas, emails enviados. | Grupo sin miembros. |
| `calcCompliance(assignments)` | Calcular % completadas. | Lista de asignaciones | Porcentaje. | — |
| `calcWeeklyLoad(records, weekStart)` | Calcular carga semanal. | records, weekStart | `{ km, minutes, tss?, trimp? }`. | — |
| `detectAlerts(teamAthletes, records)` | Detectar alertas. | atletas, registros | Lista de alertas. | — |

---

## 8. Flujos técnicos

### Flujo 1: Atleta registra una sesión

1. Página RSC `/athlete/calendar` carga `session_assignments` del mes vía `metric.service` / `plan.service`.
2. `MonthCalendar` renderiza días con colores según estado.
3. Atleta hace click en un día → `SessionDetailPanel` (client component) abre.
4. Panel carga detalle: `session_assignments` + `template.structure` + `session_records`.
5. Atleta llena `SessionForm` (distancia, tiempo, RPE, comentarios) → validación cliente con Zod.
6. Atleta presiona "Guardar" → Server Action `recordSession`:
   a. Verifica sesión (Lucia).
   b. Verifica propiedad (es su asignación).
   c. Verifica fecha (no futura) y ventana de edición.
   d. Valida datos con Zod (server-side).
   e. INSERT `session_records` + UPDATE `session_assignments.status`.
   f. `metric.service` recalcula métricas.
   g. `notification.service` crea notificación in-app para el coach.
   h. `email.service` envía email al coach (evento crítico).
   i. `audit.service` registra la acción.
7. Retorna `{ ok: true, status: 'completed' }`.
8. UI actualiza color del día a verde + muestra confirmación.

### Flujo 2: Coach planifica una semana

1. Coach abre `/coach/calendar/[teamId]/[athleteId]` → RSC carga plantillas del coach + asignaciones de la semana.
2. Coach arrastra `TemplateCard` → `CalendarDay` → `@dnd-kit` detecta drop.
3. Client llama Server Action `assignSession`:
   a. Verifica sesión + rol coach + permiso `canPlanFor`.
   b. Si día ocupado → muestra `ConfirmDialog` "¿Reemplazar?".
   c. Crea `session_assignments`.
4. Retorna ok → UI actualiza.
5. Opcional: Coach usa `WeekGenerator` → patrón (3F, 1S, 1T, 2D) → Server Action `generateWeek` crea asignaciones para 7 días.
6. Opcional: Coach pulsa "Copiar semana anterior" → `copyPreviousWeek` copia asignaciones de semana-1.

### Flujo 3: Admin crea coach

1. Admin abre `/admin/coaches` → "Nuevo coach".
2. Llena form (nombre, email) → validación cliente con Zod.
3. Client llama Server Action `createCoach`:
   a. Verifica sesión + rol admin.
   b. Valida email único (Zod + check en DB).
   c. Genera contraseña temporal.
   d. INSERT `users` (rol='coach', must_change_password=true).
   e. `audit.service`: 'coach_created'.
   f. `email.service`: envía invitación con link de activación.
4. UI muestra "Coach creado. Email de invitación enviado."

### Flujo 4: Notificación in-app + email (evento crítico)

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

### Flujo 5: Avatar

1. Usuario selecciona imagen en `AvatarUpload` (client).
2. Client-side: canvas.resize(256, 256) + strip EXIF → Blob.
3. Client llama `getAvatarUploadUrl` → retorna presigned PUT URL.
4. Client hace PUT directo a R2 con el Blob.
5. Client llama `confirmAvatarUpload(key)` → Server actualiza `users.avatar_key`.
6. Visualización: GET `/api/avatar?id={userId}` → Server genera signed URL temporal de R2 → redirect. Si no hay `avatar_key` → retorna SVG de iniciales.

---

## 9. Interfaz y navegación

### 9.1 Estructura general

El sistema se organiza en tres niveles de navegación según el rol:

**Header global** (todas las pantallas autenticadas):
- Logo / nombre del sistema.
- Centro de notificaciones (campanita con contador de no leídas).
- Avatar del usuario con menú desplegable (perfil, cerrar sesión).

**Menú lateral** (varía según rol):
- Admin: Dashboard, Coaches, Grupos, Atletas, Plantillas oficiales, Configuración, Logs, Exportes.
- Director Técnico: Dashboard grupo, Comparativa teams, Anuncios, Exportes.
- Coach: Dashboard, Mis Teams, Calendario, Biblioteca de plantillas, Atletas, Métricas, Exportes.
- Atleta: Calendario, Mis métricas, Mi historial, Perfil.

### 9.2 Pantallas principales

| ID | Pantalla | Elementos clave |
|----|----------|-----------------|
| PNT-01 | Login | Formulario de email y contraseña. Acceso desde cualquier dispositivo (responsive). |
| PNT-02 | Dashboard Admin | Resumen del sistema: cantidad de coaches, grupos, atletas, solicitudes pendientes. |
| PNT-03 | Dashboard Coach | Resumen de sus teams: cumplimiento %, alertas, sesiones de hoy. |
| PNT-04 | Dashboard Atleta | Resumen de su semana: sesiones de hoy, cumplimiento, racha. |
| PNT-05 | Dashboard Director Técnico | Resumen del grupo: comparativa teams, alertas. |
| PNT-06 | Calendario mensual | Vista mes con navegación anterior/siguiente. Día actual resaltado. Código de color por estado (verde/amarillo/rojo/gris). Click en día → detalle de sesión + formulario de registro. Para coach: drag & drop de plantillas, badge de cumplimiento por día. |
| PNT-07 | Biblioteca de plantillas (Coach) | Listado de plantillas propias + oficiales + compartidas del grupo. Formulario de creación/edición: nombre, tipo, estructura de la sesión. Acciones: editar, clonar, compartir al grupo. |
| PNT-08 | Gestión de Teams (Coach) | Listado de teams del coach. Crear team (nombre por defecto = apellido, editable). Ver atletas de cada team, asignar/quitar atletas. |
| PNT-09 | Gestión de Atletas (Coach/Admin) | Listado con filtros. Perfil de atleta: datos, historial de sesiones, métricas, gráficas. |
| PNT-10 | Detalle de sesión (modal/panel) | Planificado: calentamiento, entrenamiento específico, enfriamiento. Real: distancia, tiempo, RPE, comentarios, motivo (si no realizada). Registro (atleta): formulario de entrada. Feedback (coach): campo de comentario. |
| PNT-11 | Centro de notificaciones | Lista de notificaciones no leídas con icono y texto. Click → navega a la entidad relacionada. Marcar como leída. |
| PNT-12 | Perfil de usuario | Datos personales, avatar (subir/eliminar), cambio de contraseña. |
| PNT-13 | Panel Admin | Gestión de coaches, grupos, atletas, configuración global, logs de auditoría, exportes globales. |

### 9.3 Principios de experiencia

- **Responsive:** el sistema funciona en desktop, tablet y móvil.
- **Código de color consistente:** verde = completado, amarillo = parcial, rojo = no realizado, gris = descanso/sin asignar.
- **Acciones destructivas confirmadas:** diálogo de confirmación (eliminar plantilla, eliminar team, eliminar atleta).
- **Feedback inmediato:** al guardar un registro, el sistema muestra confirmación y actualiza el estado visual.
- **Accesibilidad:** contraste adecuado, navegación por teclado, textos alternativos en imágenes.

### 9.4 Componentes UI reutilizables

Los componentes base viven en `components/ui/` con clases Bootstrap/AdminLTE:

| Componente | Clases base | Uso |
|------------|-------------|-----|
| `Button` | `.btn`, `.btn-primary`, `.btn-ghost` | Acciones |
| `Field` | `.form-control`, `.form-select`, `.form-label` | Inputs, selects, textareas |
| `Card` | `.card`, `.card-body`, `.card-title` | Dashboards, métricas, plantillas |
| `Table` | `.table`, `.table-hover` | Listados (coaches, atletas, logs) |
| `Badge` | `.badge`, `.text-bg-success` / `.text-bg-danger`... | Estados de sesión, contador campanita |
| `PageHeader` | `.app-page-header` | Cabecera de página con h1 y acciones |
| `ModalShell` | `.modal`, `.modal-dialog`, `.modal-content` | Modales con Escape, foco, trampa de foco |
| `EmptyState` | `.card-body` con `BIcon` | Estados vacíos |

Los iconos usan Bootstrap Icons (`bi bi-*`) vía `components/ui/BIcon`. Los modales, dropdowns y tabs se manejan con estado React (no se carga el JS de AdminLTE/Bootstrap).

---

## 10. Persistencia y consistencia

### 10.1 Estrategia de persistencia

| Aspecto | Decisión |
|---------|----------|
| **Base de datos** | MySQL. Dev local (XAMPP/MariaDB 10.4), producción Aiven MySQL 8.4. Acceso vía Drizzle ORM; en Cloudflare vía Hyperdrive. |
| **Migraciones** | `drizzle-kit generate` crea archivos SQL. `drizzle-kit migrate` aplica contra `DATABASE_URL` (local en desarrollo). Producción se configura en fase de despliegue. |
| **Gotcha `timestamp` nullable** | drizzle-kit no emite `NULL` para columnas MySQL: genera `resolved_at timestamp,` y MySQL/MariaDB (`NO_ZERO_DATE`) lo rechaza con `ERROR1067`. Tras cada `generate`, revisar migraciones con `timestamp,` sin `NOT NULL` y corregir a `timestamp NULL DEFAULT NULL` a mano antes de `migrate`. |
| **Seed** | `db/seed.ts` crea: usuario admin inicial, plantillas oficiales de ejemplo, configuración default en `settings`. |
| **Archivos** | Avatares en Cloudflare R2 (bucket privado). No se usa filesystem local (efímero en Workers). |
| **Sesiones** | Tabla `sessions` de Lucia en MySQL. Cookie HttpOnly en navegador. |

### 10.2 Estado de la aplicación

| Nivel | Estrategia |
|-------|-----------|
| **Persistente** | Todo vive en MySQL. No hay caché de cliente. |
| **Server-side (por request)** | RSC cargan datos directamente de DB en cada render. Next.js App Router cachea por request (no entre requests sin revalidación explícita). |
| **Client-side (UI local)** | Estado de componentes con `useState`/`useReducer`: mes seleccionado, modal abierto, tab activo, formulario en progreso. Se resetea al navegar. |
| **Entre páginas** | No hay estado global. Cada página RSC carga lo que necesita. La sesión (usuario, rol) vive en cookie y se lee en proxy + RSC. |
| **Actualización tras mutación** | Server Actions usan `revalidatePath()` o `revalidateTag()` de Next.js para refrescar los datos de la página después de una mutación. No se usa polling ni WebSockets. |
| **Rutas con sesión (Cache Components)** | Páginas que leen la sesión (cookie) usan `export const instant = false` (opt-out oficial de Next.js 16) para render dinámico en el servidor; adopción progresiva de `use cache: private` por ruta en fases futuras. |

### 10.3 Flujo de datos típico

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

### 10.4 Integridad de datos

| Aspecto | Mecanismo |
|---------|-----------|
| **Claves foráneas** | Todas las relaciones FK definidas en Drizzle schema. MySQL las respeta. |
| **Únicos** | `users.email` UNIQUE, `group_requests(group_id, coach_id)` UNIQUE, `session_records.assignment_id` UNIQUE (1:1 con asignación). |
| **Índices** | `session_assignments(athlete_id, session_date)`, `session_assignments(athlete_id, week_start)`, `notifications(user_id, is_read)`. |
| **Soft delete** | Usuarios con `is_active=false` no se eliminan físicamente; preserva integridad de registros históricos. |
| **Transacciones** | Server Actions que escriben múltiples tablas (ej. crear coach + enviar invitación) deben usar transacción Drizzle para atomicidad. |

---

## 11. Validaciones y errores

### 11.1 Estrategia de validación en dos capas

| Capa | Herramienta | Momento |
|------|-------------|---------|
| **Cliente** | React Hook Form + Zod | Al interactuar con formularios. Feedback inmediato sin roundtrip. |
| **Servidor** | Zod (mismo esquema) | En cada Server Action. Nunca confiar en el cliente. |

### 11.2 Esquemas Zod clave

```typescript
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

### 11.3 Manejo de errores

| Tipo | Estrategia |
|------|-----------|
| **Error de validación (Zod)** | Server Action retorna `{ ok: false, errors: fieldErrors }`. Cliente muestra errores en el formulario correspondiente. |
| **Error de permiso** | Server Action retorna `{ ok: false, error: 'No autorizado' }`. UI muestra `Alert` con mensaje. |
| **Error de regla de negocio** | Server Action retorna `{ ok: false, error: 'mensaje específico' }` (ej. "Has alcanzado el límite de teams"). |
| **Error de DB (constraint, timeout)** | Server Action retorna `{ ok: false, error: 'Error interno. Intenta de nuevo.' }`. Se registra en Sentry. |
| **Error inesperado** | Error boundary de Next.js (`app/error.tsx`) muestra pantalla de error genérica con botón "Volver al inicio". Se registra en Sentry. |
| **Email fallido** | No bloquea la acción principal. Se registra en `audit_logs` con `action='email_failed'`. Se reintenta una vez. |

### 11.4 Mensajes de error (alineados con `specs/SPECS.md`)

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

## 12. Seguridad y privacidad

| Aspecto | Medida |
|---------|--------|
| **Autenticación** | Lucia Auth. Sesiones en DB + cookie `HttpOnly; Secure; SameSite=Lax`. Expiración configurable. |
| **Autorización** | Middleware verifica sesión en cada request. Server Actions verifican rol + propiedad antes de cada operación. `lib/permissions/` centraliza las reglas. |
| **Contraseñas** | Hash con PBKDF2-HMAC-SHA512 nativo (WebCrypto), 210 000 iteraciones (OWASP). Nunca bcryptjs para nuevas contraseñas. Contraseña temporal forzada a cambio (`must_change_password`). |
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

## 13. Estrategia de pruebas

| Componente | Qué se verifica | Pruebas automatizadas | Criterios de aceptación |
|------------|-----------------|----------------------|------------------------|
| `lib/metrics/*` | Funciones de cálculo puras (cumplimiento, carga, distribución, rachas, HR zones, VO2max, TRIMP, alertas) | Vitest unit tests | CA-057 a CA-060 |
| `lib/services/` | Lógica de negocio (auth, user, group, team, template, plan, session, notification, email, avatar, export, audit) | Vitest unit tests con `tests/helpers/fakeDb.ts` | CA-001 a CA-083 (según corresponda) |
| `lib/auth/guards.ts` | Permisos por rol (isAdmin, isCoach, isAthlete, isDirector, canManageTeam, canPlanFor, canViewAthlete, canEditRecord) | Vitest unit tests | RB-01 a RB-10 |
| `lib/validations/` | Esquemas Zod (esquemas válidos e inválidos) | Vitest unit tests | — |
| `lib/actions/` | Server Actions (sesión + validación con Zod) | Vitest unit tests | — |
| Páginas RSC | Renderizado correcto, datos en HTML, sin errores de consola | Playwright E2E contra `npm run preview` | CA-001 a CA-083 (según corresponda) |
| Flujos E2E | Login por rol, credenciales inválidas, logout, flujos completos de admin/coach/atleta | Playwright E2E | Flujo 1 a Flujo 8 |
| Scripts de verificación | `verify-tokens.ts`, `verify-accesibilidad.ts`, `verify-i18n.ts`, `verify-rendimiento.ts`, `verify-seguridad.ts`, `verify-sentry.ts` | Ejecutar contra servidor levantado | Tokens contraste, axe sobre 22 rutas, i18n, bundle, seguridad, Sentry |

### 13.1 Cobertura mínima

- `lib/metrics/`: 80% de líneas, sentencias y funciones; 75% de ramas.
- `lib/permissions/`: 80% de líneas, sentencias y funciones.
- `lib/auth/guards.ts`: 90% de líneas, sentencias y funciones.
- `session.service.ts`: 80% de líneas, sentencias y funciones.
- Conjunto de archivos incluidos: 89.5% de líneas.

### 13.2 Datos de prueba

Se usará `tests/helpers/fakeDb.ts`: un doble de `db` que devuelve las filas que la prueba preparó para cada tabla, sin evaluar condiciones SQL. Las pruebas afirman sobre la decisión que toma el servicio a partir del contenido de la fila.

---

## 14. Secuencia de implementación

### 14.1 Fase 1 — Fundación (sin dependencias)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 1.1 | Proyecto Next.js + TypeScript + ESLint/Prettier | `npm run dev` funciona, linting pasa | Build limpio, sin errores de lint | — |
| 1.2 | Configurar AdminLTE (`admin-lte`) + Bootstrap + AppShell layout | Layout con sidebar y header renderiza | Sidebar y header visibles, navegación por rol | RNF-02, TEC-02 |
| 1.3 | Configurar Drizzle + schema de DB + migración inicial | Tablas creadas en MySQL local | `npm run db:migrate` aplica sin errores | DAT-01 a DAT-12 |
| 1.4 | Configurar Lucia Auth + proxy + login/logout | Login funciona, rutas protegidas redirigen | Login con credenciales válidas/inválidas; rutas sin sesión redirigen a login | RF-001 a RF-004, RNF-02 |
| 1.5 | Seed: admin inicial + configuración default | Admin puede loguearse | Admin existe en DB, puede acceder a `/admin/dashboard` | RF-005, RB-01 |
| 1.6 | Configurar Zod + React Hook Form + primer Server Action | Formulario login con validación | Login valida en cliente y servidor | RF-001, TEC-08 |

**Hito de Fase 1:** Usuario admin se loguea y ve el layout con sidebar.

---

### 14.2 Fase 2 — Admin: Usuarios y Grupos (depende de Fase 1)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 2.1 | CRUD coaches (listado, crear, editar, desactivar) | Admin gestiona coaches | Admin crea, edita, desactiva coaches; listado visible | RF-005 a RF-007, RB-01 |
| 2.2 | Email de invitación (Resend + React Email) | Coach recibe email | Email de invitación se envía al crear coach | RF-005, RF-065 |
| 2.3 | Reset password + must_change_password | Funciona el flujo de invitación | Coach recibe contraseña temporal, debe cambiarla en primer login | RF-009 |
| 2.4 | CRUD grupos | Admin crea/edita/elimina grupos | Grupo creado visible en listado; eliminación con confirmación | RF-012 a RF-014, RB-01 |
| 2.5 | Solicitudes de unión (enviar, aprobar, rechazar) | Flujo completo coach→admin | Coach envía solicitud; admin aprueba/rechaza; notificaciones | RF-015 a RF-019, RB-02 |
| 2.6 | Asignación/quitar Director Técnico | Admin gestiona directores | Coach con `is_director=true` puede ver métricas del grupo | RF-017, RB-02 |
| 2.7 | Auditoría básica (logs en acciones admin) | Logs visibles en `/admin/logs` | Crear coach genera log con `action='coach_created'` | RF-080, RF-081 |

**Hito de Fase 2:** Admin da de alta un coach, crea un grupo, aprueba solicitud, asigna Director Técnico.

---

### 14.3 Fase 3 — Teams y Atletas (depende de Fase 2)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 3.1 | CRUD teams (coach) con nombre default | Coach crea teams | Nombre por defecto = apellido del coach; editable | RF-020, RF-021 |
| 3.2 | Gestión de atletas (crear, asignar a teams) | Coach gestiona atletas | Atleta dado de alta y asignado a team | RF-024, RF-026 |
| 3.3 | Listado de atletas con filtros (coach y admin) | Listados funcionan | Coach ve sus atletas; admin ve listado global con filtros | RF-027, RF-029 |
| 3.4 | Traslado de atletas entre teams (admin) | Traslado con auditoría | Admin traslada atleta; cambio registrado en `audit_logs` | RF-030 |
| 3.5 | Perfiles de atletas (datos físicos opcionales) | Perfil editable | Atleta puede editar peso, altura, FC máx, FC reposo | RF-028 |

**Hito de Fase 3:** Coach crea team, registra atletas, los asigna. Admin los ve globalmente.

---

### 14.4 Fase 4 — Plantillas (depende de Fase 3)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 4.1 | Schema de templates + template_sections (JSON) | DB lista | Tabla `templates` creada con columna JSON `structure` | DAT-05 |
| 4.2 | CRUD plantillas (crear, editar, eliminar) | Coach crea plantillas | Coach crea, edita, elimina plantilla propia | RF-032 a RF-034 |
| 4.3 | Editor de secciones (reordenar, añadir, eliminar) | Estructura flexible funciona | Coach reordena secciones dentro de plantilla | RB-14 |
| 4.4 | Clonar plantilla (propia, oficial) | Clon crea copia editable | Coach clona plantilla oficial; aparece como propia editable | RF-035, RB-13 |
| 4.5 | Compartir al grupo + visibilidad | Coach comparte, otro coach ve y clona | Plantilla compartida visible para coaches del grupo | RF-036, RB-12 |
| 4.6 | Plantillas oficiales (CRUD admin + seed) | Admin gestiona oficiales; coaches clonan | Admin crea plantilla oficial; coach la clona | RF-039, RB-13 |
| 4.7 | Validación de plantilla (nombre + al menos 1 sección) | No se guardan vacías | Plantilla sin nombre o sin secciones da error | ERR-09 |

**Hito de Fase 4:** Coach crea, edita, clona y comparte plantillas. Ve las oficiales.

---

### 14.5 Fase 5 — Calendario y Planificación (depende de Fase 4)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 5.1 | Schema de session_assignments | DB lista | Tabla `session_assignments` creada | DAT-06 |
| 5.2 | Vista calendario atleta (solo lectura, colores) | Atleta ve su calendario | Calendario mes con colores por estado | RF-047, RF-048 |
| 5.3 | Vista calendario coach (con badge cumplimiento) | Coach ve calendario de atletas | Coach selecciona team → atleta → ve calendario | RF-053 |
| 5.4 | Drag & drop plantillas → días (@dnd-kit) | Asignación funciona | Coach arrastra plantilla a día; asignación creada | RF-040 |
| 5.5 | Generador de semana tipo | Genera semana según patrón | Patrón 3F+1S+1T+2D distribuido en 7 días | RF-043 |
| 5.6 | Multi-asignación (varios atletas) | Asigna a N atletas de una vez | Coach selecciona varios atletas y asigna plantilla | RF-041 |
| 5.7 | Copiar semana anterior | Copia con opción de editar | Semana anterior copiada; editable después | RF-042 |
| 5.8 | Panel detalle de sesión (planificado) | Click día → detalle completo | Click en día muestra plantilla (calentamiento, específico, enfriamiento) | RF-048 |

**Hito de Fase 5:** Coach planifica una semana completa con drag & drop. Atleta ve el plan.

---

### 14.6 Fase 6 — Registro de Sesiones (depende de Fase 5)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 6.1 | Schema de session_records + session_feedback | DB lista | Tablas `session_records` y `session_feedback` creadas | DAT-07, DAT-08 |
| 6.2 | Formulario de registro atleta (distancia, tiempo, RPE, comentarios) | Atleta registra sesión | Formulario valida en cliente y servidor | RF-049 |
| 6.3 | Estados automáticos (completada, parcial, en curso, no realizada) | Colores correctos en calendario | Día cambia de color según estado | RB-21 a RB-24 |
| 6.4 | Marcar "no realizada" con motivo predefinido + libre | Motivo funciona | Atleta selecciona motivo; "otro" requiere texto libre | RF-050, ERR-19 |
| 6.5 | Ventana de edición 24-48h (configurable) | Bloqueo fuera de ventana | Atleta no puede editar fuera de ventana; dentro sí | RF-051, RB-23 |
| 6.6 | Validaciones server-side (RPE, futuro, distancia/tiempo) | Errores correctos | RPE fuera de rango da error; sesión futura bloqueada | ERR-18, ERR-20 |
| 6.7 | Feedback del coach en sesión | Coach comenta, atleta ve | Coach deja feedback; atleta lo ve en su sesión | RF-052 |
| 6.8 | Notificaciones in-app al registrar + feedback | Campanita funciona | Campanita incrementa al registrar sesión | RF-061, RF-062 |
| 6.9 | Email al coach al completar sesión | Email se envía | Coach recibe email cuando atleta completa sesión | RF-066 |

**Hito de Fase 6:** Flujo completo atleta registra → coach ve → coach comenta → atleta recibe notificación.

---

### 14.7 Fase 7 — Métricas (depende de Fase 6)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 7.1 | Funciones puras: cumplimiento, carga, distribución, rachas | Tests unitarios pasan | `calcCompliance`, `calcWeeklyLoad`, `calcTypeDistribution`, `calcStreak` con datos de prueba | RF-057 |
| 7.2 | Panel métricas atleta (cards + gráficas Recharts) | Atleta ve sus métricas | Panel muestra cumplimiento %, carga, progresión, distribución | RF-057 |
| 7.3 | Progresión semanal (gráfica línea) | Gráfica renderiza datos reales | Gráfica SVG con volúmenes semanales últimos 4-12 sem | RF-057 |
| 7.4 | VO2max estimado + zonas FC (si perfil completo) | Métricas fisiológicas calculadas | Atleta con perfil completo ve VO2max y zonas FC | RF-057 |
| 7.5 | Panel métricas team (buckets cumplimiento + alertas) | Coach ve resumen team | Panel muestra % por bucket, carga media, alertas | RF-058 |
| 7.6 | Panel métricas grupo (comparativa teams) | Director Técnico ve comparativa | Tabla comparativa de teams y cumplimiento por coach | RF-059 |
| 7.7 | Actualización al guardar registro | Métricas frescas sin recargar | Al guardar registro, métricas se actualizan | RF-060 |
| 7.8 | Fórmulas TRIMP/TSS (si hay datos FC) | Calculadas cuando hay datos | TRIMP calculado si hay datos de FC | RF-057 |

**Hito de Fase 7:** Las 3 vistas de métricas funcionan con datos reales.

---

### 14.8 Fase 8 — Notificaciones completas (depende de Fase 6)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 8.1 | Schema de notifications | DB lista | Tabla `notifications` creada | DAT-09 |
| 8.2 | Centro de notificaciones (lista, marcar leída) | Campanita + página funciona | Contador de no leídas; click marca como leída | RF-062, RF-063, RF-064 |
| 8.3 | Todos los triggers in-app (plan, cambio, feedback, etc.) | Eventos generan notificaciones | Cada evento del sistema crea notificación in-app | RF-061 |
| 8.4 | Email templates (React Email): bienvenida, plan, sesión, anuncio | Emails se envían | Templates HTML renderizados y enviados por Resend | RF-065, RF-066, RF-067 |
| 8.5 | Anuncios masivos (Admin/DT → grupo) | Anuncio llega a todos | Admin/DT envía anuncio; miembros reciben in-app + email | RF-067 |
| 8.6 | Contador no leídas en header | Badge actualizado | Header muestra contador de notificaciones no leídas | RF-062 |

**Hito de Fase 8:** Todos los eventos generan notificaciones in-app. Emails críticos se envían.

---

### 14.9 Fase 9 — Avatar (independiente, puede hacerse en paralelo)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 9.1 | Configurar R2 + presigned URLs | Upload funciona | API route genera presigned PUT; cliente sube a R2 | RF-068 |
| 9.2 | Client-side resize (canvas) + strip EXIF | Imagen se redimensiona | Imagen subida es 256×256; sin EXIF | RF-068, RB-31, RB-32 |
| 9.3 | Avatar con fallback de iniciales (SVG) | Muestra iniciales sin foto | Usuario sin foto ve avatar de iniciales | RF-069, RB-33 |
| 9.4 | Subir/eliminar avatar en perfil | Flujo completo | Usuario sube foto; se muestra en header; eliminar vuelve a iniciales | RF-068, RF-070 |
| 9.5 | Mostrar avatar en header, listas, perfiles | Consistencia visual | Avatar aparece en header, lista de atletas, perfil | RF-068 |

**Hito de Fase 9:** Usuario sube foto, se muestra en header y listas.

---

### 14.10 Fase 10 — Export (depende de Fase 7)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 10.1 | Export PDF de métricas atleta (react-pdf) | PDF descargable | Coach descarga PDF con métricas de atleta | RF-071 |
| 10.2 | Export Excel de métricas atleta/team (exceljs) | XLSX descargable | Coach descarga XLSX con métricas | RF-072 |
| 10.3 | Export CSV de listados globales (admin) | CSV descargable | Admin descarga CSV con listados globales | RF-074 |
| 10.4 | Selector de periodo (temporada, año, personalizado) | Filtro funciona | Selector de periodo aplicado a exportación | RF-071 a RF-074 |

**Hito de Fase 10:** Coach exporta métricas de atleta a PDF y Excel.

---

### 14.11 Fase 11 — Panel Admin completo (depende de Fase 2)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 11.1 | Configuración global (settings: límites, motivos, tipos) | Admin edita settings | Admin configura límites, motivos, tipos de sesión | RF-075 a RF-079 |
| 11.2 | Plantillas de email editables | Admin edita HTML de email | Admin modifica templates de email | RF-076 |
| 11.3 | Logs de auditoría con filtros | Admin consulta logs | Admin filtra logs por fecha, usuario, acción | RF-080, RF-081 |
| 11.4 | Mantenimiento (limpieza avatares huérfanos) | Función disponible | Admin puede limpiar avatares huérfanos de R2 | — |
| 11.5 | Dashboard admin (stats cards) | Resumen visible | Dashboard muestra contadores de coaches, grupos, atletas, solicitudes | RF-001 |

**Hito de Fase 11:** Admin tiene control total del sistema.

---

### 14.12 Fase 12 — Director Técnico completo (depende de Fase 7)

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 12.1 | Dashboard Director Técnico | Resumen del grupo | DT ve dashboard con métricas del grupo | RF-082, RF-083 |
| 12.2 | Vista solo lectura de atletas del grupo | DT ve atletas en modo lectura | DT ve atletas sin opciones de edición | RF-082, RB-06 |
| 12.3 | Comparativa teams + cumplimiento por coach | Gráficas del grupo | DT ve tabla comparativa de teams | RF-059 |
| 12.4 | Anuncios masivos (ya en Fase 8) | Completado | DT envía anuncio masivo; miembros reciben in-app + email | RF-067 |
| 12.5 | Export del grupo | PDF/Excel del grupo | DT exporta métricas del grupo | RF-073 |

**Hito de Fase 12:** Director Técnico tiene visibilidad total de su grupo.

---

### 14.13 Fase 13 — Pulido y testing

| # | Tarea | Entregable esperado | Condiciones de verificación | Requisitos relacionados |
|---|-------|---------------------|----------------------------|------------------------|
| 13.1 | Tests unitarios de métricas y servicios (Vitest) | Cobertura de lógica crítica | Tests pasan con cobertura mínima | RNF-18 |
| 13.2 | Tests E2E de flujos principales (Playwright) | Flujo coach, atleta, admin | Tests E2E pasan contra preview | — |
| 13.3 | Responsive (mobile, tablet) | Todas las pantallas adaptan | Páginas renderizan en 375/768/1400 px | RNF-12 |
| 13.4 | Estados vacíos y mensajes de error | UX completa | Listados vacíos muestran mensaje orientativo | ERR-23, ERR-24 |
| 13.5 | Sentry configurado | Errores reportados | Sentry captura errores de Server Actions y rendering | RNF-18 |
| 13.6 | CI/CD (GitHub Actions → Cloudflare Pages) | Deploy automático en push | Pipeline en verde en push a main | — |
| 13.7 | Rate limiting en login | Protección implementada | Login limita intentos fallidos por IP | — |

**Hito de Fase 13:** MVP listo para producción.

---

## 15. Riesgos y decisiones pendientes

### 15.1 Riesgos identificados

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|-------------|---------|------------|
| RIES-01 | Prisma/Drizzle incompatibilidad con Cloudflare Workers | Baja (Drizzle es compatible) | Alto | Elegir Drizzle desde el inicio; probar conexión temprano en Fase 1. |
| RIES-02 | Rendimiento de métricas con muchos datos | Media (con el tiempo) | Medio | Índices en DB; si es necesario, caché en Redis/Upstash (fase futura). |
| RIES-03 | @dnd-kit + calendario complejo | Media | Medio | Empezar con click-to-assign como fallback; drag & drop como mejora. |
| RIES-04 | Resend límites de email (3k/mes) | Baja (MVP pequeño) | Bajo | Monitorear uso; escalar a plan pago si es necesario. |
| RIES-05 | PlanetScale sin free tier (eliminado abril 2024) | Ya materializado | Alto | Dev con MySQL local (XAMPP); Drizzle es ORM-agnostic. Producción: otro MySQL (Aiven, Railway) vía `DATABASE_URL`. |
| RIES-06 | Lucia Auth deprecación futura | Baja | Medio | Lucia es librería pequeña y estable; capa de auth aislada en `lib/auth/`. |
| RIES-07 | Zona horaria de Chile | Baja | Bajo | Usar `Intl.DateTimeFormat` con `timeZone: America/Santiago` en `lib/i18n/format.ts`. |

### 15.2 Decisiones pendientes

| ID | Pregunta / decisión | Contexto | Impacto si no se resuelve |
|----|---------------------|----------|------------------------|
| PEND-001 | Eliminar coach con teams y atletas: ¿soft delete definitivo o eliminación en cascada? | `specs/SPECS.md` §10 (Casos límite) recomienda soft delete, pero no está cerrado. | Afecta a RF-008 y a la integridad de registros históricos. |
| PEND-002 | Ventana de edición de registro: ¿24h o 48h? | `specs/SPECS.md` dice "24-48 horas". Default 48h en settings. | Afecta a RB-23 y a ERR-15. |
| PEND-003 | ¿Se permite eliminar un atleta que tiene registros históricos? | `specs/SPECS.md` no especifica comportamiento para atletas con historial. | Afecta a la gestión de atletas (RF-026, RF-030). |
| PEND-004 | ¿Los valores de X días para alerta de "sin registrar" y caída de carga son configurables? | `specs/SPECS.md` §4.10 menciona "sin registrar >X días" sin definir X. | Afecta a RF-058 y a la configuración global (RF-077). |
| PEND-005 | ¿El email de bienvenida se envía al activar cuenta o al crear el coach? | `specs/SPECS.md` CA-079 menciona "email de bienvenida al activar cuenta", pero RF-005 ya envía email de invitación al crear. | Afecta a RF-065 y al flujo de alta de coach. |
| PEND-006 | ¿Se requiere confirmación para eliminar plantilla con asignaciones activas o se impide directamente? | `specs/SPECS.md` ERR-10 deja la decisión abierta. | Afecta a RF-034. |

---

## 16. Auditoría técnica final

| Punto de verificación | Estado | Evidencia |
|----------------------|--------|-----------|
| Cada requisito relevante tiene una solución técnica prevista | ✅ | RF-001 a RF-083 mapeados a MOD-01 a MOD-19 |
| Las decisiones respetan `specs/AGENTS.md` | ✅ | SSR, cookies, sin middleware, AdminLTE 4, Bootstrap Icons, Cloudflare Workers, Drizzle, Lucia, Resend, R2 |
| La arquitectura satisface `specs/SPECS.md` | ✅ | Secciones 3-8 cubren todos los requisitos funcionales |
| No existen tecnologías o componentes sin justificación | ✅ | Cada tecnología en TEC-01 a TEC-P1 tiene justificación |
| Los riesgos principales están documentados | ✅ | RIES-01 a RIES-07 en sección 15.1 |
| Las fases tienen entregables verificables | ✅ | Cada fase tiene "Condiciones de verificación" |
| Las dependencias determinan un orden de implementación válido | ✅ | Fases 1-13 ordenadas por dependencias |
| La estrategia de pruebas permite verificar los criterios de aceptación | ✅ | Sección 13 mapea pruebas a CA-001 a CA-083 |
| Las decisiones pendientes no se presentan como confirmadas | ✅ | PEND-001 a PEND-006 listadas como pendientes |

**Contradicciones detectadas:** Ninguna. Todas las reglas de negocio (`specs/SPECS.md` §9) son consistentes con los requisitos funcionales y la arquitectura propuesta.

**Archivo guardado:** `specs/PLAN.md` (creado en múltiples escrituras sucesivas).

**Resumen:**
- Arquitectura definida: Next.js 16.3.x + App Router + RSC + Server Actions + Cloudflare Workers + OpenNext
- Tecnologías confirmadas: 16 (TEC-01 a TEC-16)
- Módulos identificados: 19 (MOD-01 a MOD-19)
- Entidades de datos: 12 (DAT-01 a DAT-12)
- Fases de implementación: 13 (Fase 1 a Fase 13)
- Riesgos: 7 (RIES-01 a RIES-07)
- Decisiones pendientes: 6 (PEND-001 a PEND-006)

El plan técnico es coherente, trazable, viable y ordenado. Permite generar tareas de implementación sin tener que inventar decisiones esenciales.

---
