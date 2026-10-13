"use client";

import { useState, type ReactNode } from "react";

type TabKey = "limits" | "reasons" | "types" | "email";

type Props = {
  limits: ReactNode;
  reasons: ReactNode;
  types: ReactNode;
  email: ReactNode;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "limits", label: "Límites" },
  { key: "reasons", label: "Motivos no realizada" },
  { key: "types", label: "Tipos de sesión" },
  { key: "email", label: "Email" },
];

/**
 * Tabs de la configuración global (tarea 34.4).
 *
 * Se implementa a mano en lugar de usar el componente Tabs de Tabler para
 * mantener el estado en React y no depender del JS Bootstrap.
 */
export function SettingsTabs({ limits, reasons, types, email }: Props) {
  const [active, setActive] = useState<TabKey>("limits");
  const panels: Record<TabKey, ReactNode> = { limits, reasons, types, email };

  return (
    <div className="card">
      <div className="card-header">
        <ul className="nav nav-tabs card-header-tabs" role="tablist">
          {TABS.map((tab) => (
            <li
              key={tab.key}
              className="nav-item"
              role="presentation"
            >
              <button
                type="button"
                role="tab"
                id={`tab-${tab.key}`}
                aria-selected={active === tab.key}
                aria-controls={`panel-${tab.key}`}
                className={`nav-link ${active === tab.key ? "active" : ""}`}
                onClick={() => setActive(tab.key)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-body">
        {TABS.map((tab) => (
          <div
            key={tab.key}
            role="tabpanel"
            id={`panel-${tab.key}`}
            aria-labelledby={`tab-${tab.key}`}
            hidden={active !== tab.key}
          >
            {panels[tab.key]}
          </div>
        ))}
      </div>
    </div>
  );
}
