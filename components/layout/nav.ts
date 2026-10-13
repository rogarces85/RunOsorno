import {
  IconBuildingCommunity,
  IconCalendar,
  IconChartBar,
  IconDownload,
  IconFileText,
  IconHome,
  IconRun,
  IconSettings,
  IconSpeakerphone,
  IconTemplate,
  IconTrophy,
  IconUserStar,
  IconUsers,
} from "@tabler/icons-react";
import type { Role } from "@/lib/auth/role";

/**
 * Configuración de menú lateral por rol (Fase 31).
 * Los items con `pending: true` documentan el menú completo del MVP pero se
 * ocultan hasta que su página exista (se desbloquean en sus fases):
 * - Exportes: Fase 33 (Exportación)
 * - Configuración: Fase 34
 * - Logs: Fase 35
 * - Anuncios: Fase 32
 */

export type NavItem = {
  label: string;
  href: string;
  icon: typeof IconHome;
  pending?: boolean;
};

export type NavSection = {
  key: string;
  header?: string;
  items: NavItem[];
};

const ADMIN_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: IconHome },
  { label: "Coaches", href: "/admin/coaches", icon: IconUserStar },
  { label: "Grupos", href: "/admin/groups", icon: IconUsers },
  { label: "Atletas", href: "/admin/athletes", icon: IconRun },
  { label: "Plantillas oficiales", href: "/admin/templates", icon: IconTemplate },
  { label: "Configuración", href: "/admin/settings", icon: IconSettings, pending: true },
  { label: "Logs", href: "/admin/logs", icon: IconFileText, pending: true },
  { label: "Exportes", href: "/admin/exports", icon: IconDownload, pending: true },
];

const COACH_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/coach/dashboard", icon: IconHome },
  { label: "Mis Teams", href: "/coach/teams", icon: IconUsers },
  { label: "Calendario", href: "/coach/calendar", icon: IconCalendar },
  { label: "Plantillas", href: "/coach/templates", icon: IconTemplate },
  { label: "Atletas", href: "/coach/athletes", icon: IconRun },
  { label: "Métricas", href: "/coach/metrics", icon: IconChartBar },
  { label: "Grupos", href: "/coach/groups", icon: IconBuildingCommunity },
  { label: "Exportes", href: "/coach/exports", icon: IconDownload, pending: true },
];

const DIRECTOR_ITEMS: NavItem[] = [
  { label: "Dashboard del grupo", href: "/director/dashboard", icon: IconHome },
  { label: "Teams (comparativa)", href: "/director/teams", icon: IconTrophy },
  { label: "Atletas (lectura)", href: "/director/athletes", icon: IconRun },
  { label: "Anuncios", href: "/director/announcements", icon: IconSpeakerphone },
  { label: "Exportes", href: "/director/exports", icon: IconDownload, pending: true },
];

const ATHLETE_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/athlete/dashboard", icon: IconHome },
  { label: "Calendario", href: "/athlete/calendar", icon: IconCalendar },
  { label: "Mis métricas", href: "/athlete/metrics", icon: IconChartBar },
  { label: "Perfil", href: "/profile", icon: IconUserStar },
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
