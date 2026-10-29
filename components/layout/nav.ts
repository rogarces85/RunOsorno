import type { Role } from "@/lib/auth/role";

/**
 * Configuración de menú lateral por rol (Fase 31).
 * Los items con `pending: true` documentan el menú completo del MVP pero se
 * ocultan hasta que su página exista (se desbloquean en sus fases).
 * A la Fase 36 quedan desbloqueados los tres items del menú admin:
 * Configuración (34), Logs (35) y Exportes (33).
 */

export type NavItem = {
  label: string;
  href: string;
  /** Nombre del icono de Bootstrap Icons (sin el prefijo `bi bi-`). */
  icon: string;
  pending?: boolean;
};

export type NavSection = {
  key: string;
  header?: string;
  items: NavItem[];
};

const ADMIN_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "house" },
  { label: "Coaches", href: "/admin/coaches", icon: "person-badge" },
  { label: "Grupos", href: "/admin/groups", icon: "people" },
  { label: "Atletas", href: "/admin/athletes", icon: "person-arms-up" },
  { label: "Plantillas oficiales", href: "/admin/templates", icon: "grid-1x2" },
  { label: "Configuración", href: "/admin/settings", icon: "gear" },
  { label: "Logs", href: "/admin/logs", icon: "file-earmark-text" },
  { label: "Exportes", href: "/exports", icon: "download" },
];

const COACH_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/coach/dashboard", icon: "house" },
  { label: "Mis Teams", href: "/coach/teams", icon: "people" },
  { label: "Calendario", href: "/coach/calendar", icon: "calendar" },
  { label: "Plantillas", href: "/coach/templates", icon: "grid-1x2" },
  { label: "Atletas", href: "/coach/athletes", icon: "person-arms-up" },
  { label: "Métricas", href: "/coach/metrics", icon: "bar-chart" },
  { label: "Grupos", href: "/coach/groups", icon: "building" },
  { label: "Exportes", href: "/exports", icon: "download" },
];

const DIRECTOR_ITEMS: NavItem[] = [
  { label: "Dashboard del grupo", href: "/director/dashboard", icon: "house" },
  { label: "Teams (comparativa)", href: "/director/teams", icon: "trophy" },
  { label: "Atletas (lectura)", href: "/director/athletes", icon: "person-arms-up" },
  { label: "Anuncios", href: "/director/announcements", icon: "telephone-outbound" },
  { label: "Exportes", href: "/exports", icon: "download" },
];

const ATHLETE_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/athlete/dashboard", icon: "house" },
  { label: "Calendario", href: "/athlete/calendar", icon: "calendar" },
  { label: "Mis métricas", href: "/athlete/metrics", icon: "bar-chart" },
  { label: "Perfil", href: "/profile", icon: "person-badge" },
];

function visible(items: NavItem[]): NavItem[] {
  return items.filter((item) => !item.pending);
}

/**
 * Secciones del sidebar para un rol. Los directores técnicos son coaches en
 * la DB, por lo que conservan el menú de coach y agregan la sección
 * "Director Técnico".
 */
export function navForRole(role: Role, isDirector: boolean): NavSection[] {
  switch (role) {
    case "admin":
      return [{ key: "admin", items: visible(ADMIN_ITEMS) }];
    case "coach": {
      const sections: NavSection[] = [
        { key: "coach", items: visible(COACH_ITEMS) },
      ];
      if (isDirector) {
        sections.push({
          key: "director",
          header: "Director Técnico",
          items: visible(DIRECTOR_ITEMS),
        });
      }
      return sections;
    }
    case "athlete":
      return [{ key: "athlete", items: visible(ATHLETE_ITEMS) }];
  }
}
