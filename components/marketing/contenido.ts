/**
 * Contenido de la landing pública.
 *
 * Todo lo que se afirma aquí existe en el producto (`specs/mvp.md` §4). No hay
 * precios, cifras de clientes ni testimonios: el modelo comercial todavía no está
 * definido y no se inventa prueba social.
 *
 * Los iconos son nombres de Bootstrap Icons (sin el prefijo `bi bi-`).
 */

export type Paso = {
  titulo: string;
  texto: string;
  /** Nombre del icono de Bootstrap Icons (sin el prefijo `bi bi-`). */
  icono: string;
};

export const PASOS: Paso[] = [
  {
    icono: "layout-template",
    titulo: "El coach planifica",
    texto:
      "Elige plantillas de la biblioteca, arrástralas a los días de la semana, genera una semana tipo o copia la anterior.",
  },
  {
    icono: "person-running",
    titulo: "El atleta entrena y registra",
    texto:
      "Ve su plan en el calendario y anota distancia, tiempo, esfuerzo percibido y comentarios. Si no pudo, deja el motivo.",
  },
  {
    icono: "chat",
    titulo: "El coach revisa y responde",
    texto:
      "Ve el cumplimiento de cada atleta, lee el registro real y deja feedback en la misma sesión. Todo queda en el historial.",
  },
];

export type Producto = {
  id: "atleta" | "coach" | "escuela";
  nombre: string;
  resumen: string;
  /** Nombre del icono de Bootstrap Icons (sin el prefijo `bi bi-`). */
  icono: string;
  capacidades: string[];
  /** Texto del asunto del correo cuando se pide información de este bloque. */
  seccion: string;
};

export const PRODUCTOS: Producto[] = [
  {
    id: "atleta",
    nombre: "Atleta",
    resumen: "Tu plan, tu registro y tu progreso, sin planillas ni mensajes sueltos.",
    icono: "person-running",
    capacidades: [
      "Calendario mensual con el estado de cada sesión",
      "Registro de distancia, tiempo, RPE y comentarios",
      "Marcar «no realizada» con el motivo que corresponda",
      "Métricas personales: cumplimiento, carga semanal y progresión",
    ],
    seccion: "plan Atleta",
  },
  {
    id: "coach",
    nombre: "Coach",
    resumen: "Planifica la semana en minutos y sigue a cada atleta sin preguntar.",
    icono: "people",
    capacidades: [
      "Biblioteca de plantillas propia, compartida al grupo u oficial",
      "Planificación con arrastrar y soltar, generador y copiar semana",
      "Asignar la misma sesión a varios atletas a la vez",
      "Seguimiento con cumplimiento, alertas y feedback por sesión",
    ],
    seccion: "plan Coach",
  },
  {
    id: "escuela",
    nombre: "Escuela o club",
    resumen: "Varios coaches bajo una misma escuela, con lectura agregada.",
    icono: "building",
    capacidades: [
      "Grupos con coaches y equipos, con solicitudes de ingreso",
      "Director técnico con visibilidad de todo el grupo",
      "Comparativa entre equipos y cumplimiento por coach",
      "Anuncios para todo el grupo, in-app y por correo",
    ],
    seccion: "plan Escuela/Club",
  },
];

export type Funcionalidad = {
  titulo: string;
  texto: string;
  /** Nombre del icono de Bootstrap Icons (sin el prefijo `bi bi-`). */
  icono: string;
};

export const FUNCIONALIDADES: Funcionalidad[] = [
  {
    icono: "layout-template",
    titulo: "Plantillas de sesión",
    texto:
      "Calentamiento, parte principal y enfriamiento en secciones que el coach reordena o amplía.",
  },
  {
    icono: "magic",
    titulo: "Generador de semana",
    texto:
      "Una semana tipo como «3 fondos + 1 series + 1 tempo + 2 descansos» distribuida en el calendario.",
  },
  {
    icono: "calendar-event",
    titulo: "Calendario con estados",
    texto:
      "Planificada, en curso, completada, parcial o no realizada. Cada estado con color y forma propia.",
  },
  {
    icono: "clipboard-list",
    titulo: "Registro real",
    texto:
      "Distancia, tiempo, RPE y comentarios. Editable durante la ventana configurada y bloqueado después.",
  },
  {
    icono: "bar-chart-steps",
    titulo: "Métricas de carga",
    texto:
      "Cumplimiento, carga semanal, progresión de 4 a 12 semanas y distribución por tipo de sesión.",
  },
  {
    icono: "heartbeat",
    titulo: "Zonas y umbrales",
    texto:
      "VO₂máx estimado, frecuencia de umbral y zonas de frecuencia cardíaca a partir del perfil y los registros.",
  },
  {
    icono: "bell",
    titulo: "Avisos y feedback",
    texto:
      "Notificaciones en la campanita para cada evento y correo solo en los casos que importan.",
  },
  {
    icono: "layout-grid",
    titulo: "Exportes",
    texto:
      "PDF y Excel para el atleta, el equipo y el grupo, con periodo por temporada, año o rango.",
  },
];

export type Linea = {
  nombre: string;
  texto: string;
  /** Nombre del icono de Bootstrap Icons (sin el prefijo `bi bi-`). */
  icono: string;
};

export const LINEAS: Linea[] = [
  {
    nombre: "Running",
    texto:
      "Series, tempo y fondos en pista, parque o calle. La planificación semanal y las métricas de carga están pensadas para el calendario de competencia.",
    icono: "flame",
  },
  {
    nombre: "Trail Running",
    texto:
      "Desnivel, terrenos y sesiones largas. El registro libre de distancia, tiempo y esfuerzo se adapta a entrenamientos que no caben en una planilla rígida.",
    icono: "map",
  },
];

export const PREGUNTAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: "¿Tengo que instalar algo?",
    respuesta:
      "No. RunOsorno Training funciona en el navegador del computador y del celular. Tu coach te entrega las credenciales de acceso.",
  },
  {
    pregunta: "¿Cómo empiezo a usarlo?",
    respuesta:
      "Escríbenos y coordinamos el alta: creamos la escuela o el equipo, damos de alta al coach y desde ahí se suman los atletas.",
  },
  {
    pregunta: "¿Puedo ver mi plan desde el celular?",
    respuesta:
      "Sí. El calendario, el registro de sesiones y tus métricas están diseñados para pantallas pequeñas, y hoy se alcanzan sin zoom.",
  },
  {
    pregunta: "¿Quién ve mis datos?",
    respuesta:
      "Tu coach y quien administre tu escuela. Un atleta solo ve su calendario; un coach ve el detalle de sus atletas y métricas agregadas de su grupo.",
  },
  {
    pregunta: "¿Cuánto cuesta?",
    respuesta:
      "Todavía no hay planes publicados: estamos ordenando la oferta. Escríbenos y te contamos el esquema que mejor calza con tu equipo.",
  },
];

/** Icono de la pregunta frecuente (reservado para futuras variantes visuales). */
export const ICONO_PREGUNTA = "chevron-down";

/** Icono de la sección de dispositivos, usado en la franja de confianza. */
export const ICONO_MOVIL = "device-mobile";
