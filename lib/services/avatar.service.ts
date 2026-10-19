import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { PermissionUser } from "@/lib/permissions";
import type { ServiceResult } from "@/lib/services/template.service";

/**
 * El SDK de S3 y el firmador se cargan **bajo demanda** (Fase 47/48): son
 * grandes y solo hacen falta cuando hay un avatar de por medio, así que no
 * tienen por qué evaluarse en el arranque del Worker ni ocupar memoria en cada
 * isolate. Se memoriza la promesa del `import()` para no repetirlo.
 */
type ModuloS3 = typeof import("@aws-sdk/client-s3");
type ModuloPresigner = typeof import("@aws-sdk/s3-request-presigner");

let moduloS3: Promise<ModuloS3> | null = null;
let moduloPresigner: Promise<ModuloPresigner> | null = null;

function s3(): Promise<ModuloS3> {
  moduloS3 ??= import("@aws-sdk/client-s3");
  return moduloS3;
}

function presigner(): Promise<ModuloPresigner> {
  moduloPresigner ??= import("@aws-sdk/s3-request-presigner");
  return moduloPresigner;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/**
 * Firmas binarias de los formatos aceptados.
 *
 * La constante `AVATAR_ACCEPTED_TYPES` estaba declarada pero nunca se usaba, y
 * el upload local solo miraba el tamaño. Como el `Content-Type` lo declara el
 * cliente, un atacante podía mandar cualquier archivo (un `.html` con un
 * script, por ejemplo) haciéndose pasar por imagen. Lo que decide es la
 * **firma del propio archivo**, no lo que el navegador diga que es.
 *
 * - JPEG: `FF D8 FF` al inicio.
 * - PNG: `89 50 4E 47 0D 0A 1A 0A`.
 * - WebP: `RIFF....WEBP` (los 4 bytes del medio son el tamaño).
 */
const FIRMAS: Record<
  string,
  { prefijo: number[]; enOffset?: number; marca?: string }
> = {
  "image/jpeg": { prefijo: [0xff, 0xd8, 0xff] },
  "image/png": { prefijo: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "image/webp": {
    prefijo: [0x52, 0x49, 0x46, 0x46],
    enOffset: 8,
    marca: "WEBP",
  },
};

/** Devuelve el MIME detectado por la firma del archivo, o `null` si no es imagen. */
export function sniffImageMime(data: Uint8Array): string | null {
  for (const [mime, regla] of Object.entries(FIRMAS)) {
    if (data.byteLength < regla.prefijo.length) continue;
    if (!regla.prefijo.every((b, i) => data[i] === b)) continue;
    if (regla.marca !== undefined) {
      const fin = regla.enOffset! + regla.marca.length;
      if (data.byteLength < fin) continue;
      const texto = String.fromCharCode(
        ...data.slice(regla.enOffset!, fin),
      );
      if (texto !== regla.marca) continue;
    }
    return mime;
  }
  return null;
}

export function avatarKeyFor(userId: string): string {
  return `avatars/${userId}.webp`;
}

function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

async function r2Client() {
  const { S3Client } = await s3();
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
    // Sin esto, el SDK añade a la URL prefirmada un checksum CRC32 calculado
    // sobre un cuerpo vacío y firma `content-length`; el navegador sube otros
    // bytes y R2 responde `SignatureDoesNotMatch`. Con `WHEN_REQUIRED` la firma
    // solo cubre lo que de verdad se manda.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

function localAvatarPath(userId: string): string {
  return path.join(process.cwd(), ".data", "avatars", `${userId}.webp`);
}

export type AvatarUploadTicket = {
  uploadUrl: string;
  key: string;
};

export async function getUploadTicket(
  user: PermissionUser,
): Promise<AvatarUploadTicket> {
  const key = avatarKeyFor(user.id);
  if (r2Configured()) {
    const [{ PutObjectCommand }, { getSignedUrl }] = await Promise.all([
      s3(),
      presigner(),
    ]);
    const url = await getSignedUrl(
      await r2Client(),
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: "image/webp",
        // No se firma `ContentLength`: al prefirmar, el SDK lo incluiría en la
        // firma y el tamaño real del archivo (redimensionado en el navegador)
        // no tiene por qué coincidir. El límite de 2 MB se comprueba en
        // `confirmUpload`, que lee el objeto antes de confirmarlo.
      }),
      { expiresIn: 300 },
    );
    return { uploadUrl: url, key };
  }
  return { uploadUrl: "/api/avatar/upload?local=1", key };
}

/** Borra un objeto del bucket sin propagar el error si ya no está. */
async function deleteObjectQuietly(key: string): Promise<void> {
  const { DeleteObjectCommand } = await s3();
  await (await r2Client())
    .send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      }),
    )
    .catch(() => undefined);
}

export async function storeLocalAvatar(
  userId: string,
  data: Buffer,
): Promise<ServiceResult<null>> {
  if (data.byteLength > AVATAR_MAX_BYTES) {
    return { ok: false, error: "La imagen es muy grande. El máximo es 2 MB." };
  }
  // Se valida la firma del archivo, no el Content-Type declarado por el
  // cliente: si no, cualquiera podría subir un HTML con script diciendo que es
  // una imagen (Fase 45, tarea 45.9).
  if (!sniffImageMime(data)) {
    return {
      ok: false,
      error: "El archivo no es una imagen válida (JPG, PNG o WebP).",
    };
  }
  const target = localAvatarPath(userId);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return { ok: true, data: null };
}

export async function confirmUpload(
  user: PermissionUser,
  key: string,
): Promise<ServiceResult<null>> {
  const expected = avatarKeyFor(user.id);
  if (key !== expected) {
    return { ok: false, error: "Clave de avatar inválida" };
  }
  // Con R2 el navegador sube el archivo directo, así que esta es la primera vez
  // que el servidor ve los bytes. Se comprueban la firma y el tamaño antes de
  // dejar el objeto en el bucket: hasta aquí el archivo existe pero la app no
  // lo sirve (el `avatarKey` del usuario sigue sin seteear).
  if (r2Configured()) {
    const { GetObjectCommand } = await s3();
    const objeto = await (await r2Client())
      .send(
        new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: expected,
        }),
      )
      .catch(() => null);

    if (!objeto?.Body) {
      return { ok: false, error: "No se encontró la imagen subida" };
    }
    const bytes = await objeto.Body.transformToByteArray();
    if (bytes.byteLength > AVATAR_MAX_BYTES) {
      await deleteObjectQuietly(expected);
      return { ok: false, error: "La imagen es muy grande. El máximo es 2 MB." };
    }
    if (!sniffImageMime(bytes)) {
      await deleteObjectQuietly(expected);
      return {
        ok: false,
        error: "El archivo no es una imagen válida (JPG, PNG o WebP).",
      };
    }
  }
  await db
    .update(users)
    .set({ avatarKey: expected })
    .where(eq(users.id, user.id));
  return { ok: true, data: null };
}

export async function deleteAvatar(
  user: PermissionUser,
): Promise<ServiceResult<null>> {
  const [row] = await db
    .select({ avatarKey: users.avatarKey })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row?.avatarKey) {
    return { ok: false, error: "No tienes foto de perfil" };
  }
  if (r2Configured()) {
    const { DeleteObjectCommand } = await s3();
    await (await r2Client())
      .send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: row.avatarKey,
        }),
      )
      .catch(() => undefined);
  } else {
    await unlink(localAvatarPath(user.id)).catch(() => undefined);
  }
  await db.update(users).set({ avatarKey: null }).where(eq(users.id, user.id));
  return { ok: true, data: null };
}

export type AvatarSource =
  | { kind: "none" }
  | { kind: "svg"; name: string }
  | { kind: "redirect"; url: string }
  | { kind: "local"; name: string };

export async function resolveAvatarSource(
  userId: string,
): Promise<AvatarSource> {
  const [row] = await db
    .select({ avatarKey: users.avatarKey, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) {
    return { kind: "none" };
  }
  if (!row.avatarKey) {
    return { kind: "svg", name: row.name };
  }
  if (r2Configured()) {
    const [{ GetObjectCommand }, { getSignedUrl }] = await Promise.all([
      s3(),
      presigner(),
    ]);
    const url = await getSignedUrl(
      await r2Client(),
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: row.avatarKey,
      }),
      { expiresIn: 3600 },
    );
    return { kind: "redirect", url };
  }
  return { kind: "local", name: row.name };
}

export async function readLocalAvatar(
  userId: string,
): Promise<Buffer | null> {
  return readFile(localAvatarPath(userId)).catch(() => null);
}
