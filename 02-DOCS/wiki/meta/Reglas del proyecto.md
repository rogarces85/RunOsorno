---
type: article
title: Reglas del proyecto
description: Dónde viven las reglas canónicas — AGENTS.md, la constitución v1.0.0 y las guías de docs/ que el wiki no duplica.
tags: [reglas, canon, fuentes-de-verdad]
timestamp: 2026-10-27T12:35:00Z
aliases: [reglas, canon]
topic: meta
status: draft
sources: ["AGENTS.md 2026-10-27", "docs/ (indice 2026-10-27)"]
score: 0.0
---

# Reglas del proyecto

> Sources: AGENTS.md 2026-10-27; docs/ (índice 2026-10-27)
> Raw: [AGENTS](../../raw/meta/2026-10-27-AGENTS.md)

## Overview

El canon de reglas vive en **`AGENTS.md`**, mantenido a mano (más el bloque agéntico que `next dev` re-escribe). La **constitución SDD v1.0.0** (`02-DOCS/wiki/sdd/constitution.md`) ratifica los principios innegociables y el Definition of Done que las fases `specify→plan→tasks→implement→verify→review→ship` obedecen. Nada se duplica aquí: este artículo dice dónde está cada cosa.

## Fuentes de verdad por área

| Área | Fuente canónica |
|------|-----------------|
| Reglas del proyecto y decisiones | `AGENTS.md` |
| Non-negociables y DoD | `02-DOCS/wiki/sdd/constitution.md` (v1.0.0) |
| Estado del sistema y pendientes | `docs/pendientes.md` |
| Revisión de las 20 funcionalidades | `docs/revision-mvp.md` |
| Dominio/DNS/correo (fechas otorgadas) | `docs/dominio.md` + `docs/renovacion-dominio.ics` |
| Aiven/Hyperdrive/R2/Resend/Sentry | `docs/setup-servicios.md`, `docs/configurar-sentry.md` |
| Pipeline y reversión | `docs/despliegue.md` |
| Modelo de datos | `docs/base-de-datos.md` |
| Worker de calentamiento | `docs/calentamiento.md` |
| Incidentes de base de datos | `docs/recuperar-acceso-aiven.md` |
| Alcance del MVP | `specs/mvp.md`, `plan/mvp.md`, `tasks/mvp.md` |

## Restricciones duras (resumen, detalle en AGENTS.md)

Fase 43 y Fase 46 dejan tres: Next.js queda en **16.3.x** (no 16.4.0: OpenNext no inlina `preview-props.json`), prohibido generar código en runtime (`disableEval: true`; ninguna librería nueva con `eval`/`new Function`), y nada de I/O compartido entre peticiones (el cliente Drizzle vive junto al contexto de la petición). La localización centraliza fechas en `lib/i18n/format.ts` con zona `America/Santiago`.

## Cómo debe mantenerse el wiki

- Cambio de regla → se edita `AGENTS.md` y 01 `Sistema general` / este wiki se actualiza en cascada; nunca al revés.
- Nueva decision significativa → se registra en `02-DOCS/wiki/harness/decisions.md` (append-only, fecha + opciones + por qué).
- El knowledge map completo vive en `02-DOCS/wiki/index.md`; la raíz `CLAUDE.md/AGENTS.md` solo llevan el puntero de read-first.

## Related

- [Sistema general](../arquitectura/Sistema%20general.md) — opción de proyecto y jerarquía.
- [Mapa de código](../arquitectura/Mapa%20de%20c%C3%B3digo.md) — cómo se organiza el repo.
- [Despliegue y dominio](../operaciones/Despliegue%20y%20dominio.md) — restricciones de runtime Workers.
- [Verificadores del sistema](../operaciones/Verificadores%20del%20sistema.md) — cómo se garantizan las reglas.
