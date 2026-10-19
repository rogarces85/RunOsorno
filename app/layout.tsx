import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RunOsorno",
  description: "Plataforma de gestión de entrenamiento de running",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" data-bs-theme="light" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
