# Base de datos

MySQL 8.4 en producción (Aiven) y MariaDB 10.4 en desarrollo (XAMPP). El esquema
se define en `lib/db/schema.ts` con Drizzle ORM y se versiona en
`db/migrations/`.

Reglas del proyecto:

- **El esquema se crea con migraciones**, nunca importando un volcado entre
  motores distintos.
- Los ids son `varchar(36)` (UUID generados en la app).
- Las fechas de calendario son columnas `date` (`session_date`, `week_start`,
  `birth_date`); los instantes son `timestamp`/`datetime`.
- En producción la conexión va por Hyperdrive; `DATABASE_URL` solo se usa en
  desarrollo y scripts.

## Tablas

### Identidad y acceso

| Tabla | Contenido | Claves |
|---|---|---|
| `users` | Todos los usuarios: admin, coach, atleta | `email` único, `role` (`admin`/`coach`/`athlete`), `password_hash` (PBKDF2-SHA512 nativo; bcrypt heredado se migra al login), `avatar_key`, `is_active`, `must_change_password` |
| `sessions` | Sesiones de Lucia | `id` (varchar 255), `user_id` → `users`, `expires_at` |
| `login_attempts` | Rate limiting del login | `key` (ventana + IP), `ip`, `attempts`, `expires_at`; índice por `expires_at` |
| `athlete_profiles` | Datos fisiológicos del atleta | `user_id` PK → `users`; `birth_date`, `weight_kg`, `height_cm`, `max_hr`, `resting_hr` |

### Organización

| Tabla | Contenido | Claves |
|---|---|---|
| `groups` | Grupos/escuelas | `id`, `name`, `description`, `logo_key` |
| `group_members` | Coaches (y directores) de un grupo | PK (`group_id`, `user_id`), `is_director`, `joined_at` |
| `group_requests` | Solicitudes de coach para unirse | `status` (`pending`/`approved`/`rejected`), `resolved_by`; única (`group_id`, `coach_id`) |
| `teams` | Equipos de un coach | `coach_id` → `users`; índice `teams_coach_id_idx` |
| `team_members` | Atletas de un team | PK (`team_id`, `athlete_id`), `joined_at` |

Un atleta puede estar en varios teams y un coach en varios grupos.

### Planificación

| Tabla | Contenido | Claves |
|---|---|---|
| `templates` | Biblioteca de plantillas | `coach_id` (nulo si es oficial), `group_id` (si se comparte), `session_type`, `is_official`, `is_shared`, `structure` (JSON con secciones) |
| `session_assignments` | Sesión planificada en un día | `athlete_id`, `template_id`, `session_date`, `week_start` (lunes), `status` (`planned`/`in_progress`/`completed`/`partial`/`not_done`), `created_by` |

Índices de `session_assignments`: (`athlete_id`, `session_date`),
(`athlete_id`, `week_start`) y `created_by`. Son los que usan el calendario
mensual, la semana y las métricas.

### Ejecución y seguimiento

| Tabla | Contenido | Claves |
|---|---|---|
| `session_records` | Registro real de una sesión | `assignment_id` **único** → `session_assignments`; `distance_km`, `duration_minutes`, `rpe` (1-10), `comments`, `not_done_reason`, `custom_reason` |
| `session_feedback` | Comentarios del coach sobre una sesión | `assignment_id`, `author_id` → `users`, `message` |
| `notifications` | Campanita | `user_id`, `type`, `title`, `message`, `is_read`, `entity_type`, `entity_id` |

Índices de `notifications`: (`user_id`, `is_read`, `created_at`) y
(`user_id`, `created_at`). El primero también cubre la clave foránea.

### Administración

| Tabla | Contenido | Claves |
|---|---|---|
| `audit_logs` | Auditoría de acciones críticas | `user_id` (nullable), `action`, `entity_type`, `entity_id`, `details` (JSON), `ip_address`, `created_at` |
| `settings` | Configuración global | `key` PK, `value` (JSON), `updated_at` |

Índices de `audit_logs`: `created_at`, (`user_id`, `created_at`) y
(`action`, `created_at`). `/admin/logs` filtra y ordena por fecha, y es la tabla
que más crece.

## Relaciones principales

```
users ─┬─< sessions
       ├─< teams (coach_id)
       ├─< team_members (athlete_id)
       ├─< group_members
       ├─< templates (coach_id)
       ├─< session_assignments (athlete_id, created_by)
       ├─< session_records (vía assignment)
       └─< notifications / audit_logs

groups ─< group_members
       └─< group_requests

teams ─< team_members
      └─ (team_members) ─< session_assignments (athlete_id)

templates ─< session_assignments ─┬─ session_records (1:1)
                                  └─< session_feedback
```

## Migraciones

| Archivo | Qué hace |
|---|---|
| `0000_smooth_captain_britain.sql` | Esquema inicial (14 tablas) |
| `0001_tiresome_thunderbolts.sql` | `login_attempts` + índice (rate limiting) |
| `0002_bent_jocasta.sql` | Índices de `audit_logs` y `notifications`; se borra `notifications_user_read_idx` **después** de crear los nuevos, porque MySQL lo usa para la clave foránea |
| `0003_numerous_baron_zemo.sql` | Sustituye el índice por acción por (`action`, `created_at`) |

Comandos:

```bash
npm run db:generate    # nueva migración desde lib/db/schema.ts
npm run db:migrate     # aplica pendientes en DATABASE_URL
npm run db:seed        # admin, ajustes y plantillas oficiales (idempotente)
```

En producción:

```bash
DATABASE_URL="mysql://usuario:clave@host:puerto/defaultdb" npx drizzle-kit migrate
```

Si `db:migrate` falla al borrar un índice con `ERROR 1553`, es una clave foránea:
crea primero los índices nuevos y borra el viejo al final (como hace `0002`).

## Caché de Hyperdrive

Hyperdrive **cachea las consultas sueltas**: un `SELECT` inmediatamente después
de un `INSERT` puede devolver el estado anterior. Las lecturas dentro de una
transacción son frescas. Al aplicar migraciones con un Worker de diagnóstico esto
se notó en `__drizzle_migrations`; en la app conviene tenerlo presente en flujos
de escritura seguida de lectura (registrar sesión y recargar el calendario).
