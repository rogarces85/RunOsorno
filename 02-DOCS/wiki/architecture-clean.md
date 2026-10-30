# Stack Canon PHP - Arquitectura Limpia

## Versión 1.0 - 2026-10-30

## Visión General

Este documento describe la arquitectura limpia (Clean Architecture) aplicada al Stack Canon PHP para RunOsorno. El objetivo es separar claramente las responsabilidades, facilitar el testing y mantener el código independiente de frameworks o bases de datos específicas.

### Objetivo

Estructurar el código PHP en capas bien definidas con dependencias hacia afuera, permitiendo:
- Testing unitario sin BD
- Cambio de proveedor de BD sin afectar lógica de negocio
- Separación de preocupaciones (SoC)
- Código comprensible y mantenible

---

## 2. Estructura de Capas

### 2.1 El Principio de Dependencias Hacia Afuera

```
┌─────────────────────────┐
│         INFRA           │  (DB, APIs, Frameworks - OUTER)
└─────────────────────────┘
           ↑
           │  (Dependencies point OUTWARD)
           ↓
┌─────────────────────────┐
│      ADAPTERS           │  (PDO, Cloudflare R2, Resend - 2nd LAYER)
└─────────────────────────┘
           ↑
           │
           ↓
┌─────────────────────────┐
│      DOMAIN/CORE        │  (Entidad pura, lógica de negocio - INNER)
│  - Use Cases / Cases    │
│  - Entities (PHP puro) │
└─────────────────────────┘
           ↑
           │  (Ninguna dependencia - aislado)
           ↓
┌─────────────────────────┐
│    GATEWAY / REPO       │  (Interfaces/Contracts - 2nd INNER)
│  - Firmas de métodos    │
│  - Contratos           │
└─────────────────────────┘
```

### 2.2 Capas Detalladas

#### Capa 1: Dominio / Núcleo (INNER - Capa más interna)

**Qué contiene**:
- Entidades PHP puro (objetos de datos sin lógica de negocio compleja)
- Casos de uso (use cases) o casos de aplicación
- Lógica de negocio pura, sin conocimientos de BD o HTTP
- Interfaces/contratos (gateways/repositories)

**Características**:
- **Sin importaciones de infraestructura**: No hay `use PDO`, `use Resend`, etc.
- **Testeable aisladamente**: Puedes testear con datos mock sin BD
- **Frameworks agnósticos**: El código funciona igual en PHP puro, Workers, o cualquier entorno

**Ejemplo de entidad**:

```php
<?php
// src/Domain/Entities/User.php - Entidad pura, sin imports de infraestructura

namespace App\Domain\Entities;

class User
{
    public int $id;
    public string $name;
    public string $email;
    public string $passwordHash;
    public string $role;
    public bool $isActive;
    public bool $isVerified;
    public \DateTimeCreated $createdAt;
    public \DateTimeUpdated $updatedAt;
    
    public function __construct(
        int $id,
        string $name,
        string $email,
        string $passwordHash,
        string $role,
        bool $isActive,
        bool $isVerified,
        \DateTimeCreated $createdAt,
        \DateTimeUpdated $updatedAt
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->passwordHash = $passwordHash;
        $this->role = $role;
        $this->isActive = $isActive;
        $this->isVerified = $isVerified;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
    }
}
```

#### Capa 2: Gateway / Repository Interfaces (INNER)

**Qué contiene**:
- Interfaces/contratos que definen lo que el dominio puede hacer
- Firmas de métodos sin implementación
- Contratos que la capa de adaptadores debe cumplir

**Ejemplo de interfaz**:

```php
<?php
// src/Domain/Gateways/UserRepository.php - Interfaz para el repositorio

namespace App\Domain\Gateways;

interface UserRepository
{
    public function findById(int $id): ?User;
    public function findByEmail(string $email): ?User;
    public function save(User $user): void;
    public function existsWithEmail(string $email): bool;
    public function countActiveByRole(string $role): int;
}
```

#### Capa 3: Adapters (SECOND LAYER)

**Qué contiene**:
- Implementaciones concretas de las interfaces del dominio
- Conexión a BD PDO
- Integración con Cloudflare R2 para avatares
- Envío de emails vía Resend
- Transformación de datos entre formato BD y entidades del dominio

**Características**:
- **Sólo dependencias hacia afuera**: Hacia PDO, R2, Resend, Workers
- **Fábrica de dependencias**: Recibir conexiones por parámetro (no crear internas)
- **Mapeo DTO ↔ Entity**: Convertir filas PDO a objetos Domain\Entities\User

**Ejemplo de adaptador**:

```php
<?php
// src/Infrastructure/Adapters/PdoUserRepository.php - Implementación PDO

namespace App\Infrastructure\Adapters;

use App\Domain\Entities\User;
use App\Domain\Gateways\UserRepository;

class PdoUserRepository implements UserRepository
{
    protected \PDO $pdo;
    
    public function __construct(\PDO $pdo)
    {
        $this->pdo = $pdo;
        // Nota: No hay conexión aquí, se asume que ya está abierta
        // Por request (patrón getDatabase()) o inyectada via DI container
    }
    
    public function findById(int $id): ?User
    {
        $stmt = $this->pdo->prepare("SELECT id, name, email, password_hash, role, is_active, 
                                      created_at, updated_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        
        if (!$row) {
            return null;
        }
        
        return new User(
            (int)$row['id'],
            h($row['name']),
            h($row['email']),
            $row['password_hash'],
            $row['role'],
            (bool)$row['is_active'],
            /* is_verified no en users básica, se calcula aparte */
            false,
            new \DateTimeCreated((string)$row['created_at']),
            new \DateTimeUpdated((string)$row['updated_at'])
        );
    }
    
    public function findByEmail(string $email): ?User
    {
        $stmt = $this->pdo->prepare("SELECT id, name, email, password_hash, role, is_active, 
                                      created_at, updated_at FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        
        return $this->mapToUser($row);
    }
    
    public function save(User $user): void
    {
        $stmt = $this->pdo->prepare(
            "INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, NOW(), NOW()) 
             ON DUPLICATE KEY UPDATE 
                 name = VALUES(name), 
                 email = VALUES(email), 
                 password_hash = VALUES(password_hash),
                 updated_at = NOW()"
        );
        
        $stmt->execute([
            h($user->name),
            h($user->email),
            $user->passwordHash,
            $user->role,
            $user->isActive ? 1 : 0,
        ]);
    }
    
    public function existsWithEmail(string $email): bool
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return (bool)$stmt->fetchColumn();
    }
    
    public function countActiveByRole(string $role): int
    {
        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM users WHERE role = ? AND is_active = 1"
        );
        $stmt->execute([$role]);
        return (int)$stmt->fetchColumn();
    }
}
```

#### Capa 4: Use Cases / Services (THIRD LAYER)

**Qué contiene**:
- Lógica de negocio orquestada
- Coordination between repositories/gateways
- Validación de entrada/salida
- Error handling domain-specific
- No contiene lógica de presentación (vistas)

**Ejemplo de caso de uso**:

```php
<?php
// src/App/UseCases/Auth/LoginUser.php - Caso de uso de login

namespace App\App\UseCases\Auth;

use App\Domain\Entities\User;
use App\Domain\Gateways\UserRepository;
use App\Domain\Gateways\SessionGateway;
use App\Infrastructure\Security\PasswordVerifier;
use App\Infrastructure\Security\CsrfValidator;
use App\Domain\ValueObjects\LoginResult;

class LoginUser
{
    protected UserRepository $userRepository;
    protected PasswordVerifier $passwordVerifier;
    protected SessionGateway $sessionGateway;
    protected CsrfValidator $csrfValidator;
    
    public function __construct(
        UserRepository $userRepository,
        PasswordVerifier $passwordVerifier,
        SessionGateway $sessionGateway,
        CsrfValidator $csrfValidator
    ) {
        $this->userRepository = $userRepository;
        $this->passwordVerifier = $passwordVerifier;
        $this->sessionGateway = $sessionGateway;
        $this->csrfValidator = $csrfValidator;
    }
    
    public function execute(string $email, string $password, ?string $csrfToken = null): LoginResult
    {
        // 1. Buscar usuario por email
        $user = $this->userRepository->findByEmail($email);
        
        if (!$user) {
            return LoginResult::failure('Usuario no encontrado');
        }
        
        // 2. Verificar que el usuario está activo
        if (!$user->isActive) {
            return LoginResult::failure('Cuenta desactivada');
        }
        
        // 3. Verificar CSRF si es POST request (validación de frontera)
        if ($csrfToken !== null && !$this->csrfValidator->validate($csrfToken)) {
            return LoginResult::failure('Token de seguridad inválido');
        }
        
        // 4. Verificar contraseña (con migración heredada bcrypt→PBKDF2)
        $passwordValid = $this->passwordVerifier->verify($password, $user->passwordHash);
        
        if (!$passwordValid) {
            return LoginResult::failure('Contraseña incorrecta');
        }
        
        // 5. Verificar que la cuenta está activa (segunda capa)
        if (!$user->isActive) {
            return LoginResult::failure('Cuenta desactivada');
        }
        
        // 6. Crear sesión del usuario
        $sessionResult = $this->sessionGateway->create($user->id, $user->role);
        
        if (!$sessionResult->ok) {
            return LoginResult::failure('Error al crear sesión: ' . $sessionResult->error);
        }
        
        // 7. Retornar resultado exitoso
        return LoginResult::success($user, $sessionResult->sessionId);
    }
}
```

#### Capa 5: Entry Point / Controllers (OUTERMOST)

**Qué contiene**:
- Manejadores de rutas (framework-agnostic o minimal)
- Parseo de request HTTP
- Formateo de response HTTP
- Inyección de dependencias
- Middleware ligero (sin el costoso proxy de Cloudflare)

**Ejemplo de controlador**:

```php
<?php
// src/Http/Controllers/AuthController.php - Controlador mínimo

namespace App\Http\Controllers;

use App\App\UseCases\Auth\LoginUser;
use App\Infrastructure\Adapters\PdoUserRepository;
use App\Infrastructure\Security\PasswordVerifier;
use App\Infrastructure\Security\CsrfValidator;
use App\Infrastructure\Gateways\SessionGateway;
use App\Infrastructure\Session\SessionHandler;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;
use Slim\Psr7\Headers;

class AuthController
{
    protected LoginUser $loginUseCase;
    
    public function __construct()
    {
        // Dependency Injection - los adaptadores se crean en el bootstrap
        $this->loginUseCase = new LoginUser(
            new PdoUserRepository($GLOBALS['pdo']),
            new PasswordVerifier(),
            new SessionHandler(),
            new CsrfValidator()
        );
    }
    
    public function handleLogin(ServerRequestInterface $request): ResponseInterface
    {
        // 1. Obtener datos del formulario
        $email = $request->getParsedBody()['email'] ?? '';
        $password = $request->getParsedBody()['password'] ?? '';
        $csrfToken = $request->getParsedBody()['csrf_token'] ?? '';
        
        // 2. Ejecutar caso de uso
        $result = $this->loginUseCase->execute($email, $password, $csrfToken);
        
        // 2. Responder según resultado
        if ($result->isOk()) {
            $user = $result->getUser();
            $sessionId = $result->getSessionId();
            
            // Crear respuesta exitosa con sesión
            $response = $response->withStatus(302)
                ->withHeader('Location', '/dashboard');
            
            // Session handling
            $session = $sessionHandler->start($user->id);
            $response->getSession()->set('user_id', $user->id);
            $response->getSession()->set('role', $user->role);
            
            return $response;
        } else {
            // Respuesta de error (volver al login con mensaje)
            $response = $response->withStatus(302)
                ->withHeader('Location', '/login?error=' . urlencode($result->getError()));
            
            return $response;
        }
    }
    
    public function handleLogout(ServerRequestInterface $request): ResponseInterface
    {
        // Cerrar sesión y redirigir
        $response = $response->withStatus(302)
            ->withHeader('Location', '/login');
        
        // Invalidar sesión
        $session = $request->getSession();
        $session->destroy();
        
        return $response;
    }
}
```

#### Capa 6: Bootstrap / Dependency Injection (SOPORTE)

**Qué contiene**:
- Creación de conexiones PDO
- Registro de servicios en contenedor
- Configuración global
- Ejecución del framework mínimo

**Ejemplo simplificado**:

```php
<?php
// public/index.php - Entry point mínimo

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../app/App/UseCases/Auth/LoginUser.php';
require_once __DIR__ . '/app/Infrastructure/Adapters/PdoUserRepository.php';
require_once __DIR__ . '/app/Infrastructure/Security/PasswordVerifier.php';
require_once __DIR__ . '/app/Infrastructure/Gateways/SessionGateway.php';
require_once __DIR__ . '/app/Infrastructure/Session/SessionHandler.php';
require_once __DIR__ . '/app/Http/Controllers/AuthController.php';

// 1. Configuración y BD
$config = require __DIR__ . '/../config.php';
$pdo = new \PDO(
    "mysql:host=localhost;dbname={$config['db_name']}",
    $config['db_user'],
    $config['db_password'],
    [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
);
$GLOBALS['pdo'] = $pdo; // Disponible para todos los adaptadores

// 2. Crear adaptadores (inyección dependencias)
// El PdoUserRepository recibe el $pdo por constructor
$userRepository = new App\Infrastructure\Adapters\PdoUserRepository($pdo);

// 3. Crear controlador
$authController = new App\Http\Controllers\AuthController();

// 4. Rutas minimal (sin middleware costoso)
// Usando Slim Framework ligero o ruta manual

// Ruta de login
$app->post('/login', function (Psr\Http\Message\ServerRequestInterface $request, 
                            Psr\Http\Message\ResponseInterface $response) use ($authController) {
    return $authController->handleLogin($request, $response);
});

// Ruta de logout
$app->get('/logout', function (Psr\Http\Message\ServerRequestInterface $request, 
                          Psr\Http\Message\ResponseInterface $response) use ($authController) {
    return $authController->handleLogout($request, $response);
});

// Ejecutar
$app->run();
```

---

## 3. Patrón de Inyección de Dependencias Simplificada

### 3.1 Contenedor DI Mínimo

```php
<?php
// src/Infrastructure/Container.php - Contenedor DI simplificado

namespace App\Infrastructure;

class Container
{
    protected array $bindings = [];
    
    public function bind(string $abstract, $concrete)
    {
        $this->bindings[$abstract] = $concrete;
    }
    
    public function make(string $abstract)
    {
        if (!isset($this->bindings[$abstract])) {
            throw new \Exception("Binding no registrado: $abstract");
        }
        
        $concrete = $this->bindings[$abstract];
        
        // Reflect and instantiate
        $reflector = new \ReflectionClass($concrete);
        $constructor = $reflector->getConstructor();
        
        if ($constructor === false) {
            return new $concrete();
        }
        
        $params = [];
        foreach ($constructor->getParameters() as $param) {
            $paramType = $param->getType();
            if ($paramType instanceof \ReflectionNamedType) {
                $typeName = $paramType->getName();
                
                // Si es algo que ya hemos creado (inyección recursiva)
                if (array_key_exists($typeName, $this->bindings)) {
                    $params[] = $this->make($typeName);
                } elseif (isset($GLOBALS[$typeName])) {
                    $params[] = $GLOBALS[$typeName];
                } else {
                    // Instanciar automáticamente si es una entidad simple
                    $params[] = new $typeName();
                }
            }
        }
        
        return $reflector->newInstanceArgs($params);
    }
}
```

### 3.2 Uso del Contenedor

```php
<?php
// bootstrap.php - Bootstrap del sistema

$container = new \App\Infrastructure\Container();

// 1. Registrar bindings
$container->bind('PDO', function() {
    $pdo = new \PDO(
        "mysql:host=localhost;dbname=defaultdb",
        getenv("CF_DB_USER") ?? "defaultdb_user",
        getenv("CF_DB_PASSWORD") ?? "defaultdb_password",
        [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
    );
    return $pdo;
});

$container->bind('App\Domain\Gateways\UserRepository', 
    \App\Infrastructure\Adapters\PdoUserRepository::class);

$container->bind('App\App\UseCases\Auth\LoginUser', 
    \App\App\UseCases\Auth\LoginUser::class);

// 2. Crear instancias
$userRepo = $container->make('App\Domain\Gateways\UserRepository');
$loginUseCase = $container->make('App\App\UseCases\Auth\LoginUser');

// 3. Usar
$result = $loginUseCase->execute('test@test.com', 'password123');
```

---

## 4. Migración desde el Patrón Actual

### 4.1 De TypeScript/Drizzle a PHP/Clean Architecture

| Concepto TypeScript | Contraparte PHP Clean Architecture |
|-------------------|-----------------------------------|
| `db.select().from(users)` | `UserRepository->findByEmail()` |
| `User` interface/type | `App\Domain\Entities\User` |
| `bcrypt.hash()` | `PasswordVerifier->hash()` / `needsRehash()` |
| `bcrypt.compare()` | `PasswordVerifier->verify()` |
| `Drizzle ORM queries` | `PDO prepared statements` + Repositorios |
| `Next.js API routes` | `PHP Handlers` (Slim minimal o rutas nativas) |
| `Middleware global` | `Bootstrap/Dependency Injection` |
| `Context7 docs` | `02-DOCS/wiki/` (documentación propia) |

### 4.2 Pasos de Migración

1. **Definir entidades Domain**: Crear `src/Domain/Entities/` con clases PHP puro
2. **Definir interfaces**: Crear `src/Domain/Gateways/` con interfaces sin implementación
3. **Implementar adaptadores**: Crear `src/Infrastructure/Adapters/` con PDO, R2, Resend
4. **Crear casos de uso**: Crear `src/App/UseCases/` con lógica de negocio orquestada
5. **Crear controladores**: Crear `src/Http/Controllers/` mínimos para routes
6. **Bootstrap**: Crear `public/index.php` entry point con DI container
7. **Testing**: Testear casos de uso con datos mock (sin BD)
8. **Gradual migration**: Migrar routes uno por uno, no todo de golpe

---

## 5. Testing con Clean Architecture

### 5.1 Testing Isolado (Sin BD)

```php
<?php
// tests/App/UseCases/Auth/LoginUserTest.php

use App\App\UseCases\Auth\LoginUser;
use App\Domain\Entities\User;
use App\Domain\ValueObjects\LoginResult;
use PHPUnit\Framework\TestCase;

class LoginUserTest extends TestCase
{
    public function test_login_successful(): void
    {
        // Crear usuario mock (sin BD)
        $user = new User(
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            passwordHash: 'hashed_password_mock',
            role: 'ROLE_ATHLETE',
            isActive: true,
            isVerified: true,
            createdAt: new \DateTime(),
            updatedAt: new \DateTime()
        );
        
        // Crear mock del repositorio
        $userRepo = $this->createMock(App\Domain\Gateways\UserRepository::class);
        $userRepo->method('findByEmail')->willReturn($user);
        
        // Mock del validador de password (devuelve true)
        $passwordVerifier = $this->createMock(App\Infrastructure\Security\PasswordVerifier::class);
        $passwordVerifier->method('verify')->willReturn(true);
        
        // Mock del gateway de sesión
        $sessionGateway = $this->createMock(App\Infrastructure\Gateways\SessionGateway::class);
        $sessionGateway->method('create')->willReturn(['ok' => true, 'sessionId' => 'sess_123']);
        
        // Mock del validador CSRF
        $csrfValidator = $this->createMock(App\Infrastructure\Security\CsrfValidator::class);
        $csrfValidator->method('validate')->willReturn(true);
        
        // Instanciar caso de uso (inyectando mocks)
        $useCase = new LoginUser(
            $userRepo,
            $passwordVerifier,
            $sessionGateway,
            $csrfValidator
        );
        
        // Ejecutar
        $result = $useCase->execute('test@example.com', 'password123');
        
        // Afirmar
        $this->assertInstanceOf(LoginResult::class, $result);
        $this->assertTrue($result->isOk());
        $this->assertEquals('test@example.com', $result->getUser()->email);
        $this->assertEquals('sess_123', $result->getSessionId());
    }
    
    public function test_login_inactive_user(): void
    {
        $user = new User(
            id: 2,
            name: 'Inactive User',
            email: 'inactive@example.com',
            passwordHash: 'hash',
            role: 'ROLE_ATHLETE',
            isActive: false,  // Usuario inactivo
            isVerified: true,
            createdAt: new \DateTime(),
            updatedAt: new \DateTime()
        );
        
        $userRepo = $this->createMock(App\Domain\Gateways\UserRepository::class);
        $userRepo->method('findByEmail')->willReturn($user);
        
        $passwordVerifier = $this->createMock(App\Infrastructure\Security\PasswordVerifier::class);
        $passwordVerifier->method('verify')->willReturn(true);
        
        $sessionGateway = $this->createMock(App\Infrastructure\Gateways\SessionGateway::class);
        $sessionGateway->method('create')->willReturn(['ok' => true, 'sessionId' => 'sess_456']);
        
        $csrfValidator = $this->createMock(App\Infrastructure\Security\CsrfValidator::class);
        $csrfValidator->method('validate')->willReturn(true);
        
        $useCase = new LoginUser(
            $userRepo,
            $passwordVerifier,
            $sessionGateway,
            $csrfValidator
        );
        
        $result = $useCase->execute('inactive@example.com', 'password123');
        
        $this->assertFalse($result->isOk());
        $this->assertEquals('Cuenta desactivada', $result->getError());
    }
}
```

### 5.2 Testing Integración (Con BD Real)

```php
<?php
// tests/Infrastructure/PdoUserRepositoryTest.php

use App\Infrastructure\Adapters\PdoUserRepository;
use PDO;
use DateTime;

class PdoUserRepositoryTest extends TestCase
{
    protected PDO $pdo;
    protected PdoUserRepository $repository;
    
    protected function setUp(): void
    {
        // BD en memoria para testing
        $this->pdo = new PDO('sqlite::memory:');
        
        // Crear esquema simple
        $this->pdo->exec("
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                name TEXT,
                email TEXT,
                password_hash TEXT,
                role TEXT,
                is_active INTEGER,
                created_at TEXT,
                updated_at TEXT
            );
        ");
        
        // Insertar usuario de prueba
        $this->pdo->exec("
            INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
            VALUES ('Test User', 'test@example.com', 'hash', 'ROLE_ATHLETE', 1, datetime('now'), datetime('now'))
        ");
        
        $this->repository = new PdoUserRepository($this->pdo);
    }
    
    protected function tearDown(): void
    {
        // Cleanup
        $this->pdo = null;
        $this->repository = null;
    }
    
    public function test_find_by_id(): void
    {
        $user = $this->repository->findById(1);
        
        $this->assertNotNull($user);
        $this->assertInstanceOf(\App\Domain\Entities\User::class, $user);
        $this->assertEquals('Test User', $user->name);
        $this->assertEquals('test@example.com', $user->email);
    }
    
    public function test_find_by_id_not_found(): void
    {
        $user = $this->repository->findById(999);
        
        $this->assertNull($user);
    }
    
    public function test_find_by_email(): void
    {
        $user = $this->repository->findByEmail('test@example.com');
        
        $this->assertNotNull($user);
        $this->assertEquals('test@example.com', $user->email);
    }
}
```

---

## 6. Beneficios de Clean Architecture en Cloudflare Workers

### 5.1 Cumplimiento de Restricciones

| Restricción | Cómo Clean Architecture Ayuda |
|-------------|------------------------------|
| Sin middleware costoso | Controllers minimal, lógica en Use Cases |
| I/O por request | Dependencies injected por request, no estáticas |
| CPU limit 10ms | Lógica de negocio aislada, testing sin costo de BD |
| No eval/new Function | Código PHP puro, sin librerías que evalúen strings |
| Workers Free tier | Capas separadas permiten optimizar solo las necesarias |

### 5.2 Optimizaciones Específicas Workers

```php
<?php
// src/Infrastructure/Adapters/PdoUserRepository.php - Optimizado para Workers

class PdoUserRepository implements UserRepository
{
    // El PDO NO se crea aquí staticamente
    // Se pasa por constructor por request (inyectado desde bootstrap)
    
    public function __construct(\PDO $pdo)
    {
        // No hay $this->pdo->... aquí en el constructor
        // El $pdo se usa en cada método individualmente
        // Cada request get su propia conexión del pool Hyperdrive
    }
    
    public function findById(int $id): ?User
    {
        // Cada query es una operación independiente
        // No hay estado compartido entre requests
        $stmt = $this->pdo->prepare('SELECT ... WHERE id = ?');
        $stmt->execute([$id]);
        // ... procesar resultado
        return $user;
    }
    
    public function login(string $email, string $password): LoginResult
    {
        // Mismo patrón: query preparada, execute, return result
        // Sin variables compartidas, seguro para Workers Free 10ms
    }
}
```

---

## 6. Estructura de Archivos Final

```
src/
├── Domain/                   # Capa INNER - Sin infraestructura
│   ├── Entities/             # User, Session, Plan, etc. (PHP puro)
│   └── Gateways/             # Interfaces: UserRepository, SessionRepository, etc.
├── App/                      # Capa de Use Cases / Aplicación
│   └── UseCases/             # LoginUser, GeneratePlan, etc. (orquesta repositorios)
├── Infrastructure/           # Capa de Adapters (hacia afuera)
│   ├── Adapters/             # PdoUserRepository, R2Client, ResendEmailer
│   ├── Security/             # PasswordVerifier, CsrfValidator, h() helper
│   └── Gateways/             Implementaciones concretas
├── Http/                     # Capa de Entry Point
│   ├── Controllers/          # AuthController, PlanController, minimal
│   └── Middleware/           # Ligero, solo lo necesario
└── App.php                   # Punto de entrada DI container / bootstrap
```

---

## 7. Migración Gradual Recomendada

### Fase 1 (1-2 semanas): Estructura base
- [ ] Crear `src/Domain/Entities/` con entidades PHP puro
- [ ] Definir interfaces en `src/Domain/Gateways/`
- [ ] Crear bootstrap mínimo `public/index.php`
- [ ] Migrar Auth login/logout a nueva arquitectura

### Fase 2 (2-3 semanas): Servicios críticos
- [ ] Migrar User Service (CRUD)
- [ ] Migrar Session Service (registro de sesiones)
- [ ] Migrar Plan Service (generación de semanas)
- [ ] Testing unitario de todos los Use Cases

### Fase 3 (2-3 semanas): Vistas y Routes
- [ ] Migrar controladores a nuevo patrón
- [ ] Crear vistas Tabler CSS nuevas sobre arquitectura
- [ ] Migrar vistas existentes poco a poco
- [ ] Validar accessibility (verify-accesibilidad.php)

### Fase 4 (1 semana): Testing y Validación
- [ ] Tests unitarios pasando > 90%
- [ ] Tests de integración con BD real
- [ ] Performance testing en Workers preview
- [ ] Documentación completada (`02-DOCS/wiki/`)

### Fase 5 (Decisión): Main Merge o Paralelo
- [ ] Evaluar estabilidad
- [ ] Decidir merge a main o mantener php-canonical paralelo
- [ ] Documentar lecciones aprendidas
- [ ] Plan de deprecación del sistema antiguo

---

## 8. Referencias y Recursos

- **Clean Architecture - Robert C. Martin**: Libro original y principios
- **Clean Architecture en PHP**: Guías y ejemplos de comunidad
- **Dependency Injection en PHP**: Guía práctica
- **Cloudflare Workers PHP**: Limitaciones y patrones recomendados
- **PHPUnit Testing**: Manual y mejores prácticas

---

*Documento generado el 2026-10-30 como parte de la migración al Stack Canon PHP.*
*Versión: 1.0 | Revisar en: 2026-11-30*