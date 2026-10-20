# Notas de implementación — landing-publica

## Qué se construyó

- `app/(public)/layout.tsx` y `app/(public)/page.tsx`: portada con hero, tres pasos,
  tres productos por rol, ocho funcionalidades, dos líneas, preguntas frecuentes y
  cierre. Se eliminó `app/page.tsx` (antes redirigía a `/login`).
- `proxy.ts`: lista blanca explícita `RUTAS_PUBLICAS = { "/", "/login" }`; con sesión,
  ambas redirigen al tablero del rol.
- `lib/site.ts` (marca y contacto) y `components/marketing/contenido.ts` (textos), con
  el correo en un solo lugar.
- `app/styles/marketing.css`, importado solo por el layout público.
- `app/sitemap.ts` y `app/robots.ts`; metadata con Open Graph sobre `brand/og.jpg`.
- `e2e/landing.spec.ts` (5 casos), más `/` en `verify-accesibilidad` (23 rutas × 2 temas),
  `verify-roles` (62/62, con dos comprobaciones nuevas) y `verify-responsive`
  (34/34, con la landing en tres anchos y consola limpia).

## Decisiones y hallazgos

- **Sin año dinámico en el pie.** `new Date().getFullYear()` en el layout público hacía
  que Next intentara prerenderizar un valor inestable y registraba un error en consola
  («unstable value `new Date()` while prerendering»). `connection()` y
  `export const instant = false` no lo silenciaban; se optó por no mostrar el año, que
  tampoco aportaba.
- **Título duplicado.** Con la plantilla del layout raíz (`%s · RunOsorno Training`), el
  título de la landing quedaba «… · RunOsorno Training · RunOsorno Training». Se declaró
  con `title: { absolute: … }`.
- **Desborde a 375 px.** El botón del cierre llevaba el correo completo como etiqueta y
  empujaba 30 px el layout. Ahora el botón dice «Escribir por correo», la dirección va
  como enlace en el texto (con `overflow-wrap: anywhere`) y `.app-cta-actions .app-btn`
  limita su ancho.
- **Dos enlaces con el mismo nombre accesible** («Entrar al sistema» en hero y pie). No
  es un problema de accesibilidad, pero la prueba E2E tuvo que apuntar al del `<main>`
  en vez de usar el primero del documento.
- **La verificación de consola de la landing vive en `verify-responsive.ts`**, no en
  `verify-rendimiento.ts`: ese script audita páginas autenticadas y la portada necesita
  un contexto sin sesión. La tarea 6.3 se cumple con la cobertura equivalente (tres
  anchos, consola sin errores).
- **Cobertura del baseline (tarea 1.2).** No se ejecutó `verify-roles` antes de tocar el
  proxy; se compensó con la corrida posterior, que conserva las 60 comprobaciones
  previas sin cambios y suma dos nuevas.

## Resultado de la verificación

| Comprobación | Resultado |
|---|---|
| `npm run lint` | 0 errores, 1 aviso conocido (`<img>` en `Avatar`) |
| `npm run build` | OK, con `/`, `/sitemap.xml` y `/robots.txt` |
| `npm run test` | 196/196 |
| `npx playwright test` | 23/23 (18 previas + 5 de landing) |
| `verify-accesibilidad` | 23 rutas × 2 temas, 0 violaciones |
| `verify-roles` | 62/62 |
| `verify-responsive` | 34/34 |
| `verify-rendimiento` | 25/25 |
| `verify-i18n` / `verify-empty-states` | 12/12 · 11/11 |
| `verify-tokens` | 63/63 |
