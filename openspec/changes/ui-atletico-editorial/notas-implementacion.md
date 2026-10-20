# Notas de implementación — ui-atletico-editorial

Bitácora de lo que difiere de `design.md`, de los hallazgos y de las decisiones
tomadas al implementar. `design.md` se corrige cuando el desvío es definitivo.

## Línea base (2026-10-20, antes de tocar estilos)

| Comprobación | Resultado |
|---|---|
| `git status --short` | Solo directorios nuevos del cambio (`openspec/`, `docs/roadmap.md`, `.opencode/`); sin modificaciones ajenas |
| `npx drizzle-kit generate` | «No schema changes, nothing to migrate» |
| `npm run lint` | 0 errores, 1 aviso (`<img>` en `Avatar.tsx`) |
| `npm run test` | 191/191 (13 archivos) |
| `npx tsx scripts/verify-accesibilidad.ts` | **20/21** — ver hallazgo H1 |
| `npx tsx scripts/verify-responsive.ts` | 31/31 |
| Capturas | `%TEMP%\ui-baseline\baseline-<pantalla>-<ancho>-light.png` (6 pantallas × 1400/375) |

### H1 — El baseline de accesibilidad no estaba en verde

`axe` reporta 7 nodos con `color-contrast` en `/coach/dashboard` y `/coach/metrics`:

```
<div class="h1 mb-0 text-yellow">77%</div>
```

`components/dashboard/StatsCards.tsx` pinta el valor con utilidades de color de
Tabler (`text-yellow`, `text-green`, `text-red`, `text-blue`), justo lo que la
convención del proyecto prohíbe sobre texto normal: 4,5:1 no se alcanza. El
`docs/pendientes.md` del 19-10 daba 21/21 porque en esa fecha ningún team tenía un
porcentaje con tono de aviso; con los datos actuales (77 %) el defecto aparece.

Se corrige dentro de este cambio, en el grupo 6 (adopción de `Card` y `Badge`): el
tono de una cifra pasa a la familia `text-*-ink` o a un badge, nunca a la utilidad
de color cruda.

### Decisiones de arranque

- El servidor de desarrollo en `localhost:3000` se reutiliza para todos los
  verificadores, como ya hace `playwright.config.ts`.
- Las capturas de referencia viven en `%TEMP%`, no en el repositorio: sirven para la
  comparación manual del cierre y no como baseline versionado (decisión de
  `design.md` §12).

## Fase A — tokens, tipografía y tema (implementado)

### Desvíos respecto de `design.md`

- **`--app-ink-3` se oscureció de `#737D8B` a `#616A76`.** El valor del documento daba
  4,18:1 sobre blanco y 4,01:1 sobre el lienzo; con 12 px de tamaño no alcanzaba el
  mínimo. El nuevo valor mide 5,48:1 y 5,11:1.
- **`--app-border-strong` pasó de `#C6CEDA` a `#848D9A` (claro) y de `#3C4552` a
  `#6D7787` (oscuro).** El documento pedía 3:1 para bordes de control y el valor
  original medía 1,59:1. Ahora mide 3,36:1 sobre superficie y 3,13:1 sobre lienzo en
  claro, 3,82:1 y 4,11:1 en oscuro.
- **La familia `text-*-ink` necesita variante oscura.** Los hex originales se midieron
  contra tintes claros; en oscuro quedaban en 2,49:1. Se agregó un bloque
  `[data-bs-theme="dark"]` con 12 tonos claros de la misma gama y el equivalente para
  los `Alert`, que salen de `--tblr-alert-variant-color`.
- **La segunda serie de gráfica es teal `#0E7C86`, no «azul claro».** `#6E9BFF` daba
  2,51:1 contra el lienzo claro y la prueba unitaria lo rechazó. La mostaza también se
  oscureció (`#B58B00` → `#8F6C00`, 2,94:1 → 4,59:1).
- **Las series usan tokens CSS (`--app-chart-1…5`) en lugar de un parámetro de tema.**
  El SVG se pinta igual en servidor y cliente y cambia solo con `data-bs-theme`, sin
  pasar el tema por props.

### Hallazgos técnicos

- **`app/layout.tsx` declara `export const instant = false`.** Leer la cookie de tema en
  la raíz convertía el árbol en dinámico y el build fallaba al prerenderizar
  `/_not-found` («blocking route»). Con el opt-out explícito, todas las rutas son
  dinámicas y el tema llega en el primer HTML, que es lo que exige el requisito de
  evitar el destello.
- **Tabler declara `--tblr-nav-link-color` dentro de `.nav`**, no en `:root`: hubo que
  sobreescribirla en `.nav` para que las pestañas y filtros dejaran de usar el gris 500
  (4,42:1 sobre el lienzo nuevo).
- **`--tblr-secondary` y `--tblr-primary-fg` también se mapearon.** El gris de fábrica
  quedaba en 4,42:1 y el texto blanco sobre el acento oscuro en 2,2:1.
- **El inicio de sesión no tenía `h1`** (usaba `h2` dentro de la tarjeta). Ahora es un
  `h1`, requisito para entrar en la verificación de axe.
- **`axe` pasa de 21 a 22 rutas y de un tema a dos**: 44 auditorías por corrida.
  Línea base real: **20/21** (el 21/21 de `docs/pendientes.md` ya no se sostenía con los
  datos actuales). Después del cambio: **22/22 en claro y 22/22 en oscuro**.
- **`verify-tokens.ts` corre 61 comprobaciones** (paridad de 60 tokens entre temas, 18
  pares semánticos por tema y 18 badges por tema). Se comprobó que **falla** inyectando
  `--app-ink: #b9bcc0`: baja a 59/61 y termina con código 1.

### Observación fuera de alcance

- `/athlete/metrics` muestra «Carga semanal 0 km · 0 min» mientras la gráfica de
  progresión dibuja semanas de 60 km. Es un desajuste de periodo/datos previo a este
  cambio; no se tocó porque no es de presentación. Queda anotado para revisarlo con el
  cambio de métricas.

### Pendiente en este punto

- `PageHeader` existe en `components/ui/` pero **no se adoptó en las pantallas**: las 31
  páginas siguen con su `<h1 class="page-title">` y el CSS del sistema visual. Falta
  reemplazar el bloque de cabecera en las 21 pantallas de axe y en las de director.
- Las primitivas `Button`, `Field`, `Card`, `Table` y `Badge` están creadas y probadas
  contra axe, pero la adopción explícita en listados, formularios y paneles (grupo 6)
  todavía no se hizo: hoy la mejora llega por `components.css`, que reescribe las clases
  de Tabler en toda la app.

## Estado al cierre de la sesión (33/48 tareas)

Verificadores ejecutados, todos en verde:

| Comprobación | Resultado |
|---|---|
| `npm run lint` | 0 errores, 1 aviso (`<img>` en `Avatar.tsx`, el mismo de la línea base) |
| `npm run build` | OK |
| `npm run test` | **196/196** (14 archivos; +5 de `chart-colors`) |
| `npx playwright test` | **18/18** (15 previas + 3 de `e2e/tema.spec.ts`), sin cambiar aserciones |
| `npx tsx scripts/verify-accesibilidad.ts` | **22/22** en claro y **22/22** en oscuro (44 auditorías) |
| `npx tsx scripts/verify-tokens.ts` | **61/61**; comprobado que falla con un token insuficiente (59/61) |
| `npx tsx scripts/verify-i18n.ts` | 12/12 |
| `npx tsx scripts/verify-empty-states.ts` | 11/11 (ver H3) |
| `npx tsx scripts/verify-rendimiento.ts` | 25/25 |
| `npx tsx scripts/verify-responsive.ts` | 31/31 |

### H3 — Ajuste del verificador de estados vacíos

`verify-empty-states` tomaba el **primer** `[data-testid="empty-state"]` de la página de
detalle de team. Esa página tiene dos estados vacíos legítimos (el del listado del team y
el del selector «Asignar atleta»); al quedar todos los atletas asignados tras la limpieza
de restos, el primero del DOM pasó a ser el del selector y la comprobación empezó a
comparar contra el título equivocado. Ahora busca el estado vacío **dentro de la tarjeta
«Atletas del team»**, que es lo que la prueba quiere medir. No se relajó ninguna
aserción: se apuntó al elemento correcto.

### Pendiente para la siguiente sesión (15 tareas)

- **4.4** — Adoptar `PageHeader` en las 21 pantallas de axe: hoy el componente existe y
  las páginas siguen con `<h1 class="page-title">` suelto. Es el cambio de mayor impacto
  visual que queda (separador de cabecera, descripción y acciones alineadas).
- **5.1–5.6** — `Button`, `Field`, `Card`, `Table` y `Badge` están creados, con docblock
  y contrato, pero **sin adoptar** en las pantallas; por eso su verificación de estados
  (hover/foco/deshabilitado, errores anunciados, patrón tarjeta en móvil) no se puede dar
  por hecha todavía.
- **6.1–6.4** — Migración de tablas, formularios, tarjetas y badges a las primitivas.
  Hoy la mejora llega por `components.css` reescribiendo las clases de Tabler.
- **6.6** — Revisión de densidad y objetivos táctiles a 375 px pantalla por pantalla.
- **7.3** — Comprobar el estado vacío de una gráfica con un periodo sin registros.
- **9.4** — Comparación de las seis pantallas en ambos temas contra las capturas de la
  línea base (se revisaron login, dashboard de admin y métricas; faltan las otras).
- **9.5** — `verify-produccion` y medición de `cpuTime` del login tras el despliegue por
  CI (requiere push y deploy).

## Paleta oficial y marca real (tarea 4.7)

### Paleta aplicada

`#101827` (azul profundo), `#1675DF` (azul tecnológico) y `#FFFFFF` (blanco), con los
tokens reescritos en `app/styles/tokens.css`. Dos derivados fueron necesarios para
cumplir el contraste que ya exige el sistema:

- **`--app-brand` = `#1675DF`** queda como color de marca y de gráficos: sobre blanco
  mide **4,21:1**, suficiente para elementos gráficos (3:1) pero **no** para texto
  normal.
- **`--app-accent` = `#0F63C4`** (misma familia) para acciones, enlaces y foco:
  **5,85:1**. En oscuro el acento es **`#4E9BF0`** (6,16:1), porque `#1675DF` sobre
  `#101827` da 3,92:1.
- `verify-tokens.ts` pasó a comprobar también el azul de marca contra el lienzo
  (mínimo 3:1). Resultado: **63/63**.

### Marca

`scripts/generar-marca.mjs` (sin dependencias nuevas, usa Chromium) recorta el PNG
original por sus cortes verticales medidos, quita el fondo con un alfa suave —el fondo
real es 253–255, no 255— y exporta:

| Archivo | Tamaño | Uso |
|---|---|---|
| `public/brand/logo-mark.webp` | 256×87 · 19 KB | Sidebar y header |
| `public/brand/logo-lockup.webp` | 520×243 · 85 KB | Login y hero de la landing |
| `public/brand/og.jpg` | 1200×630 · 60 KB | Imagen para compartir |
| `app/icon.png` / `app/apple-icon.png` | 512 / 180 | Icono del sitio |

El original (1,1 MB) vive en `assets/brand/logo-original.png`, fuera de `public/`, para
que nunca se sirva. Se retiraron `app/icon.svg` y `app/favicon.ico` (provisionales) y
`components/layout/BrandMark.tsx` se reemplazó por `components/layout/Logo.tsx`
(`mark`, `wordmark`, `lockup`).

**En oscuro el arte va sobre pastilla blanca.** El lettering del logo es azul profundo y
sobre `#101827` desaparecería; se descartó invertir con filtros porque el monocromo se
come el detalle del corredor y las líneas de velocidad.

### Textos

La marca pasa a **RunOsorno Training** en `metadata`, login y shell. El claim del logo
(«Planifica · Entrena · Evoluciona») se usa literal en la landing y en el pie.
