import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/**
 * Fila de tarjetas de estadística para los dashboards (Fases 30, 36 y D8).
 * Usa la primitiva `Card` y la familia `text-*-ink`; las cifras llevan
 * `.app-numeric` para que las columnas queden alineadas.
 */

export type StatCardItem = {
  key: string;
  label: string;
  value: ReactNode;
  sub?: string;
  href?: string;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  /** Marca de agua deportiva (`card-stamp`) opcional, recibida ya montada. */
  stamp?: { icon: ReactNode; variant?: "primary" | "success" | "info" | "warning" | "danger" };
};

const TONE_CLASS: Record<NonNullable<StatCardItem["tone"]>, string> = {
  default: "",
  // Familia de contraste del proyecto: las utilidades crudas de Tabler
  // (`text-green`, `text-yellow`…) no alcanzan 4,5:1 sobre fondo claro y axe las
  // reporta. El tono se refuerza además con la etiqueta del dato, nunca solo con
  // color.
  success: "text-success-ink",
  warning: "text-warning-ink",
  danger: "text-danger-ink",
  primary: "text-primary-ink",
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
            className="h-100 text-decoration-none"
            href={item.href}
            stamp={item.stamp}
          >
            <div className="text-secondary mb-1">{item.label}</div>
            <div
              className={`h1 mb-0 app-numeric ${TONE_CLASS[item.tone ?? "default"]}`.trim()}
            >
              {item.value}
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
