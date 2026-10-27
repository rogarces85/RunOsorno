---
type: article
title: Despliegue y dominio
description: Pipeline a Cloudflare Workers, el orden de la purga de caché R2, el Worker de calentamiento, Hyperdrive y el dominio runosorno.online.
tags: [deploy, cloudflare, dominio, operacion]
timestamp: 2026-10-27T12:35:00Z
aliases: [despliegue-y-dominio, deploy]
topic: operaciones
status: draft
sources: ["README.md 2026-10-27", "AGENTS.md 2026-10-27", "docs/dominio.md (indice, no copiado)"]
score: 0.0
---

# Despliegue y dominio

> Sources: README.md 2026-10-27; AGENTS.md 2026-10-27; docs/dominio.md (índice, no copiado)
> Raw: [README](../../raw/meta/2026-10-27-README.md); [AGENTS](../../raw/meta/2026-10-27-AGENTS.md)

## Overview

El pipeline corre en cada push a `main`: instala, lint, pruebas unitarias, **purga la caché incremental de R2**, build OpenNext y despliegue al Worker `runosorno` → `https://runosorno.online`. Necesita `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en GitHub. Las fechas y detalles del dominio **no se inventan**: la fuente única es `docs/dominio.md`.

## El orden de la purga importa

Esa es la decisión crítica del pipeline:

- El deploy sube el prerender de la build nueva **a la misma caché incremental de R2**.
- Purgar **después** deja el bucket vacío y las páginas públicas colgadas: el render en runtime no termina en `workerd` (Next usa `setTimeout`, que workerd no implementa como se espera, con `cacheComponents: true`).
- Por eso en `.github/workflows/deploy.yml` la purga va **antes** del despliegue. Sin purga, además, se acumulaban objetos de builds viejas (1199) y provocaban 500.

También hay purga manual: `npx tsx scripts/purgar-cache.ts`.

## Calentamiento

- Worker separado `workers/calentamiento.mjs` (`runosorno-calentamiento`): desplegable con `npm run deploy:calentamiento`, editable sin riesgo para el tráfico principal; probar con `npx wrangler deploy --config wrangler.calentamiento.jsonc --dry-run`.
- Motivo: Workers Free da **10 ms de CPU**; rutas triviales usan 3–8 ms, la primera petición fría se corta. El cron mantiene caliente el isolate.
- Ninguna fecha del dominio se escribe en código — se consulta `docs/dominio.md`.

## Conexión a datos y correo en producción

- Aiven MySQL 8.4 (base `defaultdb`) vía binding **Hyperdrive** (`1bffd76cc20d423690c4079891d596eb`), `.env` por `wrangler.jsonc` declara `localConnectionString` para que wrangler resuelva.
- Correo por **Resend** con `no-reply@runosorno.online` (dominio verificado, región `sa-east-1`); buzones `@runosorno.online` en webmail de Nominalia.
- Avatares en **R2** (bucket privado + signed URLs; filesystem es efímero en Workers).

## Verificación post-despliegue

`npm run deploy` incluye comprobaciones; a mano: `npx tsx scripts/verify-produccion.ts` (login real contra el Worker), `npx tsx scripts/verify-health.ts` (`/api/health`, blanco del ping de calentamiento), `BASE_URL=http://127.0.0.1:8787 npx playwright test` y `npx tsx scripts/medir-login-cpu.ts 20 https://runosorno.online` (quedan listados en el `README.md` §Verificadores).

## Related

- [Sistema general](../arquitectura/Sistema%20general.md) — por qué no hay middleware y por qué el login es ruta.
- [Verificadores del sistema](./Verificadores%20del%20sistema.md) — catálogo completo de scripts.
- [Reglas del proyecto](../meta/Reglas%20del%20proyecto.md) — restricciones de runtime Workers.
