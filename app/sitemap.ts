import type { MetadataRoute } from "next";
import { urlAbsoluta } from "@/lib/site";

/**
 * Solo se publican las rutas públicas. Las internas (`/admin`, `/coach`,
 * `/athlete`, `/director`, `/profile`, `/notifications`, `/exports`) exigen sesión y
 * no tienen por qué aparecer en un buscador.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: urlAbsoluta("/"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: urlAbsoluta("/login"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
