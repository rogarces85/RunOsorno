# Stack Canon PHP - Estrategia de Vistas Tabler CSS

## Versión 1.0 - 2026-10-30

## Visión General

Este documento describe la estrategia de vistas para el Stack Canon PHP, estableciendo que **todas las vistas deben basarse exclusivamente en Tabler CSS** sin frameworks JS cliente, logrando HTML limpio y renderizable en servidor (SSR).

### Objetivo

Definir las directrices, componentes y patrones para construir vistas usando únicamente Tabler CSS, eliminando la dependencia de jQuery, React, Vue u otros frameworks JavaScript en el cliente.

---

## 1. Principios Fundamentales

### 1.1 HTML Limpio sin Framework JS

- **Prohibido**: jQuery, React, Vue, Angular, o cualquier framework JS en las vistas
- **Sólo permitido**: HTML semántico + clases Tailwind/Tabler CSS
- **Objetivo**: Renderizado completo en servidor (SSR), sin hidratación client-side necesaria para la estructura visual

### 1.2 Renderizado en Servidor (SSR)

- **Ventaja**: El HTML ya está en el cuerpo de la respuesta HTTP
- **Beneficio**: Velocidad de primera pintura, compatible con todas las APIs, sin JS necesario para estructura básica
- **Restricción de Workers**: Sin `node:fs`, sin code generation en runtime, I/O por request

### 1.3 Enfoque "Progressive Enhancement"

- La vista funciona completamente sin JS
- Mejoras opcionales con JS van en archivos separados (`*.tsx` en `app/(app)/`, no en vistas PHP)
- Estructura y estilizado corren por Tabler CSS

---

## 2. Convenciones de Vistas

### 2.1 Estructura Base de Vista

Cada vista PHP debe seguir esta estructura mínima:

```php
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= h($page_title ?? 'RunOsorno') ?></title>
    
    <!-- Tabler CSS - Única dependencia CSS -->
    <link href="https://cdn.jsdelivr.net/npm/tabler@3.0.0/dist/css/tabler.min.css" rel="stylesheet">
    
    <!-- Favicon -->
    <link rel="icon" href="/favicon.ico">
</head>
<body class="min-h-screen bg-gray-100 dark:bg-gray-900">
    
    <main class="max-w-7xl mx-auto p-4">
        <!-- Contenido de la vista -->
    </main>
    
    <!-- JavaScript opcional - solo si es estrictamente necesario -->
    <!-- <script src="ruta/a/script.js"></script> -->
</body>
</html>
```

### 2.2 Doctype y Meta Tags

- **Doctype**: `<!DOCTYPE html>` obligatorio (primera línea)
- **Charset**: `UTF-8` para caracteres especiales (tildes, ñ, etc.)
- **Viewport**: `width=device-width, initial-scale=1.0` para responsive mobile
- **Data theme**: `data-theme="light"` o `data-theme="dark"` para modo oscuro controlado por cookie

### 2.3 Clase `data-bs-theme`

- **No usar**: `light-dark()` o detección automática del sistema operativo
- **Usar**: El tema lo decide la cookie `runosorno_tema` leída en `app/layout.tsx` (o equivalente PHP)
- **Control**: El usuario controla el tema manualmente, no por preferencia del SO

---

## 3. Componentes Reutilizables Tabler CSS

### 3.1 Crear Componentes Una Vez, Reutilizar en Múltiples Vistas

En lugar de escribir HTML repetitivo, crear archivos parciales PHP que incluyan las clases Tabler CSS correspondientes.

#### 3.1.1 Componente `Button`

```php
<!-- buttons.php - Partial reusable -->
<?php
// No requiere parámetros obligatorios, pero soporta opciones
$text = $text ?? 'Botón';
$type = $type ?? 'default'; // default, primary, secondary, danger
$size = $size ?? 'default'; // default, sm, lg
$outline = $outline ?? false;
$href = $href ?? null;
$target = $target ?? '_self';
?>

<!-- Botón con enlace (más común en vistas PHP) -->
<?php if ($href): ?>
    <a href="<?= h($href) ?>" class="btn btn-<?= $type ?> <?= $outline ? 'btn-outline' : '' ?> <?= $size === 'sm' ? 'btn-sm' : ($size === 'lg' ? 'btn-lg' : '') ?>" 
       target="<?= h($target) ?>"><?= h($text) ?></a>
<?php else: ?>
    <button type="button" class="btn btn-<?= $type ?> <?= $outline ? 'btn-outline' : '' ?> <?= $size === 'sm' ? 'btn-sm' : ($size === 'lg' ? 'btn-lg' : '') )}">
        <?= h($text) ?>
    </button>
<?php endif; ?>
```

**Uso en vistas**:
```php
<!-- Como enlace -->
<?php include 'partials/buttons.php'; ?> 
<!-- O con parámetros -->
<?= include 'partials/buttons.php', ['text' => 'Guardar', 'type' => 'primary', 'href' => '/plans/create'] ?>

<!-- Como botón submissions -->
<?= include 'partials/buttons.php', ['text' => 'Guardar Cambios', 'type' => 'secondary', 'size' => 'lg'] ?>
```

#### 3.1.2 Componente `Card`

```php
<!-- cards.php - Partial reusable -->
<div class="card <?= $extra_classes ?? '' ?>">
    <div class="card-header">
        <h3 class="card-title"><?= h($title ?? 'Título') ?></h3>
    </div>
    <div class="card-body">
        <?= h($content ?? 'Contenido por defecto') ?>
    </div>
    <?php if ($show_footer): ?>
    <div class="card-footer">
        <?= h($footer_content ?? '') ?>
    </div>
    <?php endif; ?>
</div>
```

**Uso**:
```php
<!-- Tarjeta simple -->
<?= include 'partials/cards.php', ['title' => 'Perfil', 'content' => $user_bio] ?>

<!-- Tarjeta con footer -->
<?= include 'partials/cards.php', [
    'title' => 'Estadísticas', 
    'content' => $stats_html,
    'show_footer' => true,
    'footer_content' => 'Ver todos los detalles'
] ?>
```

#### 3.1.3 Componente `Table`

```php
<!-- tables.php - Partial reusable -->
<div class="table-responsive">
    <table class="table">
        <thead>
            <tr>
                <?php foreach ($headers as $header): ?>
                    <th><?= h($header) ?></th>
                <?php endforeach; ?>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($rows as $row): ?>
                <tr>
                    <?php foreach ($row as $cell): ?>
                        <td><?= h($cell) ?></td>
                    <?php endforeach; ?>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>
```

**Uso**:
```php
<?php 
$headers = ['Fecha', 'Distancia', 'Tiempo', 'RPE'];
$rows = [
    ['2024-01-15', '10.5 km', '45:30', '7'],
    ['2024-01-22', '12.3 km', '50:15', '8'],
];
?>

<?= include 'partials/tables.php', ['headers' => $headers, 'rows' => $rows] ?>
```

#### 3.1.4 Componente `Badge`

```php
<!-- badges.php - Partial reusable -->
<?php
$text = $text ?? 'Etiqueta';
$variant = $variant ?? 'default'; // default, primary, secondary, success, warning, danger, light, dark
$large = $large ?? false;
?>

<!-- Badge pequeño -->
<span class="badge bg-<?= $variant ?>"><?= h($text) ?></span>

<!-- Badge grande (si el tema lo soporta) -->
<?= $large ? '<span class="badge bg-'.$variant.' fs-base px-3 py-2 rounded-pill">' . h($text) . '</span>' : '' ?>
```

**Uso**:
```php
<!-- Estados de sesión -->
<span class="badge bg-success"><?= include 'partials/badges.php', ['text' => 'Completada', 'variant' => 'success'] ?></span>
<span class="badge bg-warning"><?= include 'partials/badges.php', ['text' => 'Parcial', 'variant' => 'warning'] ?></span>
<span class="badge bg-danger"><?= include 'partials/badges.php', ['text' => 'No realizada', 'variant' => 'danger'] ?></span>
```

---

## 4. Layouts de Aplicación

### 4.1 Layout Público (`public.layout.php`)

Vista base para páginas públicas (landing, login, registro):

```php
<!-- public.layout.php -->
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= h($page_title ?? 'RunOsorno') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Tabler CSS CDN -->
    <link href="https://cdn.jsdelivr.net/npm/tabler@3.0.0/dist/css/tabler.min.css" rel="stylesheet">
    
    <!-- Font: Archivo (variable self-hosted) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <link href="https://fonts.googleapis.com/css2?family=Archivo+Sans:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
    
    <style>
        /* Variables CSS personalizadas */
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f8f9fa;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
        }
        
        @media (prefers-color-scheme: dark) {
            --bg-primary: #0a0a0a;
            --bg-secondary: #1f2937;
            --text-primary: #f3f4f6;
            --text-secondary: #d1d5db;
        }
    </style>
</head>
<body class="min-h-screen bg-gray-100 dark:bg-gray-900" data-theme="light">
    
    <!-- Navigation / Header -->
    <nav class="navbar navbar-expand-md navbar-dark bg-dark mb-4">
        <div class="container">
            <a class="navbar-brand" href="/">
                <img src="/logo.svg" alt="RunOsorno" height="32">
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="/">Inicio</a>
                    </li>
                    <?php if (is_authenticated()): ?>
                        <li class="nav-item">
                            <a class="nav-link" href="/dashboard">Panel</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/perfil">Perfil</a>
                        </li>
                        <li class="nav-item">
                            <form method="POST" action="/logout" class="d-inline">
                                <button type="submit" class="btn-link text-danger">Cerrar sesión</button>
                            </form>
                        </li>
                    <?php endif; ?>
                </ul>
            </div>
        </div>
    </nav>
    
    <main class="max-w-7xl mx-auto p-4">
        <!-- Contenido principal de la vista -->
    </main>
    
    <footer class="mt-auto py-4 text-center text-small text-gray-500">
        <p>&copy; <?= date('Y') ?> RunOsorno. Todos los derechos reservados.</p>
    </footer>
    
    <!-- JavaScript - Tabler JS mínimno / Vanilla JS solo -->
    <script src="https://cdn.jsdelivr.net/npm/tabler@3.0.0/dist/js/tabler.min.js"></script>
    <!-- Scripts propios solo si son críticos y van en línea -->
    <!-- <script src="/js/app.js"></script> -->
</body>
</html>
```

### 4.2 Layout Aplicación (`app.layout.php`)

Vista base para áreas protegidas (dashboard, coach, atleta):

```php
<!-- app.layout.php -->
<!DOCTYPE html>
<html lang="es" data-theme="light" data-page="app">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= h($page_title ?? 'RunOsorno') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Tabler CSS -->
    <link href="https://cdn.jsdelivr.net/npm/tabler@3.0.0/dist/css/tabler.min.css" rel="stylesheet">
    
    <!-- CSS Personalizado - Variables y overrides -->
    <link rel="stylesheet" href="/css/app.min.css">
    
    <!-- Iconos Bootstrap -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
</head>
<body class="min-h-screen bg-gray-100 dark:bg-gray-900" data-theme="light">
    
    <!-- Sidebar Navigation (para coaches/directors) -->
    <?php if (has_sidebar()): ?>
    <div class="sidebar col-md-2 col-lg-2 bg-dark min-vh-100 p-0">
        <ul class="nav flex-column">
            <li class="nav-item">
                <a class="nav-link active" href="/dashboard">
                    <i class="bi bi-speedometer"></i> Dashboard
                </a>
            </li>
            <!-- Más enlaces de navegación -->
            <?php foreach ($sidebar_links as $link): ?>
                <li>
                    <a class="nav-link" href="<?= h($link['url']) ?>">
                        <i class="bi <?= h($link['icon']) ?> me-2"></i><?= h($link['label']) ?>
                    </a>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>
    
    <main class="col-md-9 col-lg-9 p-4">
        <!-- Título de página -->
        <div class="page-header mb-4">
            <h1 class="h2"><?= h($page_title ?? '') ?></h1>
            <small class="text-gray-500"><?= h($page_subtitle ?? '') ?></small>
        </div>
        
        <!-- Mensajes flash / notifications -->
        <?= $this->fetch('flashMessages') ?>
        
        <!-- Contenido principal -->
        <?= $this->section('content') ?>
    </main>
    
    <footer class="mt-4 py-3 text-center text-small text-gray-500">
        <p>&copy; <?= date('Y') ?> RunOsorno. <a href="/">Privacidad</a> | <a href="/terminos">Términos</a></footer>
    </footer>
    
    <!-- JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/tabler@3.0.0/dist/js/tabler.min.js"></script>
    <script src="/js/app.min.js"></script>
</body>
</html>
```

---

## 5. Estados de Sesión con Formas Visuales (No Solo Color)

### 4.1 Principio: El Color No es Suficiente

Según las reglas de accesibilidad (Phase 48):

- **Cada estado del calendario tiene forma propia vía `[data-state=...]` en `globals.css`**
- **Un nuevo estado necesita su forma, no solo su tono**
- **Los estados incluyen formaradio, triángulo, anillo o hueco**

### 4.2 Estilos CSS para Estados de Sesión

```css
/* globals.css - Estados del calendario */
[data-state="completed"] {
    --badge-bg: #10b981; /* Verde - completado */
    --badge-shape: rect; /* Rectángulo */
}

[data-state="partial"] {
    --badge-bg: #f59e0b; /* Ámbar - parcial */
    --badge-shape: rect;
}

[data-state="not_done"] {
    --badge-bg: #ef4444; /* Rojo - no realizado */
    --badge-shape: rect;
}

[data-state="in_progress"] {
    --badge-bg: #3b82f6; /* Azul - en progreso */
    --badge-shape: rect;
}

/* Shapes adicionales (opcional) */
[data-state="completed"]::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    background: currentColor;
    border-radius: 50%;
    top: 50%;
    right: -4px;
    transform: translateY(-50%);
}

[data-state="not_done"]::before {
    content: "•";
    display: block;
    font-size: 0.75em;
    color: currentColor;
}
```

### 4.2 Implementación en Vistas PHP

```php
<!-- Ejemplo: Día de calendario con estado -->
<div class="calendar-day" data-state="<?= h($session_status ?? 'not_done') ?>">
    <span class="day-number"><?= h($day_number) ?></span>
    
    <!-- Badge con forma y color según estado -->
    <span class="badge bg-[var(--badge-bg)] px-2 py-1 rounded">
        <?= h($session_label ?? '') ?>
    </span>
</div>
```

### 4.3 Variables CSS en `globals.css`

```css
/* Definir variables de estado por defecto */
:root {
    --badge-bg-completed: #10b981;
    --badge-bg-partial: #f59e0b;
    --badge-bg-not_done: #ef4444;
    --badge-bg-in_progress: #3b82f6;
    
    --badge-shape-completed: rect;
    --badge-shape-partial: rect;
    --badge-shape-not_done: rect;
    --badge-shape-in_progress: rect;
}
```

### 4.4 Accesibilidad (Phase 48 Rules)

- **Nunca color solo**: Cada estado debe tener forma identificable
- **`[data-state=...]`**: Usar atributo data-state en el contenedor padre
- **Combinar color + forma**: El badge muestra color, la forma del contenedor identifica el estado
- **Nuevo estado**: Requiere tanto color definidio como forma SVG/HTML identificable

---

## 5. Migración de Vistas Existentes a Tabler CSS

### 5.1 Patrones a Eliminar (Anti-Patrones)

| Anti-Patron | Razón | Reemplazo |
|-------------|-------|-----------|
| `<button>` con estilos inline | Difficult maintenance | Clases Tabler `btn` |
| Tabla con `style=` attributes | Hard to maintain | Clase `table` Tabler |
| `div` con `bg-[color]` inline | No consistente | Variables CSS + clases `bg-*` |
| `float: left` / `clearfix` | Legacy CSS | Clases Grid/Flex Tabler |
| `position: absolute` para layout | Fragil | Clases `position-fixed` Tabler o layout natural |

### 5.2 Patrones a Adoptar

| Nuevo Patrón | Archivo de Ejemplo | Beneficio |
|-------------|-------------------|-----------|
| `table > thead > tr > th` | `partials/tables.php` | Accessible tabla semantic |
| `card > card-header > h3` | `partials/cards.php` | Consistencia visual |
| `badge bg-[color-NAME]` | `partials/badges.php` | Estados con color+shape |
| `grid gap-4` | Layouts nativos | Responsivo sin CSS custom |
| `form-control` | Formularios input | Estilo consistente |

### 5.3 Estrategia de Migración Paso a Paso

1. **Identificar vistas**: Listar todos los archivos `*.php` en `templates/`
2. **Priorizar**: Empezar por login, dashboard, y formularios críticos
3. **Refactorizar por componente**: Migrar `Button` → `Card` → `Table` → `Badge`
4. **Validar accessibility**: Ejecutar `scripts/verify-accesibilidad.php`
5. **Deploy progresivo**: Merge cambios por componente, no masivo

---

## 6. Herramientas de Validación

### 6.1 Script `scripts/verify-accesibilidad.php`

```php
<?php
// scripts/verify-accesibilidad.php - Ejecutar antes de deploy
// Basado en axe-core principles para 22 rutas en claro y oscuro

$issues = [];
$template_dir = 'templates/';
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($template_dir),
    RecursiveIteratorIterator::LEAVES_ONLY
);

foreach ($files as $file) {
    if ($file->getExtension() !== 'php') continue;
    $content = file_get_contents($file);
    
    // Verificar [data-state=...] existe en lugar de solo colores
    if (preg_match_all('/\[data-state=[^\]]+\]/', $content, $matches)) {
        // Buen signo - tiene atributos data-state
    } else {
        // Revisar si hay clases de estado que carecen de forma
        if (preg_match('/bg-red-500.*bg-green-500/', $content)) {
            $issues[] = "Archivo $file: Estados de color sin forma definida";
        }
    }
    
    // Verificar que no hay aria-label reescribiendo texto visible
    if (preg_match('/<button[^>]*aria-label=[^>]*>[^<]+<\/button>/', $content)) {
        $issues[] = "Archivo $file: botón con aria-label que reescribe texto visible";
    }
    
    // Verificar saltos de línea main
    if (!preg_match('/<main[^>]*id=[\"']contenido[\"']/', $content)) {
        $issues[] = "Archivo $file: Saltos de navegación principal fuera de <main id='contenido'>";
    }
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

### 6.2 Ejecutar Validación

```bash
cd C:\xampp\htdocs\www\RunOsorno
php scripts/verify-accesibilidad.php
```

**Resultados esperados**: ✅ Si todos los archivos cumplen las reglas

**Resultados problemáticos**: ❌ Listar problemas y corregir antes de deploy

---

## 7. Resumen de Chequeo Pre-Deploy

Antes de desplegar cualquier vista nueva o modificada:

- [ ] HTML5 doctype en primera línea
- [ ] `data-theme="light"` o `data-theme="dark"` en `<html>`
- [ ] Tabler CSS CDN cargado (sólo este, sin otros frameworks)
- [ ] `h()` usado en todas las variables dinámicas impresas
- [ ] Formularios tienen token CSRF hidden field
- [ ] Estados de sesión usan `[data-state=...]` + color badge
- [ ] Navegación principal dentro de `<main id="contenido">`
- [ ] No hay `aria-label` que reescriba texto visible en botones
- [ ] No hay estilos inline `bg-[color]` sin variables CSS definidas
- [ ] Scripts Tabler CDN (`tabler.min.js`) cargado al final
- [ ] No hay jQuery, React, Vue imports en la vista

---

## 7. Recursos Externos

- **Tabler CSS v3 Documentation**: https://github.com/tabler/tabler
- **Bootstrap Icons**: https://icons.getbootstrap.com/
- **Arquitectura de Accesibilidad Phase 48**: Ver `02-DOCS/wiki/accessibility-rules.md`
- **Variables CSS personalizadas**: Documentación en `app/styles/tokens.css`

---

*Documento generado el 2026-10-30 como parte de la migración al Stack Canon PHP.*
*Versión: 1.0 | Revisar en: 2026-11-30*