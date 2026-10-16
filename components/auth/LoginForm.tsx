"use client";

import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "@/lib/actions/auth.actions";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schemas";
import { Alert } from "@/components/ui/Alert";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const [state, formAction, isActionPending] = useActionState(
    login,
    initialState,
  );
  const [isValidating, startValidation] = useTransition();
  const isPending = isValidating || isActionPending;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginInput) => {
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    // El Server Action debe invocarse dentro de una transition para que
    // React gestione correctamente el estado pendiente.
    startValidation(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {expired && (
        <Alert variant="warning" testId="login-expired">
          Tu sesión ha expirado. Inicia sesión nuevamente.
        </Alert>
      )}
      {state.error && (
        <Alert variant="danger" testId="login-error">
          {state.error}
        </Alert>
      )}
      <div className="mb-3">
        <label className="form-label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          className={`form-control ${errors.email ? "is-invalid" : ""}`}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          placeholder="tu@email.cl"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <div id="login-email-error" className="invalid-feedback">
            {errors.email.message}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="login-password">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          className={`form-control ${errors.password ? "is-invalid" : ""}`}
          aria-invalid={!!errors.password}
          aria-describedby={
            errors.password ? "login-password-error" : undefined
          }
          placeholder="Tu contraseña"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <div id="login-password-error" className="invalid-feedback">
            {errors.password.message}
          </div>
        )}
      </div>
      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={isPending}
      >
        {isPending ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
