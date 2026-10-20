import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Card de estadística reutilizable para dashboards (Fases 30 y 36).
 * Sigue el patrón visual de Tabler usado en TeamMetricsPanel:
 * card con label secundario, número grande y subtítulo opcional.
 */

export type StatCardItem = {
  key: string;
  label: string;
  value: ReactNode;
  sub?: string;
  href?: string;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
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
      {items.map((item) => {
        const body = (
          <div className="card-body">
            <div className="text-secondary mb-1">{item.label}</div>
            <div
              className={`h1 mb-0 app-numeric ${TONE_CLASS[item.tone ?? "default"]}`.trim()}
            >
              {item.value}
            </div>
            {item.sub ? (
              <div className="text-secondary small">{item.sub}</div>
            ) : null}
          </div>
        );
        return (
          <div key={item.key} className="col-md-6 col-xl-3 mb-3">
            {item.href ? (
              <Link
                href={item.href}
                className="card h-100 text-decoration-none"
              >
                {body}
              </Link>
            ) : (
              <div className="card h-100">{body}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
