# Proposal: shell atlético interactivo

## Why

El dashboard ya usa Tabler como base (cambio `2026-10-22-ui-atletico-editorial`), pero el
shell era neutro: el menú de usuario era solo un avatar con enlace y un botón de logout,
los tres roles se veían idénticos y no había ningún momento de celebración al cumplirse una
meta de entrenamiento. Plantea la evolución del shell para que sea más atlético e
interactivo sin contradecir las reglas del sistema visual (D8) ni aumentar el bundle.

## What Changes

- **Acento por rol en el shell**: el layout autenticado declara `data-user-role` en el
  wrapper `.page` y `tokens.css` define `--app-role-accent` / `--app-role-soft` (atleta =
  azul de marca, entrenador = índigo, admin = rojo). Teñe el ítem activo del sidebar, su
  franja y la línea inferior del navbar. Sin JavaScript ni clases nuevas: solo CSS.
- **Sidebar diferenciado**: fondo de `--app-surface-3`, un paso de superficie sobre el
  lienzo, que también cubre el panel off-canvas en móvil.
- **Menú de usuario completo** (`components/layout/UserMenu.tsx`): avatar con punto de
  presencia verde ("en línea", con `visually-hidden`), nombre y rol, Mi perfil y Cerrar
  sesión (misma server action). Replica el patrón de `NotificationBell` porque el proyecto
  no carga el bundle de Bootstrap JS.
- **Confeti de celebración** (`components/ui/celebrate.ts`): canvas nativo sin
  dependencias, colores leídos de los tokens del tema activo, respeta
  `prefers-reduced-motion` y se autodestruye. Se dispara al registrar una sesión
  (completada → ráfaga completa; parcial → ráfaga corta). La vía nativa de Tabler
  (`data-bs-toggle="confetti"`) queda descartada: exige el bundle de Bootstrap JS.
- **Tarjetas stamp**: la primitiva `Card` gana `stamp` (marca de agua circular
  `card-stamp` de Tabler, con variantes de color propias porque 1.6 no las trae) e `href`
  (tarjeta entera como `<a class="card card-link card-link-pop">`). El dashboard del
  atleta recibe sellos con `IconTrophy`, `IconRoute`, `IconStopwatch` e `IconActivity`.

## Capabilities

### New Requirements

- `design-system`: Acento del shell por rol, celebración accesible de logros y tarjeta
  de métrica con sello.

## Impact

- Sin cambios de esquema, permisos ni rutas. El logout cambia de superficie visual pero
  conserva su server action.
- Dependientes actualizados por el desplazamiento del logout: `e2e/auth.spec.ts`
  (testids del menú), `scripts/verify-responsive.ts` (probe `userMenu`), y el CSS huérfano
  `.app-logout` en `app/globals.css`.
- Bundles: cero dependencias nuevas; `tabler.min.js` no se introduce.
