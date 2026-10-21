/**
 * Purga la cache incremental de R2 (bucket `runosorno-cache`).
 *
 * Por que: despues de un despliegue quedan objetos de la build anterior en el
 * bucket. OpenNext versiona la clave con el build id, asi que no se sirven
 * como respuesta... pero el error observado en produccion era
 * `TypeError: components.ComponentMod.handler is not a function` en peticiones
 * nuevas, que apunta a artefactos viejos (modulo del proxy/middleware) y no al
 * HTML cacheado. Purgar el bucket deja la cache limpia: es regenerable y se
 * vuelve a llenar sola.
 *
 * Necesita las credenciales S3 de R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) en el entorno.
 *
 *   npx tsx scripts/purgar-cache.ts
 */
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME ?? "runosorno-cache";

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error(
    "Faltan R2_ACCOUNT_ID, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY.",
  );
  process.exit(1);
}

const cliente = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function main() {
  console.log(`Bucket: ${bucket}`);
  let borrados = 0;
  let total = 0;

  for (;;) {
    const listado = await cliente.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000 }),
    );
    const objetos = listado.Contents ?? [];
    total += objetos.length;
    if (objetos.length === 0) break;

    await cliente.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: objetos.map((o) => ({ Key: o.Key })) },
      }),
    );
    borrados += objetos.length;
    console.log(`  borrados ${borrados}...`);
    if (!listado.IsTruncated) break;
  }

  console.log(`\nListados: ${total} · borrados: ${borrados}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
