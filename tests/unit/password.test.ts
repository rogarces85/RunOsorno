import { hashSync } from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  hashPassword,
  needsRehash,
  PBKDF2_ITERATIONS,
  verifyPassword,
} from "@/lib/security/hashing";

/**
 * Fase 45 (45.2) + P1.5: hashing de contraseñas con PBKDF2-HMAC-SHA512 nativo,
 * migrando desde bcryptjs sin romper cuentas existentes.
 */

describe("hashing de contraseñas (PBKDF2-SHA512)", () => {
  it("genera un hash con prefijo versionado", async () => {
    const h = await hashPassword("secreto");
    expect(h.startsWith("pbkdf2-sha512$")).toBe(true);
    expect(h.split("$")).toHaveLength(4);
    expect(Number(h.split("$")[1])).toBe(PBKDF2_ITERATIONS);
  });

  it("verifica la contraseña correcta y rechaza la incorrecta", async () => {
    const h = await hashPassword("secreto");
    expect(await verifyPassword("secreto", h)).toBe(true);
    expect(await verifyPassword("otra", h)).toBe(false);
  });

  it("usa sal aleatoria: dos hashes de la misma clave difieren", async () => {
    const a = await hashPassword("secreto");
    const b = await hashPassword("secreto");
    expect(a).not.toBe(b);
  });

  it("devuelve false ante un hash malformado en vez de lanzar", async () => {
    expect(await verifyPassword("x", "basura")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2-sha512$abc$zz$yy")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2-sha512$210000$@@$!!")).toBe(false);
  });

  it("sigue verificando hashes bcrypt heredados y los marca para rehash", async () => {
    const legacy = hashSync("legacy", 4);
    expect(await verifyPassword("legacy", legacy)).toBe(true);
    expect(needsRehash(legacy)).toBe(true);
  });

  it("no marca para rehash un PBKDF2 con las iteraciones vigentes", async () => {
    const h = await hashPassword("secreto");
    expect(needsRehash(h)).toBe(false);
  });
});
