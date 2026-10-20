# Design — Landing pública

Ver `proposal.md` para la motivación y `specs/public-site/spec.md` para los requisitos.

## Context

- Hoy `app/page.tsx` redirige a `/login` y `proxy.ts` protege **todo** salvo `/login`:
  sin sesión no se ve nada.
- El layout raíz lee la cookie de tema (`runosorno_tema`), así que todo el árbol es
  dinámico (`export const instant = false`). La landing hereda ese comportamiento.
- La marca real ya está integrada: `Logo` usa los WebP de `public/brand/` y en oscuro
  va sobre pastilla blanca.
- La paleta oficial es `#101827` / `#1675DF` / `#FFFFFF`; no hay precios definidos y el
  canal de contacto es el correo personal del dueño.

## Goals / Non-Goals

**Goals:**

1. Que alguien sin cuenta entienda en treinta segundos qué hace el producto y para
   quién es.
2. Explicar los tres productos con hechos del sistema, no con promesas.
3. Canalizar la consulta en un clic de correo.
4. Abrir solo dos rutas y demostrar que el resto sigue cerrado.

**Non-Goals:**

- Precios, checkout, formulario de leads, CMS, blog, redes sociales, multi-idioma.
- Reutilizar el layout de la app (sidebar, campanita, sesión).

## Decisions

### 1. Route group `(public)` y raíz

La landing vive en `app/(public)/page.tsx` con su propio layout. Se elimina
`app/page.tsx` para no tener dos rutas resolviendo `/`.

- **Por qué:** separa el armazón público del de la app sin tocar los grupos existentes
  `(app)` y `(auth)`.
- **Alternativa descartada:** dejar la landing en `app/page.tsx` con condicionales de
  sesión; habría mezclado dos armazones en un archivo.

### 2. Lista blanca en el proxy

```ts
const PUBLICAS = new Set(["/", "/login"]);
```

- Sin sesión: si la ruta es pública → `next()`; si no → `/login` (como hoy).
- Con sesión: `/` y `/login` → dashboard del rol; el resto → `next()`.
- El `matcher` no cambia: sigue excluyendo `api` y archivos con extensión, así que
  `/brand/*.webp` se sirve sin pasar por el proxy.
- **Por qué una lista y no un prefijo:** un `pathname.startsWith("/")` mal escrito abre
  el sistema entero. La lista es explícita y se puede leer en una línea.

### 3. Contenido en módulos TypeScript

`lib/site.ts` (marca y contacto) y `components/marketing/contenido.ts` (secciones: pasos,
productos, funcionalidades, preguntas). Sin CMS.

- **Por qué:** el texto cambia poco, se revisa en un diff y no cuesta una consulta.
- **Alternativa descartada:** MDX o base de datos; agrega dependencias o I/O a una
  página que debe ser barata.

### 4. Contacto por correo

`mailto:` con asunto por sección, generado desde `lib/site.ts`:

```
CONTACT_EMAIL = "rodrigo.garces.guerrero@gmail.com"
CONTACT_SUBJECT = "Quiero información sobre RunOsorno Training"
```

- Se muestra la dirección como texto además del enlace, para quien copie a mano.
- **Riesgo asumido:** un `mailto:` público es rastreable por bots. Cuando exista dominio
  propio y Resend verificado, el paso siguiente es un formulario con honeypot y rate
  limit; este enlace queda como respaldo.

### 5. Composición visual

- **Header mínimo**: logo (mark + texto), control de tema y «Entrar». Sin menú lateral.
- **Hero**: lockup, claim del logo («Planifica · Entrena · Evoluciona»), subtítulo y dos
  llamados: «Entrar al sistema» y «Solicitar información». Fondo con un degradado muy
  sutil del acento, sin imágenes pesadas.
- **Tres pasos**: coach planifica → atleta registra → coach revisa. Numerados.
- **Productos**: tres tarjetas (Atleta, Coach, Escuela/Club) con icono, cuatro viñetas
  reales y enlace de correo con asunto propio.
- **Funcionalidades**: ocho tarjetas con icono de Tabler (ya instalado).
- **Líneas**: Running y Trail Running, con el claim del logo como puente.
- **Preguntas**: `details`/`summary` nativos (teclado y lector gratis).
- **Cierre y pie**: contacto, «Entrar», aviso de privacidad breve y © del año.

Todo con las clases del sistema visual (`app-*`), sin CSS nuevo fuera de
`app/styles/marketing.css` (un archivo, solo para la landing).

### 6. Tema

Se reutiliza `ThemeToggle` y la cookie existente. El layout público no agrega estado: el
atributo `data-bs-theme` viene del layout raíz, así que no hay destello en la landing.

### 7. SEO

`app/sitemap.ts` y `app/robots.ts` declaran solo `/` y `/login`; las rutas internas
quedan fuera del sitemap y bloqueadas por `robots`. La imagen de compartición es
`public/brand/og.jpg` (1200×630, 60 KB) generada por `scripts/generar-marca.mjs`.

### 8. Verificación

| Qué | Cómo |
|---|---|
| Rutas | `e2e/landing.spec.ts`: anónimo ve la landing; `/admin`, `/coach`, `/athlete` redirigen; con sesión `/` va al tablero |
| Accesibilidad | `verify-accesibilidad.ts` admite entradas públicas y suma `/` (23 rutas × 2 temas) |
| Rutas por rol | `verify-roles.ts` declara `/` como pública y comprueba que el resto sigue cerrado |
| Responsive y consola | `verify-responsive.ts` y `verify-rendimiento.ts` suman la landing |
| Tokens | `verify-tokens.ts` sigue midiendo el sistema, que la landing usa |

## Risks / Trade-offs

- **Abrir de más el proxy → fuga de rutas internas.** Mitigación: lista de dos rutas y
  E2E que prueba `/admin`, `/coach` y `/athlete` sin sesión.
- **La landing es dinámica por la cookie de tema.** Mitigación: se acepta; es un render
  barato sin base de datos. Si el tráfico crece, se evalúa mover el tema a un layout por
  grupo, decisión que hoy costaría más de lo que ahorra.
- **Correo expuesto a rastreadores.** Mitigación documentada arriba; el asunto
  prellenado ayuda a filtrar.
- **Contenido sin prueba social.** Mitigación: no se inventa; el espacio queda rotulado
  como pendiente hasta tener casos reales.
- **Landing desactualizada respecto del producto.** Mitigación: el contenido cita
  funcionalidades que existen en `specs/mvp.md` §4 y se revisa en cada cambio de alcance.

## Migration Plan

No hay migraciones de datos ni de esquema. El despliegue va por CI. Rollback: revertir
`proxy.ts` (vuelve a cerrar `/`) y retirar `app/(public)`; la app no depende de la landing
para funcionar.

## Open Questions

- ¿Se agrega un formulario de contacto cuando exista dominio propio? Queda para una
  fase posterior con Resend verificado.
- ¿La sección de prueba social se llena con casos reales o se retira? Se decide cuando
  haya material.
