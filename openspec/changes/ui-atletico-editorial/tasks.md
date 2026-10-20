# Tasks — Sistema visual «atlético editorial»

## 1. Punto de partida

- [x] 1.1 Confirmar rama y estado limpio: `git status --short` sin cambios ajenos al cambio y `npx drizzle-kit generate` sin migraciones nuevas.
- [x] 1.2 Ejecutar la línea base y anotarla en `openspec/changes/ui-atletico-editorial/notas-implementacion.md`: `npm run lint`, `npm run test`, `npx tsx scripts/verify-accesibilidad.ts` (21/21) y `npx tsx scripts/verify-responsive.ts`.
- [x] 1.3 Guardar capturas de referencia en `%TEMP%\ui-baseline\` de seis pantallas (login, dashboard admin, dashboard coach, dashboard atleta, calendario atleta, `/admin/coaches`) en claro y 1400/375 px, para comparación manual al cierre.

## 2. Tokens y tipografía (fase A)

- [x] 2.1 Crear `app/styles/tokens.css` con los tokens `--app-*` del claro según `design.md` §2 e importarlo en `app/globals.css` antes de las reglas propias; verificar con `npm run build` y que `document.documentElement` exponga `--app-accent` en una página cualquiera.
- [x] 2.2 Agregar el bloque `[data-bs-theme="dark"]` con el juego completo y comprobar por script que cada token del claro tiene su par oscuro (mismo listado, sin faltantes).
- [x] 2.3 Mapear los tokens a las variables de Tabler que usa el proyecto (`--tblr-primary`, `--tblr-body-bg`, `--tblr-body-color`, `--tblr-border-color`, `--tblr-border-radius`, `--tblr-box-shadow`, `--tblr-font-sans-serif`, `--tblr-sidebar-width`), verificando el nombre exacto en `@tabler/core/dist/css/tabler.css`; comprobar en el navegador que `getComputedStyle(document.body).backgroundColor` corresponde a `--app-canvas`.
- [x] 2.4 Incorporar Archivo variable self-hosted: woff2 subset latin y su licencia en `app/fonts/`, carga con `next/font/local` en `app/layout.tsx` y exposición como `--font-archivo`; verificar que el HTML servido no contiene dominios de fuentes externas y que `document.fonts.check("16px Archivo")` devuelve `true`.
- [x] 2.5 Definir la escala tipográfica y las clases de soporte (títulos de página, sección y tarjeta, cuerpo, secundario, rótulo y `.app-numeric` con `tabular-nums`); verificar en `/admin/coaches` y `/athlete/metrics` que las cifras de una columna quedan alineadas.
- [x] 2.6 Re-medir la familia `text-*-ink` contra los tintes vigentes y actualizar cada hex con su par y ratio en comentario, incluido `text-primary-ink`; verificar con `npx tsx scripts/verify-accesibilidad.ts` (sin violaciones) y que cada valor documenta un ratio ≥4,5:1.
- [x] 2.7 Agregar tokens de radio, sombra, espaciado y movimiento según `design.md` §5, sustituyendo los valores repetidos en `globals.css`; verificar que ninguna regla propia queda con `border-radius: 4px` ni con duraciones mayores a 200 ms (`grep` sobre el archivo).
- [x] 2.8 Revisar a ojo las seis capturas del punto 1.3 con el tema aplicado y corregir los desajustes de ritmo vertical detectados; dejar la lista de ajustes aplicados en `notas-implementacion.md`.

## 3. Tema claro por defecto y oscuro con paridad

- [x] 3.1 Leer la cookie `runosorno_tema` en `app/layout.tsx` y renderizar `data-bs-theme` y `color-scheme` desde el servidor, con `claro` como valor por defecto; verificar con `curl -s http://localhost:3000/login | grep -o 'data-bs-theme="[a-z]*"'` que sale `light` sin cookie.
- [x] 3.2 Crear `components/layout/ThemeToggle.tsx` accesible (nombre accesible, estado actual anunciado, sin recarga al cambiar) que escriba la cookie y aplique el atributo de inmediato; verificar con teclado en `/admin/dashboard` que el control es alcanzable y que el cambio se ve sin recargar.
- [x] 3.3 Eliminar el uso de `light-dark()` para superficies en `globals.css` y dejar el tema resuelto solo por `data-bs-theme`; verificar que en oscuro `body`, tarjetas, tablas y modales usan los tokens oscuros y no el fondo claro.
- [x] 3.4 Comprobar ausencia de destello: con la cookie en oscuro, recargar cinco veces `/coach/dashboard` y verificar que el HTML inicial ya trae `data-bs-theme="dark"` y que no hay salto de color perceptible.
- [x] 3.5 Escribir `e2e/tema.spec.ts` con tres casos (claro por defecto aun con el sistema en oscuro, persistencia tras recarga y navegación, y foco visible en el control); verificar con `npx playwright test e2e/tema.spec.ts`.

## 4. Shell y marca (fase B)

- [x] 4.1 Crear `components/layout/BrandMark.tsx` (wordmark y mark, tamaños y área de resguardo de `design.md` §9) y `app/icon.svg` derivado del mark; verificar que sidebar, header y login muestran la marca y que `/icon.svg` responde 200.
- [x] 4.2 Rediseñar `AppSidebar` (264 px, secciones rotuladas, ítem activo con barra de acento, hover) sin tocar `nav.ts` ni los permisos; verificar navegación completa con cada rol y que el off-canvas bajo 992 px sigue cerrando con `Escape` (`npx tsx scripts/verify-responsive.ts`).
- [x] 4.3 Rediseñar `AppHeader` (56 px, sticky, marca, campanita, avatar y salir) conservando el contador de no leídas y los nombres accesibles; verificar que el contador coincide con `/notifications` y que el foco recorre los controles en orden visual.
- [ ] 4.4 Crear `components/ui/PageHeader.tsx` y adoptarlo en las 21 pantallas de la lista de axe, retirando los títulos y contenedores duplicados; verificar que cada página tiene un solo `h1` con su nombre y `npx tsx scripts/verify-accesibilidad.ts` sin violaciones.
- [x] 4.5 Rediseñar la entrada: `app/(auth)/layout.tsx` y `app/(auth)/login/page.tsx` con marca, claim y tarjeta de 420 px, sin imagen; verificar el login de los tres roles y que el error genérico sigue apareciendo igual.
- [x] 4.6 Verificar el shell completo: `npx tsx scripts/verify-accesibilidad.ts`, `npx tsx scripts/verify-responsive.ts` y navegación manual por las 10 rutas de admin y coach sin errores de consola.
- [x] 4.7 Aplicar la paleta oficial (#101827 / #1675DF / #FFFFFF), generar los derivados de marca con `scripts/generar-marca.mjs` y sustituir la marca provisional por `Logo` en sidebar, header, login e iconos; verificar `verify-tokens` (63/63), axe (23x2) y que `/icon.png` responde 200.

## 5. Primitivas (fase C)

- [ ] 5.1 Crear `Button` con variantes, tamaños, estados y `loading` según `design.md` §8, sustituyendo los `btn` sueltos en las pantallas ya migradas; verificar con teclado los estados hover, focus, disabled en `/admin/coaches`.
- [ ] 5.2 Crear `Field` para input, select, textarea, checkbox, radio y switch, con label, ayuda, error anunciado (`aria-invalid` + `aria-describedby`) y anillo de foco; verificar en `/admin/settings` y en el formulario de plantilla que un error se anuncia al lector y no depende del color.
- [ ] 5.3 Crear `Card` (con cabecera, acciones y variante interactiva) y adoptarlo en dashboards y paneles; verificar que los dashboards de los tres roles mantienen sus datos y que no aparecen sombras fuera de la variante interactiva.
- [ ] 5.4 Crear `Table` con cabecera en versalitas, cifras a la derecha, hover y variante `stack` en móvil, conservando `tabIndex={0}`, `role="region"` y nombre accesible; verificar con teclado en `/admin/logs` (desplazamiento) y a 375 px en `/admin/coaches`.
- [ ] 5.5 Crear `Badge` con punto y familia `text-*-ink`, variante neutra incluida; verificar cada estado del calendario y del listado de coaches a escala de grises.
- [ ] 5.6 Ajustar visualmente `Alert`, `EmptyState`, `ConfirmDialog` y `ModalShell` sin alterar su contrato; verificar `Escape`, foco inicial, trampa de foco y devolución del foco en el modal de detalle de sesión y en un `ConfirmDialog`.
- [x] 5.7 Documentar el contrato de cada primitiva en su archivo (props, estados y reglas de accesibilidad) para que las fases 51–59 no las reinventen; verificar que cada componente nuevo tiene su docblock en español.

## 6. Adopción en pantallas

- [ ] 6.1 Migrar las tablas existentes (coaches, grupos, atletas, logs, teams, plantillas, notificaciones) a `Table`; verificar que ninguna pierde columnas, filtros ni paginación y que axe sigue en verde.
- [ ] 6.2 Migrar los formularios de alta y edición a `Field` (coach, grupo, team, atleta, plantilla, configuración, perfil); verificar en cada uno que los errores de validación se muestran y se anuncian igual que antes.
- [ ] 6.3 Migrar tarjetas de métricas, resúmenes y paneles a `Card` con `.app-numeric` en las cifras; verificar en `/coach/metrics`, `/athlete/metrics` y `/coach/dashboard` que los valores coinciden con los de antes del cambio.
- [ ] 6.4 Sustituir badges y avisos sueltos por `Badge` y `Alert`; verificar los cinco estados de sesión, las alertas de team y los avisos de error en ambos temas.
- [x] 6.5 Revisar el calendario sin reescribir su marcado: confirmar que hereda tokens y que las formas de `[data-state]`, el drag & drop y los badges siguen funcionando; verificar arrastrando una plantilla a un día y comprobando el estado visual.
- [ ] 6.6 Revisar en móvil (375 px) las pantallas migradas y ajustar densidad de tablas, cabeceras y acciones; verificar que ningún control accionable queda por debajo de 44×44 px.

## 7. Datos y gráficas

- [x] 7.1 Convertir `components/metrics/chartColors.ts` en una función que resuelva la paleta desde los tokens del tema, con juegos claro y oscuro, y ajustar los componentes que lo consumen; verificar en `/athlete/metrics` y `/coach/metrics` que las gráficas se ven correctamente en ambos temas.
- [x] 7.2 Agregar `tests/unit/chart-colors.test.ts` que compruebe que ambos juegos existen, que ninguna serie se repite y que cada serie conserva contraste suficiente contra su fondo; verificar con `npm run test`.
- [ ] 7.3 Revisar que cada serie se distinga además por etiqueta o leyenda y que un periodo sin datos muestre el estado vacío; verificar en `/athlete/metrics` con un rango sin registros.

## 8. Verificación y documentación

- [x] 8.1 Crear `scripts/verify-tokens.ts` que abra las páginas clave en claro y oscuro, lea los valores computados de los tokens y calcule el ratio de cada par declarado; verificar que falla al inyectar un token con contraste insuficiente y que pasa con los valores reales.
- [x] 8.2 Añadir `/login` a la verificación de accesibilidad y ejecutar axe en ambos temas sobre las 22 rutas; verificar `npx tsx scripts/verify-accesibilidad.ts` con 0 violaciones en claro y en oscuro.
- [x] 8.3 Documentar las convenciones nuevas en `AGENTS.md` (tokens en `app/styles/tokens.css` y ningún hex suelto en componentes, primitivas obligatorias, tema por `data-bs-theme`, fuentes self-hosted) y verificar que el texto es coherente con `design.md` §2–§9.
- [x] 8.4 Registrar el cambio como **D8 — sistema visual unificado** en `docs/roadmap.md` y actualizar `README.md` si cambian comandos o verificadores; verificar que el documento menciona `verify-tokens.ts` y la ubicación de los tokens.
- [x] 8.5 Anotar en `notas-implementacion.md` cualquier desvío respecto de `design.md` (valores finales, decisiones de último momento) y ajustar `design.md` para que no quede desactualizado; verificar que los tokens del documento coinciden con `tokens.css`.

## 9. Integración

- [x] 9.1 Ejecutar `npm run lint` y `npm run build`; verificar 0 errores y que el aviso de `<img>` en `Avatar` sigue siendo el único.
- [x] 9.2 Ejecutar `npm run test` y `npx playwright test` completos; verificar que ninguna aserción funcional tuvo que cambiar.
- [x] 9.3 Ejecutar `npx tsx scripts/verify-i18n.ts`, `verify-empty-states.ts`, `verify-rendimiento.ts` y `verify-responsive.ts`; verificar que siguen en verde sin tocar sus listas salvo la incorporación de `/login`.
- [ ] 9.4 Comparar las capturas finales con las de referencia del punto 1.3 y revisar las seis pantallas en ambos temas a 1400 y 375 px; dejar la conclusión en `notas-implementacion.md`.
- [ ] 9.5 Verificar en producción tras el despliegue por CI: `npx tsx scripts/verify-produccion.ts` y `npx wrangler tail runosorno --format json` sobre un login, comprobando que el `cpuTime` del POST no cambia respecto de la línea base anotada en 1.2.
