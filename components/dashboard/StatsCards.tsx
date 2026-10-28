import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { CountUp } from "./CountUp";

/**
 * Fila de tarjetas de estadística para los dashboards (Fases 30, 36 y D8).
 *
 * Usa la primitiva `Card`. Cada ficha lleva una medalla circular con el ícono,
 * la etiqueta en versalitas y la cifra grande con `.app-numeric`.
 *
 * El tono no se pinta en la cifra: `text-*-emphasis` de AdminLTE caía en un
 * verde aceituna y competía con el color de la medalla. El tono vive en el
 * carril superior de la tarjeta y en la medalla (tinte suave + ícono en el
 * tono, que pasa 3:1 en ambos temas), y la cifra queda en la tinta de la
 * interfaz. El dato nunca se comunica solo con color: la etiqueta impresa lo
 * acompaña.
 */

/**
 * El valor grande se anima a su llegada cuando es un número o un texto
 * acotado —`«82%»`, `«176,03 km»`—; cualquier otro nodo (un enlace, un fragmento
 * compuesto) se pinta tal cual, sin intentarlo animar.
 */
function valorAnimado(value: ReactNode): ReactNode {
  if (typeof value === "number") {
    return <CountUp number={value} />;
  }
  if (typeof value === "string") {
    return <CountUp value={value} />;
  }
  return value;
}

export type StatCardItem = {
  key: string;
  label: string;
  value: ReactNode;
  sub?: string;
  href?: string;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  /** Medalla de color con ícono (decorativa), recibida ya montada. */
  stamp?: {
    icon: ReactNode;
    variant?: "primary" | "success" | "info" | "warning" | "danger";
  };
};

export function StatsCards({ items }: { items: StatCardItem[] }) {
  return (
    <div className="row">
      {items.map((item) => (
        <div key={item.key} className="col-md-6 col-xl-3 mb-3">
          {/* Con `href`, la tarjeta completa es el enlace (`card-link
              card-link-pop`), no un `<a>` envolviendo la tarjeta: la
              elevación del hover cae sobre la tarjeta misma. */}
          <Card
            className={`h-100 text-decoration-none app-stat-card app-stat-card-${item.tone ?? "default"}`}
            href={item.href}
          >
            <div className="app-stat-top">
              {item.stamp ? (
                <span
                  className={`app-stat-medal app-stat-medal-${item.stamp.variant ?? "primary"}`}
                  aria-hidden
                >
                  {item.stamp.icon}
                </span>
              ) : null}
              <span className="app-stat-label">{item.label}</span>
            </div>
            <div className="app-stat-value app-numeric">
              {valorAnimado(item.value)}
            </div>
            {item.sub ? <div className="app-stat-sub">{item.sub}</div> : null}
          </Card>
        </div>
      ))}
    </div>
  );
}
