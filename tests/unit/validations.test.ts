/**
 * Pruebas de los esquemas Zod (Fase 41, tarea 41.11).
 *
 * Estos esquemas son la primera línea de validación: lo que rechazan aquí
 * determina qué ve el usuario marcado bajo cada campo, así que se comprueban
 * tanto los casos válidos como los mensajes exactos de los inválidos (los
 * reutiliza el formulario y son parte de la interfaz).
 */

import { describe, expect, it } from "vitest";
import { createCoachSchema } from "@/lib/validations/user.schemas";
import {
  changePasswordSchema,
  loginSchema,
} from "@/lib/validations/auth.schemas";
import {
  createTeamSchema,
  teamTargetSchema,
} from "@/lib/validations/team.schemas";
import {
  assignSessionSchema,
  bulkAssignSchema,
  generateWeekSchema,
} from "@/lib/validations/plan.schemas";
import { templateSchema } from "@/lib/validations/template.schemas";
import {
  notDoneSchema,
  recordSessionSchema,
} from "@/lib/validations/session.schemas";
import { createAthleteSchema } from "@/lib/validations/athlete.schemas";
import { createGroupSchema } from "@/lib/validations/group.schemas";

const UUID = "3f1a5d7c-1f1a-4a1a-9a1a-1a1a1a1a1a1a";
const UUID2 = "4f1a5d7c-1f1a-4a1a-9a1a-1a1a1a1a1a1a";

/** Primer mensaje de error, que es el que se muestra bajo el campo. */
function primerMensaje(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  return result.success ? null : (result.error?.issues[0]?.message ?? "");
}

describe("createCoachSchema", () => {
  it("acepta nombre y email válidos", () => {
    const result = createCoachSchema.safeParse({
      name: "Coach Demo",
      email: "Coach.Demo@RunOsorno.CL",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // El email se normaliza a minúsculas: es la clave única de `users`.
      expect(result.data.email).toBe("coach.demo@runosorno.cl");
    }
  });

  it("rechaza nombre corto y email inválido", () => {
    expect(
      primerMensaje(
        createCoachSchema.safeParse({ name: "A", email: "no-es-email" }),
      ),
    ).toBe("Ingresa el nombre (mínimo 2 caracteres)");

    expect(
      primerMensaje(
        createCoachSchema.safeParse({ name: "Coach Demo", email: "x" }),
      ),
    ).toBe("Email inválido");
  });
});

describe("loginSchema", () => {
  it("exige email y contraseña", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.cl", password: "x" }).success,
    ).toBe(true);
    expect(
      primerMensaje(loginSchema.safeParse({ email: "", password: "x" })),
    ).toBe("Ingresa tu email");
    expect(
      primerMensaje(loginSchema.safeParse({ email: "a@b.cl", password: "" })),
    ).toBe("Ingresa tu contraseña");
  });
});

describe("changePasswordSchema", () => {
  const base = {
    currentPassword: "Vieja1234!",
    newPassword: "Nueva1234!",
    confirmPassword: "Nueva1234!",
  };

  it("acepta el cambio completo", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });

  it("exige que coincidan y que la nueva sea distinta", () => {
    expect(
      primerMensaje(
        changePasswordSchema.safeParse({
          ...base,
          confirmPassword: "Otra1234!",
        }),
      ),
    ).toBe("Las contraseñas no coinciden");

    expect(
      primerMensaje(
        changePasswordSchema.safeParse({
          ...base,
          newPassword: "Vieja1234!",
          confirmPassword: "Vieja1234!",
        }),
      ),
    ).toBe("La nueva contraseña debe ser distinta de la actual");
  });

  it("exige un mínimo de 8 caracteres", () => {
    expect(
      primerMensaje(
        changePasswordSchema.safeParse({
          ...base,
          newPassword: "Corta1!",
          confirmPassword: "Corta1!",
        }),
      ),
    ).toBe("La contraseña debe tener al menos 8 caracteres");
  });
});

describe("recordSessionSchema (40.10 / 40.16)", () => {
  const base = {
    assignmentId: UUID,
    distanceKm: 10,
    durationMinutes: 60,
    status: "completed" as const,
  };

  it("acepta una sesión completada con distancia y tiempo", () => {
    expect(recordSessionSchema.safeParse(base).success).toBe(true);
  });

  it("exige distancia y tiempo para marcarla como completada", () => {
    expect(
      primerMensaje(
        recordSessionSchema.safeParse({
          assignmentId: UUID,
          status: "completed",
        }),
      ),
    ).toBe("La distancia y el tiempo son requeridos");
  });

  it("exige algún dato en una sesión parcial", () => {
    expect(
      primerMensaje(
        recordSessionSchema.safeParse({
          assignmentId: UUID,
          status: "partial",
        }),
      ),
    ).toBe("Indica al menos un dato del entrenamiento");
  });

  it("limita el RPE a 1-10", () => {
    expect(
      primerMensaje(recordSessionSchema.safeParse({ ...base, rpe: 11 })),
    ).toBe("El RPE debe estar entre 1 y 10");
    expect(
      primerMensaje(recordSessionSchema.safeParse({ ...base, rpe: 0 })),
    ).toBe("El RPE debe estar entre 1 y 10");
    expect(recordSessionSchema.safeParse({ ...base, rpe: 7 }).success).toBe(
      true,
    );
  });

  it("rechaza duraciones imposibles y distancia negativa", () => {
    expect(
      primerMensaje(
        recordSessionSchema.safeParse({ ...base, durationMinutes: 0 }),
      ),
    ).toBe("El tiempo debe ser mayor a 0");
    expect(
      primerMensaje(recordSessionSchema.safeParse({ ...base, distanceKm: 0 })),
    ).toBe("La distancia debe ser mayor a 0");
  });

  it("rechaza un assignmentId que no es UUID", () => {
    expect(
      primerMensaje(
        recordSessionSchema.safeParse({ ...base, assignmentId: "abc" }),
      ),
    ).toBe("ID de sesión inválido");
  });
});

describe("notDoneSchema (40.11)", () => {
  it("acepta un motivo configurado", () => {
    expect(
      notDoneSchema.safeParse({ assignmentId: UUID, reason: "lesion" }).success,
    ).toBe(true);
  });

  it("exige descripción cuando el motivo es 'otro'", () => {
    expect(
      primerMensaje(
        notDoneSchema.safeParse({ assignmentId: UUID, reason: "otro" }),
      ),
    ).toBe("Describe el motivo");

    expect(
      notDoneSchema.safeParse({
        assignmentId: UUID,
        reason: "otro",
        customReason: "Viaje",
      }).success,
    ).toBe(true);
  });

  it("rechaza motivos con caracteres no permitidos", () => {
    expect(
      primerMensaje(
        notDoneSchema.safeParse({ assignmentId: UUID, reason: "lesión!" }),
      ),
    ).toMatch(/minúsculas|Motivo/);
  });
});

describe("templateSchema (40.12)", () => {
  const valida = {
    name: "Series 6x400",
    sessionType: "series",
    structure: [
      { title: "Calentamiento", type: "warmup", content: "8 min de trote" },
    ],
  };

  it("acepta una plantilla con estructura", () => {
    expect(templateSchema.safeParse(valida).success).toBe(true);
  });

  it("exige al menos una sección con contenido", () => {
    expect(
      primerMensaje(templateSchema.safeParse({ ...valida, structure: [] })),
    ).toBe("Agrega al menos una sección con contenido");

    expect(
      primerMensaje(
        templateSchema.safeParse({
          ...valida,
          structure: [
            { title: "Calentamiento", type: "warmup", content: "  " },
          ],
        }),
      ),
    ).toBe("Describe la sección");
  });

  it("exige nombre y tipo de sesión", () => {
    expect(
      primerMensaje(templateSchema.safeParse({ ...valida, name: "x" })),
    ).toBe("Ingresa un nombre (mínimo 2 caracteres)");
    expect(
      primerMensaje(templateSchema.safeParse({ ...valida, sessionType: "" })),
    ).toBe("Selecciona o escribe un tipo de sesión");
  });
});

describe("plan.schemas (40.14 y planificación)", () => {
  it("assignSession exige UUIDs y fecha ISO", () => {
    expect(
      assignSessionSchema.safeParse({
        athleteId: UUID,
        templateId: UUID2,
        date: "2026-10-14",
      }).success,
    ).toBe(true);

    expect(
      primerMensaje(
        assignSessionSchema.safeParse({
          athleteId: UUID,
          templateId: UUID2,
          date: "14-10-2026",
        }),
      ),
    ).toBe("Fecha inválida");
  });

  it("bulkAssign exige al menos un atleta", () => {
    expect(
      primerMensaje(
        bulkAssignSchema.safeParse({
          athleteIds: [],
          templateId: UUID2,
          date: "2026-10-14",
        }),
      ),
    ).toBe("Selecciona al menos un atleta.");
  });

  it("generateWeek valida el patrón", () => {
    expect(
      generateWeekSchema.safeParse({
        athleteId: UUID,
        weekStart: "2026-10-12",
        pattern: [{ type: "series", count: 3 }],
      }).success,
    ).toBe(true);

    expect(
      primerMensaje(
        generateWeekSchema.safeParse({
          athleteId: UUID,
          weekStart: "2026-10-12",
          pattern: [],
        }),
      ),
    ).toBe("El patrón no puede estar vacío");

    expect(
      primerMensaje(
        generateWeekSchema.safeParse({
          athleteId: UUID,
          weekStart: "2026-10-12",
          pattern: [{ type: "series", count: 9 }],
        }),
      ),
    ).toBe("La cantidad máxima es 7");
  });
});

describe("team y athlete", () => {
  it("createTeam acepta nombre opcional", () => {
    expect(createTeamSchema.safeParse({}).success).toBe(true);
    expect(createTeamSchema.safeParse({ name: "Team Elite" }).success).toBe(
      true,
    );
  });

  it("teamTarget exige ambos UUID", () => {
    expect(
      teamTargetSchema.safeParse({ teamId: UUID, athleteId: UUID2 }).success,
    ).toBe(true);
    expect(teamTargetSchema.safeParse({ teamId: UUID }).success).toBe(false);
  });

  it("createAthlete exige email válido y team", () => {
    const valido = {
      name: "Atleta",
      email: "atleta@demo.cl",
      teamId: UUID,
    };
    const base = createAthleteSchema.safeParse(valido);
    expect(base.success).toBe(true);
    expect(
      primerMensaje(
        createAthleteSchema.safeParse({ ...valido, email: "no-email" }),
      ),
    ).toBe("Email inválido");
  });
});

describe("createGroupSchema", () => {
  it("exige nombre y acepta descripción opcional", () => {
    expect(createGroupSchema.safeParse({ name: "RunOsorno" }).success).toBe(
      true,
    );
    expect(
      createGroupSchema.safeParse({ name: "RunOsorno", description: "Escuela" })
        .success,
    ).toBe(true);
    expect(createGroupSchema.safeParse({ name: "R" }).success).toBe(false);
  });
});
