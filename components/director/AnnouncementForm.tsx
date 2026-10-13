"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconSend } from "@tabler/icons-react";
import { sendAnnouncementAction } from "@/lib/actions/group.actions";
import {
  sendAnnouncementSchema,
  type SendAnnouncementInput,
} from "@/lib/validations/group.schemas";
import { applyServerErrors } from "@/lib/utils/form";
import { Alert } from "@/components/ui/Alert";

export type AnnouncementNotice = {
  type: "success" | "danger";
  message: string;
};

/**
 * Formulario de anuncio masivo del Director Técnico (Fase 32).
 * Incluye preview del mensaje antes de enviar. Envía notificaciones
 * in-app + email a todos los miembros del grupo vía sendAnnouncementAction.
 */
export function AnnouncementForm({
  groups,
  defaultGroupId,
  senderName,
}: {
  groups: { id: string; name: string }[];
  defaultGroupId: string;
  senderName: string;
}) {
  const [notice, setNotice] = useState<AnnouncementNotice | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SendAnnouncementInput>({
    resolver: zodResolver(sendAnnouncementSchema),
    defaultValues: { groupId: defaultGroupId, title: "", message: "" },
  });

  // Preview en vivo: refleja lo que el director escribe mientras compone.
  const { title, message } = useWatch({ control });

  const onSubmit = async (data: SendAnnouncementInput) => {
    clearErrors();
    setNotice(null);
    const result = await sendAnnouncementAction(data);
    if (result.ok) {
      const { notified, emailed } = result.data;
      setNotice({
        type: "success",
        message: `Anuncio enviado a ${notified} miembro${notified === 1 ? "" : "s"} (${emailed} email${emailed === 1 ? "" : "s"} entregado${emailed === 1 ? "" : "s"}).`,
      });
      reset({ groupId: data.groupId, title: "", message: "" });
    } else {
      applyServerErrors(setError, result.fieldErrors);
      setNotice({ type: "danger", message: result.error });
    }
  };

  return (
    <div className="row">
      <div className="col-lg-7 mb-3">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Nuevo anuncio</h3>
          </div>
          <div className="card-body">
            {notice && (
              <Alert
                variant={notice.type}
                dismissible
                onDismiss={() => setNotice(null)}
              >
                {notice.message}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {groups.length > 1 && (
                <div className="mb-3">
                  <label className="form-label" htmlFor="announcement-group">
                    Grupo
                  </label>
                  <select
                    id="announcement-group"
                    className={`form-select ${errors.groupId ? "is-invalid" : ""}`}
                    {...register("groupId")}
                  >
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  {errors.groupId && (
                    <div className="invalid-feedback">
                      {errors.groupId.message}
                    </div>
                  )}
                </div>
              )}
              {groups.length === 1 && (
                <input type="hidden" {...register("groupId")} />
              )}

              <div className="mb-3">
                <label className="form-label" htmlFor="announcement-title">
                  Título
                </label>
                <input
                  id="announcement-title"
                  type="text"
                  className={`form-control ${errors.title ? "is-invalid" : ""}`}
                  placeholder="Ej: Cambio de horario del entrenamiento"
                  {...register("title")}
                />
                {errors.title && (
                  <div className="invalid-feedback">{errors.title.message}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="announcement-message">
                  Mensaje
                </label>
                <textarea
                  id="announcement-message"
                  className={`form-control ${errors.message ? "is-invalid" : ""}`}
                  rows={6}
                  placeholder="Escribe el anuncio para tu grupo…"
                  {...register("message")}
                />
                {errors.message && (
                  <div className="invalid-feedback">
                    {errors.message.message}
                  </div>
                )}
                <div className="form-hint">
                  Se enviará como notificación in-app y email a todos los
                  miembros activos del grupo.
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                <IconSend size={18} stroke={1.75} className="me-1" />
                {isSubmitting ? "Enviando…" : "Enviar anuncio"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col-lg-5 mb-3">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Preview</h3>
            <span className="text-secondary small ms-auto">
              Así lo verán tus miembros
            </span>
          </div>
          <div className="card-body">
            {title || message ? (
              <div className="card bg-azure-lt">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-azure text-white">Anuncio</span>
                    <span className="text-secondary small">{senderName}</span>
                  </div>
                  <div className="fw-bold mb-1">{title}</div>
                  <div
                    className="text-secondary"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {message}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-secondary text-center py-4">
                El preview aparecerá aquí mientras escribes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
