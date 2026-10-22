"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schemas";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/**
 * Formulario de inicio de sesión.
 *
 * Va contra `POST /login` (una ruta, no una acción de servidor) por dos
 * motivos:
 *
 * 1. **La contraseña nunca viaja en la URL.** Antes el formulario no declaraba
 *    `action` ni `method`, así que si el usuario pulsaba antes de que la
 *    página hidratara, el navegador hacía un GET nativo y la contraseña
 *    acababa en la URL, en el historial y en los registros del servidor. Con
 *    `action="/login" method="post"` el envío nativo es un POST de verdad.
 * 2. **Se puede reintentar.** En el plan gratuito de Cloudflare (10 ms de CPU
 *    por petición) el login se corta de vez en cuando con un 503; el corte es
 *    transitorio, así que un reintento lo resuelve. Aquí el reintento lo hace
 *    el cliente, que es quien puede reintentar sin que el usuario lo note.
 *
 * Sin JavaScript el formulario sigue funcionando: el POST nativo lo resuelve
 * la misma ruta.
 */

const REINTENTOS = 2;
const ESPERA_ENTRE_INTENTOS_MS = 1500;

const ERRORES: Record<string, string> = {
  formato: "Revisa los datos del formulario",
  invalido: "Email o contraseña incorrectos",
  servidor:
    "No pudimos iniciar sesión en este momento. Vuelve a intentarlo en un segundo.",
};

function dormir(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const errorUrl = searchParams.get("error");
  const minutos = searchParams.get("minutos");
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const mensajeUrl = errorUrl
    ? errorUrl === "demasiados"
      ? `Demasiados intentos. Vuelve a probar en ${minutos ?? 1} minuto(s).`
      : (ERRORES[errorUrl] ?? ERRORES.invalido)
    : null;

  const onSubmit = (data: LoginInput) => {
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);

    startTransition(async () => {
      for (let intento = 0; intento <= REINTENTOS; intento++) {
        try {
          const respuesta = await fetch("/api/login", {
            method: "POST",
            body: formData,
            redirect: "follow",
          });

          // 5xx: el Worker se quedó sin CPU (o se cayó). Es transitorio, así
          // que se reintenta; si persiste, se avisa con un mensaje claro.
          if (respuesta.status >= 500) {
            if (intento < REINTENTOS) {
              await dormir(ESPERA_ENTRE_INTENTOS_MS);
              continue;
            }
            window.location.assign("/login?error=servidor");
            return;
          }

          // El servidor respondió con un 303: al tablero si el login fue
          // correcto, o a /login?error=... si no. `respuesta.url` ya es la
          // dirección final.
          window.location.assign(respuesta.url);
          return;
        } catch {
          // Fallo de red: mismo trato que un 5xx.
          if (intento < REINTENTOS) {
            await dormir(ESPERA_ENTRE_INTENTOS_MS);
            continue;
          }
          window.location.assign("/login?error=servidor");
          return;
        }
      }
    });
  };

  return (
    <form
      action="/api/login"
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {expired && (
        <Alert variant="warning" testId="login-expired">
          Tu sesión ha expirado. Inicia sesión nuevamente.
        </Alert>
      )}
      {mensajeUrl && (
        <Alert variant="danger" testId="login-error">
          {mensajeUrl}
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
      <Button type="submit" className="w-100" loading={isPending}>
        {isPending ? "Ingresando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
