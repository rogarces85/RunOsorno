---
type: article
title: Mapa de código
description: Dónde vive cada cosa del sistema (app, components, lib, db, scripts) y los comandos de desarrollo.
tags: [runosorno, estructura, comandos]
timestamp: 2026-10-27T12:35:00Z
aliases: [mapa-de-codigo, code-map]
topic: arquitectura
status: draft
sources: ["README.md 2026-10-27"]
score: 0.0
---

# Mapa de código

> Sources: README.md 2026-10-27
> Raw: [README](../../raw/meta/2026-10-27-README.md)

## Overview

Un solo subproyecto en la raíz. Este artículo es el mapa para orientarse sin listar carpetas; el detalle de comportamiento se encuentra por área en los otros artículos del wiki.

## Estructura

| Carpeta | Contenido |
|---------|-----------|
| `app/` | Rutas: `(app)` con sesión, `(auth)` login, `(public)` landing, `api/` (avatar, exports, health, login) |
| `components/` | UI por dominio (admin, coach, atleta, director, calendar, metrics) + primitivas en `ui/` |
| `lib/` | db, auth, permissions, services, metrics, actions, validations, i18n |
| `db/` | Esquema Drizzle, migraciones y seeds |
| `emails/` | Plantillas React Email |
| `scripts/` | Verificadores del sistema (`verify-*.ts`) y utilidades de build |
| `docs/` | Guías de operación e informe de pendientes (canónicas por área) |
| `tests/` `e2e/` | Unitarias Vitest y Playwright |
| `workers/` | Worker de calentamiento y migraciones |

## Comandos de desarrollo

```bash
npm run dev            # servidor de desarrollo
npm run db:migrate     # aplica migraciones Drizzle
npm run db:seed        # admin, ajustes, 5 plantillas oficiales (idempotente)
npm run db:seed:demo   # escenario demo: 2 coaches, 5 atletas, 8 semanas
npm run preview        # build OpenNext + workerd en 127.0.0.1:8787 (probar restricciones Workers)
npm test               # Vitest
npm run test:e2e       # Playwright (requiere dev; con BASE_URL=127.0.0.1:8787 prueba dentro de workerd)
```

Las credenciales de desarrollo y demo viven en `README.md` (§Puesta en marcha); no se copian al wiki — la contraseña demo es pública a propósito, pero la del admin de producción debe rotarse y no se documenta aquí.

## Entorno

- Node.js **24** (el lockfile es de npm 11; con Node 22 `npm ci` falla).
- MySQL/MariaDB local vía XAMPP; producción MySQL 8.4 en Aiven.
- `cp .env.example .env.local`: sin `R2_*` ni `RESEND_API_KEY`, los avatares van a `.data/avatars/` y los correos a consola.

## Related

- [Sistema general](./Sistema%20general.md) — qué es y por qué está montado así.
- [Verificadores del sistema](../operaciones/Verificadores%20del%20sistema.md) — cómo se comprueba el sistema real.
- [Reglas del proyecto](../meta/Reglas%20del%20proyecto.md) — canon de reglas y fuentes de verdad.
