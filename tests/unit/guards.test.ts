/**
 * Pruebas de `lib/auth/guards.ts` (Fase 41, tarea 41.12).
 *
 * Los guards son la frontera de autorización de todas las páginas y Server
 * Actions, así que lo que se comprueba es exactamente qué hace cada uno: qué
 * devuelve cuando la sesión es válida, a dónde manda cuando no lo es y a qué
 * dashboard manda a un usuario del rol equivocado.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({
  sessionId: null as string | null,
  valid: { session: null, user: null } as {
    session: { id: string; fresh: boolean } | null;
    user: { id: string; role: string } | null;
  },
  redirect: null as { path: string } | null,
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionId: vi.fn(async () => sesion.sessionId),
}));

vi.mock("@/lib/auth/index", () => ({
  lucia: { validateSession: vi.fn(async () => sesion.valid) },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    // `redirect` de Next nunca retorna: lanza. Se reproduce para que el test
    // pueda distinguir "mandó a /login" de "siguió y devolvió el usuario".
    throw Object.assign(new Error(`NEXT_REDIRECT:${path}`), {
      digest: `NEXT_REDIRECT:${path}`,
    });
  }),
}));

const { requireAuth, requireRole } = await import("@/lib/auth/guards");

function usuarioVálido(role: string) {
  sesion.sessionId = "sesion-1";
  sesion.valid = {
    session: { id: "sesion-1", fresh: false },
    user: { id: "u-1", role },
  };
}

beforeEach(() => {
  sesion.sessionId = null;
  sesion.valid = { session: null, user: null };
});

describe("requireAuth", () => {
  it("devuelve sesión y usuario cuando la cookie es válida", async () => {
    usuarioVálido("coach");
    const result = await requireAuth();
    expect(result.user).toEqual({ id: "u-1", role: "coach" });
    expect(result.session).toEqual({ id: "sesion-1", fresh: false });
  });

  it("manda a /login sin sesión", async () => {
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("manda a /login?expired=1 cuando la sesión ya no valida", async () => {
    sesion.sessionId = "sesion-caducada";
    sesion.valid = { session: null, user: null };
    await expect(requireAuth()).rejects.toThrow(
      "NEXT_REDIRECT:/login?expired=1",
    );
  });
});

describe("requireRole", () => {
  it("deja pasar al rol que coincide", async () => {
    usuarioVálido("admin");
    const result = await requireRole("admin");
    expect(result.user.role).toBe("admin");
  });

  it("devuelve al dashboard propio cuando el rol no coincide", async () => {
    usuarioVálido("athlete");
    await expect(requireRole("admin")).rejects.toThrow(
      "NEXT_REDIRECT:/athlete/dashboard",
    );
  });

  it("un coach no entra como admin", async () => {
    usuarioVálido("coach");
    await expect(requireRole("admin")).rejects.toThrow(
      "NEXT_REDIRECT:/coach/dashboard",
    );
  });

  it("sin sesión manda a /login antes que comprobar el rol", async () => {
    await expect(requireRole("admin")).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
