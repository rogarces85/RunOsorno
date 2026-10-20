import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

/**
 * Inicio de sesión (Fase B, tarea 4.5).
 *
 * El título es un `h1`: la página no tenía ninguno —usaba `h2` dentro de la tarjeta—
 * y desde ahora también entra en la verificación de accesibilidad.
 */
export default function LoginPage() {
  return (
    <div className="card app-auth-card">
      <div className="card-body">
        <h1 className="app-h2 mb-1">Iniciar sesión</h1>
        <p className="app-muted mb-4">
          Accede con la cuenta que te entregó tu coach o el administrador.
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
