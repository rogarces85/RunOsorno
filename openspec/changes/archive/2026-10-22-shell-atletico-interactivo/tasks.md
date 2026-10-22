# Tasks: shell atlético interactivo

## 1. Acento por rol

- [x] 1.1 Agregar `data-user-role={user.role}` al wrapper `.page` en `app/(app)/layout.tsx`
- [x] 1.2 Declarar `--app-role-accent` / `--app-role-soft` en `app/styles/tokens.css` (claro, oscuro y overrides entrenador/admin)
- [x] 1.3 Aplicar los tokens al ítem activo del sidebar (fondo, texto y franja) en `app/styles/components.css`
- [x] 1.4 Teñir la línea inferior del navbar con `color-mix` del acento por rol

## 2. Sidebar diferenciado

- [x] 2.1 Mover el fondo del sidebar a `--app-surface-3`, cubriendo también el panel off-canvas en móvil

## 3. Menú de usuario

- [x] 3.1 Crear `components/layout/UserMenu.tsx` con el patrón de `NotificationBell` (clic fuera, Escape con devolución de foco, foco inicial)
- [x] 3.2 Avatar con punto de presencia (`app-presence-dot`) + `visually-hidden` "En línea", nombre y rol
- [x] 3.3 Mantener el logout como `<form action={logout}>` dentro del desplegable, sin `onClick` que desmonte el formulario
- [x] 3.4 Reemplazar el bloque avatar+logout de `components/layout/AppHeader.tsx` por `UserMenu`
- [x] 3.5 Actualizar dependientes: `e2e/auth.spec.ts` (testids del menú), `scripts/verify-responsive.ts` (probe `userMenu`) y borrar el CSS huérfano `.app-logout`

## 4. Confeti de celebración

- [x] 4.1 Crear `components/ui/celebrate.ts`: canvas nativo, colores desde tokens del tema, `prefers-reduced-motion` y autodestrucción
- [x] 4.2 Disparar en `SessionForm` al guardar: `completed` → `full`, `partial` → `soft`

## 5. Tarjetas stamp

- [x] 5.1 Extender `components/ui/Card.tsx` con `stamp` (sello `card-stamp` con `aria-hidden`) e `href` (tarjeta-ancla con `card-link card-link-pop`)
- [x] 5.2 Declarar variantes de color del sello en `components.css` con los semánticos del sistema
- [x] 5.3 Usarlos en `StatsCards` (pase `stamp` por ítem) y en el dashboard del atleta con íconos deportivos

## 6. Verificación

- [x] 6.1 `tsc --noEmit` y `vitest run` sin errores
- [x] 6.2 `scripts/verify-tokens.ts`: 63/63 comprobaciones, paridad de tokens en ambos temas
- [x] 6.3 `scripts/verify-accesibilidad.ts`: 22/22 (axe sobre 23 páginas, claro y oscuro)
- [x] 6.4 `e2e/auth.spec.ts` y `e2e/athlete-flow.spec.ts` en verde, con el flujo de logout por el desplegable
- [x] 6.5 Sonda visual: atleta azul, entrenador índigo, admin rojo; sidebar `#E8EEF7`; menú y sello visibles
