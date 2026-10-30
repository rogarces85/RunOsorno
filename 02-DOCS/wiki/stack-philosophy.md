# Stack Canon PHP - Filosofía y Decisiones

## Versión 1.0 - 2026-10-30

## Visión General

Este documento describe la filosofía y las decisiones técnicas del **Stack Canon PHP** para la migración de RunOsorno.

### Objetivo

Migración de una aplicación TypeScript/Drizzle ORM a PHP 8.2 con un stack canonical que priorice:
- PHP 8.2 con `declare(strict_types=1)`
- Consultas 100% preparadas con PDO
- Seguridad contra XSS/CSRF por diseño
- Arquitectura limpia (Clean Architecture)
- Vistas basadas exclusivamente en Tabler CSS
- Despliegue en Cloudflare Workers (compatible edge)

## 1. Decisiones Técnicas Fundamentales

### 1.1 PHP 8.2 y `declare(strict_types=1)`

- **Objetivo**: Tipado fuerte desde el primer línea
- **Archivo base**: Todos los archivos deben comenzar con `<?php declare(strict_types=1);`
- **Beneficios**:
  - Prevención de tipos inesperados en tiempo de ejecución
  - Mejor detección de errores en desarrollo
  - Compatibilidad con Cloudflare Workers

### 1.2 Consultas 100% Preparadas con PDO

- **Patrón obligatorio**: `$stmt = $pdo->prepare("SQL"); $stmt->execute([$parametros]);`
- **Prohibido**: consultas inline, `mysql_query`, `mysqli_query` sin preparar
- **Beneficios**:
  - Prevención de SQL Injection
  - Mejor performance en repetidas ejecuciones
  - Compatible con Cloudflare Workers

### 1.3 Seguridad XSS/CSRF por Diseño

#### Seguridad XSS

- **Función `h()`**: Toda salida HTML debe pasar por `h($texto)`
- **Ejemplo**: `echo h($usuario->nombre);` en lugar de `echo $usuario->nombre;`
- **Nunca**: HTML sin escapar directamente en vistas

#### Seguridad CSRF

- **Token por sesión**: Generar token único por sesión de usuario
- **Validación**: Todo formulario debe validar token antes de procesar
- **Patrón**:
  1. Session start
  2. Check/Generar token CSRF
  3. Validar en form submission
  4. Invalid token → redirect / login

### 1.4 Arquitectura Limpia (Clean Architecture)

```
src/
├── Controller/       # Manejadores de rutas (entrada/salida)
├── Service/          # Lógica de negocio (casos de uso)
├── Model/           # Entidades PHP simples (datos)
└── Repository/      # Acceso a datos (PDO preparadas)
```

- **Regla de dependencia**: Capas inferiores no dependen de superiores
- **Dependencia hacia afuera**: Testing facilitado por separación de capas

### 1.5 Vistas Exclusivamente Tabler CSS

- **Prohibido**: frameworks JS cliente (jQuery, React, Vue en vistas)
- **Sólo permitido**: Tabler CSS classes (`bg-white`, `text-gray-800`, `rounded`, etc.)
- **HTML semántico**: Sin divs innecesarios, usar estructura significada
- **Componentes reusable**: Button, Card, Table, Badge, Field creados una vez y reutilizados

#### Ejemplo de vista Tabler:

```php
<!-- Vista ejemplo con Tabler CSS -->
<main class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
  <div class="max-w-7xl mx-auto">
    <div class="grid gap-4">
      <div class="bg-white dark:bg-gray-800 rounded p-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Título</h1>
        <!-- Contenido -->
      </div>
    </div>
  </div>
</main>
```

### 1.6 Despliegue en Cloudflare Workers

#### Restricciones Conocidas (Fase 43)

| Restricción | Impacto | Solución |
|-------------|---------|----------|
| Sin middleware | Rutas protegidas en layouts | `requireAuth()` en `public/layout.php` |
| No `node:fs` | No guardar archivos localmente | Avatares via Cloudflare R2 |
| Sin code generation runtime | `workerd` bloquea `eval` y `new Function` | PHP puro, sin librerías que evalúan strings |
| I/O compartido entre peticiones | Conexión BD por request, no reutilizable | Patrón `getDatabase()` o conexión PDO por request |
| Free tier 10ms CPU | Login no puede ser costoso | Optimizar consultas, caching estratégico |

#### Configuración Workers

- **Binding**: `HYPERDRIVE` para conexión BD
- **No `NEXT_PUBLIC_`**: Variables server-side solo en build time
- **Conexión por request**: `getDatabase()` patrón, crear nueva conexión cada petición
- **Variables de entorno en GitHub Secrets**: `RESEND_API_KEY`, credenciales R2

---

## 2. Restricciones de Cloudflare Workers (Recordatorio Crítico)

Estas restricciones deben considerarse en TODO el código PHP migrado:

| Restricción | Impacto | Solución |
|-------------|---------|----------|
| Sin middleware | Rutas protegidas en layouts | `requireAuth()` en `public/layout.php` |
| No `node:fs` | No guardar archivos localmente | Avatares via Cloudflare R2 |
| Sin code generation runtime | Sin `eval`/`new Function` | PHP puro, sin librerías que evalúan strings |
| I/O por request | Conexión BD nueva cada petición | Patrón `getDatabase()` o conexión PDO por script |
| CPU limit 10ms | Login no puede ser costoso | Optimizar consultas, caching estratégico |

---

## 3. Patrones de Código

### 3.1 Archivo Base (`config.php`)

```php
<?php
// config.php - Archivo base de toda la aplicación
declare(strict_types=1);

// Configuración de base de datos (Cloudflare Hyperdrive)
$pdo = new PDO(
    "mysql:host=localhost;dbname=defaultdb",
    getenv("CF_DB_USER") ?? "defaultdb_user",
    getenv("CF_DB_PASSWORD") ?? "defaultdb_password",
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]
);

// Configuración global
$tituloSitio = "RunOsorno";
$versionApp = "1.0.0";
$tiempoCpuLimite = 8; // ms, para optimizar login
```

### 3.2 Función de Escape HTML (`h()`)

```php
<?php
// lib/security.php - Helper de seguridad
if (!function_exists('h')) {
    function h(string $texto): string {
        return htmlspecialchars($texto, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
    }
}
```

### 3.3 Validación CSRF (`csrf_validate()`)

```php
<?php
// lib/security/csrf.php
if (!function_exists('csrf_validate')) {
    function csrf_validate(): bool {
        // Iniciar sesión si no está activa
        if (session_status() === SESSION_NONE) {
            session_start();
        }

        // Obtener token del formulario
        $tokenForm = $_POST['csrf_token'] ?? '';
        $tokenSession = $_SESSION['csrf_token'] ?? '';

        // Validar
        if (!$tokenForm || !$tokenSession) {
            return false;
        }

        // Verificar match y no expirado (opcional: agregar tiempo de vida)
        return hash_equals($tokenForm, $tokenSession);
    }
}
```