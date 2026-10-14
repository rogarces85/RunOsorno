# AGENTS.md — RunOsorno (Versión Final)

## Proyecto
**RunOsorno** — Plataforma web de gestión de entrenamiento de running que conecta entrenadores (coaches) con sus atletas, bajo supervisión de un administrador (admin).

## Problema que resuelve
Digitalizar y centralizar la planificación, ejecución y seguimiento de entrenamientos de running para equipos/coaches, reemplazando planillas/manuales por una herramienta web accesible desde navegador.

## Solución general
Sistema web **SSR (renderizado en servidor)** con **autenticación por sesión (cookies)**, sin API pública ni tiempo real. Tres roles con flujos diferenciados:

1. **Planificación (Coach)**: Crea entrenamientos individuales o usa biblioteca de plantillas para generar planes semanales personalizados.
2. **Ejecución y registro (Atleta)**: Consulta su plan en calendario mensual, registra resultados reales (distancia, tiempo, RPE, comentarios) y marca sesiones no realizadas con motivo.
3. **Seguimiento y comunicación (Coach/Admin)**: Revisa cumplimiento y métricas, responde feedback, comunicación via notificaciones in-app y email automático.

---

## Usuarios y Roles

### Jerarquía organizacional
| Nivel | Entidad | Reglas |
|-------|---------|--------|
| **Organización** | Grupo/Escuela | La crea **solo Admin**. Agrupa múltiples coaches/teams. Coach pide unirse (solicitud + aprobación admin). Coach puede estar en **múltiples grupos**. |
| **Equipo** | Team | **1 coach = N teams**. Nombre por defecto = apellido coach, **editable**. Atleta puede estar en **múltiples teams** (incluso del mismo coach). |

### Permisos por rol
| Rol | Alcance | Acciones clave |
|-----|---------|----------------|
| **Admin** | Global | Crea grupos, aprueba solicitudes coaches, gestiona usuarios, configuración global, plantillas oficiales, logs auditoría, exports globales. |
| **Director Técnico** | Grupo/Escuela | Visibilidad total atletas del grupo. Métricas agregadas comparativas entre teams. Cumplimiento por coach. Anuncios masivos al grupo. |
| **Coach** | Sus Teams | Gestiona sus teams. Planifica (drag & drop + generador + copiar semana). Ve **detalle** de sus atletas. Ve **lectura + métricas agregadas** de atletas de otros coaches en su mismo grupo. Feedback en sesiones. |
| **Atleta** | Sus Teams | Ve su grupo → sus teams/coaches → su calendario. Registra sesiones (distancia, tiempo, RPE, comentarios). Marca "No realizada" con motivo predefinido + campo libre. Edita registro 24-48h. Ve su historial y métricas personales. |

---

## Biblioteca de Plantillas de Sesiones

| Aspecto | Definición |
|---------|------------|
| **Propiedad** | Privadas por coach. En grupos/escuelas: coach puede **publicar/compartir** sus plantillas al grupo (visibles para otros coaches del grupo). |
| **Tipos base** | Series, Intervalos, Fondos, Tempo, Recuperación, Descanso + **creación libre** por coach (Test/Control, Fuerza, Cross-training, etc.). |
| **Estructura obligatoria** | 1. **Calentamiento/Puesta en marcha** 2. **Entrenamiento específico** (series, repeticiones, tiempos, FC, zonas, ritmos — lo que defina coach) 3. **Enfriamiento** + opcional: estiramientos, trabajo recuperación/musculación. Estructura base, pero **coach puede reorganizar/omitir/añadir** secciones. |
| **Versionado/Edición** | Coach edita plantilla actual. Puede **clonar** (propia o compartida en grupo) y adaptar para otro atleta. |
| **Plan semanal** | **Drag & drop** plantillas a días del calendario + **Generador** (ej. "semana tipo: 3F + 1S + 1T + 2D"). **Copiar semana anterior** (editable). **Multi-asignación** a varios atletas a la vez. Semana = unidad base, días sin asignar = "Descanso" o plantilla descanso explícita. |
| **Plantillas oficiales** | Precargadas por sistema, **clonables y editables** por coach. |

---

## Métricas y Dashboard

| Nivel | Métricas clave |
|-------|----------------|
| **Atleta (detalle)** | Cumplimiento %, Carga semanal (km, tiempo, TSS/TRIMP), Progresión 4-12 sem (gráfica), Distribución por tipo %, RPE medio vs plan, Rachas consecutivas, **VO2max est., FC umbral, Potencia, Umbrales, Zonas FC/Potencia** |
| **Team (resumen coach)** | % atletas por cumplimiento (>80/50-80/<50), Carga media, Alertas (sin registrar >X días, caída carga, RPE alto sostenido) |
| **Grupo/Escuela (Dir. Técnico)** | Comparativa teams (cumplimiento, carga, alertas), **Cumplimiento por coach** (no ranking) |
| **Técnico** | Actualización **tiempo real** (al guardar atleta). Export **PDF + Excel**. Historial: **temporada, año, periodo personalizado**. |

---

## Notificaciones

| Canal | Triggers | Frecuencia |
|-------|----------|------------|
| **In-app** (campanita) | Todos los eventos: nuevo plan, cambio sesión, feedback, completada, pregunta, recordatorio, bienvenida, cambios equipo/grupo, anuncios masivos | Tiempo real |
| **Email** | **Solo eventos críticos**: 1) Coach publica/carga plan → avisa atleta. 2) Atleta completa sesión → avisa coach. 3) Anuncios masivos Admin/Dir. Técnico | Inmediata o mismo día |
| **Preferencias** | In-app siempre activo. Email = medio de entrega de eventos (no configurable por usuario) | — |
| **Plantillas** | HTML responsive, editables por Admin | — |
| **Masivas** | Admin/Dir. Técnico → todo grupo/escuela | — |

---

## Avatar / Foto de Perfil
- **1 foto por usuario** (coach, atleta, admin) — avatar en header, lista atletas, perfil.
- Formatos: JPG, PNG, WebP. Máx. 2-3 MB original → redimensionar client-side a **256×256 px** (avatar) + opcional 512×512.
- Almacenamiento: **Cloudflare R2** (bucket privado + signed URLs). Subida client-side → presigned PUT → R2. Worker valida auth y genera URL firmada.
- Default: avatar generado con iniciales (canvas SVG) — sin dependencia externa.
- Strip EXIF al procesar (privacidad GPS).

---

## Calendario Mensual

| Vista | Funcionalidades |
|-------|-----------------|
| **Atleta** | Mes actual (día actual resaltado), nav mes ant/sig. Día: planificado + real (código color: verde=completado, amarillo=parcial, rojo=no hecho, gris=descanso). Click → detalle plan + formulario registro (distancia, tiempo, RPE, comentarios). Edición registro: ventana 24-48h. |
| **Coach** | Selector Team → Atleta. Drag & drop plantillas a días. **Multi-asignación** (varios atletas a la vez). Badge cumplimiento % por día. Click → ve real + deja feedback. **Copiar semana anterior** (editable). |
| **Dir. Técnico / Admin** | Solo lectura agregada: % cumplimiento por día/team. No edita. |
| **Estados sesión** | Planificada → En curso (hoy) → Completada / No realizada / Parcial. **"No realizada"**: motivos predefinidos (lesión, trabajo, enfermedad, personal, otro) + campo "otro" libre. |
| **Festivos** | Configuración manual por coach/team (no automático regional). **El calendario está orientado a festivos de Chile**, pero la planificación final depende de cada coach. |

---

## Funciones de Administrador

1. **Gestión de coaches**: Alta (datos, email, pwd temporal), edición, desactivar/activar (soft delete), eliminación definitiva, ver huérfanos, reset pwd, reenviar invitación.
2. **Gestión de grupos/escuelas**: CRUD grupos (nombre, descripción, logo), aprobar/rechazar solicitudes coaches, asignar/quitar rol **Director Técnico**, métricas agregadas por grupo.
3. **Gestión de atletas (global)**: Listado con filtros (coach, team, grupo, estado), trasladar atletas entre teams/coaches (con historial), atletas sin coach.
4. **Configuración global**: Plantillas oficiales (CRUD), parámetros email (SMTP, remitente, plantillas base), límites (máx teams/coach, máx atletas/team, almacenamiento avatares), motivos "no realizada" predefinidos, tipos de sesión base.
5. **Logs / Auditoría**: Acciones críticas (creación/eliminación usuarios, cambios grupo, asignaciones, exports) — quién, qué, cuándo, IP.
6. **Exportes globales**: Listados coaches/atletas/grupos (CSV/Excel), backup métricas globales.
7. **Mantenimiento**: Limpieza avatares huérfanos, reindexar métricas.

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Framework SSR** | **Next.js 16.3.x (App Router, React Server Components)** | SSR nativo, auth por cookies, RSC reduce JS cliente, compatible con Cloudflare Workers vía OpenNext. **No subir a 16.4.0**: ver "Restricciones de Cloudflare Workers" |
| **UI / Design System** | **Tabler** (`@tabler/core` + `@tabler/icons-react`) | `@tabler/core` (HTML/CSS Bootstrap 5-based) + wrappers React propios en `components/ui/` con clases Tabler. Iconos React oficiales. Responsive, dark/light, accesible. |
| **Estilos** | **`@tabler/core` CSS** | Un solo framework CSS (el de Tabler). Tailwind descartado: conflicta con Bootstrap base de Tabler. Personalización vía CSS custom properties / SCSS de Tabler. |
| **Base de Datos** | **MySQL** — dev local (XAMPP), prod PlanetScale u otro MySQL + Cloudflare Hyperdrive | Hyperdrive crea connection pooling global y cachea queries en edge. PlanetScale eliminó su free tier (abril 2024, desde $5/mes): desarrollo con MySQL local, producción se decide en Fase 43 (variable `DATABASE_URL`). |
| **ORM** | **Drizzle ORM** | Type-safe, ligero, funciona en edge (Cloudflare Workers), migraciones SQL nativas, mejor performance que Prisma en edge |
| **Autenticación** | **Lucia Auth** | Session-based, cookies HttpOnly/Secure, multi-runtime (Node/Edge), DB-agnostic, sin vendor lock-in. Simple y edge-ready. |
| **Validación** | **Zod** + **React Hook Form** | Esquemas compartidos server/client, type inference, integra con Drizzle |
| **Email Transaccional** | **Resend** (SDK edge-compatible) | DX excelente, React Email templates, 3k emails/mes gratis |
| **Almacenamiento Avatares** | **Cloudflare R2** (bucket privado + signed URLs) | S3-compatible, gratis hasta 10GB, edge caching, sin egress fees. Mejor que filesystem local en Cloudflare (ephemeral). |
| **Despliegue** | **Cloudflare Workers** (Next.js vía `@opennextjs/cloudflare`) | `@cloudflare/next-on-pages` está deprecado y no soporta Next 16; OpenNext despliega a Workers, no a Pages. Build automático, edge global, gratis generoso. Dominio `*.workers.dev` inicial. |
| **CI/CD** | **GitHub Actions** → Cloudflare Workers (`opennextjs-cloudflare deploy`) | Estándar, gratis para repos privados. |
| **Testing** | **Vitest** (unit/integration) + **Playwright** (e2e) | Vitest: rápido, compatible edge. Playwright: corre contra preview URLs. |
| **Observabilidad** | **Sentry** (errores) + **Cloudflare Web Analytics / Logpush** | Sentry: DSN gratis generoso. Logpush → R2/BigQuery para queries SQL. |
| **i18n** | **next-intl** (App Router) | Soporte RSC, routing por locale, mensajes en JSON/TS. Solo `es-CL` ahora, listo para futuro. |

---

## Restricciones Tecnológicas
- **SSR** (renderizado en servidor)
- **Autenticación por sesión** (cookies HttpOnly, Secure, SameSite)
- **Sin API pública** / Sin WebSockets / Sin tiempo real (excepto actualización métricas al guardar)
- Uso directo vía navegador (responsive)
- **Runtime Cloudflare Workers** con `nodejs_compat`. Ojo: `node:fs` existe pero **es efímero y no sirve para guardar nada** — los avatares van a R2 sí o sí.
- **Next.js en Cloudflare** vía `@opennextjs/cloudflare`. `proxy.ts` (el middleware) corre por el camino *experimental* de Node middleware: funciona, pero conviene revisar el log de OpenNext al compilar.
- **Base de datos** via Hyperdrive (connection pooler global + query cache, latencia ~1-5ms desde edge).
- **Archivos** en R2 (no filesystem local — efímero en Cloudflare).

### Restricciones de Cloudflare Workers (descubiertas en la Fase 43)

Estas tres solo se ven ejecutando la app dentro de `workerd`. `next dev` y
`npm run build` pasan sin avisar de ninguna. Antes de tocar el runtime, correr
`BASE_URL=http://127.0.0.1:8787 npx playwright test` con
`npm run preview` levantado en otra terminal.

1. **Next.js debe quedar en 16.3.x.** La 16.4.0 genera
   `.next/server/preview-props.json` y OpenNext 1.20.11 no lo sabe inlinear:
   *todas* las peticiones devuelven 500. El peer dependency del adaptador es
   `next >=16.3.8`.
2. **Prohibido generar código en tiempo de ejecución.** `workerd` responde
   `Code generation from strings disallowed for this context`. Por eso
   `lib/db/index.ts` conecta con `disableEval: true`, que hace que `mysql2` use
   su parser estático en vez de compilar uno con `new Function`. **Cualquier
   librería nueva que use `eval` o `new Function` rompe en producción.**
3. **Nada de I/O compartido entre peticiones.** Una conexión creada en la
   petición A no puede usarse en la B: `Cannot perform I/O on behalf of a
   different request`. Por eso el cliente de Drizzle se memoriza junto al
   contexto de Cloudflare (que OpenNext crea nuevo por petición) y se rehace
   cuando cambia. Ver `getDatabase()` en `lib/db/index.ts`.

---

## Consideraciones Clave
- Sistema cerrado de tres roles + Director Técnico con permisos diferenciados por jerarquía (Grupo → Team → Atleta)
- Flujo asíncrono: coach planifica → atleta ejecuta → coach revisa → feedback bidireccional
- Comunicación integrada: in-app (todos eventos) + email (solo críticos: plan publicado, sesión completada, anuncios)
- Planificación flexible: drag & drop + generador + copia semana + multi-asignación
- Métricas modernas running (TSS/TRIMP, VO2max est., zonas FC/potencia) + exports PDF/Excel
- Avatar simple (R2, client-side resize, sin cloud complejo)
- Calendario con estados claros y motivo "no realizada" estructurado
- Admin con control total + auditoría + mantenimiento
- **Orientado a Chile** (festivos, zona horaria, formato fecha/hora, moneda si aplica)
- Stack 100% compatible con **Cloudflare Edge** (Pages + Workers + Hyperdrive + R2 + D1 opcional futuro)

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
