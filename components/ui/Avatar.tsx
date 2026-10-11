import { svgAvatar } from "@/lib/utils/avatar";

type AvatarProps = {
  userId: string;
  name: string;
  avatarKey?: string | null;
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: 24,
  md: 36,
  lg: 96,
} as const;

export function Avatar({
  userId,
  name,
  avatarKey,
  size = "md",
}: AvatarProps) {
  const px = SIZES[size];
  const src = avatarKey
    ? `/api/avatar?userId=${userId}`
    : `data:image/svg+xml;utf8,${encodeURIComponent(svgAvatar(name))}`;
  return (
    <img
      src={src}
      alt={name}
      width={px}
      height={px}
      className="avatar rounded"
      style={{ width: px, height: px, objectFit: "cover" }}
    />
  );
}
