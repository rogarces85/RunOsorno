import { describe, expect, it } from "vitest";
import { scrubEvent } from "@/lib/observability/scrub";

/**
 * Fase 44: limpieza de datos personales antes de enviar un evento a Sentry.
 *
 * Estas pruebas cubren lo que la limpieza no puede romper: si el scrub se come
 * el stack trace, el evento llega a Sentry vacío y no sirve para nada. Ese fue
 * un defecto real (el límite de profundidad estaba en 6 niveles y los frames
 * están a 7), y la prueba de abajo lo fija para que no vuelva.
 */

describe("scrubEvent", () => {
  it("sustituye correos por [email]", () => {
    const evento = { message: "Fallo al enviar a admin@runosorno.cl" };
    expect(scrubEvent(evento).message).toBe("Fallo al enviar a [email]");
  });

  it("sustituye IPs por [ip]", () => {
    const evento = { message: "Conexión rechazada desde 192.168.4.64" };
    expect(scrubEvent(evento).message).toBe("Conexión rechazada desde [ip]");
  });

  it("limpia dentro de objetos y arrays anidados", () => {
    const evento = {
      contexts: {
        runtime: {
          contexto: ["usuario@runosorno.cl", "sin datos"],
        },
      },
    };
    const limpio = scrubEvent(evento) as typeof evento;
    expect(limpio.contexts.runtime.contexto[0]).toBe("[email]");
    expect(limpio.contexts.runtime.contexto[1]).toBe("sin datos");
  });

  it("redacta cabeceras sensibles por nombre de clave", () => {
    const evento = {
      request: {
        headers: {
          cookie: "auth_session=abc123",
          authorization: "Bearer xyz",
          "user-agent": "Playwright",
        },
      },
    };
    const limpio = scrubEvent(evento) as typeof evento;
    expect(limpio.request.headers.cookie).toBe("[redactado]");
    expect(limpio.request.headers.authorization).toBe("[redactado]");
    expect(limpio.request.headers["user-agent"]).toBe("Playwright");
  });

  it("conserva el stack trace del error", () => {
    // Regresión: con MAX_DEPTH = 6 los frames quedaban como "[truncado]" y el
    // evento llegaba a Sentry sin información utilizable.
    const evento = {
      exception: {
        values: [
          {
            type: "Error",
            value: "boom",
            stacktrace: {
              frames: [
                {
                  filename: "app/(app)/login/page.tsx",
                  function: "LoginPage",
                  lineno: 42,
                  colno: 7,
                  context_line: "throw new Error('boom')",
                },
              ],
            },
          },
        ],
      },
    };
    const limpio = scrubEvent(evento) as typeof evento;
    const frame = limpio.exception.values[0].stacktrace.frames[0];
    expect(frame.filename).toBe("app/(app)/login/page.tsx");
    expect(frame.function).toBe("LoginPage");
    expect(frame.lineno).toBe(42);
    expect(frame.context_line).toBe("throw new Error('boom')");
  });

  it("limpia el mensaje del error sin tocar el resto del stack", () => {
    const evento = {
      exception: {
        values: [
          {
            type: "MySqlError",
            value: "No se pudo actualizar el usuario admin@runosorno.cl",
            stacktrace: { frames: [{ filename: "lib/services/user.service.ts" }] },
          },
        ],
      },
    };
    const limpio = scrubEvent(evento) as typeof evento;
    expect(limpio.exception.values[0].value).toBe(
      "No se pudo actualizar el usuario [email]",
    );
    expect(limpio.exception.values[0].stacktrace.frames[0].filename).toBe(
      "lib/services/user.service.ts",
    );
  });

  it("no entra en bucle con referencias circulares", () => {
    const evento: Record<string, unknown> = { mensaje: "ciclo" };
    evento.siMismo = evento;
    expect(() => scrubEvent(evento)).not.toThrow();
  });

  it("trunca cadenas desmedidas", () => {
    const evento = { mensaje: "a".repeat(9000) };
    const limpio = scrubEvent(evento) as typeof evento;
    expect(limpio.mensaje.length).toBeLessThan(9000);
    expect(limpio.mensaje.endsWith("…")).toBe(true);
  });
});