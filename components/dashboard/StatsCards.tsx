import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { CountUp } from "./CountUp";

/**
 * Fila de tarjetas de estadística para los dashboards (Fases 30, 36 y D8).
 *
 * Usa la primitiva `Card`. Cada ficha lleva una medalla circular de color con
 * el ícono (variante de `stamp`), la etiqueta al lado y el valor grande con
 * `.app-numeric`. Las clases `text-*-emphasis` de Bootstrap refuerzan el tono
 * de la cifra: las utilidades crudas de Tabler (`text-green`, `text-yellow`…)
 * no alcanzan 4,5:1 sobre fondo claro y axe las reporta; el dato nunca se
 * comunica solo con color, la etiqueta impresa lo acompaña.
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

const TONE_CLASS: Record<NonNullable<StatCardItem["tone"]>, string> = {
  default: "",
  success: "text-success-emphasis",
  warning: "text-warning-emphasis",
  danger: "text-danger-emphasis",
  primary: "text-primary-emphasis",
};

export function StatsCards({ items }: { items: StatCardItem[] }) {
  return (
    <div className="row">
      {items.map((item) => (
        <div key={item.key} className="col-md-6 col-xl-3 mb-3">
          {/* Con `href`, la tarjeta completa es el enlace (`card-link
              card-link-pop`), no un `<a>` envolviendo la tarjeta: la
              elevación del hover cae sobre la tarjeta misma. */}
          <Card className="h-100 text-decoration-none" href={item.href}>
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
            <div
              className={`h1 mb-0 app-numeric ${TONE_CLASS[item.tone ?? "default"]}`.trim()}
            >
              {valorAnimado(item.value)}
            </div>
            {item.sub ? (
              <div className="text-secondary small">{item.sub}</div>
            ) : null}
          </Card>
        </div>
      ))}
    </div>
  );
}
