# Proposal — Rediseño visual «atlético editorial»

## Why

RunOsorno funciona: las 20 funcionalidades del MVP están implementadas, 185 pruebas
unitarias y 21 páginas pasan axe sin violaciones. Pero **la interfaz es Tabler por
defecto**: azul `#206bc4`, radios de 4 px, la escala `h1…h6` de Tabler, un sidebar
con el ítem activo plano y tarjetas sin jerarquía visual más allá del color. El
resultado se lee como un panel administrativo genérico, no como un producto de
entrenamiento de running.

Importa ahora, no después, por dos razones concretas:

1. La entrega del MVP se apoya en una demo y en la percepción de producto. Hoy la
   primera pantalla que ve un coach es una tarjeta centrada con el título «Iniciar
   sesión» y nada de identidad.
2. Cada pantalla nueva de las fases 51–59 heredará estos estilos. Cambiar tokens
   hoy cuesta un cambio; cambiarlos después cuesta una migración por pantalla.

## What Changes

- **Capa de tokens visuales** nueva (`app/styles/tokens.css`) con canvas, superficie,
  superficie secundaria, bordes, tres niveles de texto y acento azul `#1D5DD7`, más
  radios (6/8/12/16), tres niveles de sombra, escala de espaciado de 4 px y escala
  tipográfica 12–48.
- **Tipografía propia**: una sola familia variable (Archivo) self-hosted con
  `next/font`, subset latin, números tabulares para métricas. Hoy la app usa el stack
  del sistema de Tabler.
- **Tema claro por defecto y oscuro con paridad**, con control en el header y
  preferencia persistente. Se unifica el mecanismo: hoy `data-bs-theme="light"` está
  fijo en `app/layout.tsx` y `globals.css` usa `light-dark()`, que responde al
  sistema operativo. Ambos convivirán bajo `data-bs-theme` con un único juego de
  tokens por tema.
- **Shell rediseñado**: sidebar de 264 px con grupos rotulados e ítem activo con
  barra de acento, header de 56 px, patrón de cabecera de página (título,
  descripción y acciones) y marca provisional `BrandMark` (wordmark + marcador
  reemplazable).
- **Primitivas nuevas en `components/ui/`**: `Button`, `Field`, `Card`, `Table`,
  `PageHeader` y `Badge`; ajuste de `Alert`, `EmptyState`, `ConfirmDialog` y
  `ModalShell` sin alterar su contrato de accesibilidad.
- **Re-medición de contraste**: la familia `text-*-ink` se calculó contra los tintes
  exactos de Tabler 1.6; al cambiar el primario hay que recalcular sus valores y
  documentarlos.
- **Gráficas conscientes del tema**: `chartColors.ts` pasa de 8 hex fijos a tokens
  por tema, con series distinguibles sin depender solo del color.
- **Verificación ampliada**: axe en ambos temas, `/login` incorporado a la lista de
  páginas verificadas (hoy son 21 y el login no está) y un `scripts/verify-tokens.ts`
  nuevo que falla ante regresiones de contraste.

### Fuera del alcance de este cambio

- **Calendario, drag & drop, dashboards por rol y pantallas de métricas.** Quedan
  para un segundo cambio (`ui-calendario-metricas`), porque son las superficies con
  más lógica visual propia y no hacen falta para validar el sistema. Este cambio
  cambia su apariencia de forma indirecta al heredar tokens, pero no reescribe su
  marcado.
- **Cualquier cambio de comportamiento**: no se tocan servicios, Server Actions,
  esquemas Zod, permisos, cálculos de métricas ni migraciones. Las suites E2E y los
  verificadores deben pasar sin cambios de lógica.
- **Logo definitivo**: no existe todavía. Se define una marca provisional tipográfica
  y el punto exacto de reemplazo.
- **Fotografía, ilustración o iconografía nueva**: se mantiene `@tabler/icons-react`.
- **Tailwind, shadcn/ui o cualquier librería de componentes o de gráficas.** La base
  CSS es Tabler 1.6 y sustituirla implicaría reescribir 21 pantallas y perder la red
  de axe. El sistema se expresa en variables CSS y clases semánticas propias.

### Ubicación en el roadmap y costo

No pertenece a las fases 51–59 (son funcionalidades) ni a la deuda D1–D7. Es una
mejora transversal previa a escalar; propongo registrarla en `docs/roadmap.md` como
**D8 — sistema visual unificado**. Costo **cero**: sin dependencias nuevas, sin
servicios pagos, fuentes gratuitas y self-hosted (sin plan de Workers Paid). No
bloquea ni depende de ninguna fase; sí reduce el costo de todas las pantallas
futuras.

## Capabilities

### New Capabilities

- `design-system`: define la identidad visual y los invariantes de accesibilidad que
  toda pantalla respeta —tokens de color con contraste verificado, paridad de temas,
  estado no comunicado solo por color, foco visible, tipografía self-hosted con
  números tabulares, densidad y objetivos táctiles, movimiento contenido, marca
  reemplazable, series de gráfica legibles en ambos temas y cobertura de verificación
  visual—.

### Modified Capabilities

Ninguna. Este cambio no altera requisitos funcionales: no modifica las 35 reglas de
negocio de `specs/mvp.md` §8 ni los flujos de §5. Refuerza los criterios de
«Accesibilidad y UX» de §10 (responsive, confirmaciones, estados vacíos y errores
claros), que siguen vigentes sin cambios de redacción.

## Impact

| Área | Archivos | Tipo de cambio |
|---|---|---|
| Tokens y tema | `app/styles/tokens.css` (nuevo), `app/globals.css` | Tokens en `:root` y `[data-bs-theme="dark"]`; se conservan las formas `[data-state]`, `text-*-ink`, skip-link y off-canvas |
| Tipografía | `app/layout.tsx` | `next/font` self-hosted, `data-bs-theme` desde cookie |
| Tema | `components/layout/ThemeToggle.tsx` (nuevo), `app/actions`/cookie de preferencia | Control accesible, persistencia, `color-scheme` |
| Shell | `components/layout/AppSidebar.tsx`, `AppHeader.tsx`, `nav.ts`, `BrandMark.tsx` (nuevo) | Marcado y clases; sin cambios de navegación ni de permisos |
| Primitivas | `components/ui/*` | Nuevos `Button`, `Field`, `Card`, `Table`, `PageHeader`, `Badge`; ajuste de los 5 existentes |
| Páginas | Cabeceras y contenedores de las 21 pantallas | Solo clases y estructura de presentación |
| Gráficas | `components/metrics/chartColors.ts` | Hex fijos → tokens por tema |
| Login | `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx` | Marca, composición tipográfica, sin foto de stock |
| Verificación | `scripts/verify-accesibilidad.ts`, `scripts/verify-tokens.ts` (nuevo) | Doble tema y `/login` |

**No se toca**: `lib/services/`, `lib/actions/`, `lib/permissions/`, `lib/auth/`,
`lib/metrics/`, `lib/db/`, `db/migrations/`, `wrangler.jsonc`, R2, Resend ni
Hyperdrive. Sin migraciones, sin secretos nuevos, sin cambios de runtime; por tanto
no hay riesgo de CPU ni de I/O compartido entre peticiones.

Riesgo principal: `app/globals.css` tiene 620 líneas con `!important` deliberados y
reglas por fase (accesibilidad, shell responsive, gráficas, drag & drop, calendario).
El plan de migración lo trata por capas y prohíbe reescribirlo de una vez.
