import type { Metadata } from "next";
import Link from "next/link";
import { BIcon } from "@/components/ui/BIcon";
import {
  FUNCIONALIDADES,
  LINEAS,
  PASOS,
  PREGUNTAS,
  PRODUCTOS,
} from "@/components/marketing/contenido";
import { SITE, mailtoContacto, urlAbsoluta } from "@/lib/site";

/**
 * Landing pública de RunOsorno Training.
 *
 * Todo el texto viene de `components/marketing/contenido.ts` y de `lib/site.ts`:
 * aquí solo hay composición. Sin precios, sin testimonios inventados y sin
 * peticiones a la base de datos.
 */
export const metadata: Metadata = {
  // `absolute` evita que la plantilla del layout raíz repita la marca.
  title: { absolute: `${SITE.nombre} — ${SITE.claim}` },
  description: SITE.descripcionCorta,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: urlAbsoluta("/"),
    siteName: SITE.nombre,
    title: `${SITE.nombre} — ${SITE.claim}`,
    description: SITE.descripcionCorta,
    images: [
      {
        url: "/brand/og.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE.nombre}: ${SITE.claim}`,
      },
    ],
  },
};

export default function LandingPage() {
  return (
    <>
      {/* ===== Hero ===== */}
      <section className="app-hero" aria-labelledby="hero-titulo">
        <div className="app-public-container">
          <div className="app-hero-grid">
            <div className="app-hero-text">
              <p className="app-label app-hero-eyebrow">
                Running y trail running · Chile
              </p>
              <h1 id="hero-titulo" className="app-hero-title">
                Planifica. Entrena. Evoluciona.
              </h1>
              <p className="app-hero-lead">{SITE.descripcionCorta}</p>
              <div className="app-hero-actions">
                <Link href="/login" className="btn app-btn app-btn-primary app-btn-lg">
                  Entrar al sistema
                </Link>
                <a
                  href={mailtoContacto("landing")}
                  className="btn app-btn app-btn-secondary app-btn-lg"
                >
                  Solicitar información
                </a>
              </div>
              <ul className="app-hero-facts">
                <li>Funciona en el navegador, sin instalar nada</li>
                <li>Diseñado para coaches y escuelas</li>
                <li>Tus datos, solo para tu entrenamiento</li>
              </ul>
            </div>

            <div className="app-hero-panel" aria-hidden="true">
              <div className="app-hero-week">
                <div className="app-hero-week-head">
                  <span className="app-label">Semana en curso</span>
                  <span className="app-hero-week-badge">4 sesiones</span>
                </div>
                {[
                  ["Lunes", "Fondo largo", "Completada"],
                  ["Martes", "Descanso", "Planificada"],
                  ["Miércoles", "Series 6×800", "Completada"],
                  ["Jueves", "Tempo 25 min", "En curso"],
                  ["Viernes", "Descanso", "Planificada"],
                ].map(([dia, sesion, estado]) => (
                  <div key={dia} className="app-hero-row">
                    <span className="app-hero-day">{dia}</span>
                    <span className="app-hero-session">{sesion}</span>
                    <span className={`app-hero-state app-hero-state--${estado.toLowerCase().replace(/\s/g, "-")}`}>
                      {estado}
                    </span>
                  </div>
                ))}
              </div>
              <div className="app-hero-chip">
                <span className="app-label">Cumplimiento del equipo</span>
                <strong className="app-numeric">84%</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Cómo funciona ===== */}
      <section className="app-public-section" aria-labelledby="pasos-titulo">
        <div className="app-public-container">
          <header className="app-section-head">
            <p className="app-label">Cómo funciona</p>
            <h2 id="pasos-titulo" className="app-section-title">
              Tres pasos, un mismo lugar
            </h2>
            <p className="app-section-lead">
              El ciclo completo del entrenamiento deja de vivir en planillas y mensajes
              sueltos.
            </p>
          </header>
          <ol className="app-steps">
            {PASOS.map((paso, indice) => (
              <li key={paso.titulo} className="app-step">
                <span className="app-step-number app-numeric" aria-hidden="true">
                  {indice + 1}
                </span>
                <span className="app-step-icon" aria-hidden="true">
                  <BIcon name={paso.icono} size={22} aria-hidden />
                </span>
                <h3 className="app-step-title">{paso.titulo}</h3>
                <p className="app-step-text">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== Productos ===== */}
      <section
        className="app-public-section app-public-section--alt"
        aria-labelledby="productos-titulo"
      >
        <div className="app-public-container">
          <header className="app-section-head">
            <p className="app-label">Para quién es</p>
            <h2 id="productos-titulo" className="app-section-title">
              Tres formas de usar RunOsorno Training
            </h2>
            <p className="app-section-lead">
              La misma plataforma, vista desde el rol que te toca. Los atletas entrenan;
              los coaches planifican y siguen; las escuelas ordenan a sus equipos.
            </p>
          </header>

          <div className="app-products">
            {PRODUCTOS.map((producto) => (
              <article key={producto.id} className="app-product">
                <span className="app-product-icon" aria-hidden="true">
                  <BIcon name={producto.icono} size={24} aria-hidden />
                </span>
                <h3 className="app-product-title">{producto.nombre}</h3>
                <p className="app-product-lead">{producto.resumen}</p>
                <ul className="app-product-list">
                  {producto.capacidades.map((capacidad) => (
                    <li key={capacidad}>{capacidad}</li>
                  ))}
                </ul>
                <a
                  href={mailtoContacto(producto.seccion)}
                  className="app-product-action"
                >
                  Solicitar información
                  <span className="visually-hidden"> sobre el plan {producto.nombre}</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Funcionalidades ===== */}
      <section className="app-public-section" aria-labelledby="funciones-titulo">
        <div className="app-public-container">
          <header className="app-section-head">
            <p className="app-label">Qué incluye</p>
            <h2 id="funciones-titulo" className="app-section-title">
              Lo que el sistema ya hace hoy
            </h2>
            <p className="app-section-lead">
              Sin promesas a futuro: estas son funciones que están en la plataforma.
            </p>
          </header>
          <ul className="app-features">
            {FUNCIONALIDADES.map((funcion) => (
              <li key={funcion.titulo} className="app-feature">
                <span className="app-feature-icon" aria-hidden="true">
                  <BIcon name={funcion.icono} size={20} aria-hidden />
                </span>
                <h3 className="app-feature-title">{funcion.titulo}</h3>
                <p className="app-feature-text">{funcion.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Líneas ===== */}
      <section
        className="app-public-section app-public-section--alt"
        aria-labelledby="lineas-titulo"
      >
        <div className="app-public-container">
          <header className="app-section-head">
            <p className="app-label">Dos disciplinas</p>
            <h2 id="lineas-titulo" className="app-section-title">
              Running y trail running
            </h2>
            <p className="app-section-lead">
              El plan se adapta a la disciplina: cambia el terreno y la duración, no el
              seguimiento.
            </p>
          </header>
          <div className="app-lines">
            {LINEAS.map((linea) => (
              <article key={linea.nombre} className="app-line">
                <span className="app-line-icon" aria-hidden="true">
                  <BIcon name={linea.icono} size={22} aria-hidden />
                </span>
                <h3 className="app-line-title">{linea.nombre}</h3>
                <p className="app-line-text">{linea.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Preguntas ===== */}
      <section className="app-public-section" aria-labelledby="faq-titulo">
        <div className="app-public-container app-public-narrow">
          <header className="app-section-head">
            <p className="app-label">Antes de escribir</p>
            <h2 id="faq-titulo" className="app-section-title">
              Preguntas frecuentes
            </h2>
          </header>
          <div className="app-faq">
            {PREGUNTAS.map((item) => (
              <details key={item.pregunta} className="app-faq-item">
                <summary className="app-faq-question">{item.pregunta}</summary>
                <p className="app-faq-answer">{item.respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Cierre ===== */}
      <section className="app-cta" aria-labelledby="cierre-titulo">
        <div className="app-public-container app-cta-inner">
          <div>
            <h2 id="cierre-titulo" className="app-cta-title">
              ¿Armamos el plan de tu equipo?
            </h2>
            <p className="app-cta-text">
              Cuéntanos cuántos atletas y coaches son. Te mostramos la plataforma y
              coordinamos el alta; también puedes escribir a{" "}
              <a href={mailtoContacto("cierre")}>{SITE.email}</a>.
            </p>
          </div>
          <div className="app-cta-actions">
            <a
              href={mailtoContacto("cierre")}
              className="btn app-btn app-btn-primary app-btn-lg"
            >
              Escribir por correo
            </a>
            <Link href="/login" className="btn app-btn app-btn-secondary app-btn-lg">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
