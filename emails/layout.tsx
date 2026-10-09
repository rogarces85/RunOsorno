import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function EmailLayout({
  preview,
  title,
  children,
}: {
  preview: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>RunOsorno</Text>
          </Section>
          <Heading style={h1}>{title}</Heading>
          {children}
          <Hr style={hr} />
          <Text style={footer}>
            RunOsorno — Plataforma de gestión de entrenamiento de running.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f8fafc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const container = {
  maxWidth: "480px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const header = {
  backgroundColor: "#0d6efd",
  borderRadius: "8px 8px 0 0",
  padding: "16px 24px",
};

const brand = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0",
};

const h1 = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#0f172a",
  margin: "24px 24px 8px",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px",
};

const footer = {
  color: "#64748b",
  fontSize: "12px",
  margin: "0 24px 24px",
};
