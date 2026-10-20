import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";

/**
 * Layout de entrada (Fase B, tarea 4.5).
 *
 * La identidad se resuelve con tipografía y aire, sin fotografía ni ilustración:
 * marca, una frase que explica el producto y la tarjeta del formulario. Se conserva
 * `<main id="contenido">` con el enlace de salto, que es la primera parada de teclado.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
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
