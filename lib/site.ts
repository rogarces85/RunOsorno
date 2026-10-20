/**
 * Datos del sitio público: marca y contacto en un solo lugar.
 *
 * La casilla es la personal del dueño mientras no exista dominio propio
 * (`runosorno.cl` está pendiente). Cuando se cree `contacto@runosorno.cl` se cambia
 * aquí y todos los enlaces de la landing quedan actualizados.
 *
 * El canal es `mailto:` a propósito: no hay formulario ni backend de leads todavía, y
 * un formulario exigiría Resend verificado, rate limiting y antispam.
 */
export const SITE = {
  nombre: "RunOsorno Training",
  claim: "Planifica · Entrena · Evoluciona",
  descripcionCorta:
    "La plataforma que conecta entrenadores y atletas de running y trail running: planificación semanal, registro de sesiones y seguimiento del cumplimiento en un solo lugar.",
  email: "rodrigo.garces.guerrero@gmail.com",
  asunto: "Quiero información sobre RunOsorno Training",
  url: "http://localhost:3000",
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
