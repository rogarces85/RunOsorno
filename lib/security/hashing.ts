/**
 * Hashing de contraseñas con PBKDF2-HMAC-SHA512 nativo (WebCrypto).
 *
 * Sustituye a bcryptjs: en Cloudflare Workers cada login ejecuta el hashing en
 * CPU pura, y bcryptjs es Blowfish interpretado en JavaScript (~450-770 ms con
 * 12 rondas). PBKDF2 corre en la implementación nativa de WebCrypto (disponible
 * tanto en `workerd` como en Node >= 15), que es ~50-100x más rápida para la
 * misma seguridad. Eso reduce el consumo de CPU por login y evita los cortes
 * `exceededCpu` del plan Free (10 ms por invocación).
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
 * 210.000 es el valor que recomienda OWASP para PBKDF2-HMAC-SHA512 (que en
 * CPUs de 64 bits es más rápido que SHA-256 a igualdad de seguridad). Como el
 * derivado corre nativo, este coste entra con holgura en el presupuesto de CPU.
 */
export const PBKDF2_ITERATIONS = 210_000;

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

  const derived = new Uint8Array(await derive(password, salt, iterations));
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
  "pbkdf2-sha512$210000$bam1Y8nZ4FwcvV5+NxG3HQ==$7n2uvBjuGqxlfvuYTaJXn3zvBpnkGEUhJ+A609iw0GuahQlg8HhsOsU5OCT3dINH1r/FbfUbJCgl06HF0tcHGQ==";
