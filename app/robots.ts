import type { MetadataRoute } from "next";
import { urlAbsoluta } from "@/lib/site";

/**
 * La portada y el login son rastreables; el sistema no. Se bloquea explícitamente
 * cada sección interna aunque ya exija sesión: un buscador no debe recibir
 * redirecciones al login como si fueran contenido.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/coach",
          "/athlete",
          "/director",
          "/profile",
          "/notifications",
          "/exports",
        ],
      },
    ],
    sitemap: urlAbsoluta("/sitemap.xml"),
    host: urlAbsoluta("/"),
  };
}
