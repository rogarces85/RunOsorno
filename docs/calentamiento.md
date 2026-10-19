# Calentamiento del Worker (P1.5)

## Qué resuelve

Cloudflare Workers **Free** tiene un techo de **10 ms de CPU por invocación**. Un
arranque en frío (cargar el bundle del Worker, inicializar `mysql2`, conectar a
Hyperdrive) suma CPU antes de llegar al login, y en ese momento el `POST /login`
puede morir con `503 Worker exceeded CPU time limit` / `outcome: exceededCpu`.

Un ping periódico mantiene un isolate caliente y reduce esos arranques en frío.
**No sube el techo de 10 ms**: si el login por sí solo sigue pasándose, hay que
ir a la estrategia de fondo (`docs/pendientes.md` → "Estrategia de costo cero
para el login").

## Blanco del ping

```
GET https://runosorno.rodrigo-garces-guerrero.workers.dev/api/health
```

Debe responder `200` con `{"ok":true}`. La ruta:

- **No toca la base de datos** (a propósito: responde aunque Aiven esté caído).
- **No pasa por el middleware** (`proxy.ts` excluye `/api`), así que es pública y
  barata.
- Está pensada para health checks y para este calentamiento.

Verificación puntual:

```bash
npx tsx scripts/verify-health.ts
# o contra local:
BASE_URL=http://localhost:3000 npx tsx scripts/verify-health.ts
```

## Opción A — cron-job.org (recomendada, gratis)

1. Crear una cuenta gratuita en <https://cron-job.org>.
2. **Create cronjob** con estos valores:
   - **Title**: `RunOsorno warm-up`
   - **URL**: `https://runosorno.rodrigo-garces-guerrero.workers.dev/api/health`
   - **Schedule**: cada **1 minuto** (o 2-5 minutos si el plan lo limita).
   - **Request method**: `GET`
   - **Timeout**: 10 s
   - Sin autenticación ni cabeceras especiales.
3. Guardar y usar **Test run**: debe devolver `200` y `{"ok":true}`.
4. En el historial del job se ven las ejecuciones y los códigos de respuesta.

> El plan gratuito de cron-job.org permite trabajos por minuto; alcanza de sobra
> para un solo endpoint. Si cambia el límite, 5 minutos también sirve.

## Opción B — UptimeRobot (gratis, además monitorea)

Útil si además se quiere aviso cuando el sitio se cae.

1. Cuenta gratuita en <https://uptimerobot.com>.
2. **Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `RunOsorno`
   - **URL**: `https://runosorno.rodrigo-garces-guerrero.workers.dev/api/health`
   - **Monitoring Interval**: 5 minutos (plan gratuito).
3. Guardar. El panel muestra el historial y envía alertas por correo si falla.

## Opción C — Cron Trigger nativo de Cloudflare (implementado)

En el repo vive un Worker aparte, `runosorno-calentamiento`
(`workers/calentamiento.mjs` + `wrangler.calentamiento.jsonc`), con un Cron
Trigger de Cloudflare cada 2 minutos. En lugar de envolver el entry de OpenNext
(frágil y no validable en Windows por el `EPERM symlink`), el calentador pide
`/api/health` al Worker principal por un **service binding** (`env.APP`), sin
pasar por Internet.

- **No toca el Worker principal**: si el calentador falla, la app sigue igual.
- **Se despliega solo**: `.github/workflows/deploy.yml` lo publica después del
  Worker principal.
- **Manual**: `npm run deploy:calentamiento`.
- **Validación local**:
  `npx wrangler deploy --config wrangler.calentamiento.jsonc --dry-run`.

Este es el camino recomendado si no se quiere depender de un servicio externo.

## Qué esperar

- Reduce los fallos de login **en frío**; no cambia el coste de CPU de una
  invocación ya caliente.
- Cloudflare tiene isolates por colocación: calienta los que reciben el ping, no
  todos los del mundo. Para un equipo pequeño en Chile suele ser suficiente.
- Si el login sigue cayendo, el problema es de techo de CPU y toca decidir entre
  el KDF en el cliente o mover la autenticación a un runtime con más CPU.
