# Dominio `runosorno.online`

Ficha del dominio, plan de puesta en marcha y calendario de renovación.
Documento de referencia: si el dominio se renueva, se cambia de DNS o se
verifica en Resend, este archivo se actualiza.

## Datos del dominio

| Dato | Valor |
|---|---|
| Dominio | `runosorno.online` |
| Registrador | Nominalia |
| Nameservers actuales | `dns1.nominalia.com` (81.88.61.3) · `dns2.nominalia.com` (81.88.63.48) |
| A actual | 208.91.112.55 (parking de Nominalia) |
| MX actual | `mail.nominalia.com` (pref. 10) — webmail de Nominalia |
| SPF actual | `v=spf1 include:spf.webapps.net ~all` (correo de Nominalia) |
| Registro | 2026-10-21 |
| **Expiración** | **2027-10-21** |
| Avisos de renovación | 2027-09-21 (30 días) y 2027-10-14 (7 días) |

Calendario importable: [`renovacion-dominio.ics`](./renovacion-dominio.ics).

## Qué se quiere conseguir

Dos cosas, y ninguna bloquea a la otra:

1. **Correo propio.** Hoy el remitente es `RunOsorno <onboarding@resend.dev>`,
   que **solo entrega al correo dueño de la cuenta de Resend**. Con el dominio
   verificado en Resend, atletas y coaches reciben los correos de verdad
   (plan publicado, sesión completada, anuncios del Director Técnico).
2. **URL propia.** Hoy la app vive en
   `https://runosorno.rodrigo-garces-guerrero.workers.dev`. Con el dominio como
   *custom domain* del Worker, la app queda en `https://runosorno.online`.

## Estado (2026-10-21)

| Paso | Estado |
|---|---|
| Dominio registrado | **Hecho** |
| Webmail de Nominalia con buzones `@runosorno.online` | Activo (falta crear `contacto@`) |
| Zona en Cloudflare | **Pendiente** (el token de Wrangler no puede crearla: `zone.create` → 403) |
| Nameservers cambiados a Cloudflare | **Pendiente** |
| Dominio creado en Resend | **Pendiente** (falta `RESEND_API_KEY` en local) |
| Registros SPF/DKIM/DMARC publicados | **Pendiente** |
| Dominio verificado en Resend | **Pendiente** |
| `RESEND_FROM` y `APP_URL` en el Worker | **Pendiente** (siguen los de prueba) |
| `runosorno.online` como dominio del Worker | **Pendiente** |

## Puesta en marcha

### 1. Crear la zona en Cloudflare (lo hace el dueño)

Panel de Cloudflare → **Add a site** → `runosorno.online` → plan **Free**.
Cloudflare asigna dos nameservers del tipo `ana.ns.cloudflare.com`.

Alternativa: un *API Token* de Cloudflare con **Zone:Edit** y **DNS:Edit**
sobre `runosorno.online` permite que lo haga todo por API (crear la zona,
escribir los registros y registrar el dominio del Worker). El token OAuth de
Wrangler local **no** alcanza: solo tiene lectura de zonas.

### 2. Cambiar los nameservers en Nominalia (lo hace el dueño)

En el panel de Nominalia, en el dominio `runosorno.online`, se reemplazan
`dns1.nominalia.com` y `dns2.nominalia.com` por los dos de Cloudflare.

**Aviso importante:** el DNS del dominio pasa a estar administered por
Cloudflare. El **webmail de Nominalia sigue funcionando**, pero los registros
MX y SPF de Nominalia hay que **copiarlos** a Cloudflare (paso 5) antes de que
la propagación del cambio los haga desaparecer. Se puede dejar el MX de
Nominalia (`mail.nominalia.com`) para que el buzón `contacto@` siga
recibiendo, y añadir el de Resend con prioridad mayor.

La propagación puede tardar de minutos a 24 h. Se comprueba con:

```bash
nslookup -type=NS runosorno.online
```

### 3. Crear el buzón de contacto (lo hace el dueño)

En el webmail de Nominalia: `contacto@runosorno.online`. Es el destino de
contacto que muestra la landing (`lib/site.ts`).

### 4. Crear el dominio en Resend (lo hace la IA con la API key)

`POST https://api.resend.com/domains` con `{"name": "runosorno.online"}`.
Resend devuelve los registros que hay que publicar (DKIM y SPF).

### 5. Publicar los registros DNS (lo hace la IA o el dueño)

En el DNS de Cloudflare:

| Tipo | Nombre | Valor | Nota |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:spf.webapps.net include:amazonses.com ~all` | **Un solo registro SPF**: los dos `include` en la misma línea. Dos registros SPF invalidan el correo (permerror) |
| TXT/CNAME | el que indique Resend (p. ej. `resend._domainkey`) | clave DKIM de Resend | Firma de los correos |
| MX | `@` | `mail.nominalia.com` (pref. 10) | Webmail de Nominalia |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:contacto@runosorno.online` | Opcional, pero recomendado |

> Con el MX de Nominalia se conserva el buzón `contacto@`. Los correos salientes
> los firma DKIM de Resend, así que **no hace falta** cambiar el MX para enviar.

### 6. Verificar en Resend y cambiar el remitente

Resend marca el dominio como `verified` cuando los registros ya resuelven.
Después, en `wrangler.jsonc`:

```jsonc
"APP_URL": "https://runosorno.online",
"RESEND_FROM": "RunOsorno <no-reply@runosorno.online>",
```

y se redespliega (`npm run deploy` o push a `main`). Los correos que hasta
ahora salían con `onboarding@resend.dev` pasan a salir del dominio y llegan a
cualquier destinatario.

### 7. Registrar el dominio en el Worker

Con la zona activa en Cloudflare, el Worker `runosorno` puede tomar
`runosorno.online` como dominio propio:

```
POST https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/domains
{"hostname": "runosorno.online", "service": "runosorno", "zone_name": "runosorno.online"}
```

(lo mismo con `www.runosorno.online`). Cloudflare crea el certificado y
redirige. `workers.dev` sigue funcionando como respaldo.

## Renovación

| Cuándo | Qué hacer |
|---|---|
| **2027-09-21** | **Primer aviso.** Renovar en Nominalia por 1 año más (o el que se ofrezca). |
| **2027-10-14** | **Segundo aviso.** Confirmar que la renovación quedó aplicada. |
| **2027-10-21** | **Expiración.** Si no se renueva, se pierden el sitio, el correo y los buzones. |

Renovar **no** afecta al DNS ni a Cloudflare: los nameservers y los registros
publicados siguen siendo válidos. Lo que sí hay que revisar después de renovar
es que la fecha de expiración en este documento y en
`docs/renovacion-dominio.ics` se actualicen, y que el aviso en el calendario
se reprograme.

## Consecuencia de no renovar

El dominio deja de resolver: la app en `runosorno.online` cae, los buzones
`@runosorno.online` dejan de recibir y Resend deja de entregar el correo con
ese remitente. La cuenta de Resend y la de Cloudflare siguen existiendo, pero
el remitente `no-reply@runosorno.online` se vuelve inválido y hay que volver
al de pruebas.

## Referencias

- `docs/setup-servicios.md` §4 — configuración de Resend.
- `docs/despliegue.md` — despliegue y secretos del Worker.
- `docs/roadmap.md` §1 (M2) — estado de la entrega.
