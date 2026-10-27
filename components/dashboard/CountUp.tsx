"use client";

import { useEffect, useState } from "react";

/**
 * Contador que sube desde cero en el valor grande de las fichas de
 * estadística (Fase 49).
 *
 * Es **mejora progresiva**: el servidor renderiza ya el valor final, de modo
 * que sin JavaScript y en la primera respuesta el dato se lee igual. Cuando
 * la página hidrata, el número parte de cero y sube en ~700 ms con una curva
 * de salida suave. `prefers-reduced-motion` lo apaga por completo.
 *
 * Los valores que llegan tienen la forma «82%», «176,03 km», «891 min» o un
 * número suelto como `12`. Si el texto no calza en ese molde —por ejemplo un
 * separador de miles como «1.234», que sin contexto es indistinguible de una
 * coma decimal— no se anima y se muestra tal cual: el contador nunca
 * corrompe un número.
 */

const DURACION_MS = 700;

/** Separa el texto en parte numérica inicial + resto literal («176,03» + « km»). */
function descomponer(texto: string): {
  entero: number;
  decimales: string;
  separador: string;
  sufijo: string;
} | null {
  const m = /^(\d+)(?:([.,])(\d{1,2}))?(.*)$/.exec(texto);
  if (!m) {
    return null;
  }
  const [, entero, separador, decimales, sufijo] = m;
  /* Con grupos de miles («1.234») lo que sigue al separador no es la parte
     decimal, es la altura del número: animarlo lo corrompería. Sin animación. */
  if (separador && !decimales) {
    return null;
  }
  return {
    entero: Number(entero),
    decimales: decimales ?? "",
    separador: separador ?? "",
    sufijo: sufijo ?? "",
  };
}

function movimientoReducido(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function CountUp({
  value,
  number,
}: {
  /** Valor ya formateado en el servidor, p. ej. «176,03 km». */
  value?: string;
  /** Valor numérico directo, p. ej. `12`. */
  number?: number;
}) {
  const final = number !== undefined ? String(number) : (value ?? "");
  const [display, setDisplay] = useState(final);

  useEffect(() => {
    const partes = descomponer(final);
    if (!partes || movimientoReducido()) {
      return;
    }
    const decimalesCount = partes.decimales.length;
    const objetivo = partes.entero;

    let raf = 0;
    const inicio = performance.now();
    const avanzar = (ahora: number) => {
      const t = Math.min((ahora - inicio) / DURACION_MS, 1);
      // Salida cúbica: rápido al inicio, desacelerando hacia el final.
      const ease = 1 - Math.pow(1 - t, 3);
      const valor = objetivo * ease;
      const actual = partes.decimales
        ? valor.toFixed(decimalesCount).replace(".", partes.separador || ",")
        : String(Math.round(valor));
      setDisplay(`${actual}${partes.sufijo}`);
      if (t < 1) {
        raf = requestAnimationFrame(avanzar);
      } else {
        setDisplay(final);
      }
    };
    raf = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(raf);
  }, [final]);

  return <>{display}</>;
}
