/**
 * Worker temporal para migrar los hashes de contraseña de producción.
 *
 * Por qué: el runtime de Workers rechaza PBKDF2 con más de 100.000 iteraciones
 * (`NotSupportedError`), así que las cuentas que quedaron con 210.000 (de la
 * versión anterior) no se pueden verificar y el login devuelve 500. Este Worker
 * reescribe esos hashes con los parámetros vigentes (100.000) sin necesidad de la
 * contraseña de Aiven: se conecta por el binding de Hyperdrive, igual que la app.
 *
 * Es de un solo uso: se despliega, se invoca una vez y se borra
 * (`npx wrangler delete --config wrangler.migrar.jsonc`).
 *
 * Para invocarlo hace falta el token:
 *   https://runosorno-migrar-hashes.<sub>.workers.dev/?token=<TOKEN>&accion=listar
 *   https://runosorno-migrar-hashes.<sub>.workers.dev/?token=<TOKEN>&accion=migrar
 */

import mysql from "mysql2/promise";

/**
 * Contraseñas conocidas de las cuentas sembradas. Las que no estén en esta lista
 * se listan pero no se pueden migrar: su contraseña no es recuperable y hay que
 * reestablecerla desde el panel de administración.
 */
const CONTRASENAS = {
  "admin@runosorno.cl": "Admin1234!",
  "coach.demo@runosorno.cl": "Demo1234!",
  "director.demo@runosorno.cl": "Demo1234!",
  "coach.pendiente@runosorno.cl": "Demo1234!",
  "maria.fernandez@demo.runosorno.cl": "Demo1234!",
  "carlos.munoz@demo.runosorno.cl": "Demo1234!",
  "sofia.reyes@demo.runosorno.cl": "Demo1234!",
  "matias.gonzalez@demo.runosorno.cl": "Demo1234!",
  "javier.soto@demo.runosorno.cl": "Demo1234!",
  "rodrigo.garces.guerrero@gmail.com": "Demo1234!",
};

const ITERACIONES = 100_000;

function aBase64(bytes) {
  let binario = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario);
}

async function derivar(password, salt, iteraciones) {
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-512", salt, iterations: iteraciones },
    clave,
    64 * 8,
  );
  return new Uint8Array(bits);
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const token = env.MIGRATION_TOKEN ?? "";
    if (!token || url.searchParams.get("token") !== token) {
      return new Response("token inválido", { status: 401 });
    }
    const accion = url.searchParams.get("accion") ?? "listar";

    const conexion = mysql.createPool({
      uri: env.HYPERDRIVE.connectionString,
      disableEval: true,
      connectionLimit: 1,
    });

    try {
      const [usuarios] = await conexion.query(
        "SELECT id, email, role, password_hash FROM users ORDER BY email",
      );

      const resumen = usuarios.map((u) => {
        const partes = String(u.password_hash).split("$");
        return {
          email: u.email,
          role: u.role,
          algoritmo: partes[0],
          iteraciones: Number(partes[1]) || null,
          necesitaMigracion: partes[0] !== "pbkdf2-sha512" || Number(partes[1]) !== ITERACIONES,
          claveConocida: Object.prototype.hasOwnProperty.call(CONTRASENAS, u.email),
        };
      });

      if (accion === "listar") {
        return Response.json({ accion, usuarios: resumen });
      }

      const migrados = [];
      const imposibles = [];
      for (const usuario of usuarios) {
        if (!resumen.find((r) => r.email === usuario.email).necesitaMigracion) {
          continue;
        }
        const clave = CONTRASENAS[usuario.email];
        if (!clave) {
          imposibles.push(usuario.email);
          continue;
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const derivado = await derivar(clave, salt, ITERACIONES);
        const hash = `pbkdf2-sha512$${ITERACIONES}$${aBase64(salt)}$${aBase64(derivado)}`;
        await conexion.query("UPDATE users SET password_hash = ? WHERE id = ?", [
          hash,
          usuario.id,
        ]);
        migrados.push(usuario.email);
      }

      return Response.json({ accion, migrados, imposibles, usuarios: resumen });
    } catch (error) {
      return Response.json(
        { error: String(error) },
        { status: 500 },
      );
    } finally {
      await conexion.end();
    }
  },
};

export default worker;
