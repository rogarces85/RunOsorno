import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <AppSidebar />
      <div className="page-wrapper">
        <AppHeader />
        <div className="page-body">
          <div className="container-xl py-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
