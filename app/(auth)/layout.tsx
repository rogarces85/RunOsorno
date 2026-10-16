import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page page-center">
      {/* `<main>` también aquí (Fase 48): el login es una página como otra. */}
      <main className="container container-tight py-4" id="contenido" tabIndex={-1}>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </main>
    </div>
  );
}
