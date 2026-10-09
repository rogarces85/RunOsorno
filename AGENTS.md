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
| **Framework SSR** | **Next.js 14+ (App Router, React Server Components)** | SSR nativo, auth por cookies, RSC reduce JS cliente, compatible con Cloudflare Pages (@cloudflare/next-on-pages / OpenNext) |
| **UI / Design System** | **Tabler** (`@tabler/core` + `@tabler/icons-react`) | `@tabler/core` (HTML/CSS Bootstrap 5-based) + wrappers React propios en `components/ui/` con clases Tabler. Iconos React oficiales. Responsive, dark/light, accesible. |
| **Estilos** | **`@tabler/core` CSS** | Un solo framework CSS (el de Tabler). Tailwind descartado: conflicta con Bootstrap base de Tabler. Personalización vía CSS custom properties / SCSS de Tabler. |
| **Base de Datos** | **MySQL** — dev local (XAMPP), prod PlanetScale u otro MySQL + Cloudflare Hyperdrive | Hyperdrive crea connection pooling global y cachea queries en edge. PlanetScale eliminó su free tier (abril 2024, desde $5/mes): desarrollo con MySQL local, producción se decide en Fase 43 (variable `DATABASE_URL`). |
| **ORM** | **Drizzle ORM** | Type-safe, ligero, funciona en edge (Cloudflare Workers), migraciones SQL nativas, mejor performance que Prisma en edge |
| **Autenticación** | **Lucia Auth** | Session-based, cookies HttpOnly/Secure, multi-runtime (Node/Edge), DB-agnostic, sin vendor lock-in. Simple y edge-ready. |
| **Validación** | **Zod** + **React Hook Form** | Esquemas compartidos server/client, type inference, integra con Drizzle |
| **Email Transaccional** | **Resend** (SDK edge-compatible) | DX excelente, React Email templates, 3k emails/mes gratis |
| **Almacenamiento Avatares** | **Cloudflare R2** (bucket privado + signed URLs) | S3-compatible, gratis hasta 10GB, edge caching, sin egress fees. Mejor que filesystem local en Cloudflare (ephemeral). |
| **Despliegue** | **Cloudflare Pages** (Next.js via @cloudflare/next-on-pages u OpenNext) | Build automático, preview deployments, edge global, gratis generoso. Dominio `*.pages.dev` inicial. |
| **CI/CD** | **GitHub Actions** → Cloudflare Pages (wrangler pages deploy) | Estándar, gratis para repos privados. |
| **Testing** | **Vitest** (unit/integration) + **Playwright** (e2e) | Vitest: rápido, compatible edge. Playwright: corre contra preview URLs. |
| **Observabilidad** | **Sentry** (errores) + **Cloudflare Web Analytics / Logpush** | Sentry: DSN gratis generoso. Logpush → R2/BigQuery para queries SQL. |
| **i18n** | **next-intl** (App Router) | Soporte RSC, routing por locale, mensajes en JSON/TS. Solo `es-CL` ahora, listo para futuro. |

---

## Restricciones Tecnológicas
- **SSR** (renderizado en servidor)
- **Autenticación por sesión** (cookies HttpOnly, Secure, SameSite)
- **Sin API pública** / Sin WebSockets / Sin tiempo real (excepto actualización métricas al guardar)
- Uso directo vía navegador (responsive)
- **Runtime Edge (Cloudflare Workers)** — no Node.js completo. APIs como `fs`, `crypto` (algunas), `net` no existen.
- **Next.js en Cloudflare** via @cloudflare/next-on-pages (estable) u OpenNext (beta). Algunas features (ISR, Image Optimization, Middleware) requieren configuración específica.
- **Base de datos** via Hyperdrive (connection pooler global + query cache, latencia ~1-5ms desde edge).
- **Archivos** en R2 (no filesystem local — efímero en Cloudflare).

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