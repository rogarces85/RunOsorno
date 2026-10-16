import { describe, expect, it } from "vitest";
import {
  LOCALE,
  TIME_ZONE,
  type AppMessages,
} from "@/lib/i18n/config";
import {
  formatDate,
  formatDateTime,
  formatDateTimeShort,
  formatDayShort,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatTime,
  formatWeekdays,
  t,
} from "@/lib/i18n/format";
import { formatDistance, formatDuration } from "@/lib/utils/format";

/**
 * Fase 46: localización (es-CL / America-Santiago).
 *
 * Las pruebas usan instantes concretos porque el punto de todo el módulo es el
 * **desfase**: un mismo instante, formateado en UTC y en hora de Santiago, da
 * días distintos. Si estas pruebas pasan, un usuario en Chile ve el día que
 * realmente ocurrió la sesión.
 */

/** 15/10/2026 00:30 en Santiago (UTC-3) = 15/10/2026 03:30 UTC. */
const MEDIANOCHE_CHILE = "2026-10-15T03:30:00.000Z";

/**
 * Normaliza los espacios que `Intl` puede poner entre "p." y "m." / "a." y "m."
 *
 * Node 24.11 trae ICU 77.1 y escribe `p.\u00A0m.` (espacio duro); las versiones
 * anteriores de ICU escribían un espacio normal. Las tres pruebas de hora
 * fallaban por eso, sin que cambiara nada del proyecto: comparaban un detalle
 * de implementación de ICU en vez de lo que quieren comprobar (que la hora sea
 * la de Chile). Se comparan los caracteres, no el tipo de espacio.
 */
function normalizar(value: string): string {
  return value.replace(/[  ]/g, " ");
}

describe("configuración de localización", () => {
  it("usa el locale y la zona horaria de Chile", () => {
    expect(LOCALE).toBe("es-CL");
    expect(TIME_ZONE).toBe("America/Santiago");
  });

  it("hay mensajes para es-CL", async () => {
    const messages = (await import("@/messages/es-CL.json")).default as AppMessages;
    expect(messages.common.appName).toBe("RunOsorno");
    expect(messages.units.kilometers).toBe("{value} km");
  });
});

describe("fechas en hora de Chile", () => {
  it("no retrocede el día por formatear en UTC", () => {
    // 00:30 en Santiago: en UTC sigue siendo el mismo día, pero si el servidor
    // estuviera en una zona ahead (o el código quedara en UTC) la fecha cambiaría.
    expect(formatDate(MEDIANOCHE_CHILE)).toBe("15-10-2026");
  });

  it("no adelanta el día de una sesión nocturna", () => {
    // 21:30 del 14 en Santiago (UTC-3) = 00:30 UTC del 15. Sin `timeZone`, un
    // servidor en UTC mostraría "15-10-2026" para algo que pasó el 14.
    expect(formatDate("2026-10-15T00:30:00.000Z")).toBe("14-10-2026");
    expect(normalizar(formatDateTime("2026-10-15T00:30:00.000Z"))).toBe(
      "14-10-2026, 09:30 p. m.",
    );
  });

  it("aplica el horario de verano chileno", () => {
    // Enero es UTC-3 y julio UTC-4. El mismo instante UTC produce horas
    // distintas según la fecha: es el cambio de hora chileno, resuelto por Intl.
    expect(normalizar(formatTime("2026-01-15T17:00:00.000Z"))).toBe("02:00 p. m.");
    expect(normalizar(formatTime("2026-07-15T17:00:00.000Z"))).toBe("01:00 p. m.");
  });

  it("formatea la fecha y la hora separadas", () => {
    expect(normalizar(formatDateTime(MEDIANOCHE_CHILE))).toBe(
      "15-10-2026, 12:30 a. m.",
    );
    expect(normalizar(formatDateTimeShort(MEDIANOCHE_CHILE))).toBe(
      "15/10, 12:30 a. m.",
    );
    expect(normalizar(formatTime(MEDIANOCHE_CHILE))).toBe("12:30 a. m.");
    expect(formatDayShort("2026-10-15T12:00:00.000Z")).toContain("15");
  });

  it("interpreta una fecha pura al mediodía, no en UTC", () => {
    // "2026-10-15" con `new Date()` es 2026-10-15T00:00Z, que en Chile es el 14
    // a las 21:00. Las fechas del calendario llegan así desde la base.
    expect(formatDate("2026-10-15")).toBe("15-10-2026");
    expect(formatMonthYear(2026, 9)).toBe("octubre de 2026");
  });

  it("el encabezado del calendario no se atrasa un mes", () => {
    // El 1 de octubre a medianoche en el servidor (UTC) es el 30 de septiembre
    // en Santiago: el encabezado decía "septiembre".
    expect(formatMonthYear(2026, 9)).toBe("octubre de 2026");
    expect(formatMonthYear(2026, 0)).toBe("enero de 2026");
  });

  it("las abreviaturas de día empiezan en lunes", () => {
    const dias = formatWeekdays();
    expect(dias).toHaveLength(7);
    expect(dias[0].toLowerCase()).toContain("lun");
    expect(dias[2].toLowerCase()).toContain("mi");
    expect(dias[6].toLowerCase()).toContain("dom");
  });
});

describe("números en formato chileno", () => {
  it("usa punto de miles y coma decimal", () => {
    expect(formatNumber(1234.5)).toBe("1.234,5");
    expect(formatNumber(1000000)).toBe("1.000.000");
    expect(formatNumber(10.4, { maximumFractionDigits: 1 })).toBe("10,4");
  });

  it("el porcentaje se redondea a entero", () => {
    expect(formatPercent(82.4)).toBe("82%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(100)).toBe("100%");
  });

  it("las unidades salen de los mensajes", () => {
    expect(formatDistance(10.5)).toBe("10,5 km");
    expect(formatDistance(1234.5)).toBe("1.234,5 km");
    expect(formatDistance(null)).toBe("—");
    expect(formatDistance("no es un número")).toBe("—");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(95)).toBe("1 h 35 min");
    expect(formatDuration(null)).toBe("—");
  });
});

describe("mensajes", () => {
  it("traduce claves comunes", () => {
    expect(t("common.retry")).toBe("Reintentar");
    expect(t("common.notAvailable")).toBe("—");
  });

  it("interpola valores", () => {
    expect(t("units.kilometers", { value: "10,5" })).toBe("10,5 km");
    expect(t("units.minutesLeft", { minutes: 3 })).toBe(
      "Vuelve a probar en 3 minuto(s).",
    );
  });

  it("aplica plurales", () => {
    expect(t("units.days", { count: 1 })).toBe("1 día");
    expect(t("units.days", { count: 5 })).toBe("5 días");
    expect(t("units.weeks", { count: 12 })).toBe("12 semanas");
  });
});