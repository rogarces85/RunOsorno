import { describe, expect, it } from "vitest";
import { filtrarHuerfanos } from "@/lib/services/avatar.service";

/**
 * Mantenimiento (criterio de aceptación del admin): al limpiar avatares
 * huérfanos solo deben salir los objetos del bucket que ningún usuario
 * referencia, nunca los que están en uso ni objetos de otras rutas.
 */
describe("avatares huérfanos", () => {
  it("devuelve solo las claves de avatares sin usuario", () => {
    const keys = [
      "avatars/a.webp",
      "avatars/b.webp",
      "avatars/c.webp",
      "otros/x.png",
    ];
    const referenciados = new Set(["avatars/b.webp"]);

    expect(filtrarHuerfanos(keys, referenciados)).toEqual([
      "avatars/a.webp",
      "avatars/c.webp",
    ]);
  });

  it("no devuelve nada si todas están referenciadas", () => {
    const keys = ["avatars/a.webp", "avatars/b.webp"];
    const referenciados = new Set(["avatars/a.webp", "avatars/b.webp"]);

    expect(filtrarHuerfanos(keys, referenciados)).toEqual([]);
  });

  it("ignora los objetos que no están bajo avatars/", () => {
    expect(filtrarHuerfanos(["carpeta/otra.webp", "suelto.webp"], new Set())).toEqual(
      [],
    );
  });
});
