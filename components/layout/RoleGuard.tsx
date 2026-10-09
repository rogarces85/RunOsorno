import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export type Role = "admin" | "coach" | "director" | "athlete";

export function RoleGuard({
  children,
  allow,
  role,
}: {
  children: ReactNode;
  allow: Role[];
  role?: Role | null;
}) {
  if (role && !allow.includes(role)) {
    redirect("/login");
  }
  return <>{children}</>;
}
