import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="card card-md">
      <div className="card-body">
        <h2 className="card-title text-center mb-4">Iniciar sesión</h2>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
