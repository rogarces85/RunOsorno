"use client";

import { useState } from "react";
import {
  IconCalendar,
  IconChartBar,
  IconDownload,
  IconHome,
  IconRun,
  IconTemplate,
  IconUsers,
} from "@tabler/icons-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: IconHome },
  { label: "Teams", href: "#", icon: IconUsers },
  { label: "Calendario", href: "#", icon: IconCalendar },
  { label: "Plantillas", href: "#", icon: IconTemplate },
  { label: "Atletas", href: "#", icon: IconRun },
  { label: "Métricas", href: "#", icon: IconChartBar },
  { label: "Exportes", href: "#", icon: IconDownload },
];

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <aside className="navbar navbar-vertical navbar-expand-lg d-print-none">
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          aria-expanded={open}
          aria-controls="sidebar-menu"
          aria-label="Alternar menú de navegación"
          onClick={() => setOpen(!open)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div
          id="sidebar-menu"
          className={`collapse navbar-collapse${open ? " show" : ""}`}
        >
          <ul className="navbar-nav pt-lg-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.label} className="nav-item">
                <a
                  className="nav-link"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <span className="nav-link-icon">
                    <item.icon size={20} stroke={1.75} />
                  </span>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
