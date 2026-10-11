import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { PermissionUser } from "@/lib/permissions";
import type { ServiceResult } from "@/lib/services/template.service";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

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

function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
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
    const url = await getSignedUrl(
      r2Client(),
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: "image/webp",
      }),
      { expiresIn: 300 },
    );
    return { uploadUrl: url, key };
  }
  return { uploadUrl: "/api/avatar/upload?local=1", key };
}

export async function storeLocalAvatar(
  userId: string,
  data: Buffer,
): Promise<ServiceResult<null>> {
  if (data.byteLength > AVATAR_MAX_BYTES) {
    return { ok: false, error: "La imagen es muy grande. El máximo es 2 MB." };
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
    await r2Client()
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
    const url = await getSignedUrl(
      r2Client(),
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
