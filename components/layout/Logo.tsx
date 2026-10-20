/**
 * Marca oficial de RunOsorno Training.
 *
 * Las piezas salen de `scripts/generar-marca.mjs`, que recorta y quita el fondo
 * blanco del logo original (1,1 MB) y exporta WebP optimizado:
 *
 *   - `mark`     → solo el símbolo (256×87). Shell: sidebar y header.
 *   - `wordmark` → símbolo + “RunOsorno Training” en texto del sistema.
 *   - `lockup`   → símbolo + lettering del logo (520×243). Login y landing.
 *
 * En tema oscuro el arte va sobre una pastilla blanca: el lettering del logo es
 * azul profundo y sobre `#101827` desaparecería. No se invierte el color porque un
 * filtro monocromo se come el detalle del corredor y las líneas de velocidad.
 *
 * Accesibilidad: el nombre lo aporta el `alt` en `mark`/`lockup` y el texto visible
 * en `wordmark` (donde la imagen queda decorativa con `alt=""`). Nunca se usa un
 * `aria-label` que reescriba texto visible.
 */

const MARK = { src: "/brand/logo-mark.webp", width: 256, height: 87 };
const LOCKUP = { src: "/brand/logo-lockup.webp", width: 520, height: 243 };

export function Logo({
  variant = "wordmark",
  className = "",
}: {
  variant?: "mark" | "wordmark" | "lockup";
  className?: string;
}) {
  if (variant === "lockup") {
    return (
      <span className={`app-logo app-logo--lockup ${className}`.trim()}>
        <span className="app-logo-plate">
          {/* eslint-disable-next-line @next/next/no-img-element -- Asset estático optimizado en build; next/image añadiría el optimizador en runtime del Worker. */}
          <img
            src={LOCKUP.src}
            width={LOCKUP.width}
            height={LOCKUP.height}
            alt="RunOsorno Training"
            className="app-logo-lockup"
            decoding="async"
          />
        </span>
      </span>
    );
  }

  return (
    <span className={`app-logo ${className}`.trim()}>
      <span className="app-logo-plate">
        {/* eslint-disable-next-line @next/next/no-img-element -- Ver comentario del lockup. */}
        <img
          src={MARK.src}
          width={MARK.width}
          height={MARK.height}
          alt={variant === "mark" ? "RunOsorno Training" : ""}
          aria-hidden={variant === "mark" ? undefined : true}
          className="app-logo-mark"
          decoding="async"
        />
      </span>
      {variant === "wordmark" ? (
        <span className="app-logo-word">RunOsorno Training</span>
      ) : null}
    </span>
  );
}
