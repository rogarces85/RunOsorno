import { headers } from "next/headers";

/**
 * Rate limiting del login (Fase 45, tarea 45.5).
 *
 * Sin esto, el login es un oracle de fuerza bruta ilimitado contra la tabla de
 * usuarios: se pueden probar credenciales a toda velocidad sin dejar rastro.
 *
 * **Por qué en base de datos y no en memoria.** La app corre en Cloudflare
 * Workers, donde cada instancia vive poco y hay miles repartidas por el edge:
 * un contador en memoria dejaría pasar casi todos los intentos. La base ya está
 * ahí y es la única que todos los isolates comparten.
 */

/** Intentos permitidos por ventana. */
export const LOGIN_MAX_ATTEMPTS = 5;

/** Minutos de la ventana. */
export const LOGIN_WINDOW_MINUTES = 15;

/** Clave que usa el fingerprint cuando no se puede determinar la IP. */
const SIN_IP = "desconocida";

/** Milisegundos de una ventana completa. */
const VENTANA_MS = LOGIN_WINDOW_MINUTES * 60 * 1000;

/**
 * Índice de la ventana a la que pertenece un instante.
 *
 * Es la clave del bucket, y va en la clave de la fila porque así las ventanas
 * quedan alineadas a bloques fijos: sin esto, si la clave se derivara de la
 * hora del reloj, cambiaría cada minuto en vez de cada 15 y el límite real
 * pasaría a ser 5 intentos por minuto.
 */
function indiceVentana(now: number): number {
  return Math.floor(now / VENTANA_MS);
}

/**
 * IP real del visitante.
 *
 * Detrás de Cloudflare el `remoteAddress` es la del propio Worker, así que hay
 * que leer las cabeceras que inyecta el edge. Se toma la primera de la cadena
 * `CF-Connecting-IP` / `X-Forwarded-For` porque la primera es el cliente
 * original y las siguientes los intermediarios.
 */
export async function ipDeRequest(): Promise<string> {
  const h = await headers();
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return SIN_IP;
}

/** Clave de la fila que registra los intentos de una IP en la ventana actual. */
export function rateLimitKey(ip: string, now = Date.now()): string {
  return `login:${indiceVentana(now)}:${ip}`;
}

/** Minutos que faltan para que la ventana se reinicie. */
export function minutosParaReintentar(now = Date.now()): number {
  const resto = VENTANA_MS - (now % VENTANA_MS);
  return Math.max(1, Math.ceil(resto / 60000));
}

export type RateLimitVeredicto =
  | { ok: true; restantes: number }
  | { ok: false; restantes: number; minutos: number };

export type RateLimitStore = {
  contar(ip: string, ahora: number): Promise<number>;
};

/**
 * Suma un intento a la IP de este request y devuelve el veredicto.
 *
 * El almacenamiento se recibe por parámetro para poder probar la lógica con un
 * doble en los tests unitarios sin tocar la base real.
 */
export async function registrarIntento(
  store: RateLimitStore,
  ahora = Date.now(),
): Promise<RateLimitVeredicto> {
  const ip = await ipDeRequest();
  const usados = await store.contar(ip, ahora);
  if (usados > LOGIN_MAX_ATTEMPTS) {
    return { ok: false, restantes: 0, minutos: minutosParaReintentar(ahora) };
  }
  return { ok: true, restantes: Math.max(0, LOGIN_MAX_ATTEMPTS - usados) };
}

/** Inicio de la ventana en curso, para el store de base de datos. */
export function inicioVentana(now = Date.now()): Date {
  return new Date(indiceVentana(now) * VENTANA_MS);
}