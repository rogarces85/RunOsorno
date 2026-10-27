---
type: article
title: Verificadores del sistema
description: Catálogo de scripts verify-*.ts — qué comprueba cada uno, cuáles necesitan dev server y cuáles son de operación.
tags: [verificacion, scripts, calidad]
timestamp: 2026-10-27T12:35:00Z
aliases: [verificadores, verify-scripts]
topic: operaciones
status: draft
sources: ["README.md 2026-10-27", "AGENTS.md 2026-10-27"]
score: 0.0
---

# Verificadores del sistema

> Sources: README.md 2026-10-27; AGENTS.md 2026-10-27
> Raw: [README](../../raw/meta/2026-10-27-README.md); [AGENTS](../../raw/meta/2026-10-27-AGENTS.md)

## Overview

Además de linter y suites, el proyecto comprueba **el sistema real** (interfaz y base de datos) con scripts específicos. Son la red de seguridad: si se agrega una pantalla o regla nueva, un verificador existente la hereda o nace uno nuevo (constitución, principios 9–10, 22, 25).

## Cerrojos obligatorios en cada cambio visual

| Verificador | Qué mide | Ejecución | Requiere dev |
|-------------|----------|-----------|--------------|
| `scripts/verify-tokens.ts` | Contraste de tokens en claro y oscuro | `npx tsx scripts/verify-tokens.ts` | Sí |
| `scripts/verify-accesibilidad.ts` | axe-core sobre 22 rutas, WCAG AA, claro y oscuro | `npx tsx scripts/verify-accesibilidad.ts` | Sí |

La lista de rutas de `verify-accesibilidad.ts` es un registro — una pantalla nueva entra a la lista.

## El resto (por área, requieren `npm run dev` salvo indicado)

`verify-roles.ts` (rutas y menú por rol) · `verify-validations.ts` (54 Server Actions con límites reales) · `verify-i18n.ts` (falla si formatear fecha fuera de `lib/i18n/format.ts`; el único sin dev: compila y usa `next start`) · `verify-settings.ts` · `verify-audit-logs.ts` (auditoría con índices reales) · `verify-exports.ts` (PDF/XLSX/CSV por rol) · `verify-responsive.ts` (375/768/1400 px) · `verify-empty-states.ts` · `verify-dashboards.ts` (cifras contra la base) · `verify-profile.ts` · `verify-seguridad.ts` (cookies, hashing, rate limit, R2) · `verify-rendimiento.ts` (bundles, RSC, EXPLAIN, consola) · `verify-sentry.ts` (compila con `next start` y usa el build prod).

## Operación y diagnóstico (sin dev server)

```bash
npx tsx scripts/verificar-render-autenticado.ts <email> <clave>   # login real + páginas con sesión
npx tsx scripts/medir-login-cpu.ts 20 https://runosorno.online    # coste y fallos del login
npx tsx scripts/medir-rafaga.ts 30 10                             # ráfaga con concurrencia real
npx tsx scripts/purgar-cache.ts                                   # vacía la caché incremental de R2
```

## Workers y producción

Antes de tocar runtime, correr `BASE_URL=http://127.0.0.1:8787 npx playwright test` con `npm run preview` levantado: `next dev` y `npm run build` no detectan las restricciones de `workerd` (Next 16.3.x, sin codegen, sin I/O compartido). En producción: `verify-produccion.ts` (login real) y `verify-health.ts` (`/api/health`, blanco del ping de calentamiento, no requiere dev).

## Related

- [Despliegue y dominio](./Despliegue%20y%20dominio.md) — dónde se aplica la verificación.
- [Sistema general](../arquitectura/Sistema%20general.md) — decisiones que motivan los verificadores.
- [Reglas del proyecto](../meta/Reglas%20del%20proyecto.md) — la constitución exige estos cerrojos.
