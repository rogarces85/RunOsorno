# Tasks — Landing pública

## 1. Punto de partida

- [x] 1.1 Confirmar estado limpio del cambio anterior: `npm run lint` sin errores, `npm run test` en verde y `npx tsx scripts/verify-tokens.ts` en 63/63.
- [x] 1.2 Anotar la línea base de rutas: `npx tsx scripts/verify-roles.ts` en verde antes de tocar el proxy, para comparar después.

## 2. Marca, contacto y contenido

- [x] 2.1 Crear `lib/site.ts` con nombre, claim, correo, asunto y helper de `mailto:` por sección; verificar que el correo aparece una sola vez en el código (`grep`).
- [x] 2.2 Crear `components/marketing/contenido.ts` con pasos, productos por rol, funcionalidades, líneas y preguntas, todo en español y sin precios ni cifras inventadas; verificar que ningún texto menciona montos.
- [x] 2.3 Escribir `app/styles/marketing.css` (hero, grillas, tarjetas, pasos, FAQ, pie) usando solo tokens `--app-*`; verificar que no aparece ningún hex en el archivo.

## 3. Ruta pública y seguridad

- [x] 3.1 Crear el route group `app/(public)/layout.tsx` con header mínimo (logo, tema, «Entrar»), `<main id="contenido">` y enlace de salto; verificar axe sobre `/` sin violaciones.
- [x] 3.2 Crear `app/(public)/page.tsx` con las secciones del contenido y `metadata` propia; verificar que el HTML servido contiene el `h1` y la descripción.
- [x] 3.3 Eliminar `app/page.tsx` y comprobar que `/` responde 200 sin sesión y que ambas rutas no chocan (`npm run build` sin avisos de conflicto).
- [x] 3.4 Actualizar `proxy.ts` con la lista blanca (`/`, `/login`) y la redirección al tablero cuando hay sesión; verificar con `curl -I` que `/`, `/login` responden 200 sin sesión y `/admin/dashboard` responde 307 a `/login`.
- [x] 3.5 Escribir `e2e/landing.spec.ts` con cuatro casos (anónimo ve la landing, CTA lleva a `/login`, rutas internas siguen cerradas, con sesión `/` va al tablero); verificar con `npx playwright test e2e/landing.spec.ts`.

## 4. Contenido y secciones

- [x] 4.1 Implementar el hero con lockup, claim, subtítulo y dos llamados; verificar que el logo tiene nombre accesible y que el lockup pesa lo esperado.
- [x] 4.2 Implementar los tres pasos de uso con numeración e iconos; verificar lectura con teclado y jerarquía de encabezados.
- [x] 4.3 Implementar las tres tarjetas de producto con cuatro capacidades cada una y enlace de correo con asunto propio; verificar que cada `mailto:` incluye la sección.
- [x] 4.4 Implementar la grilla de ocho funcionalidades con iconos de Tabler; verificar que ninguna promete algo que el MVP no hace.
- [x] 4.5 Implementar líneas Running y Trail Running, preguntas frecuentes con `details`/`summary`, cierre y pie con contacto y privacidad; verificar apertura de cada pregunta con teclado.
- [x] 4.6 Revisar la landing a 375, 768 y 1400 px en ambos temas y corregir espaciados; verificar con capturas propias.

## 5. SEO

- [x] 5.1 Declarar `metadata` con título, descripción, canónica y Open Graph usando `public/brand/og.jpg`; verificar las etiquetas en el HTML servido.
- [x] 5.2 Crear `app/sitemap.ts` y `app/robots.ts` con solo `/` y `/login`; verificar que `/admin` no aparece en el sitemap.

## 6. Verificación y documentación

- [x] 6.1 Extender `scripts/verify-accesibilidad.ts` para rutas públicas sin credenciales y sumar `/`; verificar 23 rutas × 2 temas sin violaciones.
- [x] 6.2 Actualizar `scripts/verify-roles.ts` con `/` como pública y comprobar que el resto sigue cerrado; verificar que sigue en verde.
- [x] 6.3 Sumar la landing a `scripts/verify-responsive.ts` y a las páginas de consola de `verify-rendimiento.ts`; verificar ambos en verde.
- [x] 6.4 Documentar las rutas públicas en `AGENTS.md`, registrar D9 en `docs/roadmap.md` y anotar la landing en `README.md`; verificar que `/` figura como pública en los tres.

## 7. Integración

- [x] 7.1 Ejecutar `npm run lint`, `npm run build` y `npm run test`; verificar 0 errores y el único aviso conocido de `Avatar`.
- [x] 7.2 Ejecutar `npx playwright test` completo y `npx tsx scripts/verify-accesibilidad.ts`; verificar que las suites previas siguen pasando.
- [x] 7.3 Comparar la landing con el resto del sistema (paleta, tipografía, radios) y dejar la conclusión en `notas-implementacion.md`.
