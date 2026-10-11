import type { Role } from "@/lib/auth/role";

export const ROUTE_ACCESS: Record<Role, readonly string[]> = {
  admin: ["/admin"],
  coach: ["/coach", "/director"],
  athlete: ["/athlete"],
} as const;

export const ACTION_ACCESS: Record<Role, readonly string[]> = {
  admin: [
    "manage:users",
    "manage:groups",
    "manage:settings",
    "manage:official_templates",
    "view:global_metrics",
    "audit:logs",
  ],
  coach: [
    "manage:own_teams",
    "plan:own_athletes",
    "feedback:own_athletes",
    "share:templates",
    "view:group_metrics",
  ],
  athlete: ["record:own_sessions", "view:own_history", "view:own_metrics"],
} as const;

export function canAccessRoute(role: Role, pathname: string): boolean {
  return ROUTE_ACCESS[role].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canPerformAction(role: Role, action: string): boolean {
  return ACTION_ACCESS[role].includes(action);
}
