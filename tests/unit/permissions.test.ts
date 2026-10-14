/**
 * Pruebas de `lib/permissions/index.ts` (Fase 41, tarea 41.13).
 *
 * Las funciones puras de rol se prueban directamente; las que consultan la base
 * (grupos, equipos, atletas) usan el doble de `db`: se prepara qué filas
 * devuelve cada tabla y se comprueba la decisión que toma la función.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ tables: {} as Record<string, unknown[]> }));
const writes = vi.hoisted(() => ({
  inserted: {} as Record<string, unknown[]>,
  updated: {} as Record<string, unknown[]>,
  deleted: [] as string[],
}));

vi.mock("@/lib/db", async () => {
  const { createFakeDb } = await import("../helpers/fakeDb");
  return { db: createFakeDb(store.tables, writes) };
});

vi.mock("@/lib/services/session.service", () => ({
  canEditRecord: vi.fn(async () => true),
}));

const permissions = await import("@/lib/permissions");
const { canAccessRoute, canPerformAction } = permissions;
const { canEditRecord: serviceCanEditRecord } =
  await import("@/lib/services/session.service");

const admin = { id: "admin-1", role: "admin" } as const;
const coach = { id: "coach-1", role: "coach" } as const;
const otroCoach = { id: "coach-2", role: "coach" } as const;
const atleta = { id: "atleta-1", role: "athlete" } as const;

beforeEach(() => {
  for (const key of Object.keys(store.tables)) {
    delete store.tables[key];
  }
  vi.mocked(serviceCanEditRecord).mockReset();
  vi.mocked(serviceCanEditRecord).mockResolvedValue(true);
});

describe("roles simples", () => {
  it("reconoce cada rol", () => {
    expect(permissions.isAdmin(admin)).toBe(true);
    expect(permissions.isAdmin(coach)).toBe(false);
    expect(permissions.isCoach(coach)).toBe(true);
    expect(permissions.isCoach(atleta)).toBe(false);
    expect(permissions.isAthlete(atleta)).toBe(true);
    expect(permissions.isAthlete(admin)).toBe(false);
  });
});

describe("isDirector (5.2)", () => {
  it("el admin es director de cualquier grupo", async () => {
    expect(await permissions.isDirector(admin, "grupo-1")).toBe(true);
  });

  it("un atleta nunca es director", async () => {
    expect(await permissions.isDirector(atleta, "grupo-1")).toBe(false);
  });

  it("el coach solo si su membresía tiene is_director", async () => {
    store.tables.groupMembers = [];
    expect(await permissions.isDirector(coach, "grupo-1")).toBe(false);

    store.tables.groupMembers = [
      { groupId: "grupo-1", userId: "coach-1", isDirector: true },
    ];
    expect(await permissions.isDirector(coach, "grupo-1")).toBe(true);
  });
});

describe("isGroupMember", () => {
  it("el admin pertenece a cualquier grupo y el resto solo si hay fila", async () => {
    expect(await permissions.isGroupMember(admin, "grupo-1")).toBe(true);

    store.tables.groupMembers = [];
    expect(await permissions.isGroupMember(coach, "grupo-1")).toBe(false);

    store.tables.groupMembers = [
      { groupId: "grupo-1", userId: "coach-1", isDirector: false },
    ];
    expect(await permissions.isGroupMember(coach, "grupo-1")).toBe(true);
  });
});

describe("canManageTeam (5.3)", () => {
  it("solo el coach dueño del team", async () => {
    store.tables.teams = [{ id: "team-1", coachId: "coach-1" }];
    expect(await permissions.canManageTeam(coach, "team-1")).toBe(true);
    expect(await permissions.canManageTeam(otroCoach, "team-1")).toBe(false);
  });

  it("ni el admin ni el atleta gestionan teams", async () => {
    store.tables.teams = [{ id: "team-1", coachId: "coach-1" }];
    expect(await permissions.canManageTeam(admin, "team-1")).toBe(false);
    expect(await permissions.canManageTeam(atleta, "team-1")).toBe(false);
  });

  it("un team inexistente no se puede gestionar", async () => {
    store.tables.teams = [];
    expect(await permissions.canManageTeam(coach, "team-1")).toBe(false);
  });
});

describe("canPlanFor (5.4)", () => {
  it("el coach planifica para los atletas de sus teams", async () => {
    store.tables.teamMembers = [{ teamId: "team-1", athleteId: "atleta-1" }];
    expect(await permissions.canPlanFor(coach, "atleta-1")).toBe(true);
  });

  it("no planifica para atletas ajenos", async () => {
    store.tables.teamMembers = [];
    expect(await permissions.canPlanFor(coach, "atleta-1")).toBe(false);
  });

  it("ni admin ni atleta planifican", async () => {
    store.tables.teamMembers = [{ teamId: "team-1", athleteId: "atleta-1" }];
    expect(await permissions.canPlanFor(admin, "atleta-1")).toBe(false);
    expect(await permissions.canPlanFor(atleta, "atleta-1")).toBe(false);
  });
});

describe("canViewAthlete (5.5)", () => {
  it("el admin ve cualquier atleta", async () => {
    expect(await permissions.canViewAthlete(admin, "atleta-9")).toBe(true);
  });

  it("el atleta solo se ve a sí mismo", async () => {
    expect(await permissions.canViewAthlete(atleta, "atleta-1")).toBe(true);
    expect(await permissions.canViewAthlete(atleta, "atleta-2")).toBe(false);
  });

  it("el coach ve al atleta de su team sin ser director", async () => {
    store.tables.teamMembers = [{ teamId: "team-1", athleteId: "atleta-1" }];
    expect(await permissions.canViewAthlete(coach, "atleta-1")).toBe(true);
  });

  it("el coach sin relación no ve al atleta", async () => {
    store.tables.teamMembers = [];
    store.tables.groupMembers = [];
    expect(await permissions.canViewAthlete(coach, "atleta-1")).toBe(false);
  });

  it("el director ve atletas de coaches de su grupo", async () => {
    // `canViewAthlete` pregunta dos veces por `team_members`: la primera para
    // descartar que sea su propio atleta, la segunda (con joins) por si el
    // atleta es de un coach de su grupo. La cola devuelve una respuesta distinta
    // para cada consulta.
    store.tables.teamMembers = [
      [],
      [{ teamId: "team-1", athleteId: "atleta-1" }],
    ];
    store.tables.groupMembers = [
      { groupId: "grupo-1", userId: "coach-1", isDirector: true },
    ];
    expect(await permissions.canViewAthlete(coach, "atleta-1")).toBe(true);
  });
});

describe("canEditRecord (5.6)", () => {
  it("delega en el servicio solo para atletas", async () => {
    vi.mocked(serviceCanEditRecord).mockResolvedValue(false);

    expect(await permissions.canEditRecord(atleta, "asg-1")).toBe(false);
    expect(serviceCanEditRecord).toHaveBeenCalledWith("asg-1", "atleta-1");

    await permissions.canEditRecord(coach, "asg-1");
    await permissions.canEditRecord(admin, "asg-1");
    expect(serviceCanEditRecord).toHaveBeenCalledTimes(1);
  });
});

describe("canAccessRoute / canPerformAction (roles.ts)", () => {
  it("cada rol entra solo a su prefijo de rutas", () => {
    expect(canAccessRoute("admin", "/admin")).toBe(true);
    expect(canAccessRoute("admin", "/admin/coaches")).toBe(true);
    expect(canAccessRoute("admin", "/coach/dashboard")).toBe(false);

    expect(canAccessRoute("coach", "/coach/teams")).toBe(true);
    expect(canAccessRoute("coach", "/director/dashboard")).toBe(true);
    expect(canAccessRoute("coach", "/admin")).toBe(false);

    expect(canAccessRoute("athlete", "/athlete/calendar")).toBe(true);
    expect(canAccessRoute("athlete", "/athlete")).toBe(true);
    expect(canAccessRoute("athlete", "/athletex")).toBe(false);
    expect(canAccessRoute("athlete", "/coach")).toBe(false);
  });

  it("cada rol tiene sus acciones propias", () => {
    expect(canPerformAction("admin", "manage:users")).toBe(true);
    expect(canPerformAction("admin", "record:own_sessions")).toBe(false);

    expect(canPerformAction("coach", "plan:own_athletes")).toBe(true);
    expect(canPerformAction("coach", "manage:settings")).toBe(false);

    expect(canPerformAction("athlete", "record:own_sessions")).toBe(true);
    expect(canPerformAction("athlete", "manage:groups")).toBe(false);
  });
});
