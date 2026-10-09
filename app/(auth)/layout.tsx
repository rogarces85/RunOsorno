import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page page-center">
      <div className="container container-tight py-4">{children}</div>
    </div>
  );
}
