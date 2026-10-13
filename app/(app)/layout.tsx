import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { requireAuth } from "@/lib/auth/guards";
import { getDirectorGroups } from "@/lib/services/group.service";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireAuth();
  const isDirector =
    user.role === "coach" &&
    (await getDirectorGroups(user.id)).length > 0;

  return (
    <div className="page">
      <AppSidebar role={user.role} isDirector={isDirector} />
      <div className="page-wrapper">
        <AppHeader />
        <div className="page-body">
          <div className="container-xl py-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
