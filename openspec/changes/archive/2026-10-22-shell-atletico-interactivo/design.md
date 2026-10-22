# Design: shell atlético interactivo

## Contexto

El shell está en `app/(app)/layout.tsx` (`AppSidebar` + `AppHeader` dentro de `.page`).
El layout raíz no conoce el rol: lo resuelve `requireAuth()` en el layout autenticado,
así que es el lugar correcto para el atributo. El CSS de componentes importa Tabler y
después sus propias reglas, con la misma especificidad: gana la propia.

## Decisiones

| # | Decisión | Rationale |
|---|---|---|
| D1 | El rol viaja como atributo `data-user-role` en `.page`, no en `<body>` | `requireAuth()` corre en el layout de la app; el CSS es descendiente y alcanza igual. Evita tocar cookies ni comprobaciones cliente. |
| D2 | Tokens de rol en `tokens.css`, no en el CSS de componentes | El color tiene una sola fuente de verdad (regla D8). El atleta usa el valor por defecto (`var(--app-accent)`), admin reusa `--app-danger` y coach introduce un índigo nuevo: `#5B3FB5` en claro (6,4:1 sobre su tinte) y `#B39BF0` en oscuro (~6,7:1), porque el índigo claro no llegaba. |
| D3 | Sidebar con `--app-surface-3` en claro y oscuro | Distinto del lienzo pero de la misma familia fría; en móvil sirve de fondo del panel off-canvas con un solo regla global. |
| D4 | Menú de usuario con estado React, no `data-bs-toggle="dropdown"` | El proyecto carga solo el CSS de `@tabler/core`. Se replica el patrón de `NotificationBell`: clic fuera, `Escape` con devolución del foco, foco inicial en el primer ítem. |
| D5 | Logout dentro del desplegable conserva `<form action={logout}>` | La server action no se migra a cliente (AGENTS.md, Fase 43). El botón del desplegable **no** cierra el menú en `onClick`: desmontar el `<form>` cancela la server action antes de navegar. |
| D6 | Confeti propio en canvas (camino B) vs `data-bs-toggle="confetti"` | El componente nativo exige el bundle de Bootstrap JS (~70 KB), contradice la estrategia de bundle liviano y su base no es SSR. El propio (~100 líneas) lee los colores de los tokens del tema, respeta `prefers-reduced-motion` y se autodestruye (sobrevive al `router.refresh()` del formulario que lo dispara). |
| D7 | El confeti vive fuera del árbol de React | Se ensambla imperativo en `document.body` y se elimina al terminar la animación: no hay estado que gestionar y no interfiere con la re-renderización del formulario. |
| D8 | Variantes de color del `card-stamp` en `components.css` | Tabler 1.6 trae `.card-stamp`/`.card-stamp-lg` pero **no** variantes (`-success`, etc.). Se declaran con los semánticos del sistema; el ícono toma el color de la superficie de la tarjeta (patrón oficial). |
| D9 | `a.card.card-link` neutraliza el margen de la utilidad | `card-link` agrega `margin-inline-start` pensado para enlaces internos de la tarjeta; sobre la tarjeta-ancla desplazaría todo el contenido. |

## Riesgos / consideraciones

- El acento por rol es superficie y texto de ítem activo: los pares entrenador/admin se
  midieron con la fórmula de `verify-tokens.ts` antes de escribirse.
- El punto de presencia no comunica el estado solo con color: va acompañado de
  `visually-hidden` "En línea" (regla de Fase 48).
- El confeti no puede bloquear interacciones: su canvas es `pointer-events: none` y se
  retira solo, con un techo de 3,2 s como red de seguridad.
