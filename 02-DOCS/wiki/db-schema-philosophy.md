# Stack Canon PHP - Filosofía de Base de Datos

## Versión 1.0 - 2026-10-30

## Visión General

Este documento describe la filosofía del esquema de base de datos para la migración a PHP 8.2 con PDO prepared statements en el Stack Canon.

### Objetivo

Definir el diseño del esquema SQL nativo como alternativa a Drizzle ORM, manteniendo compatibilidad con la base de datos Cloudflare Hyperdrive y preservando todos los datos existentes.

---

## 1. Principios Fundamentales

### 1.1 SQL Nativo sobre ORM

- **Decisión**: Usar SQL nativo con PDO preparadas en lugar de Drizzle ORM encadenado
- **Razón**: Compatibilidad total con restricciones de Cloudflare Workers y control directo de queries
- **Beneficio**: Sin limitaciones de `eval`/`new Function`, queries predecibles y debugging directo

### 1.2 Convenciones de Nombrado

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Nombres de tabla | `snake_case` | `session_records`, `user_passwords` |
| Nombres de columnas | `snake_case` | `password_hash`, `is_active` |
| Primary Keys | `id` (entero auto-incremental) | `PRIMARY KEY id` |
| Foreign Keys | `_id` suffix | `user_id`, `athlete_id` |
| Índices críticos | Nombres descriptivos | `notifications_user_idx`, `session_athlete_idx` |
| Enum/Set values | `snake_case` en mayúsculas | `ROLE_ADMIN`, `ROLE_COACH`, `ROLE_ATHLETE` |

### 1.3 Tipos de Datos PHP 8.2

- **Enteros**: `INT` para IDs, `BIGINT` para IDs grandes
- **Cadenas**: `VARCHAR(255)` para strings cortos, `TEXT` para contenido largo
- **Fechas**: `DATETIME(3)` para precisión milisegundo, `TIMESTAMP` para timestamps automáticos
- **Booleanos**: `BOOLEAN` (alias de `TINYINT(1)`)
- **JSON**: `JSON` para datos estructurados (columna `settings` en usuarios)

### 1.4 Restricciones de Cloudflare Workers

| Restricción | Impacto | Solución |
|-------------|---------|----------|
| Sin `node:fs` | No hay archivos locales | Usar Cloudflare R2 para avatares |
| I/O por request | Nueva conexión cada petición | `getDatabase()` patrón, connection pooling via Hyperdrive |
| CPU limit 10ms | Queries complejas costosas | Optimizar queries, indexes estratégicos, evitar subqueries pesadas |
| No middleware | Lógica en layouts, no en proxy | `requireAuth()` en `public/layout.php` |

---

## 2. Esquema de Tablas Esenciales

### 2.1 Tabla `users` (Usuarios/Coaches/Atletas)

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ROLE_ADMIN', 'ROLE_COACH', 'ROLE_ATHLETE') NOT DEFAULT 'ROLE_ATHLETE',
    is_active TINYINT(1) DEFAULT 1,
    is_verified TINYINT(1) DEFAULT 0,
    last_login_at DATETIME(3) NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 Tabla `athletes` (Atletas detallados)

```sql
CREATE TABLE athletes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    country VARCHAR(100) DEFAULT 'Chile',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_athletes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.3 Tabla `coaches` (Entrenadores)

```sql
CREATE TABLE coaches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company VARCHAR(191) NULL,
    avatar_url VARCHAR(500) NULL, -- URL desde Cloudflare R2
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_coaches_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.4 Tabla `teams` (Equipos)

```sql
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coach_id INT NOT NULL,
    name VARCHAR(191) NOT NULL,
    is_default TINYINT(1) DEFAULT 1,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE INDEX uk_teams_coach_name (coach_id, name),
    INDEX idx_teams_coach (coach_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.5 Tabla `session_records` (Registros de sesiones)

```sql
CREATE TABLE session_records (
    id VARCHAR(36) PRIMARY KEY, -- UUID string
    assignment_id VARCHAR(36) NOT NULL,
    athlete_id INT NOT NULL,
    distance_km DECIMAL(10, 2) NULL,
    duration_minutes INT NULL,
    rpe TINYINT NULL,
    comments TEXT NULL,
    recorded_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    status ENUM('completed', 'partial', 'not_done') DEFAULT 'completed',

    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
    INDEX idx_session_records_athlete (athlete_id),
    INDEX idx_session_records_assignment (assignment_id),
    INDEX idx_session_records_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.6 Tabla `session_assignments` (Asignaciones de sesiones)

```sql
CREATE TABLE session_assignments (
    id VARCHAR(36) PRIMARY KEY, -- UUID string
    athlete_id INT NOT NULL,
    team_id INT NULL,
    session_template_id VARCHAR(36) NULL,
    status ENUM('planned', 'in_progress', 'completed', 'not_done', 'partial') DEFAULT 'planned',
    scheduled_date DATE NULL,
    completed_at DATETIME(3) NULL,
    not_done_reason ENUM('injury', 'work', 'illness', 'personal', 'other') NULL,
    custom_reason TEXT NULL,

    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_assignments_athlete (athlete_id),
    INDEX idx_assignments_team (team_id),
    INDEX idx_assignments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.7 Tabla `plans` (Planos semanales)

```sql
CREATE TABLE plans (
    id VARCHAR(36) PRIMARY KEY, -- UUID string
    coach_id INT NOT NULL,
    name VARCHAR(191) NOT NULL,
    is_official TINYINT(1) DEFAULT 0, -- Plantillas oficiales del sistema
    is_shared TINYINT(1) DEFAULT 0, -- Compartida con otros coaches del grupo
    description TEXT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_plans_coach (coach_id),
    INDEX idx_plans_official (is_official)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.7 Tabla `plan_weekly_assignments` (Asignaciones semanales a atletas)

```sql
CREATE TABLE plan_weekly_assignments (
    id VARCHAR(36) PRIMARY KEY, -- UUID string
    plan_id VARCHAR(36) NOT NULL,
    athlete_id INT NOT NULL,
    week_number INT NOT NULL, -- Número de semana (1, 2, 3, ...)
    status ENUM('assigned', 'in_progress', 'completed', 'skipped') DEFAULT 'assigned',
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
    UNIQUE INDEX uk_plan_week (plan_id, athlete_id, week_number),
    INDEX idx_plan_week_plan (plan_id),
    INDEX idx_plan_week_athlete (athlete_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.8 Tabla `notifications` (Notificaciones)

```sql
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('session_completed', 'plan_published', 'announcement', 'system') NOT NULL,
    title VARCHAR(191) NOT NULL,
    message TEXT NOT NULL,
    data JSON NULL, -- Datos adicionales en JSON
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.9 Tabla `audit_logs` (Logs de auditoría)

```sql
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NULL,
    details JSON NULL, -- Contexto de la acción
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),

    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Migración desde Drizzle ORM

### 3.1 Mapeo de Consultas

| Drizzle ORM | SQL nativo (PDO) | Observaciones |
|-------------|------------------|---------------|
| `db.select().from(users).where(eq(users.email, email))` | `SELECT * FROM users WHERE email = ?` | Mismo resultado, parámetro `$email` |
| `db.update(users).set({is_active: 1}).where(eq(users.id, id))` | `UPDATE users SET is_active = 1 WHERE id = ?` | Update condicional |
| `db.delete().from(session_records).where(eq(session_records.id, id))` | `DELETE FROM session_records WHERE id = ?` | Delete por UUID |
| `db.insert().into(plans).values({name, coach_id, is_official})` | `INSERT INTO plans (name, coach_id, is_official) VALUES (?, ?, ?)` | Insert con valores explícitos |

### 3.2 Migración de Datos

- **Usuarios existentes**: Exportar desde BD actual (`mysqldump`) e importar a nueva esquema
- **Hashed passwords**: Mantener compatibilidad con migración bcrypt→PBKDF2 existente en el código TypeScript
- **Relaciones**: Recrear Foreign Keys en la nueva esquema, preservar integridad referencial
- **Indexes**: Los indexes críticos de la BD actual deben mapearse al nuevo esquema

### 3.3 Scripts de Migración

```sql
-- Ejemplo: Migración de usuarios con hash legacy
INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
SELECT id, name, email, password_hash, role, is_active, created_at
FROM old_users_table
WHERE is_active = 1;
```

---

## 4. Índices Críticos para Performance

### 4.1 Cloudflare Workers + Hyperdrive

| Tabla | Índice | Motivo |
|-------|--------|--------|
| `users` | `idx_users_email` | Búsqueda por email (login) |
| `users` | `idx_users_active` | Filtrar usuarios activos |
| `session_records` | `idx_session_records_athlete` | Listado de sesiones por atleta |
| `session_assignments` | `idx_assignments_athlete` | Asignaciones por atleta |
| `notifications` | `idx_notifications_user` | Notificaciones por usuario |
| `notifications` | `idx_notifications_read` | Marcado como leído/non leído |
| `audit_logs` | `idx_audit_logs_created` | Queries por fecha (línea más grande) |
| `plans` | `idx_plans_coach` | Planes por coach |
| `plan_weekly_assignments` | `uk_plan_week` | Unicidad plan-semana-atleta |

### 4.2 Consideraciones de Performance

- **Hyperdrive caching**: Las queries frecuentes serán cacheadas automáticamente
- **Prepared statements**: Reutilizar `$stmt` dentro de cada request evita recompilar
- **Connection pooling**: Hyperdrive maneja el pool, no necesidad de `pool_size` manual
- **Query limits**: Para login y operations críticas, mantener queries simples (< 5ms en Workers Free)

---

## 5. Comandos de Migración Ejemplo

### 5.1 Exportar esquema actual

```bash
mysqldump -u usuario -p --no-create-info --databases base_datos > datos.sql
mysqldump -u usuario -p --no-data --routines base_datos > esquema.sql
```

### 5.2 Importar a nuevo esquema

```bash
mysql -u usuario -p nueva_base_de_datos < esquema.sql
mysql -u usuario -p nueva_base_de_datos < datos.sql
```

### 5.3 Verificar integridad

```sql
-- Contar registros en cada tabla
SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'base_datos';

-- Verificar Foreign Keys
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'base_datos' AND REFERENCED_TABLE_NAME IS NOT NULL;
```

---

## 6. Próximos Pasos

### Semana 1: Definición ✓

- [x] Estructura de tablas definida
- [x] Convenciones de naming establecidas
- [x] Índices críticos identificados

### Semana 2: Implementación

- [ ] Crear migrations SQL con `drizzle-kit` o manuales
- [ ] Ejecutar migración en entorno de staging
- [ ] Validar integridad de datos y relaciones

### Semana 3: Validación

- [ ] Probar todas las queries PDO convertidas
- [ ] Verificar performance en Cloudflare Workers
- [ ] Validar migration de hashes bcrypt→PBKDF2

---

*Documento generado el 2026-10-30 como parte de la migración al Stack Canon PHP.*
*Versión: 1.0 | Revisar en: 2026-11-30*