# Sesión — Resumen hasta Fase 14

## Estado actual
- **HEAD**: `ef095b8` (Fase 14 completada, commit local sobre `origin/main`)
- **Push a GitHub**: pendiente — sin credenciales configuradas en esta máquina (repo `rogarces85/RunOsorno`, remoto `origin/main` = `385d62d`)
- **Trabajo limpio**: `git status` → sin cambios pendientes · lint + build ✅ · leftovers 0

## Fases completadas (1–14)
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
| 14 | ef095b8 | **Plantillas oficiales (Admin)** (ver abajo) |

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

## Próximos pasos
**Fase 15 — Planificación semanal** (18 tareas en `tasks/mvp.md`): drag & drop plantillas a días, generador ("semana tipo"), copiar semana anterior, multi-asignación a varios atletas.

Luego **Fase 16 — Calendario base**.

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
- Commits en español sin acentos; push pendiente de credenciales
