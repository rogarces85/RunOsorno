import { existsSync } from "node:fs";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

type Database = ReturnType<typeof createDatabase>;

function createDatabase(uri: string) {
  // La cadena de Hyperdrive puede traer parametros (`ssl-mode`, etc.) que
  // mysql2 no entiende: avisa "Ignoring invalid configuration option" en cada
  // conexion y ensucia los logs. El proxy de Hyperdrive no necesita TLS entre
  // el Worker y el edge, asi que se descarta la query string.
  const sinParametros = uri.split("?")[0];

  return drizzle({
    connection: {
      uri: sinParametros,
      // `disableEval` es obligatorio en Cloudflare Workers y opcional en el
      // resto. mysql2 arma el parser de filas con `generate-function`, que
      // compila código con `new Function`; workerd prohíbe generar código desde
      // cadenas y toda consulta revienta con:
      //   "Code generation from strings disallowed for this context".
      // Con esta opción mysql2 usa su parser estático, que interpreta el
      // paquete fila por fila. Es algo más lento que el compilado, pero es el
      // camino que el propio mysql2 ofrece para entornos sin `eval`, y en Node
      // no aporta nada negativo.
      disableEval: true,
      // Un pool **por petición** (Workers no permite compartir I/O entre
      // peticiones), pero de **una sola conexión**. El valor por defecto de
      // mysql2 es 10, y Hyperdrive tiene `origin_connection_limit: 20`: con
      // tres o cuatro prefetch simultáneos el origen se agota y las peticiones
      // se quedan esperando (se vio una colgada 10 minutos). Como cada
      // petición solo hace consultas en serie, no necesita más de una.
      connectionLimit: 1,
    },
    schema,
    mode: "default",
  });
}

/**
 * Connection string de producción (Fase 43).
 *
 * En Cloudflare Workers la conexión no puede ir por `DATABASE_URL`: el Worker
 * habla con MySQL a través del binding de Hyperdrive, que además aporta pool de
 * conexiones y caché de consultas en el edge. Fuera de Workers (desarrollo,
 * scripts, tests) se sigue usando `DATABASE_URL` de `.env.local`.
 *
 * `getCloudflareContext()` lanza cuando no hay contexto de Cloudflare —en
 * `tsx`, en Vitest o durante el build de Next—, y ese error es precisamente la
 * señal de "aquí no hay Cloudflare", no un fallo.
 */
type HyperdriveBinding = { connectionString?: string };

/**
 * Contexto de la petición en curso, o `null` si no estamos en Cloudflare.
 *
 * OpenNext lo guarda en un `AsyncLocalStorage` y construye un objeto nuevo en
 * cada petición, así que sirve de identidad para saber si el cliente de base
 * sigue siendo válido (ver `getDatabase`).
 */
function currentContext(): unknown {
  try {
    return getCloudflareContext();
  } catch {
    return null;
  }
}

function resolveUri(context: unknown): string {
  // Se accede por índice y no por propiedad porque la interfaz `CloudflareEnv`
  // que declara el paquete solo conoce los bindings de OpenNext. La generación
  // de tipos (`npm run cf-typegen`) aún no existe porque Hyperdrive se crea
  // después de levantar la base de producción.
  const env = (context as { env?: Record<string, unknown> } | null)?.env;
  const hyperdrive = env?.HYPERDRIVE as HyperdriveBinding | undefined;
  if (hyperdrive?.connectionString) {
    return hyperdrive.connectionString;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No hay conexión a la base: falta el binding HYPERDRIVE en Cloudflare " +
        "o DATABASE_URL en el entorno local.",
    );
  }
  return url;
}

let cached: { context: unknown; database: Database } | null = null;

/**
 * Devuelve el cliente de la petición en curso, creándolo si hace falta.
 *
 * El cliente **no se puede compartir entre peticiones**: en Workers, una
 * conexión creada durante la petición A no puede usarse desde la B, y mysql2
 * falla con `Cannot perform I/O on behalf of a different request`. Por eso se
 * memoriza junto al contexto de la petición y se rehace en cuanto cambia.
 *
 * Fuera de Workers el contexto siempre es `null`, así que la comparación da
 * igual y se reutiliza una sola instancia: es lo correcto, porque en Node no
 * existe el aislamiento de I/O por petición.
 */
function getDatabase(): Database {
  const context = currentContext();
  if (!cached || cached.context !== context) {
    cached = { context, database: createDatabase(resolveUri(context)) };
  }
  return cached.database;
}

/**
 * Cliente de Drizzle para toda la aplicación.
 *
 * Es un `Proxy` sobre una instancia perezosa: la conexión se resuelve en el
 * primer uso y no al importar el módulo, porque durante el build de Next
 * (`/login` se prerenderiza) todavía no hay petición ni binding disponible.
 * Así los 27 módulos que hacen `db.select()` no necesitan saber nada de
 * Cloudflare, y en local sigue funcionando igual que siempre.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const real = getDatabase() as unknown as Record<string | symbol, unknown>;
    const value = real[property];
    // Los métodos de Drizzle usan `this`: hay que devolverlos ligados a la
    // instancia real, no al proxy.
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
  has(_target, property) {
    return property in (getDatabase() as object);
  },
});
