/**
 * Hashing de contraseñas con PBKDF2-HMAC-SHA512 nativo (WebCrypto).
 *
 * Sustituye a bcryptjs: en Cloudflare Workers cada login ejecuta el hashing en
 * CPU pura, y bcryptjs es Blowfish interpretado en JavaScript (~450-770 ms con
 * 12 rondas). PBKDF2 corre en la implementación nativa de WebCrypto (disponible
 * tanto en `workerd` como en Node >= 15), que es ~50-100x más rápida para la
 * misma seguridad.
 *
 * Las iteraciones van en **100.000**, no en las 210.000 que recomienda OWASP para
 * SHA-512: `workerd` rechaza por encima de 100.000 con `NotSupportedError` y ese
 * error rompía el login en producción. Ver `PBKDF2_ITERATIONS`.
 *
 * Los hashes se guardan con un prefijo versionado para poder migrar sin
 * romper cuentas existentes:
 *
 *   pbkdf2-sha512$<iteraciones>$<salt base64>$<hash base64>
 *
 * Los hashes bcrypt antiguos (`$2a$`, `$2b$`, `$2y$`) se siguen verificando
 * (con un import perezoso de bcryptjs) y se reescriben a PBKDF2 en el siguiente
 * login correcto. Ver `needsRehash`.
 */

const ALGORITHM = "pbkdf2-sha512";

/**
 * Iteraciones de PBKDF2-HMAC-SHA512.
 *
 * 100.000 es el techo que impone el runtime de Cloudflare Workers: `workerd`
 * rechaza con `NotSupportedError: Pbkdf2 failed: iteration counts above 100000
 * are not supported` cualquier valor mayor, y ese error tumbaba el login en
 * producción (500 en la página de error) aunque el código y la base estuvieran
 * bien. Además encaja con el límite de 10 ms de CPU del plan Free: 100.000
 * iteraciones nativas de SHA-512 entran en el presupuesto, 210.000 no.
 *
 * OWASP recomienda 210.000 para SHA-512, pero ese valor no es derivable en el
 * runtime donde vive la app. Si en el futuro la app se mueve a un runtime con más
 * CPU (una VM), el valor puede subir de nuevo: el número va dentro del hash, así
 * que las cuentas existentes se reescriben solas al hacer login (ver `needsRehash`).
 */
export const PBKDF2_ITERATIONS = 100_000;

/**
 * Máximo de iteraciones que acepta `crypto.subtle` en Workers.
 *
 * Un hash guardado con más iteraciones (los 210.000 de la versión anterior) no se
 * puede derivar con WebCrypto aquí: la verificación cae al camino de compatibilidad
 * con `node:crypto`, y si tampoco está disponible devuelve `false` en vez de romper
 * el login.
 */
export const PBKDF2_MAX_ITERATIONS = 100_000;

const KEY_BYTES = 64; // 512 bits de salida
const SALT_BYTES = 16; // 128 bits de sal aleatoria

function isLegacyBcrypt(stored: string): boolean {
  return (
    stored.startsWith("$2a$") ||
    stored.startsWith("$2b$") ||
    stored.startsWith("$2y$")
  );
}

function toBase64(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i++) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binario = atob(b64);
  const out = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    out[i] = binario.charCodeAt(i);
  }
  return out;
}

/** Comparación en tiempo constante, para no filtrar el prefijo del hash. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<ArrayBuffer> {
  return crypto.subtle
    .importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
      "deriveBits",
    ])
    .then((key) =>
      crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-512", salt, iterations },
        key,
        KEY_BYTES * 8,
      ),
    );
}

/** Deriva el hash de una contraseña nueva con sal aleatoria. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = new Uint8Array(await derive(password, salt, PBKDF2_ITERATIONS));
  return `${ALGORITHM}$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

/**
 * Deriva con `node:crypto` cuando WebCrypto no puede (iteraciones por encima del
 * máximo del runtime). Es el camino de compatibilidad para los hashes de la
 * versión anterior (210.000 iteraciones). Si `node:crypto` no está disponible,
 * devuelve `null` y la verificación falla de forma controlada.
 */
async function deriveCompat(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const { pbkdf2Sync } = await import("node:crypto");
    const buffer = Buffer.from(salt);
    const derivado = pbkdf2Sync(
      password,
      buffer,
      iterations,
      KEY_BYTES,
      "sha512",
    );
    return new Uint8Array(derivado);
  } catch {
    return null;
  }
}

/**
 * Verifica una contraseña contra un hash almacenado.
 *
 * Acepta los dos formatos: PBKDF2 (nativo) y bcrypt heredado (que se resuelve
 * con un import perezoso de bcryptjs y solo mientras existan cuentas sin
 * migrar). Nunca lanza por un hash malformado: devuelve `false`.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (isLegacyBcrypt(stored)) {
    const { compare } = await import("bcryptjs");
    return compare(password, stored);
  }

  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== ALGORITHM) return false;

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  let salt: Uint8Array<ArrayBuffer>;
  let expected: Uint8Array<ArrayBuffer>;
  try {
    salt = fromBase64(parts[2]);
    expected = fromBase64(parts[3]);
  } catch {
    return false;
  }

  let derived: Uint8Array<ArrayBuffer> | null;
  if (iterations > PBKDF2_MAX_ITERATIONS) {
    // WebCrypto no lo permite en Workers: se intenta el camino de compatibilidad.
    derived = await deriveCompat(password, salt, iterations);
  } else {
    derived = new Uint8Array(await derive(password, salt, iterations));
  }
  if (!derived) return false;
  return constantTimeEqual(derived, expected);
}

/**
 * Indica si un hash debe regenerarse con los parámetros actuales.
 *
 * Cierto para bcrypt heredado y para PBKDF2 con un número de iteraciones
 * distinto al vigente; es la señal que usa `authenticate` para reescribir el
 * hash en el siguiente login correcto sin obligar al usuario a cambiar la
 * contraseña.
 */
export function needsRehash(stored: string): boolean {
  if (isLegacyBcrypt(stored)) return true;
  const parts = stored.split("$");
  return (
    parts.length !== 4 ||
    parts[0] !== ALGORITHM ||
    Number(parts[1]) !== PBKDF2_ITERATIONS
  );
}

/**
 * Hash falso para igualar el coste cuando el email no existe.
 *
 * `authenticate` lo verifica contra la contraseña recibida para que un email
 * inexistente tarde lo mismo que uno real y no se pueda enumerar la base de
 * usuarios midiendo tiempos. Usa las mismas iteraciones que un hash real.
 */
export const DUMMY_PASSWORD_HASH =
  "pbkdf2-sha512$100000$bYms9Vv32wNoZ+zHnarwoQ==$56M6Hpxj0aduqFvN4g1K/LIsI1nhsmQ7xHlX+Jh1iu27GAqHMHxW1c1ATf3IOdZswiVvJeBCMF9gxrcbXT4Nbw==";
