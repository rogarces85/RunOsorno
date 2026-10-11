"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPhoto, IconTrash } from "@tabler/icons-react";
import {
  confirmAvatarAction,
  deleteAvatarAction,
} from "@/lib/actions/avatar.actions";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const TARGET_SIZE = 256;

type AvatarUploadProps = {
  avatarKey: string | null;
};

async function resizeToAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo procesar la imagen");
  }
  const scale = Math.max(
    TARGET_SIZE / bitmap.width,
    TARGET_SIZE / bitmap.height,
  );
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  ctx.drawImage(
    bitmap,
    (TARGET_SIZE - width) / 2,
    (TARGET_SIZE - height) / 2,
    width,
    height,
  );
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.92),
  );
  if (!blob) {
    throw new Error("No se pudo procesar la imagen");
  }
  return blob;
}

export function AvatarUpload({ avatarKey }: AvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasAvatar, setHasAvatar] = useState(avatarKey !== null);

  async function handleFile(file: File) {
    setError(null);
    setNotice(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato no soportado. Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen es muy grande. El máximo es 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const blob = await resizeToAvatar(file);
      const ticketResponse = await fetch("/api/avatar/upload", {
        method: "POST",
      });
      if (!ticketResponse.ok) {
        throw new Error("No se pudo iniciar la subida");
      }
      const ticket = (await ticketResponse.json()) as {
        uploadUrl: string;
        key: string;
      };
      const putResponse = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: blob,
      });
      if (!putResponse.ok) {
        throw new Error("No se pudo subir la imagen");
      }
      const confirm = await confirmAvatarAction({ key: ticket.key });
      if (!confirm.ok) {
        throw new Error(confirm.error);
      }
      setHasAvatar(true);
      setNotice("Foto actualizada.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Error al subir la imagen",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await deleteAvatarAction({});
      if (!result.ok) {
        throw new Error(result.error);
      }
      setHasAvatar(false);
      setNotice("Foto eliminada. Usas tu avatar de iniciales.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Error al eliminar la foto",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="d-none"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              void handleFile(file);
            }
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <IconPhoto size={18} stroke={1.75} className="me-1" />
          {busy ? "Procesando..." : "Subir foto"}
        </button>
        <button
          type="button"
          className="btn btn-outline-danger"
          disabled={busy || !hasAvatar}
          onClick={() => void handleDelete()}
        >
          <IconTrash size={18} stroke={1.75} className="me-1" />
          Eliminar foto
        </button>
      </div>
      <div className="text-secondary small mt-2">
        JPG, PNG o WebP · máximo 2 MB · se recorta a 256×256 px
      </div>
      {error ? (
        <div className="alert alert-danger mt-2 mb-0" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="alert alert-success mt-2 mb-0" role="status">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
