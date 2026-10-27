# CLAUDE.md — RunOsorno

> Generado por `harness` el 2026-10-27. Edítalo libremente: la skill respeta tus
> cambios y solo añade secciones que falten en corridas futuras.
>
> **AGENTS.md es el archivo canónico de reglas del proyecto** (incluido el bloque
> agéntico de Next.js, mantenido por `next dev`). Lee AGENTS.md primero; este
> archivo es el mapa de entrada del wiki.

## What this project is

Plataforma web de gestión de entrenamiento de running: el coach planifica la semana de sus atletas, el atleta registra lo que hizo y ambos ven cumplimiento y métricas. SSR con Next.js (App Router, RSC), sesiones con cookies, despliegue en Cloudflare Workers con MySQL en Aiven vía Hyperdrive.

## Knowledge map

El **índice completo** de convenciones vive en **`02-DOCS/wiki/index.md`** — mantenido por las skills de stack más el tema `harness/`. Lee el artículo de tu área antes de trabajar y actualízalo cuando cambie una convención. Esta sección es un **puntero corto**: CLAUDE.md se lee en cada turno; el detalle va en el wiki. Las entradas nuevas van a `02-DOCS/wiki/index.md`, no aquí.

Read first, always:

| Area | Article |
|------|---------|
| Perfil de usuario (registro: técnico o analogías) | `02-DOCS/wiki/harness/user-profile.md` |
| Constitución SDD (no-negociables del proyecto) | `02-DOCS/wiki/sdd/constitution.md` |
| **Todo lo demás — índice completo** | `02-DOCS/wiki/index.md` |

## Workspace map

| Path | Role |
|------|------|
| `app/` `components/` `lib/` `db/` | Runtime del producto (rutas, UI, servicios, esquema). Solo lectura para `harness`. |
| `scripts/` | Verificadores del sistema (`verify-*.ts`) y utilidades de build. |
| `docs/` | Guías de operación (despliegue, dominio, base de datos, Sentry). Fuente de verdad por área. |
| `AGENTS.md` | Reglas del proyecto — canónico, `next dev` lo regenera parcialmente. |
| `01-TOOLS/` | Arsenal operativo: una carpeta por proveedor externo con credenciales co-locadas y un `test_connection`. |
| `02-DOCS/` | Wiki LLM: fuentes inmutables en `raw/`, artículos compilados en `wiki/`, más `wiki/index.md` y `wiki/log.md`. |

## Working rules

- Antes de tocar código, `git status --short`. Puede haber cambios en vuelo; no los reviertas sin entenderlos.
- Ignora salidas generadas: `node_modules/`, `.next/`, `.open-next/`, `.wrangler/`, `coverage/`, `test-results/`.
- Publica nunca secretos: `01-TOOLS/**/.env`, `CREDENTIALS.md`, claves. La constitución (principio 20) lo exige.
- Para documentación, actualiza `02-DOCS/` con el protocolo wiki: fuentes nuevas en `raw/<topic>/`, conocimiento destilado en `wiki/<topic>/`; `wiki/index.md` y `wiki/log.md` se mantienen con cada cambio.

## Main commands

Desarrollo: `npm run dev` · `npm run build` / `npm start` · `npm run preview` (OpenNext en `workerd`, puerto 8787) · `npm run db:migrate` / `db:seed` / `db:seed:demo`
Calidad: `npm run lint` · `npm test` (Vitest) · `npm run test:e2e` (Playwright) · `npm run format:check`
Despliegue: `npm run deploy` · `npm run deploy:calentamiento`

Catálogo completo con explicación: `README.md` §Scripts y §Verificadores.

## Documentation

- `02-DOCS/raw/` — material fuente inmutable (instantáneas de README y AGENTS, ingestion futura de `docs/`).
- `02-DOCS/wiki/index.md` — índice de artículos compilados.
- `02-DOCS/wiki/log.md` — bitácora de ingest/query/lint (más nuevo primero).
