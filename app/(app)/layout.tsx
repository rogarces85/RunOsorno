import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { NavProvider } from "@/components/layout/NavProvider";
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
    <NavProvider>
      <div className="page">
        <AppSidebar role={user.role} isDirector={isDirector} />
        <div className="page-wrapper">
          <AppHeader />
          {/*
            `<main>` es el punto de anclaje del contenido (Fase 48, tareas 48.1
            y 48.5). Antes no había ningún landmark de contenido: el header y el
            sidebar sí los tienen, pero todo lo demás quedaba fuera, y un lector
            de pantalla no tenía forma de saltar al contenido.

            El enlace de salto va **dentro** de `<main>` a propósito: fuera de
            cualquier landmark, axe lo marca como contenido sin nombre. Es la
            primera vez que se ve, y solo cuando recibe el foco.
          */}
          <main className="page-body" id="contenido" tabIndex={-1}>
            <a className="skip-link" href="#contenido">
              Saltar al contenido
            </a>
            <div className="container-xl py-3">{children}</div>
          </main>
        </div>
      </div>
    </NavProvider>
  );
}
