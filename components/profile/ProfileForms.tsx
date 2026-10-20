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
import { applyServerErrors } from "@/lib/utils/form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Notice = { type: "success" | "danger"; message: string } | null;

function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice) {
    return null;
  }
  return (
    <Alert
      variant={notice.type}
      icon={
        notice.type === "success" ? (
          <IconCheck size={16} />
        ) : (
          <IconX size={16} />
        )
      }
    >
      {notice.message}
    </Alert>
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
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<{ name: string }>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = handleSubmit((values) => {
    setNotice(null);
    clearErrors();
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.ok) {
        setNotice({ type: "success", message: "Datos actualizados" });
        reset(values);
      } else {
        applyServerErrors(setError, result.fieldErrors);
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

      <Field id="profile-name" label="Nombre" error={errors.name?.message}>
        <input
          id="profile-name"
          type="text"
          className={`form-control ${errors.name ? "is-invalid" : ""}`}
          {...register("name")}
        />
      </Field>

      <Field
        id="profile-email"
        label="Email"
        hint="El email no se puede modificar desde el perfil."
      >
        <input
          id="profile-email"
          type="email"
          className="form-control"
          value={email}
          disabled
          readOnly
        />
      </Field>

      {!isActive && (
        <Alert variant="warning">
          Tu cuenta está inactiva. Contacta con el administrador para
          reactivarla.
        </Alert>
      )}

      <Button
        type="submit"
        loading={isPending}
        disabled={isPending || !isDirty}
      >
        <IconDeviceFloppy size={16} stroke={1.75} className="me-1" />
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
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
    setError,
    clearErrors,
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
    clearErrors();
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
        applyServerErrors(setError, result.fieldErrors);
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

      <Field
        id="current-password"
        label="Contraseña actual"
        error={errors.currentPassword?.message}
      >
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          className={`form-control ${errors.currentPassword ? "is-invalid" : ""}`}
          {...register("currentPassword")}
        />
      </Field>

      <Field
        id="new-password"
        label="Nueva contraseña"
        error={errors.newPassword?.message}
        hint="Mínimo 8 caracteres."
      >
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className={`form-control ${errors.newPassword ? "is-invalid" : ""}`}
          {...register("newPassword")}
        />
      </Field>

      <Field
        id="confirm-password"
        label="Confirmar nueva contraseña"
        error={errors.confirmPassword?.message}
      >
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
          {...register("confirmPassword")}
        />
      </Field>

      <Alert variant="info" role="status">
        Al cambiar la contraseña se cerrarán todas las sesiones abiertas en
        otros dispositivos. Solo esta sesión seguirá activa.
      </Alert>

      <Button type="submit" loading={isPending}>
        <IconDeviceFloppy size={16} stroke={1.75} className="me-1" />
        {isPending ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
