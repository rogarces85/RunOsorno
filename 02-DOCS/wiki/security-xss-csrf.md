# Stack Canon PHP - Seguridad XSS/CSRF

## Versión 1.0 - 2026-10-30

## Visión General

Este documento describe las implementaciones de seguridad XSS (Cross-Site Scripting) y CSRF (Cross-Site Request Forgery) para el Stack Canon PHP en RunOsorno.

### Objetivo

Proporcionar protección de seguridad completa por diseño, siguiendo las restricciones de Cloudflare Workers y asegurando que todas las vistas y formularios estén protegidos contra ataques comunes.

---

## 1. Seguridad XSS (Cross-Site Scripting)

### 1.1 Principio Fundamental

- **Ningún dato confiable por defecto**: Todos los datos que provienen del usuario, BD, APIs externas deben ser tratados como no confiables hasta que sean escapados.
- **Nunca confíe en la entrada del usuario**: Incluso datos que parecen seguros pueden contener payloads maliciosos.

### 1.2 Función `h()` - Escape HTML Obligatorio

- **Ubicación**: `lib/security.php` (helper global)
- **Uso obligatorio**: Toda salida a HTML MUST pasar por la función `h()`.
- **Firma de función**: `h(string $texto): string`
- **Ubicación en el código**: Cada `echo $variable`, `print $dato`, o interpolación en HTML debe usar `h()`.

#### Implementación

```php
<?php
// lib/security.php - Helper de seguridad global
if (!function_exists('h')) {
    function h(string $texto): string {
        return htmlspecialchars($texto, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
    }
}
```

#### Uso Correcto

```php
<!-- INCORRECTO - Vulnerable a XSS -->
<h1><?= $usuario->nombre ?></h1>
<!-- O también: -->
<?php echo $titulo_pagina; ?>

<!-- CORRECTO - Seguro -->
<h1><?= h($usuario->nombre) ?></h1>
<!-- O también: -->
<?php echo h($titulo_pagina); ?>
```

#### Casos Especiales

| Scenario | Acción |
|----------|--------|
| Datos ya escapados | No vuelva a escapar. Verifique con `stripslashes()` si es necesario. |
| Datos numéricos | `h()` es seguro pero innecesario para números puros. Use validación de tipo en su lugar. |
| URLs/Enlaces | Use `h()` en el texto del enlace, pero valide la URL con `filter_var()` para `href`. |
| Contenido JSON | Escape con `json_encode()` y después `h()` si se imprime en HTML. |

### 1.3 Puntos Críticos de XSS

#### 1.3.1 Vistas/Plantillas

Cada vista PHP debe asegurar que **todos** los datos dinámicos pasen por `h()`. Crear una plantilla base (`layouts/app.layout.php`) que aplique `h()` por defecto o documentar la responsabilidad de cada desarrollador.

```php
<!-- layouts/public.layout.php - Ejemplo -->
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= h($page_title ?? 'RunOsorno') ?></title>
    <!-- Tabler CSS CDN -->
    <link href="https://cdn.jsdelivr.net/npm/tabler@3.0.0/dist/css/tabler.min.css" rel="stylesheet">
</head>
<body>
    <main class="min-h-screen">
        <div class="container">
            <!-- Content injected here -->
        </div>
    </main>
</body>
</html>
```

#### 1.3.2 Formularios

Los valores de POST/GET deben escaparse al mostrarlos en mensajes de confirmación o en la misma vista si hay errores.

```php
<!-- Form con validación XSS -->
<form method="POST" action="/login">
    <div class="mb-3">
        <label class="form-label">Email</label>
        <input type="email" name="email" class="form-control" required>
    </div>
    <div class="mb-3">
        <label class="form-label">Contraseña</label>
        <input type="password" name="password" class="form-control" required>
    </div>
    <button type="submit" class="btn">Entrar</button>
</form>
```

#### 1.3.3 Mensajes Flash / Alertas

Los mensajes_session deben escaparse al mostrarse:

```php
<?php if (session('mensaje')): ?>
    <div class="alert alert-success">
        <?= h(session('mensaje')) ?>
    </div>
<?php endif; ?>
```

### 1.4 Evitar Patrones Peligrosos

#### Prohibido nuca:

```php
<!-- Peligroso - No hacer nunca -->
<h1><?php echo $_GET['titulo'] ?></h1>
<h2><?php echo $_POST['comentario'] ?></h2>
echo $usuario->biografia_sin_escapar;
```

#### Siempre usar:

```php
<?php
// Siempre
echo h($_GET['titulo'] ?? '');
echo h($_POST['comentario'] ?? '');
echo h($usuario->biografia ?? '');
?>
```

---

## 2. Seguridad CSRF (Cross-Site Request Forgery)

### 2.1 Principio Fundamental

- **Tokens por sesión**: Cada sesión de usuario debe tener un token CSRF único e impredecible.
- **Validación en formularios**: Todo formulario que realice cambios en la BD DEBE validar el token CSRF antes de procesar.

### 2.2 Implementación de Token CSRF

#### 2.2.1 Generación de Token

```php
<?php
// Iniciar sesión al inicio de cada request
if (session_status() === SESSION_NONE) {
    session_start();
}

// Generar o recuperar token CSRF
if (empty($_SESSION['csrf_token'])) {
    // Generar token criptográficamente seguro
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
```

#### 2.2.2 Inclusión en Formularios

Cada formulario debe incluir un campo hidden con el token:

```php
<form method="POST" action="/sessions/registrar">
    <!-- Token CSRF hidden field -->
    <input type="hidden" name="csrf_token" value="<?= h($_SESSION['csrf_token']) ?>" />
    
    <!-- Otros campos del formulario -->
    <div class="mb-3">
        <label>Descripción</label>
        <textarea name="descripcion" class="form-control"></textarea>
    </div>
    
    <button type="submit" class="btn">Registrar</button>
</form>
```

#### 2.2.3 Validación en el Lado Servidor

```php
<?php
// Validate CSRF before processing form
if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
    // Token inválido o ausente - rechazar request
    header('HTTP/1.1 403 Forbidden');
    exit('Token CSRF inválido');
}

// Continuar con el procesamiento normal del formulario
// ...
```

### 2.3 Flujo Completo de Validación

```text
1. Request entrante a formulario POST
2. Verificar sesión activa (session_start)
3. Obtener token del formulario: $_POST['csrf_token']
4. Obtener token de sesión: $_SESSION['csrf_token']
5. Comparar con hash_equals() (timing-safe comparison)
6. ¿Coinciden?
   ├── Sí: Procesar formulario normalmente
   └── No: 
       ├── Registrar evento en audit_logs
       ├── Responder con 403 Forbidden
       ├── Opcional: Invalidar sesión y redirect al login
       └── No revelar información sobre el token existente
```

### 2.3 Excepciones y Casos Especiales

#### Exenciones Seguras

- **Lecturas GET**: Formularios que solo leen datos (GET sin modificar BD) no requieren CSRF, pero sí consideración de XSS en la salida.
- **Tokens de propósito limitado**: Tokens para acciones específicas (como "reestablecer contraseña") pueden tener tiempos de vida reducidos (15-30 minutos).
- **AJAX/XHR requests**: Para peticiones asíncronas, el token debe enviarse en header `X-CSRF-Token` o en el body JSON.

#### No eximir nunca:

```text
- Formularios que modifican BD (POST, PUT, DELETE)
- Cambios de configuración de usuario
- Actualizaciones de perfil, avatar, configuraciones
- Formularios de contacto que envían emails
```

### 2.4 Integración con la Función `h()`

El token CSRF stored en sesión debe escaparse al imprimirse en HTML:

```php
<input type="hidden" name="csrf_token" value="<?= h($_SESSION['csrf_token']) ?>" />
```

Aunque el token es generado server-side y parece seguro, aplicar `h()` sigue la filosofía de "defensa en profundidad" y previene técnicas avanzadas de XSS que intenten inyectar en el atributo value.

---

## 3. Patrón Completo: Login Seguro (XSS + CSRF combinados)

```php
<?php
// src/controllers/AuthController.php - Controlador de login

// 1. Iniciar sesión al comienzo
if (session_status() === SESSION_NONE) {
    session_start();
}

// 2. Verificar y generar token CSRF
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 3. Si es POST (form submission)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 2a. Validar CSRF token
    if (!isset($_POST['csrf_token']) || 
        !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        // Log attempt and reject
        error_log("CSRF token inválido en login attempt");
        header('HTTP/1.1 403 Forbidden');
        exit('Token de seguridad inválido');
    }
    
    // 3a. Validar datos de entrada (XSS prevention)
    $email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
    // password no se escapa - se verifica contra hash almacenado
    
    // 4. Procesar login...
}

// 5. Vista: Login form con token CSRF y escape en mensajes
?>
<!DOCTYPE html>
<html lang="es" data-theme="light">
<body>
    <main class="min-h-screen p-4">
        <?php if (isset($login_error)): ?>
            <div class="alert alert-error">
                <?= h($login_error) ?> <!-- Escape output -->
            </div>
        <?php endif; ?>
        
        <form method="POST" action="/login">
            <!-- CSRF token hidden field (escaped) -->
            <input type="hidden" name="csrf_token" value="<?= h($_SESSION['csrf_token']) ?>" />
            
            <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-control" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Contraseña</label>
                <input type="password" name="password" class="form-control" required>
            </div>
            
            <button type="submit" class="btn">Entrar</button>
        </form>
    </main>
</body>
</html>
```

---

## 3. Herramientas y Validaciones

### 3.1 Scripts de Verificación Automática

#### 3.1.1 Verificar XSS en vistas

Crear script `scripts/verify-xss.php` que:

```php
<?php
// scripts/verify-xss.php - Verificar que todas las vistas usan h()
$issues = [];

// Recolectar todos los archivos PHP en templates/
$templates_dir = 'templates/';
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($templates_dir),
    RecursiveIteratorIterator::LEAVES_ONLY
);

foreach ($files as $file) {
    if ($file->getExtension() !== 'php') continue;
    $content = file_get_contents($file);
    
    // Buscar patrones peligrosos
    if (preg_match('/<\?=\s*(?!h\()[\$][a-z_]+/i', $content)) {
        $issues[] = "Archivo $file: Variable sin escapar detectada";
    }
    
    // Verificar que h() se usa consistentemente
    if (!preg_match_all('/h\([^)]+\)/', $content, $matches)) {
        $issues[] = "Archivo $file: Falta uso consistente de h()";
    }
}

if (empty($issues)) {
    echo "✅ Todas las vistas pasan la validación XSS\n";
    exit(0);
} else {
    echo "❌ Problemas de XSS encontrados:\n";
    foreach ($issues as $issue) {
        echo "- $issue\n";
    }
    exit(1);
}
```

#### 3.1.2 Verificar CSRF en formularios

Crear script `scripts/verify-csrf.php` que:

```php
<?php
// scripts/verify-csrf.php - Verificar que los formularios tienen token CSRF
$issues = [];

$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator('templates/', RecursiveDirectoryIterator::FILTER_CURRENT)
);

foreach ($files as $file) {
    if ($file->getExtension() !== 'php') continue;
    $content = file_get_contents($file);
    
    // Verificar que forms tienen input csrf_token
    if (preg_match('/<form[^>]*>/i', $content) && 
        !preg_match('/<input[^>]*name=[^>]*csrf_token[^>]*>/i', $content)) {
        $issues[] = "Formulario en $file: Falta token CSRF";
    }
}

if (empty($issues)) {
    echo "✅ Todos los formularios tienen token CSRF\n";
    exit(0);
} else {
    echo "❌ Problemas de CSRF encontrados:\n";
    foreach ($issue in $issues) {
        echo "- $issue\n";
    }
    exit(1);
}
```

---

## 4. Cabeza de Todo Archivo PHP

### 4.1 `config.php` Base

```php
<?php
// config.php - Primera línea de todo archivo PHP
declare(strict_types=1);

// Iniciar sesión si no está activa
if (session_status() === SESSION_NONE) {
    session_start();
}

// Configuración de errores (desarrollo vs producción)
if (getenv('APP_ENV') === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
    ini_set('display_errors', '0');
}

// Conexión a BD (Cloudflare Hyperdrive)
try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=defaultdb",
        getenv("CF_DB_USER") ?? "defaultdb_user",
        getenv("CF_DB_PASSWORD") ?? "defaultdb_password",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    // Log error y mostrar página genérica en producción
    file_put_contents('logs/error_' . date('Y-m-d') . '.log', $e->getMessage());
    header('HTTP/1.1 500 Internal Server Error');
    exit('Error interno del servidor');
}
```

### 4.2 Cargar Helpers de Seguridad

```php
// Cargar función h() si no existe
if (!function_exists('h')) {
    require_once __DIR__ . '/lib/security.php';
}

// Cargar validación CSRF si no existe
if (!function_exists('csrf_validate')) {
    require_once __DIR__ . '/lib/security/csrf.php';
}
```

---

## 5. Resumen de Chequeo de Seguridad

Antes de desplegar cualquier nuevo feature o vista, verificar:

- [ ] Todas las variables impresas en HTML pasan por `h()`
- [ ] Todos los formularios POST tienen campo hidden `csrf_token`
- [ ] La validación CSRF se ejecuta al principio del handler POST
- [ ] Los mensajes de error/feedback al usuario están escapados con `h()`
- [ ] Las URLs/links tienen el hostname validado antes de imprimirse
- [ ] Las entradas JSON se escapean correctamente antes de imprimirse en HTML
- [ ] No hay `echo $_GET/$_POST/$_REQUEST` sin escapar en ningún archivo PHP
- [ ] El archivo config.php tiene `declare(strict_types=1)` en la primera línea

---

## 5. Referencias y Recursos

- **OWASP XSS Prevention Cheat Sheet**: https://owasp.org/www-project-cheat-sheets/cheatsheets/XSS_Prevention_Cheat_Sheet.html
- **OWASP CSRF Prevention Cheat Sheet**: https://owasp.org/www-project-cheat-sheets/cheatsheets/CSRF_Prevention_Cheat_Sheet.html
- **PHP htmlspecialchars documentation**: https://www.php.net/manual/es/function.htmlspecialchars.php
- **PHP random_bytes documentation**: https://www.php.net/manual/es/function.random-bytes.php
- **PHP hash_equals documentation**: https://www.php.net/manual/es/function.hash-equals.php

---

*Documento generado el 2026-10-30 como parte de la migración al Stack Canon PHP.*
*Versión: 1.0 | Revisar en: 2026-11-30*