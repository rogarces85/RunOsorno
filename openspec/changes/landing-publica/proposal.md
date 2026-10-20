# Proposal — Landing pública de RunOsorno Training

## Why

Hoy la única puerta al producto es el inicio de sesión: `app/page.tsx` redirige a
`/login` y `proxy.ts` cierra todas las rutas salvo esa. Quien no tiene cuenta no puede
ver qué es RunOsorno Training, ni qué resuelve, ni cómo pedir acceso.

Eso deja al producto sin escaparate en el momento en que se quiere empezar a
promocionarlo. El plan comercial acordado es explícito y no incluye pagos todavía:
**la landing presenta los productos, explica para quién son y canaliza las consultas
por correo**, sin precios ni checkout.

## What Changes

- **Nueva ruta pública `/`**: landing con hero, tres pasos de uso, tres productos
  (Atleta, Coach, Escuela/Club), ocho funcionalidades, líneas Running y Trail Running,
  preguntas frecuentes y cierre con contacto.
- **Lista blanca en el proxy**: `/` y `/login` pasan a ser públicas; todo lo demás
  sigue cerrado. Un visitante con sesión que entra a `/` va a su dashboard.
- **Tema claro y oscuro** en la landing, con la misma cookie y el mismo control que la
  app.
- **Contacto por correo** (`mailto:` con asunto según sección), configurado en una
  sola constante para cambiarlo cuando exista dominio propio.
- **SEO**: título, descripción, Open Graph con imagen generada desde el logo,
  `sitemap.ts` y `robots.ts` (hoy no existen).
- **Pruebas**: E2E de la landing, axe sobre la ruta pública en ambos temas, y
  verificación de que el resto del sistema sigue cerrado.

### Fuera del alcance

- **Pagos, precios y checkout.** No hay modelo de negocio definido; mostrarlos sería
  inventar una oferta.
- **Formulario de leads con backend.** El canal es el correo. Un formulario exige
  Resend verificado, rate limiting y antispam; se evalúa más adelante, cuando exista
  dominio propio.
- **CMS o contenido editable desde el panel.** Los textos viven en módulos TypeScript.
- **Redes sociales.** No hay cuentas del proyecto todavía; no se muestran iconos que
  no lleven a ninguna parte.
- **Blog, casos de estudio y testimonios.** La sección de prueba social queda como
  espacio reservado y marcado, sin inventar personas ni cifras.
- **Multi-idioma.** Solo es-CL, como el resto del producto.

### Ubicación en el roadmap y costo

No pertenece a las fases 51–59 (que son funcionalidades del sistema). Es una capacidad
de producto nueva, previa a promocionar: se registra como **D9 — landing pública** en
`docs/roadmap.md`. Costo **cero**: sin dependencias nuevas, imágenes estáticas propias
y un `mailto:` sin backend.

## Capabilities

### New Capabilities

- `public-site`: define el escenario público del producto — qué se puede ver sin
  sesión, qué no, cómo se presenta la oferta, cómo se contacta y qué garantías de
  accesibilidad, tema y SEO debe cumplir.

### Modified Capabilities

Ninguna. No cambia el comportamiento interno del sistema: los permisos, las reglas de
negocio de `specs/mvp.md` §8 y los flujos siguen intactos. Lo que cambia es **quién
puede llegar a la puerta**, no lo que hay detrás.

## Impact

| Área | Archivos | Cambio |
|---|---|---|
| Ruta pública | `app/(public)/layout.tsx`, `app/(public)/page.tsx`, `components/marketing/*` | Nuevos; la landing deja de ser un redirect |
| Raíz | `app/page.tsx` | Se elimina (su lugar lo ocupa la landing) |
| Seguridad de rutas | `proxy.ts` | Lista blanca de rutas públicas |
| Marca y contacto | `lib/site.ts` | Nombre, correo, asunto y enlaces en un solo lugar |
| SEO | `app/sitemap.ts`, `app/robots.ts`, metadata | Nuevos |
| Pruebas | `e2e/landing.spec.ts`, `scripts/verify-accesibilidad.ts`, `scripts/verify-roles.ts` | Nuevos y ajustados |
| Documentación | `AGENTS.md`, `docs/roadmap.md`, `README.md` | Rutas públicas y D9 |

Riesgo principal: **abrir de más el proxy**. Se mitiga con una lista explícita de dos
rutas y una prueba de extremo a extremo que verifica que `/admin`, `/coach` y
`/athlete` siguen devolviendo al login sin sesión.
