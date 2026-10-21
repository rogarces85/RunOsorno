/**
 * Datos del sitio público: marca y contacto en un solo lugar.
 *
 * El dominio propio es `runosorno.online` (registrado en Nominalia el 2026-10-21,
 * expira el 2027-10-21). El buzón `contacto@runosorno.online` vive en el webmail
 * de Nominalia; ver `docs/dominio.md` para el estado de la migración de DNS a
 * Cloudflare y el plan de renovación.
 *
 * El canal es `mailto:` a propósito: no hay formulario ni backend de leads todavía, y
 * un formulario exigiría Resend verificado, rate limiting y antispam.
 */
export const SITE = {
  nombre: "RunOsorno Training",
  claim: "Planifica · Entrena · Evoluciona",
  descripcionCorta:
    "La plataforma que conecta entrenadores y atletas de running y trail running: planificación semanal, registro de sesiones y seguimiento del cumplimiento en un solo lugar.",
  email: "contacto@runosorno.online",
  asunto: "Quiero información sobre RunOsorno Training",
  url: "https://runosorno.online",
} as const;

/** Enlace de correo con el asunto de la sección que lo origina. */
export function mailtoContacto(seccion?: string): string {
  const asunto = seccion ? `${SITE.asunto} — ${seccion}` : SITE.asunto;
  return `mailto:${SITE.email}?subject=${encodeURIComponent(asunto)}`;
}

/** Dirección base para metadatos absolutos (Open Graph, canónica, sitemap). */
export function urlAbsoluta(ruta = "/"): string {
  const base = process.env.APP_URL ?? SITE.url;
  return new URL(ruta, base).toString();
}
