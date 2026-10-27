---
type: constitution
title: RunOsorno — Constitution
description: Reglas innegociables del proyecto; cada fase SDD las obedece.
tags: [sdd, constitution]
timestamp: 2026-10-27T15:14:43Z
topic: sdd
status: ratified
version: v1.0.0
---

# RunOsorno — Constitution

> **Ratificada v1.0.0 — 2026-10-27.** Las fases `specify`, `plan`, `analyze`, `implement`, `verify`, `review` y `ship` leen este archivo antes de trabajar.
> Enmienda: strike + añadir + bump de versión + entrada en el log; nunca editar en silencio.

## Known facts (from onboarding)

- Goal: Plataforma SaaS B2C de gestion de entrenamiento de running: coaches planifican, atletas registran y cumplen, admin supervisa
- Project kind: software · software scope: small
- How code changes land: straight on the default branch (`--workflow main`).
- Stack evidence: Detected at install: nextjs, node, react (from package.json). Not ratified yet.
- Fuente de las reglas (leave-in-place, no duplicadas aquí): `AGENTS.md`. La constitución ratifica el principio y enlaza el detalle.

## 1. Stack canon

1. El runtime de producción es **Cloudflare Workers vía `@opennextjs/cloudflare`**. Next.js se mantiene en **16.3.x** — prohibido subir a 16.4.0 y superior sin nueva ratificación. Comprobable: `package.json` → `dependencies.next`.
2. El esquema de base de datos nace **solo de migraciones Drizzle**; nada se importa de volcados SQL entre motores (dev MariaDB 10.4 / prod MySQL 8.4). Comprobable: existen `drizzle/migrations` y no hay dump importado.
3. La autenticación es **por sesión con cookies** (Lucia), aplicada en los layouts (`requireAuth()`); **sin middleware** (`proxy.ts`), sin API pública y sin tiempo real. Comprobable: no existe `proxy.ts`; `app/(app)/layout.tsx` llama `requireAuth()`.
4. Las reglas de runtime Workers son innegociables: **no `eval` ni `new Function`** (incluye dependencias nuevas), **no I/O compartido entre peticiones** (el cliente Drizzle vive junto al contexto de petición), **no `NEXT_PUBLIC_` para configuración de servidor**. Comprobable: `lib/db/index.ts` usa `disableEval: true`.
5. El UI usa **`@tabler/core` + `@tabler/icons-react`** con primitivas propias (`components/ui/`); no se introduce otro framework CSS (Tailwind descartado por conflicto). Comprobable: `package.json`.

## 2. Quality bar

6. Toda fecha y hora se formatea **exclusivamente en `lib/i18n/format.ts`** con zona `America/Santiago`; ningún otro módulo llama `Intl`/`toLocale*` para datos de la app. Enforcer: `scripts/verify-i18n.ts`.
7. Los textos de usuario con unidades/plurales salen de `messages/es-CL.json` vía `t()`; claves no tipadas rompen `tsc`.
8. Piso de pruebas obligatorio: todo service/regla nueva en `lib/` exige test unitario Vitest; todo componente o pantalla nueva exige test de comportamiento (Vitest o Playwright) y entra en el verificador del área. Sin test nuevo, el cambio no pasa el DoD.
9. El DoD de todo cambio es la **suite completa**: `npm run lint` limpio, `tsc --noEmit` limpio, `npm test` verde, los `scripts/verify-*.ts` del área tocada (tokens, i18n, accesibilidad, rendimiento, seguridad, según toque) y `npm run test:e2e` si el cambio toca UI. Comprobable: salida de los comandos.
10. Los scripts `verify-*.ts` son la red de seguridad del repo: si se agrega una pantalla, entra a `scripts/verify-accesibilidad.ts`; si se agrega un módulo con fechas, queda bajo `scripts/verify-i18n.ts`.
11. El estilo visual pasa los dos cerrojos antes de cerrarse: `npx tsx scripts/verify-tokens.ts` y `scripts/verify-accesibilidad.ts` (claro y oscuro). Ver §6.

## 3. Conventions

12. Los commits siguen **Conventional Commits**, descripción en español: `type(scope): resumen` (p.ej. `fix(calendario): zona horaria en registro`). Tipos válidos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`.
13. Los colores, radios, sombras, espaciados y movimiento viven en `app/styles/tokens.css`; ningún componente escribe hex suelto ni `border-radius` a mano. Formas de estado vía `[data-state=…]` en `globals.css`. Enforcer: `scripts/verify-tokens.ts`.
14. Toda pieza nueva de UI usa las primitivas de `components/ui/` (`Button`, `Field`, `Card`, `Table`, `PageHeader`, `Badge`); no se escribe marcado Tabler a mano.
15. Los modales pasan por `components/ui/ModalShell.tsx` — un `div.modal` manual es una violación, aunque funcione.

## 4. Branching & shipping

16. El trabajo avanza **directo en `main`** (elegido en onboarding). Sin pregunta de rama por defecto.
17. **La autoría git es humana**: commits y PRs a nombre del dueño del repo. Ningún `Co-Authored-By` de IA ni pie "generated with". Enforcer: fase `ship`.
18. El despliegue corre por `.github/workflows/deploy.yml`; la caché incremental de R2 se purga **antes** de desplegar, nunca después. Fechas del dominio se consultan solo en `docs/dominio.md`.

## 5. Security & privacy floor

19. Contraseñas nuevas **solo PBKDF2-HMAC-SHA512** (`lib/security/hashing.ts`, 210k iteraciones WebCrypto). Prohibido hashear nueva con `bcryptjs`; su único uso legítimo es el fallback de cuentas viejas.
20. Ningún secreto vive en el código ni en el bundle: se cargan de entorno/secretos (`01-TOOLS/<proveedor>/.env` en dev, secretos de Workers en prod). `APP_URL` sin prefijo `NEXT_PUBLIC_`; única excepción ratificada: `NEXT_PUBLIC_SENTRY_DSN` (necesita bundle de navegador).
21. Toda petición HTTP sale por dominio y remitente verificado (`runosorno.online` / `no-reply@...`); la privacidad de observabilidad es opt-in explícito (Sentry sin PII, scrub en `lib/observability/scrub.ts`).

## 6. Accessibility & UX floor

22. El piso de accesibilidad es **el resultado de `scripts/verify-accesibilidad.ts`: cero violaciones de axe en las rutas cubiertas, en tema claro y oscuro**. Pantalla nueva = fila nueva en ese script.
23. El estado nunca se comunica **solo con color**: cada estado del calendario tiene forma propia. Los badges usan la familia `text-*-ink`/`Badge`; `bg-*-lt` + `text-*` heredado está prohibido en marcado nuevo.
24. Accesibilidad de interacción: modales por `ModalShell` (foco, Escape, trampa), salto al contenido dentro de `<main>`, contenedores desplazables `tabIndex` + `role`, campos con error vía `aria-invalid`/`aria-describedby`. Prohibido `aria-label` que reescriba texto visible.

## 7. Performance budgets

25. Presupuesto: **sin regresión medida**. El JavaScript inicial no crece respecto a la última medición de `scripts/verify-rendimiento.ts`; una regresión debe justificarse y compensarse en el mismo cambio.
26. Las gráficas son **SVG propio** (`components/metrics/`), nunca una librería; color de series solo de `--app-chart-1…5`; sin texto dentro del SVG estirado.
27. Las consultas no traen histórico para filtrar en memoria: acotadas por fechas (`loadRowsInRange`) o por clave (Enforcer: revisión; principio derivado de la Fase 47).

## 8. Knowledge & decisions

28. Toda decisión significativa se registra en `02-DOCS/wiki/sdd/decisions.md` (fecha, opciones, por qué). La constitución misma es el registro de mayor orden; su enmienda es append-only.
29. El conocimiento operativo del proyecto vive en `AGENTS.md` + `02-DOCS/wiki/`; una regla nueva de ejecución entra a `AGENTS.md` (o al wiki) en el mismo cambio que la introduce — no se guarda en memoria de chat.

## Definition of Done (the merge bar `verify` runs against)

Un cambio está terminado cuando todo lo siguiente pasa:

- [ ] `npm run lint` y `tsc --noEmit` limpios
- [ ] `npm test` verde, con test nuevo si el cambio toca `lib/` o UI (principios 8-10)
- [ ] Los `scripts/verify-*.ts` del área tocada, verdes (tokens/i18n/accesibilidad/rendimiento/seguridad según toque)
- [ ] `npm run test:e2e` verde si el cambio toca UI
- [ ] Sin regresión de bundle inicial medida por `scripts/verify-rendimiento.ts` (principio 25)
- [ ] Sin secretos, sin `eval`/`new Function`, sin subida a 16.4.x (principios 1, 4, 20)
- [ ] Conocimiento nuevo documentado (principios 28-29) y decisión relevante en el log
- [ ] Commit Conventional en `main`, autoría humana (principios 12, 16-17)

## Amendment log (append-only)

| Date | Version | Change | Why |
|------|---------|--------|-----|
| 2026-10-27 | draft | Draft generated by `rsc onboard`. | The SDD floor needs a constitution; ratification is the `constitution` phase's. |
| 2026-10-27 | v1.0.0 | Ratificación inicial: 29 principios sintetizados desde `AGENTS.md` + entrevista (DoD completo, piso de pruebas obligatorio, presupuesto sin regresión, Conventional Commits). | Primera constitución del proyecto; ratificada explícitamente por el dueño. |
