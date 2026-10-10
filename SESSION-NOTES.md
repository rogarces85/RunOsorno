# Sesión — Resumen hasta Fase 16

## Estado actual
- **HEAD**: `24bc5eb` (Fase 16 completada)
- **Push a GitHub**: ✓ realizado — `main` sincronizado con `origin/main` (https://github.com/rogarces85/RunOsorno, Fases 1–15 subidas; credenciales disponibles en este equipo)
- **Trabajo limpio**: `git status` → sin cambios pendientes · lint + build ✅ · leftovers 0

## Fases completadas (1–16)
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

## Próximos pasos
**Fase 17 — Calendario vista Atleta** (6 tareas en `tasks/mvp.md`).

Luego: 18. Calendario coach, 19. Drag & drop (UI de la Fase 15).

## Para continuar en otro PC
```bash
git clone https://github.com/rogarces85/RunOsorno.git
cd RunOsorno
npm install
# Configurar .env.local (DATABASE_URL, LUCIA_SECRET, etc.)
npm run dev
```

### Cuentas seed
- `admin@runosorno.cl` / `Admin1234!` (Admin)
- `coach.test@runosorno.cl` / `Admin1234!` (Coach Test)
- `athlete.test@runosorno.cl` / `Admin1234!` (Atleta Test)
- `director.test@runosorno.cl` / `Admin1234!` (Director Test)
- `p13.ui@test.local` / `Test1234!` (coach de prueba E2E Fase 13)
- `p14.svc@test.local` / `Test1234!` (coach de prueba Fase 14)
- `p14.ath@test.local` / `Test1234!` (atleta de prueba Fase 14)

### Notas técnicas clave
- MySQL local XAMPP: `C:\xampp\mysql\bin\mysql.exe -u root runosorno`
- `RESEND_API_KEY` vacío → emails en dev log (`[email:dev]`)
- Verificación por fase: script `npx tsx scratch-*.ts` (servicios) + Playwright E2E (chromium)
- Scripts scratch se eliminan al cerrar la fase (leftovers: 0)
- Commits en español sin acentos; push a `origin/main` cuando haya commits nuevos
- **Fechas en Drizzle**: WHERE con columnas `date` → SIEMPRE `sql` + string ISO (nunca params `Date`); INSERT con `Date` local-noon
