/**
 * Pruebas de `session.service.canEditRecord` (Fase 41, tarea 41.10).
 *
 * La función decide si un atleta puede registrar o editar su sesión y con qué
 * mensaje, así que es una de las validaciones que el usuario ve en pantalla: los
 * cuatro casos de la tarea (dentro de ventana, fuera de ventana, fecha futura y
 * usuario incorrecto) tienen que distinguishable.
 *
 * Se usa el doble de `db` y un doble de `settings.service` para no depender de
 * MySQL ni del valor real de `edit_window_hours`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ tables: {} as Record<string, unknown[]> }));
const settings = vi.hoisted(() => ({
  editWindowHours: 48,
  reasons: [
    { id: "lesion", label: "Lesión" },
    { id: "trabajo", label: "Trabajo" },
    { id: "otro", label: "Otro" },
  ],
}));
const writes = vi.hoisted(() => ({
  inserted: {} as Record<string, unknown[]>,
  updated: {} as Record<string, unknown[]>,
  deleted: [] as string[],
}));
const avisos = vi.hoisted(() => ({ registrados: 0 }));
const auditoria = vi.hoisted(() => ({ registradas: 0 }));

vi.mock("@/lib/db", async () => {
  const { createFakeDb } = await import("../helpers/fakeDb");
  return { db: createFakeDb(store.tables, writes) };
});

vi.mock("@/lib/services/settings.service", () => ({
  getNumberSetting: vi.fn(async () => settings.editWindowHours),
  getNotDoneReasons: vi.fn(async () => settings.reasons),
}));

vi.mock("@/lib/services/notification.service", () => ({
  notifySessionRecorded: vi.fn(async () => {
    avisos.registrados += 1;
  }),
}));

vi.mock("@/lib/services/audit.service", () => ({
  logAudit: vi.fn(async () => {
    auditoria.registradas += 1;
  }),
}));

const { canEditRecord, recordSession, markNotDone } =
  await import("@/lib/services/session.service");

const HOY = new Date().toISOString().slice(0, 10);
const ATLETA = "atleta-1";
const OTRO = "atleta-9";

function asignacion(extra: Record<string, unknown> = {}) {
  return {
    id: "asg-1",
    athleteId: ATLETA,
    // Sesión de ayer: se puede registrar.
    sessionDate: new Date(`${HOY}T12:00:00Z`),
    ...extra,
  };
}

function registro(haceHoras: number) {
  return {
    id: "rec-1",
    assignmentId: "asg-1",
    recordedAt: new Date(Date.now() - haceHoras * 60 * 60 * 1000),
  };
}

beforeEach(() => {
  for (const key of Object.keys(store.tables)) {
    delete store.tables[key];
  }
  for (const bucket of [writes.inserted, writes.updated]) {
    for (const key of Object.keys(bucket)) {
      delete bucket[key];
    }
  }
  writes.deleted.length = 0;
  avisos.registrados = 0;
  auditoria.registradas = 0;
  settings.editWindowHours = 48;
});

describe("canEditRecord (41.10)", () => {
  it("permite registrar una sesión propia y pasada", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [];
    expect(await canEditRecord("asg-1", ATLETA)).toBe(true);
  });

  it("rechaza la sesión de otro usuario", async () => {
    store.tables.sessionAssignments = [asignacion({ athleteId: OTRO })];
    store.tables.sessionRecords = [];
    expect(await canEditRecord("asg-1", ATLETA)).toBe(false);
  });

  it("rechaza una fecha futura", async () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    store.tables.sessionAssignments = [asignacion({ sessionDate: manana })];
    store.tables.sessionRecords = [];
    expect(await canEditRecord("asg-1", ATLETA)).toBe(false);
  });

  it("rechaza cuando la ventana de edición ya expiró", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [registro(72)]; // hace 3 días
    expect(await canEditRecord("asg-1", ATLETA)).toBe(false);
  });

  it("acepta editar dentro de la ventana", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [registro(10)]; // hace 10 horas
    expect(await canEditRecord("asg-1", ATLETA)).toBe(true);
  });

  it("respeta la ventana configurada, no una fija", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [registro(10)];

    settings.editWindowHours = 48;
    expect(await canEditRecord("asg-1", ATLETA)).toBe(true);

    settings.editWindowHours = 2; // la misma sesión ya quedó fuera
    expect(await canEditRecord("asg-1", ATLETA)).toBe(false);
  });

  it("rechaza una asignación inexistente", async () => {
    store.tables.sessionAssignments = [];
    expect(await canEditRecord("no-existe", ATLETA)).toBe(false);
  });
});

describe("mensajes al registrar (40.8 / 40.9)", () => {
  it("explica que la ventana expiró", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [registro(72)];
    const result = await recordSession(
      {
        assignmentId: "asg-1",
        distanceKm: 10,
        durationMinutes: 60,
        status: "completed",
      },
      ATLETA,
    );
    expect(result).toEqual({
      ok: false,
      error: "La ventana de edición ha expirado",
    });
  });

  it("explica que la sesión es futura", async () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    store.tables.sessionAssignments = [asignacion({ sessionDate: manana })];
    store.tables.sessionRecords = [];
    const result = await recordSession(
      {
        assignmentId: "asg-1",
        distanceKm: 10,
        durationMinutes: 60,
        status: "completed",
      },
      ATLETA,
    );
    expect(result).toEqual({
      ok: false,
      error: "No puedes registrar sesiones de días futuros",
    });
  });

  it("rechaza que otro atleta registre la sesión", async () => {
    store.tables.sessionAssignments = [asignacion({ athleteId: OTRO })];
    store.tables.sessionRecords = [];
    const result = await markNotDone(
      { assignmentId: "asg-1", reason: "lesion" },
      ATLETA,
    );
    expect(result).toEqual({
      ok: false,
      error: "No puedes registrar esta sesión",
    });
  });

  it("avisa cuando la sesión no existe", async () => {
    store.tables.sessionAssignments = [];
    const result = await markNotDone(
      { assignmentId: "no-existe", reason: "lesion" },
      ATLETA,
    );
    expect(result).toEqual({ ok: false, error: "Sesión no encontrada" });
  });

  it("rechaza un motivo que no está en la configuración", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [];
    const result = await markNotDone(
      { assignmentId: "asg-1", reason: "inventado" },
      ATLETA,
    );
    expect(result).toEqual({
      ok: false,
      error: "El motivo seleccionado no es válido",
    });
  });
});

describe("camino feliz: qué se escribe al guardar", () => {
  it("registra la sesión, actualiza el estado, avisa y audita", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [];

    const result = await recordSession(
      {
        assignmentId: "asg-1",
        distanceKm: 12.5,
        durationMinutes: 70,
        rpe: 7,
        status: "completed",
      },
      ATLETA,
    );

    expect(result.ok).toBe(true);
    // El registro se inserta en `session_records` con el estado del atleta.
    expect(writes.inserted.sessionRecords?.[0]).toMatchObject({
      assignmentId: "asg-1",
      distanceKm: "12.5",
      durationMinutes: 70,
      rpe: 7,
    });
    // Y la asignación pasa a `completed`.
    expect(writes.updated.sessionAssignments?.[0]).toEqual({
      status: "completed",
    });
    // Solo avisa al coach la primera vez: al editar no se repite el aviso.
    expect(avisos.registrados).toBe(1);
    expect(auditoria.registradas).toBe(1);
  });

  it("al editar no inserta otra fila ni vuelve a avisar", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [registro(2)];

    const result = await recordSession(
      {
        assignmentId: "asg-1",
        distanceKm: 11,
        durationMinutes: 65,
        status: "partial",
      },
      ATLETA,
    );

    expect(result.ok).toBe(true);
    expect(writes.inserted.sessionRecords).toBeUndefined();
    expect(writes.updated.sessionRecords?.[0]).toMatchObject({
      distanceKm: "11",
      durationMinutes: 65,
    });
    expect(avisos.registrados).toBe(0);
  });

  it("guarda el motivo de no realizada con su descripción", async () => {
    store.tables.sessionAssignments = [asignacion()];
    store.tables.sessionRecords = [];

    const { markNotDone } = await import("@/lib/services/session.service");
    const result = await markNotDone(
      { assignmentId: "asg-1", reason: "otro", customReason: "Viaje" },
      ATLETA,
    );

    expect(result.ok).toBe(true);
    expect(writes.inserted.sessionRecords?.[0]).toMatchObject({
      notDoneReason: "otro",
      customReason: "Viaje",
    });
    expect(writes.updated.sessionAssignments?.[0]).toEqual({
      status: "not_done",
    });
  });
});
