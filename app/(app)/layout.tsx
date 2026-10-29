import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { NavProvider } from "@/components/layout/NavProvider";
import { requireAuth } from "@/lib/auth/guards";
import { getDirectorGroups } from "@/lib/services/group.service";

/**
 * Layout de la app (todo lo que hay detrás de la sesión).
 *
 * **Aquí se cierra el acceso.** Antes lo cerraba el middleware (`proxy.ts`),
 * pero ese camino costaba caro en Cloudflare Workers: el middleware se
 * compila aparte (5,5 MB), se ejecuta en el runtime de Node y salta al Worker
 * principal por un service binding, así que cada petición pagaba un bundle
 * entero y un salto extra. Con `requireAuth()` en este layout, la protección
 * sigue igual y el camino de la petición es uno solo.
 *
 * Sin sesión, `requireAuth()` redirige a `/login`; con una sesión caducada, a
 * `/login?expired=1`.
 */
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
      {/* El rol viaja como atributo del shell: `tokens.css` pisa los tokens
          `--app-role-*` según su valor (atleta/entrenador/admin) para teñir
          sidebar y navbar sin tocar clases ni JavaScript. */}
      <div
        className="app-wrapper layout-fixed sidebar-expand-lg"
        data-user-role={user.role}
      >
        <AppHeader />
        <AppSidebar role={user.role} isDirector={isDirector} />
        {/*
          `<main>` es el punto de anclaje del contenido (Fase 48, tareas 48.1
          y 48.5). Antes no había ningún landmark de contenido: el header y el
          sidebar sí los tienen, pero todo lo demás quedaba fuera, y un lector
          de pantalla no tenía forma de saltar al contenido.

          El enlace de salto va **dentro** de `<main>` a propósito: fuera de
          cualquier landmark, axe lo marca como contenido sin nombre. Es la
          primera vez que se ve, y solo cuando recibe el foco.
        */}
        <main className="app-main" id="contenido" tabIndex={-1}>
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <div className="app-content">
            <div className="container-fluid py-3">{children}</div>
          </div>
        </main>
      </div>
    </NavProvider>
  );
}
