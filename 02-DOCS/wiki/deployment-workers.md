# Stack Canon PHP - Despliegue en Cloudflare Workers

## Versión 1.0 - 2026-10-30

## Visión General

Este documento describe la configuración y el flujo de despliegue para el Stack Canon PHP en Cloudflare Workers, considerando las restricciones técnicas descubiertas en la Fase 43 y las restricciones de CPU del plan Free.

### Objetivo

Desplegar la aplicación PHP migrada a Cloudflare Workers de manera confiable, cumpliendo con todas las restricciones del entorno sin sacrificar funcionalidad ni seguridad.

---

## 1. Restricciones Críticas de Cloudflare Workers

### 1.1 Restricciones de Tempo y Recursos

| Restricción | Descripción | Impacto y Solución |
|-------------|-------------|--------------------|
| **Free tier: 10ms de CPU por invocación** | El límite de CPU es de 10ms por cada invocación del Worker | El login y operations críticas deben completarse en menos de 10ms. Optimizar queries, evitar bucles complejos, usar Hyperdrive caching estratégico. |
| **No hay middleware (`proxy.ts`)** | El middleware se compila por separado (5.5MB) y salta al Worker principal por service binding | La protección de rutas se hace en los layouts (`requireAuth()` en `public/layout.php`), no en proxy. Costo cero en Free tier. |
| **Next.js 16.3.x exacto** | La versión 16.4.0 genera `.next/server/preview-props.json` que OpenNext 1.20.11 no inlinea: todas las peticiones devuelven 500 | **No subir a 16.4.0**. Mantener `next.config.ts` configurado para 16.3.x. |
| **Prohibido generar código en runtime** | `workerd` responde `Code generation from strings disallowed for this context` | Ninguna librería puede usar `eval`, `new Function`, o strings que se compilen en tiempo de ejecución. PHP puro, sin librerías que evalúen strings. |
| **I/O compartido entre peticiones** | Una conexión creada en la petición A no puede usarse en la B: `Cannot perform I/O on behalf of a different request` | La conexión PDO debe crearse por request (pattern `getDatabase()`). No reutilizar conexiones entre requests. |
| **Ninguna variable `NEXT_PUBLIC_` para datos server** | Las variables `NEXT_PUBLIC_` se incrustan en el bundle durante build, quedaría clavado al momento de compilar | **`APP_URL` y configuraciones sensibles NO llevan prefijo `NEXT_PUBLIC_`**. Quedaría clavado en el build. |

### 1.2 Configuración del Proyecto Workers

#### 1.2.1 `wrangler.jsonc` Configuración Esencial

```jsonc
{
  "name": "runosorno",
  "main": "public/index.php",
  "compatibility_date": "2026-10-30",
  "compatibility_flags": [
    "experimental_workers_timers",
    "threads"
  ],
  "hyperdrive": {
    "bindings": ["HYPERDRIVE"]
  },
  "assets": {
    "camera": "dist/",
    "base": "public"
  },
  "routes": [
    {
      "source": "/(.*)",
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
      "destination": "::handle"
    }
  ],
  "kv": {
    "bindings": []
  }
}
```

**Explicación de campos críticos**:

| Campo | Descripción |
|-------|-------------|
| `main` | Punto de entrada PHP (`public/index.php`) |
| `compatibility_flags` | Habilitar timers y threads para PHP runtime |
| `hyperdrive.bindings` | Binding `HYPERDRIVE` para conexión BD |
| `routes` | Enrutamiento simple (sin middleware costoso) |
| `assets.base` | Directorio de assets públicos |

#### 1.2.2 `public/index.php` - Entry Point Mínimo

```php
<?php
// public/index.php - Punto de entrada para Cloudflare Workers
// REQUIERE: config.php en el mismo directorio o accessible via getenv

// 1. Configuración inicial
declare(strict_types=1);

// 2. Sesión (siempre al comienzo)
if (session_status() === SESSION_NONE) {
    session_start();
}

// 3. Cargar configuración global
$config = [
    'app_name' => 'RunOsorno',
    'app_url' => getenv('APP_URL') ?? 'https://runosorno.online',
    'db_user' => getenv('CF_DB_USER') ?? 'defaultdb_user',
    'db_password' => getenv('CF_DB_PASSWORD') ?? 'defaultdb_password',
    'env' => getenv('APP_ENV') ?? 'production',
];

// 4. Conexión a BD (PDO - por request, sin persistencia)
$pdo = new \PDO(
    "mysql:host=localhost;dbname=defaultdb",
    $config['db_user'],
    $config['db_password'],
    [
        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        // COMENTAR: PDO::ATTR_PERSISTENT => false, - crítico para Workers
    ]
);

// 5. Cargar helpers de seguridad
if (!function_exists('h')) {
    require_once __DIR__ . '/../lib/security.php';
}

// 6. Ruteo minimal (sin middleware costoso)
// Ruteo basado en la URL y método HTTP

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uri = trim($uri, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Rutas públicas (sin auth)
$publicRoutes = ['', 'login', 'register', ''];

$isPublic = in_array($uri, $publicRoutes) || startsWith($uri, '/api/') && !startsWith($uri, '/api/login');

// 7. Verificación de sesión y auth
$isAuthenticated = false;
$userRole = null;

if (!$isPublic && isset($_SESSION['user_id'])) {
    // Verificar sesión activa contra BD
    $stmt = $pdo->prepare("SELECT id, role, is_active FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    
    if ($user && $user['is_active']) {
        $isAuthenticated = true;
        $userRole = $user['role'];
    } else {
        // Sesión expirada o usuario inactivo - destruir
        session_destroy();
        header("Location: /login?expired=1");
        exit;
    }
}

// 8. Manejo de routes según rol y método
$routeHandled = false;
$response = new \Slim\Psr7\Response(); // o response nativo

switch (true) {
    // Rutas públicas
    case $uri === '' || $uri === 'index':
        // Home / landing
        $response = handleHome($pdo, $isAuthenticated);
        $routeHandled = true;
        break;
    
    case $uri === 'login' && !$isAuthenticated && $method === 'GET':
        $response = handleLoginForm($pdo);
        $routeHandled = true;
        break;
    
    case $uri === 'login' && $method === 'POST':
        // Validar CSRF
        if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'] ?? '', $_POST['csrf_token'])) {
            $response = new \Slim\Psr7\Response(403, [], 'Token CSRF inválido');
            $routeHandled = true;
            break;
        }
        
        // Ejecutar login
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $loginResult = loginUser($pdo, $email, $password);
        
        if ($loginResult['ok']) {
            // Crear sesión
            $_SESSION['user_id'] = $loginResult['user']->id;
            $_SESSION['role'] = $loginResult['user']->role;
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); // Rotar token
            
            header("Location: /dashboard");
            exit;
        } else {
            $response = new \Slim\Psr7\Response(302, [], 'Location: /login?error=' . urlencode($loginResult['error']));
            $routeHandled = true;
            break;
        }
    
    // Rutas protegidas según rol
    case $isAuthenticated:
        switch ($userRole) {
            case 'ROLE_ADMIN':
                $response = handleAdmin($pdo, $uri, $method);
                break;
            case 'ROLE_COACH':
                $response = handleCoach($pdo, $uri, $method);
                break;
            case 'ROLE_ATHLETE':
                $response = handleAthlete($pdo, $uri, $method);
                break;
            default:
                session_destroy();
                header("Location: /login");
                exit;
        }
        $routeHandled = true;
        break;
    
    default:
        header("Location: /login");
        exit;
}

// 8. Respuesta final si no fue manejado
if (!$routeHandled) {
    $response = new \Slim\Psr7\Response(404, [], 'Not Found');
}

// 9. Enviar respuesta
$response->send();
```

### 1.3 Manejo de Sesiones en Workers

#### 1.3.1 Consideraciones Críticas

- **PHP Sessions son efímeras**: En Cloudflare Workers, la sesión PHP usa almacenamiento efímero. Los datos de sesión NO persisten entre diferentes Workers.
- **Solución**: Usar sesiones solo para datos temporales (login estado, CSRF token). Datos críticos como perfiles y preferencias deben venir de la BD en cada request.
- **Cookie `runosorno_tema`**: Se lee de cookie (persistente), no de sesión PHP.

#### 1.3.2 Patrón de Sesión Recomendado

```php
<?php
// src/Infrastructure/Session/SessionHandler.php - Patrón para Workers

class SessionHandler
{
    protected \PDO $pdo;
    
    public function __construct(\PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    public function start(int $userId): \Session
    {
        // Crear/obtener sesión UUID
        $sessionId = bin2hex(random_bytes(16));
        
        // Insertar/actualizar sesión en BD (no rely en PHP session files)
        $stmt = $this->pdo->prepare(
            "INSERT INTO user_sessions (id, user_id, created_at, expires_at) 
             VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))
             ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)"
        );
        $stmt->execute([$sessionId, $userId]);
        
        // Establecer cookie (persistente, no rely en PHP session)
        // setcookie('session_id', $sessionId, time() + 86400, '/', '.runosorno.online', true, true);
        
        return new \Session(
            id: $sessionId,
            userId: $userId,
            expired: false
        );
    }
    
    public function validate(string $sessionId): bool
    {
        if (empty($sessionId)) {
            return false;
        }
        
        $stmt = $this->pdo->prepare(
            "SELECT id, user_id, expires_at FROM user_sessions WHERE id = ? AND expires_at > NOW()"
        );
        $stmt->execute([$sessionId]);
        
        return $stmt->fetch() !== false;
    }
    
    public function end(string $sessionId): bool
    {
        $stmt = $this->pdo->prepare(
            "DELETE FROM user_sessions WHERE id = ?"
        );
        $stmt->execute([$sessionId]);
        
        return $stmt->rowCount() > 0;
    }
```

#### 1.3.3 Clase Session Result

```php
<?php
// src/Domain/ValueObjects/Session.php - Value object para sesiones

class Session
{
    public string $id;
    public int $userId;
    public bool $expired;
    
    public function __construct(string $id, int $userId, bool $expired = false)
    {
        $this->id = $id;
        $this->userId = $userId;
        $this->expired = $expired;
    }
    
    public function isOk(): bool
    {
        return !$this->expired;
    }
}
```

---

## 2. Configuración de Variables de Entorno

### 2.1 GitHub Secrets Necesarias

Para el flujo GitHub Actions → Cloudflare Workers, añadir en el repositorio estos secrets:

| Secret Name | Descripción | Valor típico |
|-------------|-------------|--------------|
| `CF_API_TOKEN` | Token de API de Cloudflare para deploy | Token con permisos de Worker/D1/R2 |
| `CF_DB_USER` | Usuario de BD para Cloudflare Hyperdrive | Usuario MySQL creado en Hyperdrive |
| `CF_DB_PASSWORD` | Contraseña de BD para Hyperdrive | Contraseña asociada al usuario |
| `RESEND_API_KEY` | API key de Resend para emails transaccionales | key de cuenta Resend (región sa-east-1) |
| `APP_URL` | URL base de la aplicación | `https://runosorno.online` |
| `NODE_OPTIONS` | Opciones de Node para el build | `--enable-experimental-vm-modules` |

### 2.2 Flujo GitHub Actions (`deploy.yml`)

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20' # Versión compatible con OpenNext
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Next.js (16.3.x)
        run: npm run build
        # Verificar que no hayá sido generado preview-props.json de 16.4.0
        
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: .
          # Arguments for deployment
          # Solo deploy el nuevo código PHP, no todo el Next.js si se usa patrón híbrido
```

### 2.3 Consideraciones de Performance (Free Tier)

#### 2.3.1 Optimizaciones Obligatorias

| Optimización | Impacto en CPU |
|-------------|----------------|
| **Prepared statements PDO** | 1-2ms (vs 5-10ms con queries sin preparar) |
| **Hyperdrive caching** | Consultas repetidas ~0.5ms después del primer render |
| **Evitar `eval`/`new Function`** | Sin overhead, código directo |
| **Lazy loading de componentes** | Cargar solo lo necesario por vista |
| **Caché de queries frecuentes** | Hyperdrive cachea automáticamente las mismas queries |
| **Minificar CSS/JS** | Menor tiempo de parseo |
| **Evitar librerías pesadas** | jq, moment.js, lodash no usados = menos parseo |

#### 2.3.2 Anti-Patrones que Rompen el Límite de 10ms

| Anti-Patrón | Por qué falla | Solución |
|-------------|---------------|----------|
| `mb_convert_encoding` en loops grandes | Procesamiento costoso por carácter | Operaciones por lote, no por carácter |
| `array_map`/`filter` sobre 1000+ registros | Múltiples passes en PHP | Usar SQL `WHERE` en lugar de PHP filters |
| `strlen` en strings enormes | Costo O(n) por cada llamada | Usar `mb_strlen` o límites conocidos |
| `json_encode` con opciones complejas | Overhead de formateo | Usar `json_encode($data, JSON_UNESCAPED_STRING)` por defecto |
| Conexiones BD abiertas entre requests | Error de lógica, no solo CPU | Cerrar statements, conexión por request |

---

## 3. Migración de Datos y BD

### 3.1 Export/Import con Hiperdrive

```bash
# 1. Exportar datos actuales (desde XAMPP/MySQL actual)
mysqldump -u root -p base_datos > datos_actuales.sql

# 2. Crear esquema nuevo en BD de Cloudflare
mysql -u usuario -p base_datos_nueva < esquema_canonico.sql

# 3. Importar datos
mysql -u usuario -p base_datos_nueva < datos_actuales.sql

# 4. Verificar integridad
mysql -u usuario -p base_datos_nueva -e "
    SELECT TABLE_NAME, TABLE_ROWS 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = 'base_datos_nueva';
"
```

### 3.2 Migración de Hashrs (bcrypt → PBKDF2)

```php
<?php
// src/Infrastructure/Security/PasswordVerifier.php - Migración heredada

class PasswordVerifier
{
    // Hash format: pbkdf2-sha512$<iteraciones>$<salt>$<hash>
    // Ejemplo: pbkdf2-sha512$210000$$abcd1234$ef5678...
    const PBKDF2_PREFIX = 'pbkdf2-sha512$';
    const DEFAULT_ITERATIONS = 210000;
    
    public function verify(string $plainPassword, string $storedHash): bool
    {
        // 1. Verificar si es hash heredado bcrypt ($2a$, $2b$, $2y$)
        if (preg_match('/^\$2[aBN]\$/', $storedHash) || preg_match('/^\$2[y]\$/', $storedHash)) {
            // Verificar con bcrypt (solo en desarrollo/local, no en Workers)
            // En producción: rehashear a PBKDF2 en primer login
            return $this->migrateIfNeeded($plainPassword, $storedHash);
        }
        
        // 2. Hash actual PBKDF2-SHA512
        if (str_starts_with($storedHash, self::PBKDF2_PREFIX)) {
            $parts = explode('$', $storedHash);
            // Formato: pbkdf2-sha512$iteraciones$salt$hash
            $iterations = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : DEFAULT_ITERATIONS;
            $salt = $parts[2] ?? '';
            $storedHashValue = $parts[3] ?? '';
            
            // Verificar con PHP password_verify (si la extensión lo permite)
            // o implementar manually con hash_pbkdf2
            if (function_exists('hash_equals') && function_exists('hash')) {
                $computedHash = hash_pbkdf2(
                    'sha512',
                    $plainPassword,
                    $salt,
                    $iterations,
                    true // raw output false por defecto
                );
                
                return hash_equals($computedHash, $storedHashValue);
            }
            
            // Fallback: comparar manualmente (lento, no recomendado para producción)
            return false;
        }
        
        // 3. Hash desconocido - seguridad: denegar acceso
        return false;
    }
    
    private function migrateIfNeeded(string $plainPassword, string $oldHash): bool
    {
        // En Workers no se puede usar bcrypt (efímero)
        // La estrategia es: verificar con el hash antiguo SOLO en desarrollo
        // En producción: rehashear en primer login correcto
        
        // Por ahora: denegar y forzar reset de password
        // La migración real se hace cuando el usuario hace login exitoso
        // y el sistema reescribe su hash a PBKDF2 nuevo
        
        return false; // Forzar reset de password
    }
}
```

---

## 4. Consideraciones de Accesibilidad (Phase 48)

### 3.1 Validaciones Obligatorias Pre-Deploy

```php
<?php
// scripts/verify-accesibilidad.php - Ejecutar antes de todo deploy

$issues = [];
$template_dir = 'templates/';
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($template_dir),
    RecursiveIteratorIterator::LEAVES_ONLY
);

foreach ($files as $file) {
    if ($file->getExtension() !== 'php') continue;
    $content = file_get_contents($file);
    
    // 1. Verificar [data-state=...] en lugar de solo colores
    if (preg_match_all('/\[data-state=[^\]]+\]/', $content, $matches)) {
        // Bueno - tiene atributos data-state
    } else {
        $issues[] = "Archivo $file: Falta atributo [data-state=...] en elementos de sesión";
    }
    
    // 2. Verificar que no hay aria-label que reescriba texto visible
    if (preg_match('/<button[^>]*aria-label=[^>]*>(?!.*<\\/button>)[^<]+<\/button>/', $content)) {
        $issues[] = "Archivo $file: botón con aria-label que reescribe texto visible (WCAG 2.5.3)";
    }
    
    // 3. Verificar saltos de navegación main
    if (!preg_match('/<main[^>]*id=[\"\']contenido["\']/', $content)) {
        $issues[] = "Archivo $file: Saltos de navegación principal fuera de <main id='contenido'>";
    }
    
    // 4. Verificar contraste de tokens (mediante tokens CSS definidos)
    // (Validación manual o script separado)
}

if (empty($issues)) {
    echo "✅ Pasó verify-accesibilidad en " . count(glob($template_dir . '*.php')) . " archivos\n";
    exit(0);
} else {
    echo "❌ " . count($issues) . " problemas de accesibilidad:\n";
    foreach ($issues as $issue) {
        echo "- $issue\n";
    }
    exit(1);
}
```

### 3.2 Checklist Accesibilidad Rápida

Antes de cada deploy, verificar visualmente:

- [ ] Cada estado de sesión tiene forma distinta (no solo color)
- [ ] Los botones no tienen `aria-label` que esconda el texto visible
- [ ] La navegación salta a `<main id="contenido">`
- [ ] Los badges de estado usan `bg-[color]` + shape `[data-state=...]`
- [ ] El contraste de texto sobre cumple 4.5:1 en ambos temas (claro/oscuro)

---

## 4. Depuración y Logging

### 4.1 Logging en Workers (Sin Escritorio Local)

```php
<?php
// src/Infrastructure/Logging/WorkerLogger.php - Logging para Workers

class WorkerLogger
{
    protected \PDO $pdo;
    protected string $prefix;
    
    public function __construct(\PDO $pdo, string $prefix = 'runosorno')
    {
        $this->pdo = $pdo;
        $this->prefix = $prefix;
    }
    
    public function log(string $level, string $message, ?int $userId = null): void
    {
        $stmt = $this->pdo->prepare(
            "INSERT INTO audit_logs (action, entity_type, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)"
        );
        
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $details = json_encode([
            'level' => $level,
            'message' => $message,
            'user_id' => $userId,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        $stmt->execute([$message, 'system', $details, $ip, $ua]);
    }
    
    public function logLoginAttempt(string $email, bool $success, ?string $error = null): void
    {
        $this->log(
            'login_attempt',
            "Email: $email, Success: " . ($success ? 'true' : 'false') . ( $error ? ", Error: $error" : ''),
            null
        );
    }
    
    public function logSecurityEvent(string $event, string $detail): void
    {
        $this->log('security', "Event: $event, Detail: $detail");
    }
}
```

### 3.2 Monitoreo Sencillo

```bash
# Ver logs recientes de la BD (en entorno de desarrollo)
mysql -u usuario -p -e "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"

# Ver cantidad de logs por día
mysql -u usuario -p -e "
    SELECT DATE(created_at) as log_date, COUNT(*) as total
    FROM audit_logs
    GROUP BY log_date
    ORDER BY log_date DESC
    LIMIT 7;
"
```

---

## 5. Pasos Finales de Deploy

### 5.1 Checklist Pre-Deploy

- [ ] **Código PHP**: `declare(strict_types=1)` en todos los archivos
- [ ] **Seguridad XSS**: `h()` usado en todas las variables impresas
- [ ] **Seguridad CSRF**: Tokens en todos los formularios POST
- [ ] **Performance**: Queries probadas < 10ms en Workers preview
- [ ] **Accesibilidad**: `verify-accesibilidad.php` pasa (0 issues)
- [ ] **BD**: Migración exitosa, datos intactos, hashes migrados
- [ ] **Variables de entorno**: `CF_API_TOKEN`, `CF_DB_USER`, `RESEND_API_KEY` seten en GitHub Secrets
- [ ] **Wrangler**: `wrangler.jsonc` configurado con `hyperdrive.bindings`
- [ ] **Next.js**: Versión 16.3.x confirmada, sin 16.4.0
- [ ] **Rutas**: Sin middleware costoso, protección en layouts
- [ ] **Dominio**: `runosorno.online` configurado en Cloudflare, DNS pointing correcto
- [ ] **Resend**: Dominio verificado (`sa-east-1`), emails de prueba enviados

### 5.2 Post-Deploy Validation

```bash
# 1. Test de login con usuario existente
curl -X POST -d "email=admin@test.com&password=password&csrf_token=token" https://runosorno.online/login

# 2. Test de página pública
curl -s -o /dev/null -w "%{http_code}" https://runosorno.online/

# 3. Test de dashboard (requiere auth)
curl -s -o /dev/null -w "%{http_code}" -H "Cookie: session_id=..." https://runosorno.online/dashboard

# 4. Test de contraste/accesibilidad
php scripts/verify-accesibilidad.php

# 5. Test de CPU (simular request)
time curl -s https://runosorno.online/login > /dev/null
```

---

## 6. Rollback Plan

Si el deploy falla o hay issues críticos:

1. **Git rollback**: `git checkout main@{1}` para regresar versión anterior
2. **Wrangler rollback**: `wrangler publish --dir . --site runosorno-online --context production` con versión anterior
3. **Verificar Hyperdrive**: Confirmar que la BD antigua sigue accesible
4. **Comunicar a usuarios**: Si es necesario, página de mantenimiento con estado estimado

---

*Documento generado el 2026-10-30 como parte de la migración al Stack Canon PHP.*
*Versión: 1.0 | Revisar en: 2026-11-30*