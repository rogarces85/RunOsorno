---
type: article
title: Sistema general de RunOsorno
description: Qué es el producto, los cuatro roles, la jerarquía organizacional y las decisiones de arquitectura que no se ven en el código.
tags: [runosorno, arquitectura, roles]
timestamp: 2026-10-27T12:35:00Z
aliases: [sistema-general]
topic: arquitectura
status: draft
sources: ["README.md 2026-10-27", "AGENTS.md 2026-10-27"]
score: 0.0
---

# Sistema general de RunOsorno

> Sources: README.md 2026-10-27; AGENTS.md 2026-10-27
> Raw: [README](../../raw/meta/2026-10-27-README.md); [AGENTS](../../raw/meta/2026-10-27-AGENTS.md)

## Overview

RunOsorno digitaliza la gestión de un equipo de running: el coach planifica la semana, el atleta registra lo que hizo, y ambos ven cumplimiento y métricas. Es SSR con Next.js, sesiones por cookies, sin API pública y sin tiempo real. Este artículo es la entrada conceptual; las reglas de ejecución viven en `AGENTS.md`.

## Roles y jerarquía

| Rol | Alcance | Acciones clave |
|-----|---------|----------------|
| Admin | Global | Coach, grupos, usuarios, plantillas oficiales, config global, logs, exports |
| Director Técnico | Grupo/Escuela | Visibilidad total del grupo, métricas comparativas, anuncios masivos |
| Coach | Sus teams | Planifica (drag & drop, generador, copia semana), ve detalle de sus atletas, feedback |
| Atleta | Sus teams | Calendario, registro real (distancia/tiempo/RPE), marca "no realizada", métricas personales |

Jerarquía: **Grupo/Escuela → Team → Atleta**. La crea solo el Admin. Un coach puede estar en múltiples grupos; un atleta en múltiples teams. El flujo es asíncrono: planificar → ejecutar → registrar → revisar → feedback.

## Decisiones que no se ven en el código

- **Superficie pública mínima**: solo `/` (landing) y `/login`. No hay lista blanca: lo que vive bajo `app/(app)/` exige sesión y `requireAuth()` en su layout lo valida. Con sesión abierta, landing y login mandan al tablero del rol.
- **No hay middleware** (`proxy.ts`): se compilaba aparte (5,5 MB), corría en el runtime de Node y saltaba al Worker principal por service binding — cada petición pagaba bundle + salto extra en el plan Free de 10 ms CPU. La protección vive en los layouts.
- **El login es ruta, no Server Action**: `POST /api/login` funciona sin JavaScript, la contraseña nunca viaja en la URL y el cliente reintenta el corte transitorio de Cloudflare por CPU.
- **Calentamiento aparte**: `workers/calentamiento.mjs` es un Worker propio con cron que pingea `/api/health`. Mantiene caliente el isolate porque la primera petición fría se corta.
  > ⚠ Conflicto de fuentes sobre la frecuencia: README §Scripts menciona cron "cada minuto" y AGENTS.md Fase 45 menciona "(cada 2 min)". No se resuelve automáticamente: `docs/calentamiento.md` es la autoridad operativa.
- **Festivos orientados a Chile**, zona `America/Santiago`, `es-CL`; la planificación final es del coach.

## Related

- [Mapa de código](./Mapa%20de%20c%C3%B3digo.md) — dónde vive cada pieza del sistema.
- [Despliegue y dominio](../operaciones/Despliegue%20y%20dominio.md) — cómo llega esto a producción.
- [Reglas del proyecto](../meta/Reglas%20del%20proyecto.md) — dónde está el canon de reglas.
