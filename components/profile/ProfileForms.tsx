"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { IconCheck, IconDeviceFloppy, IconX } from "@tabler/icons-react";
import {
  changePasswordAction,
  updateProfileAction,
} from "@/lib/actions/profile.actions";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
} from "@/lib/validations/auth.schemas";

type Notice = { type: "success" | "danger"; message: string } | null;

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) {
    return null;
  }
  return (
    <div className={`alert alert-${notice.type}`} role="alert">
      {notice.type === "success" ? (
        <IconCheck size={16} className="me-1" />
      ) : (
        <IconX size={16} className="me-1" />
      )}
      {notice.message}
    </div>
  );
}

/**
 * Datos personales (tarea 37.2).
 * El email se muestra como solo lectura: cambiarlo afectaría al login y a
 * los registros ya enviados.
 */
export function ProfileForm({
  initialName,
  email,
  isActive,
}: {
  initialName: string;
  email: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<{ name: string }>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = handleSubmit((values) => {
    setNotice(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.ok) {
        setNotice({ type: "success", message: "Datos actualizados" });
        reset(values);
      } else {
        setNotice({
          type: "danger",
          message: result.error ?? "No se pudieron guardar los datos",
        });
      }
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <NoticeBox notice={notice} />

      <div className="mb-3">
        <label className="form-label" htmlFor="profile-name">
          Nombre
        </label>
        <input
          id="profile-name"
          type="text"
          className={`form-control ${errors.name ? "is-invalid" : ""}`}
          {...register("name")}
        />
        {errors.name && (
          <div className="invalid-feedback">{errors.name.message}</div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="profile-email">
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          className="form-control"
          value={email}
          disabled
          readOnly
        />
        <div className="form-hint">
          El email no se puede modificar desde el perfil.
        </div>
      </div>

      {!isActive && (
        <div className="alert alert-warning" role="alert">
          Tu cuenta está inactiva. Contacta con el administrador para
          reactivarla.
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isPending || !isDirty}
      >
        <IconDeviceFloppy size={16} stroke={1.75} className="me-1" />
        {isPending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

/**
 * Cambio de contraseña (tarea 37.3).
 *
 * Avisa de que se cerrarán las demás sesiones: es el comportamiento
 * deliberado del proyecto, no un efecto secundario oculto.
 */
export function PasswordChange() {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setNotice(null);
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (result.ok) {
        const revoked = result.data.revokedSessions;
        setNotice({
          type: "success",
          message:
            revoked > 0
              ? `Contraseña actualizada. Se cerraron ${revoked} sesión${revoked === 1 ? "" : "es"} abierta${revoked === 1 ? "" : "s"} en otros dispositivos.`
              : "Contraseña actualizada.",
        });
        reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setNotice({
          type: "danger",
          message: result.error ?? "No se pudo cambiar la contraseña",
        });
      }
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <NoticeBox notice={notice} />

      <div className="mb-3">
        <label className="form-label" htmlFor="current-password">
          Contraseña actual
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          className={`form-control ${errors.currentPassword ? "is-invalid" : ""}`}
          {...register("currentPassword")}
        />
        {errors.currentPassword && (
          <div className="invalid-feedback">
            {errors.currentPassword.message}
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="new-password">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className={`form-control ${errors.newPassword ? "is-invalid" : ""}`}
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <div className="invalid-feedback">{errors.newPassword.message}</div>
        )}
        <div className="form-hint">Mínimo 8 caracteres.</div>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="confirm-password">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <div className="invalid-feedback">
            {errors.confirmPassword.message}
          </div>
        )}
      </div>

      <div className="alert alert-info" role="note">
        Al cambiar la contraseña se cerrarán todas las sesiones abiertas en
        otros dispositivos. Solo esta sesión seguirá activa.
      </div>

      <button type="submit" className="btn btn-primary" disabled={isPending}>
        <IconDeviceFloppy size={16} stroke={1.75} className="me-1" />
        {isPending ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
