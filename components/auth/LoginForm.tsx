"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "@/lib/actions/auth.actions";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schemas";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const [state, formAction, isPending] = useActionState(login, initialState);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginInput) => {
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formAction(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} action={formAction} noValidate>
      {expired && (
        <div className="alert alert-warning" role="alert">
          Tu sesión ha expirado. Inicia sesión nuevamente.
        </div>
      )}
      {state.error && (
        <div className="alert alert-danger" role="alert">
          {state.error}
        </div>
      )}
      <div className="mb-3">
        <label className="form-label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          className={`form-control ${errors.email ? "is-invalid" : ""}`}
          placeholder="tu@email.cl"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <div className="invalid-feedback">{errors.email.message}</div>
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
          placeholder="Tu contraseña"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <div className="invalid-feedback">{errors.password.message}</div>
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
