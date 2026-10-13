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
  success: "text-green",
  warning: "text-yellow",
  danger: "text-red",
  primary: "text-blue",
};

export function StatsCards({ items }: { items: StatCardItem[] }) {
  return (
    <div className="row">
      {items.map((item) => {
        const body = (
          <div className="card-body">
            <div className="text-secondary mb-1">{item.label}</div>
            <div
              className={`h1 mb-0 ${TONE_CLASS[item.tone ?? "default"]}`.trim()}
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
