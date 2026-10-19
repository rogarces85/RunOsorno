# Recuperar el acceso a la base de producción tras rotar credenciales en Aiven

**Situación (2026-10-14):** el sitio carga pero el login falla porque Hyperdrive
apunta a credenciales que ya no existen. El código está bien; solo se perdió el
acceso a la base.

## Por qué pasó

Al cambiar la credencial en Aiven se creó un usuario nuevo (`admin`) en lugar de
cambiar la clave del usuario que Hyperdrive tenía configurado (`avnadmin`).
Hyperdrive sigue intentando con las credenciales viejas.

## Cómo se arregla

Desde Aiven, en el servicio MySQL:

1. Pestaña **Users**.
2. Elige el usuario que vas a usar. Fíjate en que tenga marcada la base
   `defaultdb` en la columna de bases de datos; si no la tiene, el acceso se
   deniega aunque la contraseña sea correcta.
3. Genera una contraseña nueva.
4. **Pásamela escrita en texto**, no en captura. Una contraseña leída de un
   pantallazo resulted ambigua: ninguna de las variantes de lectura plausible
   (`l/1`, `O/0`, `S/5`, `Z/2`, `B/8`) conectó.

Con el usuario y la contraseña en texto:

```powershell
# 1. Actualizar el binding con las credenciales nuevas
npx wrangler hyperdrive update 1bffd76cc20d423690c4079891d596eb `
  --user=<usuario> --password=<contrasena>

# 2. Redesplegar
npm run deploy

# 3. Verificar login real, cookie y persistencia de la sesión
npx tsx scripts/verify-produccion.ts
```

`verify-produccion.ts` confirma que el login llega al dashboard, que la cookie
sale `Secure` + `HttpOnly`, que la sesión sobrevive a una recarga (o sea, la
base guardó de verdad) y que una ruta protegida sin sesión redirige.

## Nota sobre el DNS

Desde el equipo de desarrollo el hostname de Aiven no resuelve
(`ENOTFOUND`), aunque los DNS públicos sí. Para probar desde local hay que
conectar por IP: `167.172.139.215:12470`. Cloudflare no tiene ese problema
porque usa sus propios resolvers.

## Si vuelve a pasar lo mismo

El síntoma es `ER_ACCESS_DENIED_ERROR` con el handshake de MySQL respondiendo
bien. Eso descarta que el servicio esté apagado y apunta a credenciales o
permisos, no a la aplicación.

## Antes de rotar nada: comprobar las migraciones (2026-10-19)

El 19-10 el login volvió a dar 500 y **no era el acceso**: las credenciales
funcionaban. La base de producción se había quedado en la migración inicial y le
faltaba `login_attempts`, la tabla del rate limiting que se toca en cada login:

```
Failed query: insert into `login_attempts` ...
ER_NO_SUCH_TABLE (1146)
```

Cómo distinguirlo sin adivinar:

1. `npx wrangler tail runosorno` y reintentar el login: el log dice en qué
   consulta falla. Si es `login_attempts` o una tabla nueva, es esquema.
2. `npx wrangler hyperdrive get 1bffd76cc20d423690c4079891d596eb`: si devuelve
   la configuración con normalidad y el Worker conecta (versión de MySQL en los
   logs), las credenciales están bien.
3. Si hay que consultar el esquema real, un Worker temporal con el binding
   `HYPERDRIVE` sirve para leer `information_schema` sin conocer la contraseña.

La solución es aplicar las migraciones pendientes (`0001` a `0003` en ese caso)
y registrar su `hash`/`created_at` en `__drizzle_migrations` con los mismos
valores que la base local. Se hizo con un Worker temporal que después se borró;
la alternativa canónica es `npx drizzle-kit migrate` con el `DATABASE_URL` de
producción.

Ojo con Hyperdrive: **cachea las consultas sueltas**. Un `SELECT` después de un
`INSERT` puede devolver el estado anterior; dentro de una transacción no.