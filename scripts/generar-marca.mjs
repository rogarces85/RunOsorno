/**
 * Genera los derivados de la marca desde `assets/brand/logo-original.png`.
 *
 * El logo original es un PNG de 1536×1024 con fondo blanco y el lockup completo
 * (símbolo + "RunOsorno" + "Training" + claim + los dos badges). Servirlo tal cual
 * en el header serían 1,1 MB por página y un rectángulo blanco en el tema oscuro.
 *
 * Este script, sin dependencias nuevas (usa el Chromium de Playwright):
 *   1. Quita el fondo blanco con un alfa suave (el fondo real es 253–255, no 255).
 *   2. Recorta las tres piezas por sus cortes verticales medidos en el original.
 *   3. Exporta versiones escaladas, el icono de la app y la imagen para compartir.
 *
 * Uso:  node scripts/generar-marca.mjs
 * Salida: public/brand/*.png, app/icon.png, app/apple-icon.png
 *
 * Para regenerar tras cambiar el logo: reemplazar `assets/brand/logo-original.png`
 * y volver a ejecutar. Si el nuevo original cambia de composición, ajustar CORTES.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";

const ORIGEN = "assets/brand/logo-original.png";
const DESTINO = "public/brand";

/**
 * Cortes verticales del original (medidos sobre 1536×1024):
 * símbolo 136–476 · "RunOsorno Training" 477–752 · claim 753–799 · badges 829–904.
 */
const CORTES = {
  marca: [136, 476],
  lockup: [136, 752],
  completo: [136, 904],
};

const ANCHOS = { marca: 256, lockup: 520, completo: 760 };

const dataUrl = `data:image/png;base64,${readFileSync(ORIGEN).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage();

const resultado = await page.evaluate(
  async ({ dataUrl, anchos, cortes }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height);
    const px = data.data;

    const alfaDe = (x, y) => {
      const i = (y * width + x) * 4;
      const min = Math.min(px[i], px[i + 1], px[i + 2]);
      return 255 * (1 - Math.min(Math.max((min - 240) / 14, 0), 1));
    };

    // Alfa suave sobre todo el lienzo.
    for (let i = 0; i < px.length; i += 4) {
      const min = Math.min(px[i], px[i + 1], px[i + 2]);
      const blanco = Math.min(Math.max((min - 240) / 14, 0), 1);
      px[i + 3] = Math.round(px[i + 3] * (1 - blanco));
    }
    ctx.putImageData(data, 0, 0);

    /** Caja real de contenido (x) para una franja vertical. */
    const cajaX = (y0, y1) => {
      let minX = width;
      let maxX = 0;
      for (let y = y0; y <= y1; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (alfaDe(x, y) > 24) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }
      }
      return { minX, maxX };
    };

    const recortar = (y0, y1) => {
      const { minX, maxX } = cajaX(y0, y1);
      const c = document.createElement("canvas");
      c.width = maxX - minX + 1;
      c.height = y1 - y0 + 1;
      const cx = c.getContext("2d");
      cx.drawImage(canvas, minX, y0, c.width, c.height, 0, 0, c.width, c.height);
      return c;
    };

    // WebP para las piezas con transparencia: mismo aspecto que PNG y una cuarta
    // parte del peso. Los iconos van en PNG opaco y la imagen social en JPEG,
    // porque las redes no siempre aceptan WebP al compartir.
    const escalar = (fuente, ancho, tipo = "image/webp", calidad = 0.88) => {
      const alto = Math.round((fuente.height / fuente.width) * ancho);
      const c = document.createElement("canvas");
      c.width = ancho;
      c.height = alto;
      const cx = c.getContext("2d");
      cx.imageSmoothingQuality = "high";
      cx.drawImage(fuente, 0, 0, ancho, alto);
      return c.toDataURL(tipo, calidad);
    };

    const marca = recortar(cortes.marca[0], cortes.marca[1]);
    const lockup = recortar(cortes.lockup[0], cortes.lockup[1]);
    const completo = recortar(cortes.completo[0], cortes.completo[1]);

    const salida = {
      marca: escalar(marca, anchos.marca),
      lockup: escalar(lockup, anchos.lockup),
      completo: escalar(completo, anchos.completo),
    };

    // Icono de la app: marca centrada sobre blanco. Los iconos opacos se ven igual
    // en cualquier lanzador y no quedan translúcidos sobre fondos oscuros.
    const icono = (lado) => {
      const c = document.createElement("canvas");
      c.width = lado;
      c.height = lado;
      const cx = c.getContext("2d");
      cx.fillStyle = "#ffffff";
      cx.fillRect(0, 0, lado, lado);
      const ancho = Math.round(lado * 0.8);
      const alto = Math.round((marca.height / marca.width) * ancho);
      cx.imageSmoothingQuality = "high";
      cx.drawImage(marca, (lado - ancho) / 2, (lado - alto) / 2, ancho, alto);
      return c.toDataURL("image/png");
    };
    salida.icono512 = icono(512);
    salida.icono180 = icono(180);

    // Imagen para compartir: 1200×630 con el lockup centrado sobre blanco.
    const og = document.createElement("canvas");
    og.width = 1200;
    og.height = 630;
    const ogx = og.getContext("2d");
    ogx.fillStyle = "#ffffff";
    ogx.fillRect(0, 0, 1200, 630);
    const ogAncho = 820;
    const ogAlto = Math.round((lockup.height / lockup.width) * ogAncho);
    ogx.imageSmoothingQuality = "high";
    ogx.drawImage(
      lockup,
      (1200 - ogAncho) / 2,
      (630 - ogAlto) / 2,
      ogAncho,
      ogAlto,
    );
    salida.og = og.toDataURL("image/jpeg", 0.9);

    return {
      medidas: { width, height },
      cajas: {
        marca: cajaX(cortes.marca[0], cortes.marca[1]),
        lockup: cajaX(cortes.lockup[0], cortes.lockup[1]),
        completo: cajaX(cortes.completo[0], cortes.completo[1]),
      },
      salida,
    };
  },
  { dataUrl, anchos: ANCHOS, cortes: CORTES },
);

await browser.close();

mkdirSync(DESTINO, { recursive: true });

const escribir = (ruta, dataUrlPng) => {
  const base64 = dataUrlPng.split(",")[1];
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, Buffer.from(base64, "base64"));
  console.log(`  ${ruta}`);
};

console.log(
  `Original: ${resultado.medidas.width}×${resultado.medidas.height}\n` +
    `Cortes: ${JSON.stringify(CORTES)}\n`,
);

console.log("Archivos generados:");
escribir(join(DESTINO, "logo-mark.webp"), resultado.salida.marca);
escribir(join(DESTINO, "logo-lockup.webp"), resultado.salida.lockup);
escribir(join(DESTINO, "logo-full.webp"), resultado.salida.completo);
escribir(join(DESTINO, "og.jpg"), resultado.salida.og);
escribir("app/icon.png", resultado.salida.icono512);
escribir("app/apple-icon.png", resultado.salida.icono180);
