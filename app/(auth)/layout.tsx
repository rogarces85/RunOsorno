import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { dashboardPath } from "@/lib/auth/role";
import { usuarioSiHaySesion } from "@/lib/auth/session";

/**
 * Layout de entrada (Fase B, tarea 4.5).
 *
 * La identidad se resuelve con tipografía y aire, sin fotografía ni ilustración:
 * marca, una frase que explica el producto y la tarjeta del formulario. Se conserva
 * `<main id="contenido">` con el enlace de salto, que es la primera parada de teclado.
 *
 * Con sesión abierta, el login lleva al tablero del rol. La comprobación está
 * aquí porque no hay middleware: el layout de la app se encarga del resto.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await usuarioSiHaySesion();
  if (user) {
    redirect(dashboardPath(user.role));
  }

  return (
    <div className="page page-center">
      {/* `<main>` también aquí (Fase 48): el login es una página como otra. */}
      <main
        className="container container-tight py-4"
        id="contenido"
        tabIndex={-1}
      >
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <div className="app-auth">
          <div className="app-auth-brand">
            <Logo variant="lockup" />
            <p className="app-auth-claim mb-0">
              Planificación, registro y seguimiento del entrenamiento de running,
              en un solo lugar.
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
