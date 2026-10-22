# Design — Sistema visual «atlético editorial»

Ver `proposal.md` para la motivación y `specs/design-system/spec.md` para los
requisitos que esta especificación debe cumplir.

## Context

### Estado actual, con evidencia

| Aspecto | Hoy |
|---|---|
| Base CSS | `@tabler/core` 1.6 importado en `app/globals.css` (620 líneas propias) |
| Primario | `--tblr-primary: oklch(54.6% 0.1724 254.2deg)` (el azul de fábrica de Tabler) |
| Radios | 4 px de fábrica; ninguna regla propia los cambia |
| Sombras | Solo `var(--tblr-box-shadow)` en el panel móvil; `.card` no tiene estilo propio |
| Tipografía | Stack del sistema de Tabler; `h1`–`h6` de Tabler; `tabular-nums` aparece en 3 lugares sueltos |
| Tema | `app/layout.tsx` fija `data-bs-theme="light"` y **no hay control de tema**; `globals.css` usa `light-dark()` para el fondo, que responde al sistema operativo. Dos mecanismos conviviendo |
| Marca | Texto `RunOsorno` en `Link.navbar-brand`; sin logo, sin icono propio |
| Estados | Formas propias por `[data-state]` y familia `text-*-ink` a 5:1 — **activos y correctos** |
| Gráficas | `components/metrics/chartColors.ts` con 8 hex fijos (`#206bc4`, `#f59f00`, `#37b24d`…), ajenos al tema |
| Cobertura axe | 21 rutas en `scripts/verify-accesibilidad.ts`; **`/login` no está** |

### Restricciones que mandan

- Tabler 1.6 es la base y no se sustituye: sus utilidades de color llevan
  `!important` y `.bg-*-lt` fija también el color del texto. De ahí la familia
  `text-*-ink`, que hay que conservar y re-medir.
- `scripts/verify-accesibilidad.ts` corre axe sobre 21 rutas y falla ante cualquier
  violación; `verify-responsive`, `verify-rendimiento` y `verify-empty-states` ya
  miden 375/768/1400 px, consola y estados vacíos.
- Cloudflare Workers: sin dependencias que usen `eval`, sin I/O compartido, 10 ms de
  CPU en el plan gratuito. Este cambio es CSS y presentación; no agrega consultas.
- El proyecto descartó Tailwind (choca con la base Bootstrap de Tabler) y las
  gráficas son SVG propio.

## Goals / Non-Goals

**Goals:**

1. Una identidad reconocible (papel frío, grafito azulado, acento azul señal) que se
   note en la primera pantalla sin recurrir a imágenes.
2. Un solo lugar para los tokens: cambiar el acento o el radio debe ser un cambio en
   un archivo, no en 60 componentes.
3. Tema claro por defecto y oscuro real, con paridad verificable y sin destello.
4. Primitivas reutilizables (`Button`, `Field`, `Card`, `Table`, `PageHeader`,
   `Badge`) que eviten que cada pantalla reinvente el marcado.
5. Que la accesibilidad no se degrade: mismos mínimos, ahora medidos en ambos temas y
   también en el login.

**Non-Goals:**

- No se rediseñan calendario, drag & drop, dashboards ni métricas pantalla por
  pantalla (segundo cambio). Heredan tokens y primitivas, pero su marcado no se
  reescribe aquí.
- No se sustituye Tabler ni se introduce librería de componentes, gráficas o iconos.
- No se toca lógica: servicios, Server Actions, permisos, métricas, esquema ni
  migraciones.
- No se define el logo definitivo; se deja el punto de recambio.

## Decisions

### 1. Dirección visual: editorial azul

Papel frío casi blanco, superficies blancas, grafito azulado para el texto y **un
único acento azul** reservado a acción primaria, enlace y foco. La personalidad la
llevan la tipografía, el aire y la precisión de los bordes, no la cantidad de color.

Alternativas descartadas: *analítico oscuro* (vistoso en escritorio, incómodo al aire
libre y más caro de validar) y *corporativo neutro tipo Linear* (correcto pero
intercambiable con cualquier panel). Se eligió el azul sobre el terracota porque el
producto se usa al aire libre y en escritorio de coach, y el azul mantiene mejor la
legibilidad en exteriores.

### 2. Tokens de color

Se declaran en `app/styles/tokens.css`, importado antes que el resto de reglas, en dos
bloques: `:root` (claro) y `[data-bs-theme="dark"]`. Nombres semánticos `--app-*`,
nunca por color.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--app-canvas` | `#FFFFFF` | `#101827` | Fondo de página (blanco oficial / azul profundo) |
| `--app-surface` | `#FFFFFF` | `#151F33` | Tarjetas, tablas, modales |
| `--app-surface-2` | `#F3F6FB` | `#1B2740` | Hover, cabecera de tabla |
| `--app-surface-3` | `#E8EEF7` | `#223050` | Presionado, selección |
| `--app-border` | `#E3E9F2` | `#283554` | Separadores de 1 px |
| `--app-border-strong` | `#7C8DA9` | `#6E7F9E` | Borde de controles (3:1) |
| `--app-ink` | `#101827` | `#EDF2F9` | Texto principal (azul profundo) |
| `--app-ink-2` | `#3C4A61` | `#AFBBD0` | Texto secundario |
| `--app-ink-3` | `#5B6B85` | `#8695B0` | Rótulos, ayudas |
| `--app-brand` | `#1675DF` | `#1675DF` | Azul tecnológico: marca y gráficos (3:1) |
| `--app-accent` | `#0F63C4` | `#4E9BF0` | Acción primaria, enlace, foco (4,5:1) |
| `--app-accent-hover` | `#0B52A5` | `#6FB0F5` | Hover y activo |
| `--app-accent-soft` | `#E7F0FB` | `#14294A` | Fondo de ítem activo, iconos |
| `--app-accent-on` | `#FFFFFF` | `#101827` | Texto sobre acento |
| `--app-border-strong` | `#848D9A` | `#6D7787` | Borde de controles (3:1) |
| `--app-success` / `-warning` / `-danger` / `-info` | `#1C762A` / `#925D00` / `#BA3030` / `#2D6CA1` | versiones aclaradas | Semánticos |

Contrastes de partida (medidos por `scripts/verify-tokens.ts`): `--app-brand`
sobre blanco **4,21:1**, suficiente para gráficos (3:1) pero **no** para texto, de ahí
que acciones y enlaces usen `--app-accent` (#0F63C4, 5,85:1). En oscuro el acento se
aclara a #4E9BF0 (6,16:1) porque #1675DF sobre #101827 da 3,92:1.

**Regla del acento:** solo acción primaria, enlace, foco y el ítem activo de
navegación. No se usa en encabezados de datos ni en decoración, porque compite con los
estados del calendario. `info` se mantiene como tinte informativo sin peso de botón,
para que una alerta no parezca un CTA.

**Familia `text-*-ink`:** los hex actuales se calcularon contra los tintes exactos de
Tabler (`rgb(230,241,250)` y compañía). Al cambiar el primario, `text-primary-ink`
deja de cumplir. Tarea obligatoria de la fase A: recalcular cada valor contra el tinte
vigente y dejar el par y el ratio en comentario, como ya está documentado en el
archivo.

### 3. Mapa a Tabler

Se sobreescriben solo variables que el proyecto ya usa o que Tabler expone como API de
tema, y se verifica el nombre exacto en `@tabler/core/dist/css/tabler.css` antes de
aplicarlo:

```
--tblr-primary: var(--app-accent)
--tblr-body-bg: var(--app-canvas)
--tblr-body-color: var(--app-ink)
--tblr-border-color: var(--app-border)
--tblr-border-radius: 8px
--tblr-box-shadow: var(--app-shadow-1)
--tblr-font-sans-serif: var(--font-archivo)
--tblr-sidebar-width: 264px
```

Lo demás se resuelve con clases semánticas propias (`.app-card`, `.app-table`,
`.app-page-header`, `.app-metric`, `.app-nav-item`), no peleando con utilidades.

### 4. Tipografía

Una sola familia variable, **Archivo** (SIL OFL), self-hosted con `next/font/local`
desde `app/fonts/` —sin descarga en build ni en runtime, y sin petición a terceros—,
subset latin (cubre á/é/í/ó/ú/ñ), `display: swap`, pesos 400/500/600/700.

| Rol | Tamaño / peso / interlineado |
|---|---|
| Título de página | 24 / 600 / 1.2, tracking −0.02em |
| Título de sección | 18 / 600 / 1.25 |
| Título de tarjeta | 14 / 600 / 1.3 |
| Cuerpo | 14 / 400 / 1.55 |
| Secundario | 13 / 400 / 1.5 |
| Rótulo de dato | 11 / 600 / 1.2, mayúsculas, tracking 0.04em |
| Métrica destacada | 30–38 / 600 / 1.1, `tabular-nums` |

Las cifras llevan `font-variant-numeric: tabular-nums` y `font-feature-settings:
"tnum" 1` en una clase `.app-numeric`, para que las columnas no bailen.

### 5. Escala, radios, sombras y movimiento

- **Espaciado:** base 4 px → 4/8/12/16/20/24/32/40/48/64. Secciones 32–40, campos
  12–16, filas de tabla 44 (móvil) y 40 (escritorio), targets táctiles ≥44.
- **Radios:** 6 chip · 8 control · 12 tarjeta · 16 modal · full avatar/píldora.
- **Sombras:** tres niveles, siempre con borde de 1 px. En oscuro la profundidad se
  logra subiendo de superficie (`surface` → `surface-2`), no con sombra más densa.
- **Movimiento:** 120 ms (micro) y 180 ms (transiciones de estado), easing
  `cubic-bezier(.2,.8,.2,1)`, desplazamiento máximo 2 px. Todo bajo
  `@media (prefers-reduced-motion: reduce)` desactivado.

### 6. Tema: un solo mecanismo

Hoy conviven `data-bs-theme="light"` fijo y `light-dark()`. Se unifica en
`data-bs-theme`, que es lo que Tabler entiende:

- Cookie `runosorno_tema` con valores `claro` | `oscuro`, 1 año, `Path=/`,
  `SameSite=Lax`, escrita por el cliente (no `HttpOnly`).
- `app/layout.tsx` la lee en el servidor y renderiza `data-bs-theme` y
  `color-scheme` desde el primer byte, así no hay destello. Como ya se lee la sesión
  en el layout de la app, el costo es una lectura de cookie más.
- `ThemeToggle` (client) escribe la cookie y aplica el atributo al instante, sin
  recargar.
- Se elimina el uso de `light-dark()` para superficies: el tema lo decide el atributo,
  no el sistema operativo. Valor inicial: **claro**, aunque el sistema prefiera oscuro
  (requisito del spec). Un tercer estado «automático» queda como pregunta abierta.

### 7. Shell

- **Sidebar 264 px**, fondo `surface`, borde derecho de 1 px, marca en bloque de 56 px,
  secciones con rótulo 11 px en versalitas e ítems de 40 px con radio 8. El ítem
  activo usa `accent-soft` de fondo, texto `accent` y barra de 2 px a la izquierda; el
  hover usa `surface-2`. Se conserva el comportamiento off-canvas bajo 992 px, el
  `Escape` para cerrar y el backdrop ya existentes.
- **Header 56 px** sticky, `surface` con borde inferior; a la izquierda el botón de
  menú (móvil) y la marca; a la derecha campanita, avatar y salir. La campanita
  conserva su contador y su `aria-label` actual.
- **PageHeader**: `h1` + descripción opcional + acciones a la derecha, separador de
  1 px y 24 px de margen inferior. Unifica las 21 pantallas, que hoy resuelven el
  título cada una a su manera (`page-title`, `d-flex` suelto, etc.).
- **Login**: composición tipográfica —marca grande, claim y formulario en tarjeta de
  420 px—, sin fotografía. Se conserva `main#contenido`, el skip-link y el mensaje de
  error genérico.

### 8. Primitivas y contrato

| Componente | Contrato |
|---|---|
| `Button` | Variantes `primary` / `secondary` / `ghost` / `danger`; tamaños 32/40/48; estados hover, active, `focus-visible` (anillo 2 px + offset 2), `disabled` (45 % + `cursor: not-allowed`) y `loading` con `aria-busy`; `iconOnly` de 40×40 con nombre accesible |
| `Field` | Label 13/600, ayuda 12 `ink-3`, control de 40 px, borde `border-strong`, foco con anillo de 3 px `accent-soft` + borde `accent`; error con borde `danger`, icono y mensaje 12, `aria-invalid` + `aria-describedby`; cubre input, select, textarea, checkbox, radio y switch |
| `Card` | `surface`, borde 1 px, radio 12, padding 20 (compacto 16), cabecera con título 14/600 y acciones; sin sombra salvo variante `interactive`, que la aplica en hover |
| `Table` | Cabecera 12 px en versalitas sobre `surface-2`, filas de 44/40 px con separador, cifras a la derecha con `app-numeric`, hover `surface-2`; en móvil variante `stack` que convierte cada fila en tarjeta con pares etiqueta-valor; el contenedor conserva `tabIndex={0}`, `role="region"` y nombre |
| `PageHeader` | Ver decisión 7; acciones se apilan bajo el título en móvil |
| `Badge` | Píldora de radio 6, 12/600, punto de 6 px + texto; usa la familia `text-*-ink`; variante neutra |
| `Alert` / `EmptyState` / `ConfirmDialog` / `ModalShell` | Se ajustan visualmente y **se conserva su contrato**: `role`, cierre, foco, `Escape`, trampa de foco y devolución del foco |

`ModalShell` no se reescribe: recibe radio 16, sombra 3, padding 24 y backdrop
`rgba(16,19,23,.55)` por CSS.

### 9. Marca oficial

`components/layout/BrandMark.tsx`, con `variant="wordmark" | "mark"` y `size`:

- **Wordmark:** `runosorno` en 600, tracking −0.02em, con un punto de acento de 6 px.
  Legible a 20 px y a 96 px.
- **Mark:** cuadrado de 24 px con radio 7 en `accent` y dos trazos diagonales blancos
  de 2 px que evocan líneas de pista.
- **Reglas:** área de resguardo de 8 px, versión monocroma para fondos de color,
  mínimo 20 px, nunca sobre fotografía.
- **Icono del sitio:** `app/icon.svg` derivado del mark.
- **Recambio:** sustituir el contenido del componente y el SVG del icono; las medidas
  no cambian porque el layout reserva el espacio.

### 10. Color de datos

`chartColors.ts` deja de exportar hex fijos y pasa a resolver la paleta desde los
tokens del tema (`--app-chart-1…5`), con un juego por tema y la misma función para
ambos. Series: azul `#1D5DD7`, teal `#0E7C86`, oliva `#6B7F3A`, ciruela `#8B5E83` y
mostaza `#8F6C00` (en oscuro, variantes aclaradas); grilla `--app-border`, rótulos
`--app-ink-3`, pista del anillo `--app-surface-3`. La leyenda y las etiquetas de valor
siguen siendo la señal principal, para que la serie no dependa solo del color.

La segunda serie es teal y no «azul claro» porque el azul claro no alcanzaba 3:1
contra el lienzo claro (2,51:1); el cambio lo detectó `tests/unit/chart-colors.test.ts`
antes de llegar a pantalla. La mostaza también se oscureció por el mismo motivo.

### 11. Capas

Este cambio es presentación pura: no crea Server Actions, servicios ni cálculos.

- Tokens y reglas globales → `app/styles/tokens.css` y `app/globals.css`.
- Componentes de presentación → `components/ui/` y `components/layout/`.
- Preferencia de tema → cookie escrita en cliente y leída en `app/layout.tsx`; no
  necesita Server Action.
- Datos, permisos y métricas → intactos (`lib/services`, `lib/actions`,
  `lib/permissions`, `lib/metrics`).

### 12. Verificación

| Qué | Cómo |
|---|---|
| Contraste de tokens en ambos temas | `npx tsx scripts/verify-tokens.ts` (nuevo): abre las páginas en claro y oscuro, compara valores computados y calcula el ratio de cada par declarado |
| Accesibilidad | `npx tsx scripts/verify-accesibilidad.ts` con axe en los dos temas y `/login` incorporado |
| Responsive | `npx tsx scripts/verify-responsive.ts` (375/768/1400 px, off-canvas y foco) |
| Estados vacíos | `npx tsx scripts/verify-empty-states.ts` |
| Rendimiento y consola | `npx tsx scripts/verify-rendimiento.ts` (gráficas en el HTML inicial, sin errores) |
| Formato es-CL | `npx tsx scripts/verify-i18n.ts` (ningún texto nuevo formatea por su cuenta) |
| Flujos | `npx playwright test` sin cambiar aserciones funcionales |

El login no gasta más CPU por este cambio: no se toca el flujo, el hashing ni las
consultas; solo se lee una cookie de tema en el layout, que ya era dinámico por la
sesión. Se comprueba con `npx wrangler tail runosorno --format json` comparando el
`cpuTime` del POST de login antes y después, y `npx tsx scripts/verify-produccion.ts`
al desplegar.

### 13. Migración y rollback

No hay cambios de esquema: no se genera migración Drizzle ni se toca `db/`. El
despliegue va por CI (`deploy.yml`) como cualquier cambio.

1. **Fase A (tokens y tema):** se agrega `tokens.css`, la fuente y el `ThemeToggle`;
   el resto de la app cambia de piel sin tocar marcado. Es la fase más reversible:
   revertir es revertir dos archivos.
2. **Fase B (shell):** sidebar, header, `PageHeader` y `BrandMark`, primero en las
   pantallas de un rol y luego en el resto.
3. **Fase C (primitivas):** se introducen de forma opt-in. Durante la transición las
   clases antiguas siguen funcionando (alias en CSS), así ninguna pantalla queda a
   medio migrar entre despliegues.
4. **Rollback:** cada fase es un commit independiente; revertir la fase no afecta a
   las anteriores. Los tokens mantienen los nombres de Tabler, así que volver al
   estado previo no exige tocar componentes.

### 14. Seguridad y privacidad

- La cookie de tema no es sensible: no identifica a la persona, no se usa para
  autorización y no se registra en auditoría. Aun así se documenta su nombre y
  duración en `docs/` para que no se confunda con una cookie de sesión.
- Las fuentes se sirven desde la aplicación: se elimina cualquier dependencia de
  terceros en el renderizado, lo que mejora la privacidad y evita una petición
  externa por visita.
- No se agregan datos a Sentry, logs ni URLs. Los mensajes de error siguen siendo
  genéricos y no cambian.

## Risks / Trade-offs

- **`globals.css` con 620 líneas, `!important` deliberados y reglas por fase** →
  los tokens viven en un archivo aparte y las reglas existentes se mueven solo cuando
  la fase lo exige; nada se reescribe «de paso».
- **Regresiones de contraste al cambiar el primario** → re-medición obligatoria de
  `text-*-ink` y `verify-tokens.ts` en CI; el build de la fase A no se cierra sin los
  valores nuevos documentados.
- **Tabler gana la especificidad** → se sobreescriben variables de tema, no clases
  utilitarias; las clases propias evitan la guerra de especificidad.
- **Fuente nueva: peso y salto de composición** → una sola familia, subset latin,
  `display: swap` y `size-adjust` si hace falta; presupuesto ≤60 KB en woff2.
- **El rediseño se detiene a mitad de camino** → las fases son independientes y las
  clases antiguas siguen vivas hasta que la fase C termina; ninguna pantalla queda
  rota por un despliegue intermedio.
- **Axe no detecta «se ve mal»** → `verify-tokens.ts` cubre lo medible (contraste,
  radios, tipografía efectiva) y las capturas quedan como revisión manual, no como
  baseline versionado.
- **El tema oscuro duplica la superficie de verificación** → se paga una sola vez en
  la fase A y luego cada pantalla se comprueba en ambos temas; es el costo de tener
  paridad real.

## Migration Plan

Ver decisión 13. Sin migraciones de base de datos. Rollback por fase, con commits
independientes y sin dependencias entre ellos.

## Open Questions

- ¿La marca definitiva llega antes de la fase C? Si llega, `BrandMark` y
  `app/icon.svg` se sustituyen sin tocar el resto.
- ¿Se agrega un tercer estado de tema «automático» (seguir al sistema) más adelante?
  Hoy el spec exige claro por defecto y no lo incluye.
- ¿La paleta de series necesita una validación con simulación de deuteranopia antes de
  fijarse, o basta la comprobación de contraste y leyenda? Se decide al implementar
  `verify-tokens.ts`.
