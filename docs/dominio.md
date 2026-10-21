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

## Estado (verificado el 2026-10-21)

| Paso | Estado |
|---|---|
| Dominio registrado | **Hecho** |
| Webmail de Nominalia con buzones `@runosorno.online` | Activo (MX `mail.nominalia.com`) |
| Zona en Cloudflare | **Hecho y `active`** — id `13f2630f1bd320d360f8d65c03c67a7c`, plan Free |
| Nameservers cambiados a Cloudflare | **Hecho y propagado**: `clint.ns.cloudflare.com` / `meadow.ns.cloudflare.com` responden en 1.1.1.1 y 8.8.8.8 |
| Registros heredados de Nominalia | **Intactos**: MX `mail.nominalia.com`, SPF `v=spf1 include:spf.webapps.net ~all` |
| DKIM de Resend | **Publicada**: TXT `resend._domainkey` → clave RSA-1024 de 218 caracteres (DER de 162 bytes, íntegra) |
| Sending de Resend | **Publicado**: CNAME `send` → `send.forge.rmta.net` (MX `feedback.forge.rmta.net`, SPF `ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24`) y CNAME `rsend` → `rsend-sae1.forge.rmta.net` (MX `feedback-smtp.sa-east-1.amazonses.com`) |
| CNAME de tracking | **Falta** (`links` → `links1.resend-dns.com`), solo si Resend lo pide y se quiere tracking |
| SPF del raíz | **Falta** incluir a Resend (recomendado, no bloqueante: ver abajo) |
| Dominio verificado en Resend | **Sin confirmar** (hace falta la API key o mirar el panel) |
| `runosorno.online` como dominio del Worker | **Pendiente** → hoy el apex y `www` devuelven **503 "no SSL certificate configured for this domain"** |
| `RESEND_FROM` y `APP_URL` en el Worker | **Pendiente** (siguen los de prueba) |

### El 503 del dominio propio

El apex y `www` resuelven a las IP de Cloudflare (104.21.40.14 / 172.67.174.43),
que son los **registros de parking que Cloudflare crea solo al añadir la zona**.
No hay certificado para el dominio porque **el dominio todavía no se ha
registrado como dominio del Worker**: sin eso, Cloudflare no emite el
certificado y contesta 503 con la página "SSL Error".

El Worker no se rompió: `workers.dev/login` y `workers.dev/api/health` devuelven
200. Se arregla con el paso 7 (agregar el dominio en *Domains & Routes*).

> **El router de casa bloquea el dominio.** El DNS local (FortiGuard SDNS)
> responde con la página "Fortiguard SDNS Blocked Page" y un certificado
> inválido. Desde la red del dueño, `runosorno.online` no abre aunque esté
> todo bien en producción. Solución: poner 1.1.1.1 / 8.8.8.8 como DNS del
> router o del dispositivo, o excluir el dominio del filtro.

### SPF del raíz: recomendado, no obligatorio

Resend lleva su SPF en el subdominio `send` (con el CNAME, la resolución sigue
la cadena y encuentra `v=spf1 ip4:52.3.252.119 ip4:44.222.39.36
ip4:199.249.231.0/24 ~all`), así que el *return-path* pasa el SPF. El dominio
**visible** (`runosorno.online`) tiene `include:spf.webapps.net ~all`, que no
autoriza esas IP: da *softfail*. Como la DKIM está firmada y alineada, **el
correo se entrega igual**.

Para dejar el SPF limpio, se **edita** el registro existente (nunca se agrega
otro) y se le añade el include de Resend:

```
v=spf1 include:spf.webapps.net include:send.runosorno.online ~all
```

Se mantiene `spf.webapps.net` para que el webmail de Nominalia siga
autorizado.

## Puesta en marcha

### 1. Crear la zona en Cloudflare — **hecho (a mano por el dueño)**

Panel de Cloudflare → **Add a site** → `runosorno.online` → plan **Free**.
Cloudflare asignó `clint.ns.cloudflare.com` y `meadow.ns.cloudflare.com`.

> El token OAuth de Wrangler local **no** puede crearla (`zone.create` → 403)
> ni leer los registros (`dns_records` → 403): sirve para leer la zona, no para
> escribirla. Un *API Token* con **Zone:Edit** + **DNS:Edit** +
> **Workers:Edit** sí permitiría escribir los registros y registrar el dominio
> del Worker por API.

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

**La fuente de verdad es la pestaña *Records* del dominio en Resend**: se copian
los registros tal cual. Para un dominio creado en 2026 Resend puede pedir la
pareja `MX`+`TXT` o dos `CNAME`; por eso el paso es copiar, no inventar.

Lo que Resend pide para **enviar** (los subdominios son de Resend, no del
webmail, así que no chocan con el MX raíz de Nominalia):

| Tipo | Nombre | Valor |
|---|---|---|
| TXT | `resend._domainkey` | clave DKIM `p=…` que genera Resend (copiar entera, sin comillas ni espacios) |
| MX | `send` | `feedback-smtp.<region>.amazonses.com` (prioridad 10) — o CNAME si Resend lo pide así |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` — o CNAME si Resend lo pide así |
| CNAME | `links` | `links1.resend-dns.com` (tracking, opcional) |

Además, **en el raíz**:

| Tipo | Nombre | Valor | Nota |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:spf.webapps.net include:amazonses.com ~all` | **Un solo registro SPF**: los dos `include` en la misma línea. Dos registros SPF invalidan el correo (permerror). Se **edita** el existente, no se agrega otro |
| MX | `@` | `mail.nominalia.com` (pref. 10) | **No se toca**: es el webmail, y `contacto@` sigue recibiendo |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:contacto@runosorno.online` | Opcional, recomendado |

> El `include:amazonses.com` en el SPF raíz es lo que autoriza a SES a enviar
> en nombre de `runosorno.online` (el `From` visible). El SPF del subdominio
> `send` es el *return-path* (rebotes). Con DKIM firmado en
> `resend._domainkey`, el correo queda firmado y verificado.

Trampas conocidas al publicar en Cloudflare:

- Los **CNAME deben quedar en «DNS only»** (nube gris, no naranja). Un registro
  proxied no resuelve como CNAME y la verificación de Resend nunca termina.
- Si el panel de Cloudflare **añade el dominio al valor** de un MX o CNAME
  (`…amazonses.com.runosorno.online`), hay que terminar el valor con un
  **punto**: `feedback-smtp.us-east-1.amazonses.com.`
- Un CNAME no puede convivir con otro registro del mismo subdominio.

### 5-bis. Comprobar los registros

```bash
nslookup -type=TXT resend._domainkey.runosorno.online
nslookup -type=MX  send.runosorno.online
nslookup -type=TXT send.runosorno.online
nslookup -type=TXT runosorno.online      # SPF: una sola línea con los dos include
```

Cada valor tiene que coincidir **exactamente** con el de la pestaña *Records*
de Resend.

### 6. Verificar en Resend y cambiar el remitente

Resend marca el dominio como `verified` cuando los registros ya resuelven
(la DKIM y los dos CNAME están publicados; en ~15 minutos debería bastar). Se
puede forzar con `POST https://api.resend.com/domains/<id>/verify`.

Después, en `wrangler.jsonc`:

```jsonc
"APP_URL": "https://runosorno.online",
"RESEND_FROM": "RunOsorno <no-reply@runosorno.online>",
```

y se redespliega (`npm run deploy` o push a `main`). Los correos que hasta
ahora salían con `onboarding@resend.dev` pasan a salir del dominio y llegan a
cualquier destinatario.

> **El ajuste del panel no cambia el remitente.** `lib/services/email.service.ts`
> resuelve el `from` con `env.resendFrom` primero y solo cae al valor por
> defecto si la variable está vacía; el ajuste "Remitente de emails" de
> `/admin/settings` se guarda en la base pero no manda sobre el envío. Para
> cambiar de remitente hay que tocar `wrangler.jsonc` y redesplegar.

> **`APP_URL` espera al dominio propio.** Cambiarlo antes de que
> `runosorno.online` sirva la app pone enlaces rotos en los correos. Los dos
> valores se cambian en el mismo despliegue, después del paso 7.

### 7. Registrar el dominio en el Worker

Con la zona activa en Cloudflare, el Worker `runosorno` puede tomar
`runosorno.online` como dominio propio. **Dos caminos:**

- **Panel (lo hace el dueño):** Cloudflare → *Workers & Pages* → `runosorno` →
  *Settings* → *Domains & Routes* → *Add* → *Custom domain* → `runosorno.online`.
  Repetir con `www.runosorno.online`. Cloudflare crea el certificado, pone el
  CNAME del Worker y **reemplaza el A del parking de Nominalia** (`81.88.48.71`)
  por la ruta del Worker.
- **API:** `POST https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/domains`
  con `{"hostname": "runosorno.online", "service": "runosorno", "zone_name": "runosorno.online"}`.
  El token OAuth de Wrangler local **no** puede: devuelve `10405 Method not
  allowed for this authentication scheme`. Necesita un *API Token* con
  **Workers:Edit**.

`workers.dev` sigue funcionando como respaldo mientras tanto.

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
