# Sesión — Resumen hasta Fase 24

## Estado actual
- **HEAD**: `effac37` (Fase 24 completada)
- **Push a GitHub**: sí realizado — `main` sincronizado con `origin/main` (https://github.com/rogarces85/RunOsorno, Fases 1–24 subidas; credenciales disponibles en este equipo)
- **Trabajo limpio**: `git status` — sin cambios pendientes · lint + build ✓ · leftovers 0

## Fases completadas (1–24)
| Fase | Commit | Descripción |
|------|--------|-------------|
| 1 | 31a023a | Base Next.js + Tabler + Drizzle + Lucia |
| 2 | dfdd5df | Docs (`AGENTS.md`, `specs/mvp.md`, `plan/mvp.md`, `tasks/mvp.md`) |
| 3 | 300779b | DB schema + seed (usuarios, grupos, teams, plantillas, métricas fixture) |
| 4 | 31d9273 | Lucia auth (login/logout, cookies, middleware, roles) |
| 5 | 47dd005 | Permisos (`requireRole`, `can`) |
| 6 | a6a0147 | Patrón `runAction` + `ActionResult`/`ServiceResult` |
| 7 | 0528605 | Admin coaches (CRUD, invites, pwd reset, auditoría) |
| 8 | d1d4296 | Email (Resend + React Email, plantillas, dev log) |
| 9 | 5e372e6 | Admin grupos (CRUD, aprobaciones, métricas, Director Técnico) |
| 10 | 768eb34 | Coach ↔ grupo (grupos disponibles, solicitud unión) |
| 11 | 4b45502 | Teams coach (CRUD, asignar/quitar atletas con límite, UI) |
| 12 | b145a12 | Gestión de atletas (schemas, servicios, UI, páginas) |
| 13 | 4c698b9 | Biblioteca de plantillas (schemas, CRUD/clonar/compartir, editor, tabs) |
| 14 | ef095b8 | Plantillas oficiales (seed 5 oficiales, CRUD admin, `/admin/templates`) |
| 15 | 0dc02cc | **Planificación semanal** (ver abajo) |
| 16 | 24bc5eb | **Calendario base** (ver abajo) |
| 17 | 89387e6 | **Calendario vista atleta** (ver abajo) |
| 18 | 7bedfb7 | **Calendario vista coach + feedback** (ver abajo) |
| 19 | c048073 | **Drag & drop y herramientas de planificación** (ver abajo) |
| 20 | 7961db3 | **Registro de sesiones** (ver abajo) |
| 21 | 13d966a | **Formulario de registro (UI)** (ver abajo) |
| 22 | — | **Feedback en sesiones** (22.9/22.10 cerradas en Fase 23) |
| 23 | 9168502 | **Notificaciones in-app** (ver abajo) |
| 24 | effac37 | **Notificaciones email** (ver abajo) |

## Fase 13 — Biblioteca de plantillas (27 tareas ✅)
- **Validación** (`template.schemas.ts`): `sectionSchema`, `templateSchema` (`structure.min(1)`, sessionType ≤50 libre), `cloneTemplateSchema`, `shareTemplateSchema`, `templateIdSchema` · `SECTION_TYPES`/labels en `constants.ts`
- **Servicio**: `create/update/delete` (solo propia, no oficial; delete bloquea con `session_assignments`), `cloneTemplate`, `share/unshare` (solo miembro del grupo), `getTemplatesByCoach` (own/official/group + flags), `getTemplateById`, `getTemplateVisibility` (admin solo lectura), `parseStructure` defensivo, auditoría por operación · `group.service.getMyGroups(userId)`
- **UI**: `TemplateList` (tabs Mías/Oficiales/Grupo), `TemplateCard`, `SectionEditor` (↑↓/eliminar), `TemplateEditor` (RHF + useFieldArray, 3 secciones default, datalist), `CloneDialog`, `ShareDialog`, `CloneButton`
- **Páginas**: `/coach/templates`, `/new`, `/[id]` (editor si `canEdit`, si no solo lectura + clonar; `notFound()` sin visibilidad)
- **Verificación**: 49 checks servicio + 14 E2E Playwright = 63/63 OK

## Fase 14 — Plantillas oficiales (7 tareas ✅)
- **Seed** (`db/seed.ts`): 5 oficiales idempotentes (`isOfficial=true`, `coachId=null`): Series 6×400m, Intervalos 5×1000m, Fondo largo, Tempo 20 min, Recuperación activa — cada una con 3 secciones (calentamiento/main/enfriamiento); re-ejecutar no duplica (check por nombre+oficial)
- **Servicio** (`template.service.ts`):
  - `getOfficialTemplates()` → lista admin (`structure` parseada + `sectionCount`), solo `is_official=true`
  - `createOfficialTemplate(input, adminId)` / `updateOfficialTemplate(id, input, adminId)` (exige `isOfficial`) / `deleteOfficialTemplate(id, adminId)` (exige `isOfficial` + bloquea si hay `session_assignments`)
  - Auditoría: `official_template_created/updated/deleted`
- **Acciones** (`template.actions.ts`): `createOfficialTemplateAction`, `updateOfficialTemplateAction`, `deleteOfficialTemplateAction` — `role: "admin"` (mismo `templateSchema` que coach)
- **UI**:
  - `app/(app)/admin/templates/page.tsx` (`instant=false`, `requireRole("admin")`)
  - `components/admin/OfficialTemplatesList.tsx` (tabla: nombre/tipo/secciones/fecha + editar/eliminar con ConfirmDialog + avisos)
  - `components/admin/OfficialTemplateForm.tsx` (modal `modal-lg` con RHF + useFieldArray + `SectionEditor` reutilizado; datalist de tipos; reset en `open` vía `useEffect` — patrón ya probado con lint)
  - `TemplateEditor.tsx`: exporta ahora `FREE_SESSION_TYPES` y `defaultSections()` (reutilizados por el form admin)
- **Verificación**: 31 checks de servicio (`scratch-phase14.ts`: seed idempotente, CRUD, rechazos no-oficial/bloqueo por asignaciones, auditoría, coach ve/clona) + 8 E2E Playwright (admin: crear/editar/eliminar por UI; coach: tab Oficiales + botón clonar) = **39/39 OK**
- **Lint/Build**: ✅ (`/admin/templates` registrada) · **Leftovers**: 0
- **Notas**: seed usa `TemplateSection["type"]` validado; `npm run db:seed` seguro de re-ejecutar

## Fase 15 — Planificación semanal (18 tareas ✅)
- **Schemas** (`plan.schemas.ts`): `assignSessionSchema` (athleteId/templateId/date + `replace` opcional), `bulkAssignSchema` (`min(1)` → "Selecciona al menos un atleta."), `assignmentIdSchema`, `copyWeekSchema`, `generateWeekSchema` (pattern `[{type, count}]`, count 1–7, ≤7 entradas)
- **Servicio** (`plan.service.ts`):
  - `assignSession` → día libre crea `status='planned'`; día ocupado retorna `{needsConfirm: true, assignmentId}`
  - `assignSessionReplace` → borra asignación previa + `session_records` + `session_feedback` (FK) y crea la nueva
  - `bulkAssign` → valida `canPlanFor` de todos antes de crear; días ocupados se omiten (created/skipped)
  - `removeAssignment(assignmentId, coachId)` → cascada record+feedback+asignación + auditoría (firma extra `coachId` por seguridad — el task decía solo `assignmentId`)
  - `copyPreviousWeek` → copia `weekStart-7d` al destino (status `planned`, salta días ocupados); error exacto "No hay semana anterior para copiar"
  - `generateWeek` → resuelve `type` por templateId visible o `sessionType` (case-insensitive) entre plantillas del coach; distribuye slots en días libres Lunes→Domingo; errores: tipo inexistente / patrón >7 / pocos días libres
  - `getWeekPlan` / `getMonthPlan` (leftJoin templates + `parseStructure`), `countWeekAssignments`; helpers ISO (weekStart lunes por aritmética UTC)
  - Permisos: `canPlanFor` de `lib/permissions` en todas las mutaciones; plantilla debe ser visible (`getTemplateVisibility`)
  - Auditoría: `bulk_assign`, `assignment_removed`, `week_copied`, `week_generated`
- **Acciones** (`plan.actions.ts`): `assignSessionAction` (usa `replace` → `assignSessionReplace`), `bulkAssignAction`, `removeAssignmentAction`, `copyPreviousWeekAction`, `generateWeekAction` — `role: "coach"`
- **Verificación**: **26/26 checks de servicio** (`scratch-phase15.ts`: 15.11–15.18 + lecturas 15.8/15.9 + cascadas + redondeo de fechas) — sin E2E (UI drag & drop llega en Fase 19)
- **Lint/Build**: ✅ · **Leftovers**: 0
- **⚠️ Trampa de fechas (CRÍTICO para fases 16-21)**: columnas `date` de Drizzle/MySQL **leen** como `Date` (UTC midnight) pero **`eq/gte/lte` con params `Date` no matchean** (mysql2 serializa param con hora → `DATE = '2026-10-06 12:00:00'` = false). **Regla**: en WHERE usar `sql\`${col} = ${isoStr}\`` con string "YYYY-MM-DD" (probado OK); en INSERT usar `Date` local-noon (`new Date(y, m-1, d, 12)`) — round-trip correcto. Leer vía `.toISOString().slice(0,10)`.
- **Cuentas prueba**: `p15.*@test.local` creadas y eliminadas por el script (cleanup al inicio y al final)

## Fase 16 — Calendario base (8 tareas ✅)
- **`components/calendar/dayState.ts`**: tipo `CalendarDayState` (`completed/partial/not_done/planned/in_progress/rest`), `DAY_STATE_META` (label + clase color: bg-success/warning/danger/primary/info/secondary), `resolveDayState(item, dateISO, todayISO)` — estado por `status` del item; `planned` hoy → `in_progress` (cyan); sin item → `rest` (gris)
- **`CalendarDay.tsx`** (Client): celda `<button>` con `data-date`/`data-state`, número, badge punto de color, etiqueta de tipo de sesión (`formatSessionType`), clases `is-today`/`is-selected`, `aria-current="date"`
- **`MonthCalendar.tsx`** (Client): props `items: PlanItem[]`, `selectedDate?`, `onDayClick(dateISO, item)`; nav prev/next (`useState` view año/mes, iconos IconChevron*), header `[data-testid="calendar-month-label"]` (Intl es-CL mayúscula), grid Lun–Dom (offset `(getDay()+6)%7`), celdas vacías al inicio/fin, `today` = `toISODate(new Date())` local
- **`SessionDetailPanel.tsx`** (Client): modal (patrón `.modal-blur.fade.show.d-block`) controlado por `open/dateISO/item/onClose`; muestra fecha (`formatDateChile`), badge estado, plantilla + secciones (`SECTION_TYPE_LABELS`), o texto "Descanso — sin sesión planificada."
- **CSS** (`app/globals.css`): `.calendar-weekdays/.calendar-grid` (grid 7 cols), `.calendar-day` (borde, hover, `is-today` ring primario, `is-selected` color-mix), badge punto 0.65rem, etiqueta sesión con ellipsis
- **Verificación**: **25/25 checks E2E Playwright** (página scratch temporal con fixtures de cada estado → 16.5 mes/días, 16.6 nav prev/next con cálculo de días, 16.7 `is-today` único + data-date, 16.8 los 6 colores + badge, 16.4 panel abre/fecha/plantilla/secciones/cierra/descanso) — scratch borrado
- **Lint/Build**: ✅ · **Leftovers**: 0
- **Notas**: login E2E debe esperar `waitForURL("**/admin/dashboard")` (la página de login también tiene `.card` → condición de carrera)

## Fase 17 — Calendario vista Atleta (6 tareas ✅)
- **Página** `app/(app)/athlete/calendar/page.tsx` (RSC, `instant=false`, `requireRole("athlete")`): lee `?month=YYYY-MM` (regex, fallback mes actual) → `getMonthPlan(user.id, year, month)`
- **Host** `components/athlete/AthleteCalendar.tsx` (Client): estado `selected {dateISO, item}`, `MonthCalendar` **controlado** (`month` + `onMonthChange` → `router.replace(/athlete/calendar?month=...)`, limpia selección), `SessionDetailPanel` controlado
- **`MonthCalendar`**: ahora acepta props opcionales `month?: string` ("YYYY-MM") y `onMonthChange?` — sin ellos sigue autogestionado (scratch/otros usos). `parseMonth` valida formato
- **`PlanItem` + registro** (`plan.service.ts`): nuevo tipo `PlanRecord` (`distanceKm/durationMinutes/rpe/comments/notDoneReason/customReason`), `PlanItem.record: PlanRecord | null`; `planSelect` agrega columnas de `session_records` con `leftJoin` en `getWeekPlan`/`getMonthPlan`; `toPlanItem` mapea
- **`SessionDetailPanel`**: nueva sección `[data-testid="session-detail-record"]` — motivo "No realizada: {reason}" si `notDoneReason`; si no: Distancia (`formatDistance` es-CL "10,5 km"), Tiempo (`formatDuration` "1 h 2 min"), RPE ("7/10"), Comentarios
- **🐛 Bug encontrado y corregido**: `templates.structure` (columna `json` de Drizzle) llega como **string** desde mysql2 → `structure.map is not a function` tumaba el panel; corregido con `parseStructure()` (template.service) en `toPlanItem` — **afectaba también a `getWeekPlan`**
- **Verificación**: **26/26 checks E2E** (`scratch-p17.ts`, datos propios `p17-*` con cleanup try/finally): 17.4 mes+días+4 colores de estado, 17.6 rest gris + panel descanso, 17.5 panel planificada (plantilla+secciones, sin registro) / completada (distancia/tiempo/RPE/comentarios) / no realizada (motivo), nav `?month=` next+prev con `waitForFunction` — **scratch borrado**
- **Lint/Build**: ✅ · **Leftovers**: 0
- **Notas**:
  - E2E atleta: `p14.ath@test.local` / `Test1234!` — **`athlete.test@runosorno.cl` NO existe** (seed solo crea admin; las cuentas `*.test@runosorno.cl` de "Cuentas seed" no están en la DB; quedan leftovers `p13.*`/`p14.*`)
  - Fixture `planned` debe evitar el día de hoy (hoy → estado `in_progress` cyan); script usó `PLANNED_DAY = hoy==10 ? 11 : 10`
  - INSERT de fixtures: `sessionDate` con `Date` local-noon (regla Drizzle/MySQL)

## Fase 18 — Calendario vista Coach + Feedback (8 tareas ✅ + 8 de Fase 22)
- **Selector** `app/(app)/coach/calendar/page.tsx` (RSC): sin `?team=` → cards de teams (`getTeamsByCoach`) con link `?team=ID`; con `?team=` → valida propiedad + cards de atletas (`getTeamAthletes`) con link a `/coach/calendar/[teamId]/[athleteId]`
- **Detalle** `app/(app)/coach/calendar/[teamId]/[athleteId]/page.tsx` (RSC): `canManageTeam` + `canPlanFor` + miembro del team (si no → `notFound()`); `Promise.all([getMonthPlan, getTeamMonthCompliance, getTemplatesByCoach, getMonthFeedback])`; lee `?month=`
- **`CoachCalendar.tsx`** (Client): `MonthCalendar mode="coach"` + compliance + panel con `messages` + `extra` = `AssignTemplateForm`; nav mes → `router.replace(/coach/calendar/[teamId]/[athleteId]?month=...)`
- **`AssignTemplateForm`** (18.3): select de plantillas visibles + "Asignar" → `assignSessionAction`; `needsConfirm` → alerta inline "¿Reemplazar la plantilla existente?" (`[data-testid="assign-confirm"]`) → `replace:true`; éxito → `router.refresh()` + cierra panel
- **Cumplimiento diario** (18.4): `getTeamMonthCompliance(teamId, year, month)` en `plan.service` — join `team_members` + `session_assignments` en el mes → `Record<dateISO, {done,total}>`; **`done` = status `completed` estricto** (parcial NO cuenta — coherente con `calcCompliance` fase 25); badge en `CalendarDay` `[data-testid="day-compliance"]` `data-pct`, color ≥80 verde / ≥50 amarillo / <50 rojo
- **`MonthCalendar`**: props `mode?: "athlete"|"coach"` (atributo `data-mode` en card) + `compliance?: Record<...>`
- **Feedback (22.1–22.8 adelantado)**:
  - `lib/validations/session.schemas.ts`: `feedbackSchema` (assignmentId, message trim 1–2000)
  - `lib/services/feedback.service.ts`: `addFeedback` (permiso: atleta dueño ∨ coach `canPlanFor` ∨ admin; error "No puedes comentar en esta sesión"), `getFeedback(assignmentId)`, `getMonthFeedback(athleteId, year, month)` → `Record<assignmentId, FeedbackMessage[]>`
  - `lib/actions/feedback.actions.ts`: `addFeedbackAction` (sin `role` — permiso en servicio)
  - `FeedbackThread` (autor + badge rol + fecha) + `FeedbackForm` (textarea + Enviar → `router.refresh()`) integrados en `SessionDetailPanel` (ambos roles vía prop `messages`)
- **Verificación**: **32/32 checks E2E** (`scratch-p18.ts`, fixtures `p18-*` + cleanup por atletas de prueba): 18.1 selector team→atleta, 18.3 modo coach/asignar/confirmar reemplazo (verificación con reintentos por `router.refresh`), 18.7 badges 100/50/0/100 + colores, 18.8 registro real, 18.5+22.5–22.7 feedback form/thread, 22.8 atleta ve feedback del coach (2do contexto Playwright)
- **Lint/Build**: ✅ · **Leftovers**: 0
- **Notas**:
  - **Limpieza de fixtures**: los assigns creados por UI tienen id aleatorio — `LIKE 'p18-%'` NO los limpia (fuga entre corridas → día ocupado → `needsConfirm` inesperado). Limpiar por `athleteId` de las cuentas de prueba
  - La UI creada por fase 18 (asignar plantillas) no era parte de la fase 19 drag&drop — fase 19 añadirá DnD + WeekGenerator + copiar semana + multi-asignación sobre este mismo calendario
  - **Fase 22 pendiente**: 22.9 (feedback → notificación no leída) y 22.10 (verificar comentario del atleta)

## Fase 19 — Drag & drop y herramientas de planificación (15 tareas ✅)
- **Dep**: `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` (19.1)
- **`DndContext` en `CoachCalendar`** (envuelve sidebar + calendario; `PointerSensor` con `activationConstraint {distance:6}`, `closestCorners`); `MonthCalendar mode="coach"` envuelve cada día en **`DroppableDay`** (`useDroppable({id: dateISO})` + clase `.is-over`) — vista atleta queda sin contexto ni droppables (19.2/19.4)
- **`TemplateSidebar`** (19.3): lista de plantillas visibles con `useDraggable({id: templateId})` + icono grip; `DragOverlay` muestra chip con el nombre durante el arrastre
- **Drop → `assignSessionAction`** (19.4): `onDragEnd` valida `over.id` como fecha ISO; `needsConfirm` → **`ConfirmDialog`** "¿Reemplazar la plantilla existente?" → `replace:true` (19.5); éxito → `router.refresh()`; errores → alerta `[data-testid="coach-error"]`
- **`WeekGenerator`** (19.6/19.7): modal con select de semanas del mes visible + inputs numéricos por `sessionType` único de las plantillas + resumen "Total: N · Descanso: M" → `generateWeekAction`; errores del servicio (patrón >7 días, sin días libres, tipo sin plantilla) en `[data-testid="wg-error"]`
- **"Copiar semana anterior"** (19.8): botón en toolbar → `ConfirmDialog` (mensaje con fecha de la semana actual via `formatDateChile(getWeekStart())`) → `copyPreviousWeekAction` (copia semana-7 → semana actual, respeta días ocupados); error "No hay semana anterior para copiar"
- **`MultiAssignDialog`** (19.9): fecha + plantilla + checkboxes de atletas (nueva prop `athletes` en `CoachCalendar`, desde `getTeamAthletes` en la página) → `bulkAssignAction`
- **Toolbar** `.calendar-toolbar`: "Generar semana" / "Copiar semana anterior" / "Multi-asignar"
- **CSS nuevo**: `.calendar-cell`/`.calendar-droppable` (flex, día al 100%), `.calendar-droppable.is-over` resaltado, `.calendar-toolbar`, `.drag-overlay-chip`
- **Verificación**: **29/29 checks E2E** (`scratch-p19.ts`, fixtures `p19-*` con UUIDs + cleanup por `email LIKE 'p19.%'`): 19.10 drag (overlay activo → día planned → panel con nombre), 19.5/19.11 confirmar/cancelar/reemplazar (retry por `router.refresh`), 19.6/19.7/19.12 generador (3 sesiones = 2 series + 1 tempo en DB, resto descanso), 19.8/19.13 copia (UI + DB 2 destinos), 19.9/19.14 multi (UI + DB ambos atletas con plantilla elegida), 19.15 atleta sin `assign-form`/`template-sidebar`/`[data-droppable]`/toolbar
- **Lint/Build**: ✅ · **Leftovers**: 0
- **Notas**:
  - **`z.uuid` exige UUIDs reales**: fixtures con ids tipo `p19-atha` → la action falla "Datos inválidos"; además el panel queda en "Descanso" (sin `<h4>`) y bloquea los checks siguientes — usar `randomUUID()` + cleanup por `email LIKE 'p19.%'`
  - **Fechas al leer de DB**: `toISOString().slice(0,10)` (las columnas `date` leen como UTC midnight); `toISO` local da día-1 en Chile
  - **FKs al limpiar usuarios**: `audit_logs`, `notifications` y `session_feedback` referencian `users.id` (NO ACTION) → borrarlos antes que `users`
  - **Localizadores Playwright**: el texto "Copiar semana anterior" existe en el botón Y en el título del diálogo → usar `.modal.show h5:has-text(...)` (strict mode)
  - DnD con Playwright: `mouse.down` → move +40px (supera `distance:6`) → move al día → `mouse.up`; `scrollIntoViewIfNeeded` antes de medir bboxes

## Fase 20 — Registro de sesiones (16 tareas ✅)
- **Esquemas** `lib/validations/session.schemas.ts`:
  - `recordSessionSchema`: assignmentId uuid, distanceKm opcional (0.01–1000), durationMinutes opcional (1–1440), rpe opcional (1–10), comments opcional (≤2000), `status: z.enum(["completed","partial"])` + `superRefine`: completed exige distance **y** duration → "La distancia y el tiempo son requeridos"; partial exige ≥1 dato
  - `notDoneSchema`: assignmentId uuid, `reason: z.enum(DEFAULT_NOT_DONE_REASONS)` (lesion/trabajo/enfermedad/personal/otro), customReason opcional + `superRefine`: reason='otro' sin customReason → **"Describe el motivo"**
- **`lib/services/session.service.ts`**:
  - `assertEditable(assignmentId, athleteId)` interno: sesión existe ("Sesión no encontrada") → dueño ("No puedes registrar esta sesión") → fecha no futura (**"No puedes registrar sesiones de días futuros"**) → si hay registro, ventana `edit_window_hours` vía `getNumberSetting` default 48h (**"La ventana de edición ha expirado"**)
  - `canEditRecord(assignmentId, userId)` (20.3) — `permissions.canEditRecord(user, assignmentId)` ahora **delega** aquí (solo retorna false si role≠athlete); única fuente de verdad
  - `recordSession(data, athleteId)` (20.4): upsert `session_records` (edita si existe, limpia `notDoneReason`), setea `session_assignments.status` = 'completed' | 'partial', audit `session_recorded` con datos
  - `markNotDone(data, athleteId)` (20.5): upsert con motivo (customReason solo si 'otro'), null distance/duration/rpe, status 'not_done', audit `session_recorded`
  - `getRecord(assignmentId)` (20.6) → fila | null
- **Actions** `lib/actions/session.actions.ts` (20.7): `recordSessionAction` / `markNotDoneAction` con `role: "athlete"`; errores de servicio vía `ActionFailure` (los fallos de esquema salen como "Datos inválidos" — patrón `runAction` de todo el proyecto)
- **Verificación**: **19/19 checks de servicio/esquema** (`scratch-p20.ts`, fixtures `p20-*` UUID + cleanup FK records→feedback→assignments→users): 20.9 (completed + día verde + getRecord + audit), 20.10 (partial amarillo), 20.11 (not_done rojo + motivo), re-registro limpia motivo, 20.12 ("Describe el motivo"), 20.13 (RPE 0/11 fallan, 10 ok), 20.14 (futuro + canEditRecord false), 20.15 (49h backdate → expirado), 20.16 (sin datos → mensaje exacto), permisos (dueña ok / otro atleta / no autorizado) — sin E2E UI (el formulario llega en Fase 21)
- **Lint/Build**: ✅ · **Leftovers**: 0
- **Notas**:
  - **Orden de cleanup FK**: `session_records` y `session_feedback` referencian `session_assignments` → borrarlos ANTES que assignments (además de audit/notifications/users ya anotados en Fase 19)
  - Colores de día verificados importando `resolveDayState` directamente en el script (mismo código que usa la UI)

## Fase 21 — Formulario de registro (UI) — `13d966a` (290/578)
- **`components/calendar/SessionForm.tsx`** (21.1-21.3, 21.5-21.6): RHF **sin resolver dinámico** — modo toggle con `useState` (`completed`/`partial`/`not_done`, `data-testid="session-mode-*"`) + `safeParse` manual de `recordSessionSchema`/`notDoneSchema` + `setError` mapeando paths (`distanceKm→distance`, `durationMinutes→duration`, `customReason→customReason`, resto→`root`). Motivos: select `NOT_DONE_REASON_LABELS`; texto libre solo si 'otro'. Éxito: `session-form-success` "Sesión registrada correctamente". Guardar → acción → `router.refresh()`
  - **Bug encontrado y corregido en E2E**: el select de motivo NO está registrado en RHF (controlado por estado local `reason`) — `onSubmit` usaba `values.reason` (siempre el default 'lesion') y la validación 'otro' nunca veía el valor seleccionado → usar el estado local `reason` en el `safeParse`
  - **Read-only** (`session-form-readonly`): fecha > hoy → "No puedes registrar sesiones de días futuros"; registro con `recordedAt + edit_window_hours (48)` vencido → "La ventana de edición ha expirado". El reloj (`BOOT_AT`/`TODAY_ISO`) vive a **ámbito de módulo** porque `react-hooks/purity` prohíbe `Date.now()`/`new Date()` en render (el servidor sigue siendo la fuente de verdad al enviar)
- **`SessionDetailPanel.tsx`**: nueva prop `recordForm?: ReactNode` (21.4) — el formulario se inyecta bajo el detalle/registro/extra
- **`AthleteCalendar.tsx`**: pasa `<SessionForm key={item.id}>` cuando hay item seleccionado (21.4). **`CoachCalendar.tsx`**: mismo refactor — estado solo `selectedDate` + item **derivado** de `items` (props frescas tras `router.refresh()`, sin efectos que disparen el lint `set-state-in-effect`)
- **`plan.service.ts`**: `PlanRecord.recordedAt: string` + `planSelect.recordRecordedAt` + mapeo en `toPlanItem` (para el check de ventana de edición en el cliente)
- **Verificación**: **27/27 E2E** (`scratch-p21.ts` + página scratch `/scratch-p21`, borrados; fixtures `p21.%` UUID + cleanup FK): 21.2 (3 modos), 21.4 (form en panel atleta), 21.5 (futuro + ventana 49h backdate → read-only), 21.6 (mensaje éxito), 21.7 (marcador JS global sobrevive al guardar = sin reload + URL estable), 21.8 (campos requeridos + 'otro' requieren texto, sin navegar), 21.9 (Server Action real rechaza: registro inválido, not_done inválido, futuro, ventana expirada — 4 mensajes exactos), 21.10 (día completed/parcial/not_done tras guardar sin reload) + DB assertions (status, motivo 'otro' + texto, valores del record, futuro sigue 'planned')
- **Lint/Build**: ✓. **Leftovers**: 0 (scratch-p21.ts, scratch-probe.ts, página scratch, .dev-e2e.log, .next)
- **Notas E2E nuevas**:
  - **Días fixtures deben ser PASADOS** para los flujos de registro — offsets +2/+3 caen en futuro → read-only y el form no aparece (timeout confuso)
  - **React bail-out con mismo estado**: dos respuestas de acción con JSON idéntico + `clearResult` (mutación manual del DOM) → `setResult` con string igual → sin re-render → DOM queda vacío → **prefijo único por handler** en la página scratch (`valid:`/`invalid:`/`notdone:`)
  - **NUNCA usar `Set-Content`/`-replace` de PS5.1 sobre .ts UTF-8** (reafirmado): mojibake + BOM → reescribir con tool `write`
  - select de motivo controlado por estado local ≠ RHF: leer ese estado en `onSubmit`, no `values.*`

## Fase 23 — Notificaciones in-app — `9168502` (309/578)
- **Servicio** (`notification.service.ts`): `notify()` original intacto · `getUnreadCount(userId)`, `getNotifications(userId,{unreadOnly,limit})`, `markAsRead(id,userId)→boolean` (ownership), `markAllAsRead(userId)` · `notifySessionRecorded({assignmentId,athleteId,kind})` (join templates+users; mensajes completed/partial/not_done; salta si `!createdBy || createdBy===athleteId`) · `notifyFeedbackCreated({assignmentId,authorId})` (notifica a todas las partes menos el autor) · helper `formatSessionDay` (slice(0,10)+`T12:00:00` para evitar desfase Santiago/UTC)
- **Actions/schemas**: `markAsReadAction` (ActionFailure "Notificación no encontrada"), `markAllAsReadAction` (`z.object({})`); `markAsReadSchema`/`markAllAsReadSchema`
- **Integraciones**: `recordSession`/`markNotDone` → `notifySessionRecorded` solo en **primer guardado** (`!editable.data.recordId`, no ediciones) · `addFeedback` → `notifyFeedbackCreated` (= 22.9+23.8) · `assignAthlete` (team) → `athlete_assigned` · `createAthlete` → `welcome` · `approveRequest`/`rejectRequest` ya notificaban (23.9)
- **UI**: `NotificationBell.tsx` (client; bell `notification-bell`, badge `notification-badge` "99+", dropdown React-state — **sin JS de Tabler** — items `notification-item` click→markAsRead+push+refresh, `mark-all-read`, "Ver todas"→`/notifications`, click-outside `mousedown`) · `AppHeader` (async server: `requireAuth` + `Promise.all(unreadCount, notifications limit 8)` → href vía `notificationHref(item, role)`) · `NotificationCenter.tsx` (filtros pills `filter-all`/`filter-unread`, lista, vacío) · `app/(app)/notifications/page.tsx` (`instant=false`, `?filter=unread`, limit 100) · `lib/utils/notification.ts` (`notificationHref`: session_assignment→atleta `/athlete/calendar`/coach `/coach/calendar`, group→admin/coach, team→coach, default `dashboardPath`)
- **Verificación**: **33/33 E2E** (`scratch-p23.ts`, borrado; fixtures `p23.%` + cleanup FK notifications→feedback→records→assignments→team_members→group_requests→group_members→audit_logs→sessions→athlete_profiles→templates→teams→users→groups): 23.1–23.4 (count/mark own-true/foreign-false/markAll→0), 23.6–23.10 (completed/not_done/feedback bidireccional/athlete_assigned/join_request_approved/welcome), 22.9+23.8, 22.10+23.8, 23.12–23.17 UI (bell visible, badge=count, dropdown lista, click item badge−1 y navega, mark-all badge gone, page list/empty, filter unread active) + coach badge/count/navegación/marca leída + leftovers 0
- **Lint/Build**: ✓ (`/notifications` dinámica). **Leftovers**: 0
- **Notas E2E nuevas**:
  - **Dropdown sin Popper de Bootstrap**: posición explícita `position:absolute; top:100%; right:0` en el estilo del menú (si no, queda fuera del viewport)
  - **Tabler `.dropdown-header` tiene `pointer-events:none`** → el botón "Marcar todas" dentro hereda `none` y Playwright reporta "dropdown intercepts pointer events" → añadir clase **`pe-auto`** al header
  - **Click en notificación navega a la entidad** (no al dashboard actual) → el paso de abrir un día del calendario debe ir tras `goto('/athlete/calendar')`, no asumir la URL actual
  - **Race markAsRead vs check DB**: esperar a que el badge baje (`waitForFunction`) antes de leer `getUnreadCount` — el `waitForURL("**/coach/**")` pasa de inmediato si ya estás en una página /coach/*
  - tsx no valida tipos: `recordSession` exige `status` explícito en el fixture; y **`process.exit()` al final del main** (el pool de MySQL mantiene el event loop vivo y el script cuelga tras el último log)

## Fase 24 — Notificaciones email (eventos críticos) — `effac37` (317/578)
- **`notifyPlanPublished({athleteId, coachId})`** (`notification.service.ts`): query atleta(name,email)+coach(name) → in-app `plan_published` (entityType `calendar` → href `/athlete/calendar` para atleta) + `renderPlanPublishedEmail` → `sendEmail` (try/catch, nunca bloquea). Integrado en **24.1**: `plan.service.assignSession` (solo create, no replace), `bulkAssign` (1 por atleta creado, array `notified`), `generateWeek` (si slots>0), `copyPreviousWeek` (si copied>0) → **un email por atleta por evento de planificación** (sin spam por sesión)
- **24.2 session-completed**: `notifySessionRecorded` acepta `record?{distanceKm,durationMinutes}`; si `kind==="completed"` consulta email/name del coach (`createdBy`) y envía `renderSessionCompletedEmail` (subject `"{atleta} completó una sesión"`). `recordSession` pasa los valores del input (tipado `number|string|null` → `String()` antes del template; `partial`/`not_done` NO generan email)
- **24.3 sendAnnouncement**: schema `sendAnnouncementSchema` (groupId uuid, title ≤150, message ≤2000) en `group.schemas.ts`; `group.service.sendAnnouncement(input, actorId)` → findGroup, `getGroupMembers` filtrando **`isActive`** (nuevo campo en select/`GroupMemberItem`), vacío → error exacto **"El grupo no tiene miembros"**, por miembro: `notify(type "announcement", entityType group)` + `renderAnnouncementEmail` → `sendEmail` (try/catch por miembro, cuenta `emailed`), `logAudit("announcement_sent")`; action `sendAnnouncementAction` (`group.actions.ts`, sin role fijo → chequea **`isDirector(user, groupId)`** = admin o Director Técnico del grupo → "No tienes permiso para anunciar en este grupo")
- **24.4**: `createCoach` ya enviaba invitación (Fase 8) — verificado y marcado
- **`notificationHref`**: nuevo case `calendar` → atleta `/athlete/calendar`, resto dashboard
- **Verificación**: **26/26** (`scratch-p24.ts`, borrado; servicio puro sin Playwright — la UI de anuncios es Fase 32): 24.5a–d (email+in-app plan en assign/bulk/generate/copy con conteos acumulados), 24.6a/b (completed→email coach + in-app; partial→NO email), 24.4 (email invitación), 24.7a (grupo vacío msg exacto), 24.7b (notified=2/emailed=2 + 2 in-app + auditoría), 24.8 (sendEmail nunca lanza + acciones ok), leftovers 0. **Captura de emails**: monkey-patch de `console.log` filtrando `[email:dev]` (dev sin RESEND_API_KEY loguea `to=` y `subject=`)
- **Lint/Build**: ✓ (re-verificado tras fix de tipos `distanceKm number→String()`). **Leftovers**: 0
- **Notas nuevas**:
  - `distanceKm` del schema es `number` pero `SessionCompletedEmailProps.distanceKm` es `string|null` → convertir con `String()` en el service, no cambiar el template
  - Sin acción "publishPlan" en el dominio: el evento implícito es **asignar/generar/copiar** plan; 1 email/atleta/evento
  - `getGroupMembers` ahora retorna `isActive` (aditivo; el filtro activo es solo en sendAnnouncement)
  - `tsx` no valida tipos: el error TS2322 solo aparece en `npm run build` → **siempre build tras cambios de tipos**

## Próximos pasos
**Fase 25 — Exportes PDF/Excel** (métricas de atleta/coach con exports; ver `tasks/mvp.md`).

Luego: 26. Dashboard atleta, 27. Dashboard coach, 28. Dashboard Dir. Técnico/Admin, 32. UI anuncios, etc.

## Para continuar en otro PC
```bash
git clone https://github.com/rogarces85/RunOsorno.git
cd RunOsorno
npm install
# Configurar .env.local (DATABASE_URL, LUCIA_SECRET, etc.)
npm run dev
```

### Cuentas seed
- `admin@runosorno.cl` / `Admin1234!` (Admin) — **única cuenta que crea `db/seed.ts`**
- `p14.ath@test.local` / `Test1234!` (Atleta de prueba Fase 14 — leftovers de DB, útil para E2E atleta)
- `p14.svc@test.local` / `Test1234!` (Coach de prueba Fase 14)
- `p13.ui@test.local` / `Test1234!` (Coach UI E2E Fase 13)
- ⚠️ `coach.test@runosorno.cl`, `athlete.test@runosorno.cl`, `director.test@runosorno.cl` **no existen** en la DB actual

### Notas técnicas clave
- MySQL local XAMPP: `C:\xampp\mysql\bin\mysql.exe -u root runosorno`
- `RESEND_API_KEY` vacío → emails en dev log (`[email:dev]`)
- Verificación por fase: script `npx tsx scratch-*.ts` (servicios) + Playwright E2E (chromium)
- Scripts scratch se eliminan al cerrar la fase (leftovers: 0)
- Commits en español sin acentos; push a `origin/main` cuando haya commits nuevos
- **Fechas en Drizzle**: WHERE con columnas `date` → SIEMPRE `sql` + string ISO (nunca params `Date`); INSERT con `Date` local-noon
