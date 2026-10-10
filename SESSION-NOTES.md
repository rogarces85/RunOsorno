# Sesión — Resumen hasta Fase 13

## Estado actual
- **HEAD**: `4c698b9` (Fase 13 completada, commit local sobre `origin/main`)
- **Push a GitHub**: pendiente — sin credenciales configuradas en esta máquina (repo `rogarces85/RunOsorno`, remoto `origin/main` = `385d62d`)
- **Trabajo limpio**: `git status` → sin cambios pendientes · lint + build ✅ · leftovers 0

## Fases completadas (1–13)
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
| 13 | 4c698b9 | **Biblioteca de plantillas** (ver abajo) |

## Fase 13 — Biblioteca de plantillas (27 tareas ✅)
- **Constantes**: `SECTION_TYPES` + `SECTION_TYPE_LABELS` (7 tipos) en `lib/config/constants.ts`
- **Validación** (`template.schemas.ts`): `sectionSchema` (id/order opcionales, title ≤100, type enum, content 1–2000), `templateSchema` (name, sessionType ≤50 libre, `structure.min(1)`), `cloneTemplateSchema`, `shareTemplateSchema`, `templateIdSchema`
- **Servicio** (`template.service.ts`):
  - `createTemplate` / `updateTemplate` (solo propia, no oficial) / `deleteTemplate` (bloquea si hay `session_assignments`)
  - `cloneTemplate` (visible → copia propia con ids nuevos), `shareTemplate` (solo propia + miembro del grupo), `unshareTemplate`
  - `getTemplatesByCoach` (propias + oficiales + compartidas de mis grupos → `ownership: own|official|group` con flags canEdit/canClone/canShare/canDelete)
  - `getTemplateById`, `getTemplateVisibility(template, user)` (admin: solo lectura; canView/canEdit/canClone/canShare/canDelete)
  - `parseStructure` defensivo (JSON string u objeto), estructura normalizada (uuid + order = índice), auditoría en cada operación
- **Group service**: `getMyGroups(userId)` (nuevo) para el diálogo de compartir
- **Acciones** (`template.actions.ts`): create/update/delete/clone/share/unshare, `role: "coach"`
- **UI** (`components/templates/`): `TemplateList` (tabs Mías/Oficiales/Grupo con contadores + avisos), `TemplateCard`, `SectionEditor` (título/tipo/contenido, mover ↑↓, eliminar), `TemplateEditor` (RHF + useFieldArray, 3 secciones por defecto, datalist de tipos: base + libres, validación cliente), `CloneDialog`, `ShareDialog`, `CloneButton`
- **Páginas**: `/coach/templates` (listado), `/coach/templates/new` (creación), `/coach/templates/[id]` (editor si `canEdit`; si no: vista solo lectura + botón clonar; `notFound()` si no `canView`)
- **Verificación**: 49 checks de servicio (`npx tsx scratch-*.ts`) + 14 E2E Playwright (login → validación vacía → crear → editar → tabs → eliminar) = **63/63 OK**
- **Lint/Build**: ✅ · **Leftovers**: 0
- **Notas**: playwright reinstaló browsers a build 1248 (`npx playwright install chromium`); sin Chrome/Edge en la máquina — usar chromium headless

## Próximos pasos
**Fase 14 — Plantillas oficiales** (7 tareas en `tasks/mvp.md`):
1. Seed de plantillas oficiales precargadas (CRUD admin en `lib/services/template.service.ts` ya separa `isOfficial`)
2. Admin: CRUD plantillas oficiales (configuración global)
3. Coaches: clonar/editar copias (ya funciona desde Fase 13)

Luego **Fase 15 — Planificación semanal** (drag & drop + generador + copiar semana + multi-asignación).

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

### Notas técnicas clave
- MySQL local XAMPP: `C:\xampp\mysql\bin\mysql.exe -u root runosorno`
- `RESEND_API_KEY` vacío → emails en dev log (`[email:dev]`)
- Verificación por fase: script `npx tsx scratch-*.ts` (servicios) + Playwright E2E (chromium)
- Scripts scratch se eliminan al cerrar la fase (leftovers: 0)
- Commits en español sin acentos; push pendiente de credenciales
