import { svgAvatar } from "@/lib/utils/avatar";

type AvatarProps = {
  userId: string;
  name: string;
  avatarKey?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * `eager` (por defecto) pide la imagen ya en la primera carga; `lazy` la
   * difiere hasta que el navegador llega a ella (Fase 47, tarea 47.7).
   *
   * El avatar del header y el del perfil están siempre visibles, así que van
   * `eager`. En un listado de atletas, en cambio, son decenas de imágenes
   * apiladas: cargarlas todas de golpe retrasa el resto de la pantalla a cambio
   * de fotos que nadie está mirando todavía. Esos usan `lazy`.
   */
  loading?: "eager" | "lazy";
};

const SIZES = {
  sm: 24,
  md: 36,
  lg: 96,
  // xl se usa en la pagina de perfil, donde el avatar es el foco visual.
  xl: 128,
} as const;

export function Avatar({
  userId,
  name,
  avatarKey,
  size = "md",
  loading = "eager",
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
      // Sin esto el navegador descarga los avatares de toda la tabla de atletas
      // antes de mostrar nada de ella.
      loading={loading}
      decoding="async"
      style={{ width: px, height: px, objectFit: "cover" }}
    />
  );
}
