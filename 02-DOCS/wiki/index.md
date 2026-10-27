# Knowledge Base Index

> **OKF v0.1 reserved file** — `index.md` no lleva frontmatter (es un listado).
> Enlaces markdown estándar, relativos a este archivo (`topic/articulo.md`), nunca wikilinks.
> La navegación humana vive en las vistas `.base` (`Articles.base`, `Worklog.base`, `Decisions.base`);
> este índice es el catálogo legible por máquina y su respaldo.

## arquitectura

Mapa conceptual del producto: roles, jerarquía y dónde vive el código.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Sistema general de RunOsorno](arquitectura/Sistema%20general.md) | Producto, 4 roles, jerarquía Grupo→Team→Atleta y decisiones no visibles en código (sin middleware, login como ruta, calentamiento). | 2026-10-27 | 11.0 |
| [Mapa de código](arquitectura/Mapa%20de%20c%C3%B3digo.md) | Estructura del repo (app/components/lib/db/scripts/docs) y comandos de desarrollo. | 2026-10-27 | 7.0 |

## operaciones

Cómo se opera, despliega y verifica el sistema real.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Despliegue y dominio](operaciones/Despliegue%20y%20dominio.md) | Pipeline deploy.yml, la purga de R2 ANTES de desplegar, calentamiento, Hyperdrive y runosorno.online. | 2026-10-27 | 9.0 |
| [Verificadores del sistema](operaciones/Verificadores%20del%20sistema.md) | Catálogo de scripts verify-*.ts: cerrojos del DoD, por área y de operación. | 2026-10-27 | 9.0 |

## meta

El canon: dónde viven las reglas y las decisiones.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Reglas del proyecto](meta/Reglas%20del%20proyecto.md) | AGENTS.md + constitución v1.0.0 como fuente read-first; tabla de fuentes de verdad por área. | 2026-10-27 | 10.0 |

## harness

El control-plane sobre sí mismo: quién usa el sistema y qué ha decidido.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [User profile](harness/user-profile.md) | Registro técnico; cómo prefiere trabajar el dueño. | 2026-10-27 | 1.5 |
| [Decisions](harness/decisions.md) | Log append-only de decisiones significativas del harness. | 2026-10-27 | 1.5 |
| [Installation plan](harness/installation-plan.md) | Plan aceptado por onboard (id b0b270fe…). | 2026-10-27 | 1.0 |

## sdd

Los artefactos de la cadena SDD (constitución primero).

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Constitution — RunOsorno](sdd/constitution.md) | 29 principios innegociables + Definition of Done; ratificada v1.0.0 el 2026-10-27. | 2026-10-27 | 1.5 |
