import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toFieldErrors } from "@/lib/actions/base";
import { applyServerErrors, isBusinessError } from "@/lib/utils/form";
import { createCoachSchema } from "@/lib/validations/user.schemas";

/** Doble de `setError` de react-hook-form: solo registra lo que recibe. */
function fakeSetError() {
  const calls: { field: string; message: string }[] = [];
  const setError = (field: string, opts: { message?: string }) => {
    calls.push({ field, message: opts.message ?? "" });
  };
  return { setError, calls };
}

describe("toFieldErrors", () => {
  it("devuelve un mensaje por campo a partir de los issues de Zod", () => {
    const result = createCoachSchema.safeParse({ name: "", email: "no-es-mail" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const fieldErrors = toFieldErrors(result.error);

    expect(fieldErrors.name).toBeTruthy();
    expect(fieldErrors.email).toBeTruthy();
  });

  it("usa `_root` cuando el issue no pertenece a ningún campo", () => {
    const schema = z.object({}).refine(() => false, {
      message: "Error de formulario",
    });
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(toFieldErrors(result.error)).toEqual({ _root: "Error de formulario" });
  });

  it("conserva solo el primer mensaje cuando un campo falla dos veces", () => {
    const schema = z.object({
      value: z
        .string()
        .min(5, "Muy corto")
        .regex(/^[0-9]+$/, "Solo dígitos"),
    });
    const result = schema.safeParse({ value: "ab" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const fieldErrors = toFieldErrors(result.error);
    expect(Object.keys(fieldErrors)).toEqual(["value"]);
  });
});

describe("applyServerErrors", () => {
  it("marca cada campo indicado en el formulario", () => {
    const { setError, calls } = fakeSetError();

    const applied = applyServerErrors<{ name: string; email: string }>(
      setError,
      { name: "Ingresa el nombre", email: "Email inválido" },
    );

    expect(applied).toBe(true);
    expect(calls).toEqual([
      { field: "name", message: "Ingresa el nombre" },
      { field: "email", message: "Email inválido" },
    ]);
  });

  it("devuelve false si la acción no trajo errores de campo", () => {
    const { setError, calls } = fakeSetError();

    expect(applyServerErrors(setError, undefined)).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("ignora los errores sin campo asociado", () => {
    const { setError, calls } = fakeSetError();

    const applied = applyServerErrors(setError, {
      _root: "Error de formulario",
      name: "Requerido",
    });

    expect(applied).toBe(true);
    expect(calls).toEqual([{ field: "name", message: "Requerido" }]);
  });
});

describe("isBusinessError", () => {
  it("distingue un error de negocio de uno de validación", () => {
    const business = { ok: false as const, error: "Ya existe un usuario con ese email" };
    const validation = {
      ok: false as const,
      error: "Datos inválidos",
      fieldErrors: { email: "Email inválido" },
    };

    expect(isBusinessError(business)).toBe(true);
    expect(isBusinessError(validation)).toBe(false);
  });
});