import { headers } from "next/headers";

/**
 * Obtiene la IP del cliente para registrarla en `audit_logs`.
 *
 * Detras de Cloudflare (o cualquier proxy) la IP real llega en
 * `cf-connecting-ip`. Sin proxy se usa `x-forwarded-for` (tomando la
 * primera IP de la cadena) o `x-real-ip`.
 *
 * Se valida el formato porque el valor va a una columna varchar(45) y
 * los headers son controlados por el cliente: sin validar, un atacante
 * podria inyectar texto arbitrario en los logs.
 */
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** IPv6 abreviado (x.x.x.x::x) o completo. */
const IPV6 = /^[0-9a-fA-F:.]{2,45}$/;

function isPlausibleIp(value: string): boolean {
  if (IPV4.test(value)) {
    // Cada octeto debe estar entre 0 y 255.
    return value
      .split(".")
      .every((octet) => Number(octet) >= 0 && Number(octet) <= 255);
  }
  return value.includes(":") && IPV6.test(value);
}

export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();

  const candidates = [
    headersList.get("cf-connecting-ip"),
    headersList.get("x-real-ip"),
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const value = candidate.trim();
    if (isPlausibleIp(value)) {
      return value;
    }
  }
  return null;
}
