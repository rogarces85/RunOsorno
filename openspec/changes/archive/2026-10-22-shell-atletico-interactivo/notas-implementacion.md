# Notas de implementación: shell atlético interactivo

Registro de la corrida (2026-10-22). Valores reales medidos, no estimados.

## Acento por rol (sonda Playwright sobre el dev server)

| Rol | Link activo (texto / fondo) | Borde del navbar | Sidebar |
|---|---|---|---|
| athlete | `rgb(15 99 196)` / `rgb(231 240 251)` | azul teñido | `rgb(232 238 247)` = `--app-surface-3` |
| coach | `rgb(91 63 181)` / `rgb(239 236 250)` | índigo teñido | ídem |
| admin | `rgb(186 48 48)` / `rgb(251 235 235)` | rojo teñido | ídem |

## Verificación

- `tsc --noEmit`: OK (se limpió `.next/types`, que apuntaba a una ruta borrada de un
  commit anterior; error preexistente, no del cambio).
- `vitest run`: 196/196.
- `scripts/verify-tokens.ts`: 63/63, incluida la paridad de tokens `--app-*` entre temas.
- `scripts/verify-accesibilidad.ts`: 22/22 (axe sobre 23 páginas en claro y oscuro).
- `e2e/auth.spec.ts`: 6/6. Primera corrida falló el logout: el `onClick` del botón del
  desplegable desmontaba el `<form>` y cancelaba la server action; corregido sin el
  cierre manual (D5).
- `e2e/athlete-flow.spec.ts`: 5/5 — registra sesiones completadas, por donde pasa el
  confeti, sin errores de consola.
- Prettier: el repo no está limpio de fábrica; solo se formatearon los archivos nuevos.

## Descartes

- `@tabler/core/dist/js/tabler.min.js`: descartado (camino B del plan). El confeti nativo
  de Tabler y los dropdowns requieren ese bundle (~70 KB de Bootstrap JS ida y vuelta).
- SVG inline pegado a mano: se mantiene `@tabler/icons-react` (mismo SVG, mismo
  `currentColor`, con tree-shaking).
- Utilidades `--tblr-blue-lt` / `--tblr-indigo-lt` crudas: los acentos de rol son tokens
  propios de `tokens.css`; Tabler no trae variantes de `card-stamp` en 1.6.
