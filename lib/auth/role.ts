import type { users } from "@/lib/db/schema";

export type Role = (typeof users.role.enumValues)[number];

export function dashboardPath(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "coach":
      return "/coach/dashboard";
    case "athlete":
      return "/athlete/dashboard";
  }
}
