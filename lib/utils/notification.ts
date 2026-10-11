import { dashboardPath, type Role } from "@/lib/auth/role";
import type { NotificationItem } from "@/lib/services/notification.service";

export function notificationHref(
  item: Pick<NotificationItem, "entityType" | "entityId">,
  role: Role,
): string {
  switch (item.entityType) {
    case "session_assignment":
      return role === "athlete" ? "/athlete/calendar" : "/coach/calendar";
    case "group":
      if (role === "admin" && item.entityId) {
        return `/admin/groups/${item.entityId}`;
      }
      return role === "coach" ? "/coach/groups" : dashboardPath(role);
    case "team":
      if (role === "coach" && item.entityId) {
        return `/coach/teams/${item.entityId}`;
      }
      return dashboardPath(role);
    default:
      return dashboardPath(role);
  }
}
