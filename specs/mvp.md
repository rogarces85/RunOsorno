# Especificaciones del MVP — RunOsorno

Documento de especificación funcional del producto mínimo viable (MVP) de RunOsorno. Define **qué debe hacer el producto**, sin entrar en detalles técnicos de implementación.

---

## 1. Descripción del MVP

### Qué se quiere construir
RunOsorno es una plataforma web de gestión de entrenamiento de running que conecta entrenadores (coaches) con sus atletas, bajo la supervisión de un administrador. El MVP permite el ciclo completo: **el coach planifica → el atleta ejecuta y registra → el coach revisa y responde**.

### Qué problema resuelve
Los coaches y atletas de running gestionan sus entrenamientos mediante planillas manuales, hojas de cálculo o mensajes dispersos. No existe un lugar centralizado donde el plan semanal, el registro de resultados y el seguimiento del cumplimiento estén conectados. RunOsorno reemplaza este proceso manual por una herramienta web accesible desde navegador para los tres roles del sistema.

### Propósito principal
Digitalizar y centralizar la planificación, ejecución y seguimiento de entrenamientos de running, permitiendo que un coach diseñe planes semanales, que el atleta registre sus resultados reales en un calendario, y que el coach revise el cumplimiento y se comunique con su equipo — todo desde una misma plataforma.

---

## 2. Objetivos

### Objetivo general
Entregar un sistema web funcional donde un administrador gestione coaches y grupos, un coach planifique y dé seguimiento a sus atletas, y un atleta consulte su plan y registre sus sesiones de entrenamiento.

### Objetivos específicos
1. Permitir al coach crear y gestionar teams y planificar sesiones semanales para sus atletas mediante plantillas de entrenamiento.
2. Permitir al atleta consultar su plan en un calendario mensual y registrar los resultados reales de cada sesión.
3. Permitir al coach revisar el cumplimiento y las métricas de su equipo, responder al feedback de los atletas y recibir notificaciones de sus sesiones completadas.
4. Permitir al administrador gestionar el alta de coaches, la creación de grupos/escuelas y la aprobación de solicitudes.
5. Establecer autenticación por sesión con roles diferenciados (Admin, Director Técnico, Coach, Atleta) y permisos acordes a cada rol.
6. Mantener el sistema sin API pública, sin tiempo real y orientado a uso directo vía navegador.

---

## 3. Usuarios

### Tipos de usuarios

| Rol | Descripción |
|-----|-------------|
| **Administrador (Admin)** | Usuario con control global del sistema. Da de alta coaches, crea grupos/escuelas, aprueba solicitudes, gestiona la configuración global. |
| **Director Técnico** | Rol asignado dentro de un grupo/escuela. Tiene visibilidad total de los atletas del grupo y sus métricas agregadas. |
| **Coach (Entrenador)** | Usuario que crea y gestiona teams, planifica entrenamientos, revisa el cumplimiento de sus atletas y les responde. |
| **Atleta** | Usuario que consulta su plan de entrenamiento en calendario, registra los resultados de sus sesiones y envía feedback a su coach. |

### Qué necesita o espera cada usuario

**Administrador**
- Crear y administrar cuentas de coaches (alta, edición, desactivación, eliminación).
- Crear grupos/escuelas y asignar Directores Técnicos.
- Aprobar o rechazar solicitudes de coaches para unirse a grupos.
- Gestionar configuración global (plantillas oficiales, parámetros de email, límites, motivos predefinidos, tipos de sesión base).
- Consultar logs de auditoría y exportar datos globales.
- Tener visibilidad del estado general del sistema (coaches, atletas, grupos, actividad).

**Director Técnico**
- Ver todos los atletas de su grupo/escuela en modo lectura.
- Ver métricas agregadas comparativas entre teams del grupo.
- Ver el cumplimiento por coach dentro de su grupo.
- Enviar anuncios masivos a todo el grupo.

**Coach**
- Crear y gestionar múltiples teams con nombre a su elección.
- Crear y editar plantillas de sesiones de entrenamiento (propias y oficiales).
- Armar planes semanales para sus atletas mediante drag & drop y generador.
- Ver el calendario de cada uno de sus atletas con el estado de cada sesión.
- Revisar los registros reales de sus atletas (distancia, tiempo, RPE, comentarios).
- Dejar feedback a sus atletas sobre sesiones completadas.
- Ver métricas de sus atletas: cumplimiento, carga semanal, progresión, distribución por tipo.
- Recibir notificaciones cuando un atleta completa una sesión.
- Copiar planes de semanas anteriores y reutilizar plantillas.
- Solicitar unirse a grupos/escuelas.

**Atleta**
- Consultar su calendario mensual con el plan de entrenamiento asignado.
- Registrar los resultados reales de cada sesión: distancia, tiempo, esfuerzo percibido (RPE), comentarios.
- Marcar una sesión como "no realizada" indicando un motivo (predefinido o libre).
- Editar su registro dentro de una ventana de 24-48 horas después de completar la sesión.
- Ver su historial y sus métricas personales (cumplimiento, carga semanal, progresión, distribución por tipo, VO2max estimado, zonas FC, umbral, etc.).
- Enviar feedback o preguntas a su coach desde la sesión.
- Ver a qué grupo/escuela y a qué team(s) pertenece.

---

## 4. Funcionalidades

### 4.1 Autenticación y gestión de sesiones

**Descripción**: El sistema debe permitir a los usuarios iniciar sesión con email y contraseña, mantener una sesión activa mediante cookies y cerrar sesión.

**Comportamiento esperado**:
- Al iniciar sesión, el sistema valida credenciales y crea una sesión persistente (cookie HttpOnly/Secure).
- El sistema redirige al usuario a la pantalla principal correspondiente a su rol.
- El usuario puede cerrar sesión desde cualquier pantalla.
- Las sesiones expiradas redirigen al login.
- Un usuario no autenticado no puede acceder a ninguna pantalla del sistema.

**Relación**: Base de todas las demás funcionalidades. Sin sesión activa, no se puede acceder al sistema.

---

### 4.2 Gestión de usuarios (Admin)

**Descripción**: El administrador puede crear, editar, desactivar y eliminar cuentas de coaches.

**Comportamiento esperado**:
- Alta de coach: el admin ingresa nombre, email y genera una contraseña temporal. El sistema envía un email de invitación al coach.
- Edición: el admin puede modificar nombre, email y datos del coach.
- Desactivación (soft delete): el coach queda inactivo pero sus datos se conservan. Un coach desactivado no puede iniciar sesión.
- Eliminación definitiva: se elimina la cuenta del coach.
- Restablecer contraseña: el admin genera una nueva contraseña temporal para el coach.
- Reenviar invitación: si el coach no activó su cuenta, el admin puede reenviar el email.
- El admin puede ver coaches "huérfanos" (sin grupo asignado).

**Relación**: Un coach creado por admin puede luego solicitar unirse a grupos y crear sus teams.

---

### 4.3 Gestión de grupos/escuelas (Admin)

**Descripción**: El administrador crea y administra grupos/escuelas, que son entidades superiores que agrupan múltiples coaches y teams.

**Comportamiento esperado**:
- Crear grupo: el admin ingresa nombre, descripción y opcionalmente un logo.
- Editar o eliminar grupo (con confirmación).
- El admin aprueba o rechaza solicitudes de coaches para unirse al grupo.
- El admin asigna o quita el rol de Director Técnico a un coach dentro del grupo.
- El grupo muestra métricas agregadas: cantidad de coaches, teams, atletas, cumplimiento promedio.

**Relación**: Los coaches solicitan unirse a grupos (ver 4.5). Los teams pertenecen a un coach dentro de un grupo. Los atletas de ese grupo son visibles para el Director Técnico.

---

### 4.4 Gestión de teams (Coach)

**Descripción**: El coach crea y gestiona sus teams. Cada team tiene un nombre que por defecto es el apellido del coach, pero puede cambiarlo.

**Comportamiento esperado**:
- Al crear un team, el nombre por defecto es el apellido del coach. El coach puede modificarlo.
- El coach puede tener múltiples teams.
- El coach asigna atletas a sus teams. Un atleta puede pertenecer a múltiples teams (incluso del mismo coach).
- El coach puede editar el nombre del team en cualquier momento.
- Un team puede tener un solo coach (el creador).

**Relación**: El team es la unidad de organización del coach. Los atletas asignados a un team ven su plan y sus sesiones. El calendario se accede por team y luego por atleta.

---

### 4.5 Solicitud de unión a grupo (Coach → Admin)

**Descripción**: Un coach solicita unirse a un grupo/escuela existente. El admin aprueba o rechaza la solicitud.

**Comportamiento esperado**:
- El coach ve la lista de grupos disponibles y envía una solicitud.
- El admin recibe la solicitud y la aprueba o rechaza.
- Al aprobar, el coach queda vinculado al grupo. Puede estar en múltiples grupos.
- Al rechazar, el coach recibe una notificación.
- Un coach ya aprobado no puede enviar solicitud duplicada al mismo grupo.

**Relación**: Conecta la gestión de coaches (4.2) con la de grupos (4.3).

---

### 4.6 Biblioteca de plantillas de sesiones (Coach)

**Descripción**: El coach crea, edita y organiza plantillas de sesiones de entrenamiento que luego asigna a los días del calendario de sus atletas.

**Comportamiento esperado**:

- **Crear plantilla**: el coach define nombre, tipo de sesión (Series, Intervalos, Fondos, Tempo, Recuperación, Descanso o tipo libre como Test/Control, Fuerza, Cross-training) y la estructura de la sesión.
- **Estructura de la sesión** (base, adaptable por el coach):
  1. Calentamiento / Puesta en marcha
  2. Entrenamiento específico (series, repeticiones, tiempos, FC, zonas, ritmos — lo que el coach determine)
  3. Enfriamiento
  4. Opcional: estiramientos, trabajo de recuperación o musculación
  - El coach puede reorganizar, omitir o añadir secciones según su criterio.
- **Editar plantilla**: el coach puede modificar cualquier plantilla propia en cualquier momento.
- **Clonar plantilla**: el coach puede duplicar una plantilla propia o una compartida en su grupo para adaptarla.
- **Compartir al grupo**: el coach puede publicar una de sus plantillas para que sea visible y clonable por otros coaches del mismo grupo.
- **Plantillas oficiales**: el sistema trae plantillas precargadas que cualquier coach puede clonar y editar.

**Relación**: Las plantillas son la materia prima del plan semanal. Se arrastran al calendario (4.7) para asignarse a días específicos de un atleta.

---

### 4.7 Planificación semanal (Coach)

**Descripción**: El coach arma el plan semanal de cada atleta asignando plantillas a días del calendario, mediante drag & drop o un generador automático.

**Comportamiento esperado**:

- **Selección**: el coach elige Team → Atleta → semana/mes del calendario.
- **Drag & drop**: el coach arrastra plantillas de su biblioteca a los días del calendario.
- **Generador**: el coach puede usar un generador tipo "semana tipo" (ej. 3 Fondos + 1 Series + 1 Tempo + 2 Descanso) y el sistema distribuye las plantillas en los días.
- **Multi-asignación**: el coach puede asignar la misma plantilla a varios atletas de la vez.
- **Días sin asignar**: se consideran "Descanso" por defecto. El coach puede asignar explícitamente una plantilla de descanso.
- **Copiar semana anterior**: el coach puede copiar el plan de la semana anterior al atleta, con la opción de editarlo después de copiar.
- **Editar**: el coach puede modificar cualquier día ya planificado (cambiar plantilla, eliminar asignación).
- **Unidad de planificación**: la semana es la unidad base.

**Relación**: El plan resultante alimenta el calendario del atleta (4.8). El atleta ve lo que el coach planificó.

---

### 4.8 Calendario mensual — Vista Atleta

**Descripción**: El atleta consulta su plan en un calendario mensual y registra los resultados reales de cada sesión.

**Comportamiento esperado**:

- **Vista mes**: se muestra el mes actual con navegación a mes anterior/siguiente. El día actual está resaltado.
- **Contenido por día**:
  - Sesión planificada (si el coach asignó una plantilla).
  - Sesión real (si el atleta registró resultados).
  - Estado visual con código de color: verde (completada), amarillo (parcial), rojo (no realizada), gris (descanso/sin asignar).
- **Detalle del día**: al hacer click en un día, se muestra el detalle de la sesión planificada (calentamiento, entrenamiento específico, enfriamiento) y un formulario de registro.
- **Formulario de registro**: el atleta ingresa distancia, tiempo, esfuerzo percibido (RPE) y comentarios opcionales.
- **Edición de registro**: el atleta puede editar su registro dentro de una ventana de 24-48 horas después de haberlo completado. Fuera de esa ventana, no puede editar.
- **Marcar "No realizada"**: el atleta puede indicar que no realizó la sesión, seleccionando un motivo predefinido (lesión, trabajo, enfermedad, personal, otro) o escribiendo un motivo libre en el campo "otro".
- **Feedback**: el atleta puede dejar comentarios o preguntas al coach desde la sesión.

**Relación**: Depende del plan creado por el coach (4.7). Los datos registrados alimentan las métricas (4.10) y las notificaciones (4.11).

---

### 4.9 Calendario mensual — Vista Coach

**Descripción**: El coach ve el calendario de sus atletas con el estado de cumplimiento y puede dejar feedback.

**Comportamiento esperado**:

- **Selector**: Team → Atleta → mes.
- **Planificación**: el coach ve el plan asignado y puede modificarlo (drag & drop, ver 4.7).
- **Cumplimiento**: se muestra un badge con el porcentaje de cumplimiento por día (qué % de sus atletas completaron esa sesión).
- **Detalle de sesión**: al hacer click en un día de un atleta, el coach ve el registro real (distancia, tiempo, RPE, comentarios, motivo si no se realizó).
- **Feedback**: el coach puede dejar un comentario o respuesta al atleta sobre esa sesión.
- **Vista agregada**: el coach puede ver la vista resumen del team (cumplimiento general, métricas).

**Relación**: Es la vista complementaria a la del atleta (4.8). Mismo calendario, permisos de edición del coach.

---

### 4.10 Métricas y Dashboard

**Descripción**: El sistema calcula y muestra métricas de entrenamiento a distintos niveles: atleta, team y grupo.

**Comportamiento esperado**:

**Nivel Atleta** (vista detalle, visible para el atleta y su coach):
- Cumplimiento %: sesiones completadas / sesiones planificadas.
- Carga semanal: km, tiempo total, TSS/TRIMP (si hay datos de FC).
- Progresión: gráfica de volumen semanal de las últimas 4 a 12 semanas.
- Distribución por tipo de sesión (% series, % fondo, % tempo, % descanso, etc.).
- RPE medio vs RPE planificado.
- Rachas consecutivas: días o semanas consecutivos completando sesiones.
- Métricas fisiológicas: VO2max estimado, FC de umbral, potencia, umbrales, zonas de FC/potencia.

**Nivel Team** (vista resumen para el coach):
- % de atletas con cumplimiento >80%, 50-80%, <50%.
- Carga media del team.
- Alertas: atletas sin registrar sesión por más de X días, caída brusca de carga, RPE consistentemente alto.

**Nivel Grupo/Escuela** (vista para Director Técnico y Admin):
- Comparativa entre teams del grupo: cumplimiento, carga, alertas.
- Cumplimiento por coach (no ranking).

**Actualización**: tiempo real (al guardar un registro del atleta, las métricas se recalculan).

**Exportación**: el coach y el Director Técnico pueden exportar datos a PDF y Excel.

**Historial**: las métricas se pueden consultar por temporada, año o un periodo personalizado hacia atrás.

**Relación**: Se alimenta de los registros de sesiones del atleta (4.8). Alimenta los dashboards de cada rol.

---

### 4.11 Notificaciones

**Descripción**: El sistema notifica eventos importantes a los usuarios mediante notificaciones in-app (campanita) y correo electrónico.

**Comportamiento esperado**:

**In-app (todas los eventos, tiempo real)**:
- Coach → Atleta: nuevo plan publicado, cambio en sesión, comentario/feedback.
- Atleta → Coach: sesión completada, feedback/comentario en sesión, pregunta.
- Sistema: bienvenida, cambio de team/grupo, aprobación/rechazo de solicitud, recordatorio de sesión.
- Anuncios masivos: Admin o Director Técnico → todo el grupo/escuela.

**Email (solo eventos críticos, inmediato o mismo día)**:
1. Coach carga/publica plan → email al atleta notificándolo.
2. Atleta completa sesión → email al coach notificándolo.
3. Anuncios masivos de Admin o Director Técnico.

**Preferencias**: las notificaciones in-app están siempre activas. El email es el medio de entrega de eventos críticos (no es configurable por usuario).

**Centro de notificaciones**: el usuario ve una campanita en el header con el listado de notificaciones no leídas. Al hacer click, se marca como leída.

**Plantillas de email**: HTML responsive, editables por el Admin.

**Relación**: Se activa por eventos de planificación (4.7), registro de sesiones (4.8), anuncios (4.3) y gestión de usuarios (4.2).

---

### 4.12 Avatar / Foto de perfil

**Descripción**: Cada usuario (admin, coach, atleta) puede tener una foto de perfil (avatar) que se muestra en el header, en listas de atletas y en su perfil.

**Comportamiento esperado**:
- Subida de foto: el usuario selecciona una imagen (JPG, PNG, WebP, máx. 2-3 MB).
- Procesamiento: la imagen se redimensiona a 256×256 px (avatar) antes de subir. Se elimina la información EXIF (privacidad).
- Almacenamiento: la foto se guarda en almacenamiento de objetos (Cloudflare R2). Solo hay un archivo por usuario (nombre fijo, se sobrescribe al subir una nueva).
- Visualización: el avatar se muestra en el header de la app, en la lista de atletas del coach y en la página de perfil.
- Avatar por defecto: si el usuario no tiene foto, se muestra un avatar generado con sus iniciales (sin imagen externa).
- Eliminación: el usuario puede eliminar su foto, volviendo al avatar por defecto de iniciales.

---

### 4.13 Gestión de atletas (Coach y Admin)

**Descripción**: El coach gestiona los atletas de sus teams. El admin tiene una vista global de todos los atletas del sistema.

**Comportamiento esperado**:

**Coach**:
- Dar de alta un atleta en uno de sus teams (nombre, email, datos básicos).
- Asignar/quitar atletas de sus teams. Un atleta puede estar en varios teams.
- Ver el listado de sus atletas con estado de cumplimiento y última actividad.
- Ver el detalle de cada atleta de su team: plan, registros, métricas, historial.

**Admin**:
- Listado global de atletas con filtros (coach, team, grupo, estado activo/inactivo).
- Trasladar atletas entre teams/coaches (con historial de cambios).
- Ver atletas sin coach asignado.

**Relación**: Los atletas creados por el coach se planifican en el calendario (4.7, 4.8). Los atletas creados por admin pueden ser reasignados.

---

### 4.14 Director Técnico

**Descripción**: Rol asignado dentro de un grupo/escuela con visibilidad total de los atletas del grupo.

**Comportamiento esperado**:
- Ve todos los atletas del grupo en modo lectura (no edita planes ni registros).
- Ve métricas agregadas comparativas entre teams del grupo.
- Ve el cumplimiento por coach dentro de su grupo.
- Puede enviar anuncios masivos a todo el grupo (notificación in-app + email).
- No edita entrenamientos ni registros.

---

### 4.15 Logs / Auditoría (Admin)

**Descripción**: El sistema registra acciones críticas para auditoría.

**Comportamiento esperado**:
- Se registran: creación/eliminación de usuarios, cambios en grupos, asignaciones de atletas, aprobación/rechazo de solicitudes, exportaciones de datos.
- Cada registro incluye: quién realizó la acción, qué se hizo, cuándo, desde qué IP.
- El admin puede consultar los logs con filtros por fecha, usuario y tipo de acción.

---

### 4.16 Exportación de datos

**Descripción**: Coach, Director Técnico y Admin pueden exportar datos del sistema.

**Comportamiento esperado**:
- **Nivel atleta**: el coach puede exportar métricas y registros de un atleta específico a PDF o Excel.
- **Nivel team**: el coach puede exportar resumen del team a PDF o Excel.
- **Nivel grupo**: el Director Técnico puede exportar métricas agregadas del grupo a PDF o Excel.
- **Nivel global (Admin)**: exportación de listados de coaches, atletas y grupos (CSV/Excel).
- Periodo configurable: temporada, año o rango de fechas personalizado.

---

### 4.17 Configuración global (Admin)

**Descripción**: El admin gestiona parámetros globales del sistema.

**Comportamiento esperado**:
- **Plantillas oficiales**: CRUD de plantillas precargadas que los coaches pueden clonar y editar.
- **Parámetros de email**: configuración SMTP/de envío, remitente, plantillas HTML base.
- **Límites**: máximo de teams por coach, máximo de atletas por team, almacenamiento de avatares.
- **Motivos "no realizada"**: lista editable de motivos predefinidos (lesión, trabajo, enfermedad, personal, otro).
- **Tipos de sesión base**: lista de tipos base (Series, Intervalos, Fondos, Tempo, Recuperación, Descanso) que el sistema ofrece por defecto.

---

## 5. Flujos principales

### Flujo 1: Alta de un coach y creación de grupo (Admin)

1. El admin inicia sesión.
2. El admin crea una cuenta de coach (nombre, email, contraseña temporal).
3. El sistema envía un email de invitación al coach.
4. El admin crea un grupo/escuela (nombre, descripción).
5. El coach recibe el email, activa su cuenta y accede al sistema.
6. El coach envía una solicitud para unirse al grupo.
7. El admin aprueba la solicitud.
8. El coach queda vinculado al grupo y puede ver a los otros coaches del grupo.

### Flujo 2: Coach crea su team y registra atletas

1. El coach inicia sesión.
2. El coach crea un team. El nombre por defecto es su apellido (editable).
3. El coach da de alta atletas en el team (o el admin los crea globalmente y el coach los asigna).
4. Un atleta puede ser asignado a varios teams del mismo coach.
5. El coach accede al calendario de un atleta para planificar.

### Flujo 3: Coach crea plantillas y planifica una semana

1. El coach accede a su biblioteca de plantillas.
2. Crea una plantilla nueva: nombre, tipo (ej. Intervalos), estructura (calentamiento → entrenamiento específico → enfriamiento).
3. Guarda la plantilla. Puede clonarla, editarla o compartirla al grupo.
4. El coach va al calendario de un atleta (Team → Atleta → mes/semana).
5. Arrastra plantillas de su biblioteca a los días del calendario.
6. O usa el generador ("semana tipo: 3 Fondos + 1 Series + 1 Tempo + 2 Descanso").
7. Revisa la semana armada. Puede editar, eliminar o copiar la semana anterior.
8. El plan queda visible para el atleta en su calendario.

### Flujo 4: Atleta consulta su plan y registra una sesión

1. El atleta inicia sesión.
2. Ve su calendario mensual. El día actual está resaltado.
3. Hace click en el día con sesión planificada.
4. Ve el detalle: calentamiento, entrenamiento específico, enfriamiento.
5. Realiza la sesión de entrenamiento.
6. Vuelve al sistema y registra: distancia, tiempo, RPE, comentarios.
7. Guarda el registro. El estado del día cambia a "Completada" (verde).
8. El sistema notifica al coach (in-app + email): "Atleta completó sesión".
9. El atleta puede editar el registro dentro de 24-48 horas.

### Flujo 5: Atleta marca una sesión como no realizada

1. El atleta abre el día con sesión planificada.
2. Selecciona "No realizada".
3. Elige un motivo predefinido (lesión, trabajo, enfermedad, personal) o selecciona "Otro" y escribe el motivo.
4. Guarda. El estado del día cambia a "No realizada" (rojo).
5. El coach recibe la notificación in-app.

### Flujo 6: Coach revisa cumplimiento y responde feedback

1. El coach inicia sesión.
2. Ve el dashboard de su team: cumplimiento %, alertas (atletas sin registrar, caída de carga).
3. Abre el calendario de un atleta. Ve badges de cumplimiento por día.
4. Hace click en una sesión completada.
5. Ve el registro real: distancia, tiempo, RPE, comentarios del atleta.
6. Deja un comentario de feedback.
7. El atleta recibe la notificación in-app y ve el feedback en su sesión.

### Flujo 7: Director Técnico revisa métricas del grupo

1. El Director Técnico inicia sesión.
2. Accede a la vista del grupo/escuela.
3. Ve la comparativa entre teams: cumplimiento, carga, alertas.
4. Ve el cumplimiento por coach.
5. Puede enviar un anuncio masivo al grupo (in-app + email).
6. Puede exportar los datos a PDF/Excel.

### Flujo 8: Admin gestiona configuración y auditoría

1. El admin inicia sesión.
2. Accede a la configuración global: edita plantillas oficiales, parámetros de email, límites, motivos predefinidos.
3. Revisa los logs de auditoría (quién, qué, cuándo, IP).
4. Exporta listados globales (coaches, atletas, grupos).
5. Realiza mantenimiento (limpieza de avatares huérfanos).

---

## 6. Interfaz y experiencia de usuario

### Estructura general

El sistema se organiza en tres niveles de navegación según el rol:

**Header global** (todas las pantallas):
- Logo / nombre del sistema.
- Centro de notificaciones (campanita con contador de no leídas).
- Avatar del usuario con menú desplegable (perfil, cerrar sesión).

**Menú lateral** (varía según rol):
- Admin: Dashboard, Coaches, Grupos, Atletas, Plantillas oficiales, Configuración, Logs, Exportes.
- Director Técnico: Dashboard grupo, Comparativa teams, Anuncios, Exportes.
- Coach: Dashboard, Mis Teams, Calendario, Biblioteca de plantillas, Atletas, Métricas, Exportes.
- Atleta: Calendario, Mis métricas, Mi historial, Perfil.

### Pantallas principales

**1. Login**
- Formulario de email y contraseña.
- Acceso desde cualquier dispositivo (responsive).

**2. Dashboard (por rol)**
- **Admin**: resumen del sistema (cantidad de coaches, grupos, atletas, solicitudes pendientes).
- **Coach**: resumen de sus teams (cumplimiento %, alertas, sesiones de hoy).
- **Atleta**: resumen de su semana (sesiones de hoy, cumplimiento, racha).
- **Director Técnico**: resumen del grupo (comparativa teams, alertas).

**3. Calendario mensual**
- Vista mes con navegación anterior/siguiente.
- Día actual resaltado.
- Código de color por estado de sesión (verde/amarillo/rojo/gris).
- Click en día → panel lateral o modal con detalle de sesión + formulario de registro.
- Para el coach: drag & drop de plantillas, badge de cumplimiento por día.

**4. Biblioteca de plantillas (Coach)**
- Listado de plantillas propias + oficiales + compartidas del grupo.
- Formulario de creación/edición: nombre, tipo, estructura de la sesión (secciones editables).
- Acciones: editar, clonar, compartir al grupo.

**5. Gestión de Teams (Coach)**
- Listado de teams del coach.
- Crear team (nombre por defecto = apellido, editable).
- Ver atletas de cada team, asignar/quitar atletas.

**6. Gestión de Atletas (Coach/Admin)**
- Listado con filtros.
- Perfil de atleta: datos, historial de sesiones, métricas, gráficas.

**7. Detalle de sesión (modal/panel)**
- Planificado: calentamiento, entrenamiento específico, enfriamiento.
- Real: distancia, tiempo, RPE, comentarios, motivo (si no realizada).
- Registro (atleta): formulario de entrada.
- Feedback (coach): campo de comentario.

**8. Centro de notificaciones (campanita)**
- Lista de notificaciones no leídas con icono y texto.
- Click → navega a la entidad relacionada.
- Marcar como leída.

**9. Perfil de usuario**
- Datos personales, avatar (subir/eliminar), cambio de contraseña.

**10. Panel Admin**
- Gestión de coaches (listado, alta, edición, desactivación).
- Gestión de grupos (CRUD, solicitudes pendientes, asignación Director Técnico).
- Configuración global (plantillas oficiales, email, límites, motivos, tipos de sesión).
- Logs de auditoría (tabla con filtros).
- Exportes globales.

### Principios de experiencia
- **Responsive**: el sistema funciona en desktop, tablet y móvil.
- **Código de color consistente** en todo el sistema (verde = completado, amarillo = parcial, rojo = no realizado, gris = descanso/sin asignar).
- **Acciones destrucción confirmadas** con diálogo de confirmación (eliminar plantilla, eliminar team, eliminar atleta).
- **Feedback inmediato**: al guardar un registro, el sistema muestra confirmación y actualiza el estado visual.
- **Accesibilidad**: contraste adecuado, navegación por teclado, textos alternativos en imágenes.

---

## 7. Datos

### Entidades principales y sus relaciones

**Usuario**
- Datos: id, nombre, email, contraseña (hasheada), rol (admin/coach/director_tecnico/atleta), avatar, fecha de creación, estado (activo/inactivo), último acceso.
- Relación: cada usuario tiene un rol. Un coach puede ser Director Técnico en uno o más grupos.

**Grupo/Escuela**
- Datos: id, nombre, descripción, logo, fecha de creación.
- Relación: contiene múltiples coaches (relación muchos a muchos — un coach puede estar en varios grupos). Contiene múltiples teams indirectamente (a través de los coaches).

**Team**
- Datos: id, nombre, coach_id, grupo_id (opcional), fecha de creación.
- Relación: pertenece a un coach. Contiene múltiples atletas (relación muchos a muchos — un atleta puede estar en varios teams).

**Atleta (perfil dentro de usuario)**
- Datos: user_id, fecha de nacimiento (opcional), datos físicos básicos (peso, altura, FC máx, FC reposo — opcionales).
- Relación: vinculado a uno o varios teams. Un atleta es un usuario con rol "atleta".

**Plantilla de sesión**
- Datos: id, nombre, tipo (series/intervalos/fondos/tempo/recuperación/descanso/libre), coach_id, es_oficial, es_compartida_grupo, estructura (secciones: calentamiento, entrenamiento específico, enfriamiento, opcionales), fecha de creación, fecha de edición.
- Relación: creada por un coach. Puede ser compartida a un grupo. Se asigna a días del calendario.

**Plan / Asignación de sesión**
- Datos: id, atleta_id, plantilla_id, fecha (día específico), semana (identificador de semana), estado (planificada/en curso/completada/no realizada/parcial), fecha de creación.
- Relación: conecta una plantilla con un atleta en una fecha específica. Un atleta tiene muchas asignaciones. Una plantilla se asigna a muchos días/atletas.

**Registro de sesión (resultado real)**
- Datos: id, asignacion_id, distancia_km, tiempo_minutos, rpe (1-10), comentarios, motivo_no_realizada (si aplica), fecha_registro, fecha_edicion.
- Relación: uno a uno con la asignación de sesión. Solo existe si el atleta registró resultados.

**Feedback de sesión**
- Datos: id, asignacion_id, autor_id (coach o atleta), mensaje, fecha.
- Relación: se asocia a una asignación de sesión. Puede haber múltiples mensajes (conversación coach-atleta).

**Notificación**
- Datos: id, usuario_destino_id, tipo, título, mensaje, leída (boolean), entidad_relacionada (tipo + id), fecha.
- Relación: dirigida a un usuario. Puede estar relacionada con una sesión, plan, grupo, etc.

**Solicitud de grupo**
- Datos: id, coach_id, grupo_id, estado (pendiente/aprobada/rechazada), fecha_solicitud, fecha_resolución.
- Relación: conecta un coach con un grupo.

**Log de auditoría**
- Datos: id, usuario_id, acción, entidad_afectada, detalles, IP, fecha.
- Relación: registrado por el sistema ante acciones críticas.

**Configuración global**
- Datos: plantillas oficiales (entidad Plantilla con es_oficial=true), parámetros de email, límites, motivos predefinidos, tipos de sesión base.
- Relación: referenciada por todo el sistema.

### Datos calculados (no almacenados, se derivan)
- Cumplimiento % (completadas / planificadas).
- Carga semanal (suma de km, tiempo, TSS/TRIMP).
- Progresión (serie temporal de carga semanal).
- Distribución por tipo (% de cada tipo de sesión).
- Rachas consecutivas.
- Métricas fisiológicas (VO2max, umbral, zonas) — calculadas a partir de registros históricos.

---

## 8. Reglas de negocio

### Jerarquía y permisos
1. Solo el Admin puede crear, editar y eliminar grupos/escuelas.
2. Solo el Admin puede crear cuentas de coaches y asignar el rol Director Técnico.
3. Un coach solo puede gestionar teams que él creó.
4. Un coach solo puede planificar sesiones para atletas asignados a sus teams.
5. Un coach puede ver en modo lectura las métricas agregadas de atletas de otros coaches en su mismo grupo, pero solo el detalle de sus propios atletas.
6. El Director Técnico solo tiene lectura (no edita planes ni registros).
7. Un atleta solo puede ver y registrar en su propio calendario.
8. Un atleta solo puede editar su registro dentro de la ventana de 24-48 horas.
9. Un coach puede estar en múltiples grupos. Un atleta puede estar en múltiples teams.
10. Un team pertenece a un solo coach.

### Plantillas
11. Una plantilla es privada por defecto. Solo el coach creador la ve hasta que la comparte al grupo.
12. Una plantilla compartida al grupo es visible y clonable por otros coaches del mismo grupo (no editable por ellos).
13. Las plantillas oficiales son clonables y editables por cualquier coach (la edición crea una copia propia, no modifica la oficial).
14. La estructura de una plantilla tiene como mínimo: calentamiento, entrenamiento específico, enfriamiento. El coach puede reorganizar, omitir o añadir secciones.
15. El tipo de sesión puede ser cualquiera de los predefinidos o uno libre creado por el coach.

### Planificación
16. La semana es la unidad base de planificación.
17. Un día sin plantilla asignada se considera "Descanso" por defecto.
18. El coach puede copiar la semana anterior, con opción de editarlo después.
19. El coach puede asignar la misma plantilla a varios atletas a la vez.
20. Solo el coach (o admin) puede modificar un plan. El atleta no puede modificar el plan, solo registrar resultados.

### Registro de sesiones
21. El atleta registra: distancia, tiempo, RPE, comentarios (comentarios y RPE son opcionales, distancia y tiempo son requeridos para marcar como completada).
22. El atleta puede marcar la sesión como "No realizada" seleccionando un motivo predefinido o escribiendo un motivo libre.
23. El atleta puede editar su registro dentro de 24-48 horas. Fuera de esa ventana, el registro queda bloqueado.
24. Un registro de sesión se puede tener en estado "Parcial" (completó parte de la sesión planificada).
25. Las métricas se actualizan en tiempo real al guardar un registro.

### Notificaciones
26. Las notificaciones in-app se generan para todos los eventos del sistema.
27. Los emails se envían solo para eventos críticos: plan publicado (coach → atleta), sesión completada (atleta → coach), anuncios masivos.
28. El email se envía de forma inmediata o dentro del mismo día.
29. Solo el Admin puede editar las plantillas HTML de email.

### Avatar
30. Solo hay un avatar por usuario. Subir una nueva foto reemplaza la anterior.
31. La imagen se redimensiona a 256×256 px antes de almacenarla.
32. Se elimina la información EXIF de la imagen.
33. Si no hay foto, se muestra un avatar generado con las iniciales del usuario.

### Festivos
34. El calendario está orientado a festivos de Chile.
35. La planificación final de festivos depende de cada coach (configuración manual por coach/team).

---

## 9. Casos límite y errores

### Autenticación
- **Credenciales incorrectas**: mostrar mensaje genérico "Email o contraseña incorrectos" (no revelar si el email existe).
- **Cuenta desactivada**: mostrar "Tu cuenta está desactivada. Contacta al administrador."
- **Sesión expirada**: redirigir al login con mensaje "Tu sesión ha expirado, inicia sesión nuevamente."
- **Acceso sin sesión**: cualquier intento de acceder a una pantalla sin sesión activa redirige al login.

### Gestión de usuarios
- **Email duplicado al crear coach**: mostrar error "Ya existe un usuario con este email."
- **Eliminar coach con teams y atletas**: confirmar con diálogo de advertencia. Determinar si se desactiva o se elimina en cascada (decisión a confirmar: recomendación = soft delete para preservar historial).
- **Coach sin grupo**: permitir que exista, se marca como "huérfano" en la vista de admin.
- **Solicitud duplicada a grupo**: si el coach ya tiene solicitud pendiente o aprobada al mismo grupo, no permitir enviar otra.

### Plantillas
- **Plantilla vacía**: no permitir guardar una plantilla sin nombre ni sin al menos una sección con contenido.
- **Eliminar plantilla en uso**: confirmar. Si la plantilla está asignada a un día de un plan, determinar qué pasa (recomendación: impedir eliminación si tiene asignaciones activas, o desasignar con confirmación).
- **Clonar plantilla compartida de otro grupo**: solo se puede clonar si el coach pertenece al mismo grupo.

### Planificación
- **Asignar plantilla a día ya ocupado**: preguntar si desea reemplazar la plantilla existente.
- **Copiar semana sin plan anterior**: mostrar mensaje "No hay semana anterior para copiar."
- **Multi-asignación sin atletas seleccionados**: mostrar error "Selecciona al menos un atleta."

### Registro de sesiones
- **Registro fuera de ventana de edición**: mostrar "No puedes editar este registro. La ventana de edición (48h) ha expirado."
- **Distancia o tiempo vacíos al marcar como completada**: mostrar error "La distancia y el tiempo son requeridos para marcar la sesión como completada."
- **Registrar sesión de un día sin plan**: no debería ser posible (el formulario solo aparece si hay sesión planificada).
- **RPE fuera de rango**: validar que esté entre 1 y 10.
- **Motivo "Otro" vacío**: si selecciona "Otro" sin escribir el motivo, mostrar error "Describe el motivo."
- **Registrar sesión futura**: no permitir registrar sesiones de días futuros.

### Notificaciones
- **Email fallido**: reintentar una vez. Si falla, registrar en logs. No bloquear la acción principal.
- **Notificaciones masivas a grupo vacío**: si el grupo no tiene coaches/atletas, mostrar aviso "El grupo no tiene miembros."

### Datos generales
- **Datos vacíos en listados**: mostrar estado vacío con mensaje orientativo y acción (ej. "No hay atletas en este team. Agrega un atleta.").
- **Exportación sin datos**: mostrar "No hay datos para exportar en el periodo seleccionado."
- **Errores inesperados**: mostrar pantalla de error genérica con opción de volver al inicio. Registrar el error en logs.

### Límites
- **Exceder máximo de teams por coach**: mostrar "Has alcanzado el límite de teams permitidos."
- **Exceder máximo de atletas por team**: mostrar "Has alcanzado el límite de atletas en este team."
- **Subida de avatar > 2-3 MB**: mostrar "La imagen es muy grande. El máximo es 2 MB."
- **Formato de avatar no soportado**: mostrar "Formato no soportado. Usa JPG, PNG o WebP."

---

## 10. Criterios de aceptación

### Autenticación
- [ ] Un usuario con credenciales válidas puede iniciar sesión y es redirigido a la pantalla de su rol.
- [ ] Un usuario con credenciales inválidas ve un mensaje de error sin revelar si el email existe.
- [ ] Un usuario sin sesión activa que intente acceder a una pantalla es redirigido al login.
- [ ] Cerrar sesión destruye la sesión y redirige al login.

### Gestión de usuarios (Admin)
- [ ] El admin puede crear un coach y este recibe email de invitación.
- [ ] El admin puede editar, desactivar y eliminar coaches.
- [ ] Un coach desactivado no puede iniciar sesión.
- [ ] El admin puede ver coaches huérfanos (sin grupo).

### Grupos (Admin)
- [ ] El admin puede crear, editar y eliminar grupos.
- [ ] El admin puede ver solicitudes pendientes y aprobar/rechazar.
- [ ] El admin puede asignar/quitar Director Técnico.
- [ ] Un coach aprobado queda vinculado al grupo y ve a los otros coaches.
- [ ] Un coach rechazado recibe notificación.

### Teams (Coach)
- [ ] El coach crea un team y el nombre por defecto es su apellido.
- [ ] El coach puede renombrar el team.
- [ ] El coach puede crear múltiples teams.
- [ ] El coach puede asignar y quitar atletas de sus teams.
- [ ] Un atleta puede estar en varios teams del mismo coach.

### Plantillas (Coach)
- [ ] El coach puede crear una plantilla con estructura: calentamiento, entrenamiento específico, enfriamiento (+ opcionales).
- [ ] El coach puede editar una plantilla existente.
- [ ] El coach puede clonar una plantilla (propia, oficial o compartida del grupo).
- [ ] El coach puede compartir una plantilla al grupo (visible para otros coaches del grupo).
- [ ] Las plantillas oficiales se pueden clonar pero no editar directamente.
- [ ] El coach puede crear tipos de sesión libre (no solo los predefinidos).

### Planificación (Coach)
- [ ] El coach puede arrastrar plantillas al calendario de un atleta (drag & drop).
- [ ] El coach puede usar el generador de semana tipo.
- [ ] El coach puede asignar una plantilla a varios atletas a la vez.
- [ ] El coach puede copiar la semana anterior con opción de editar.
- [ ] Los días sin asignar se muestran como "Descanso".
- [ ] Solo el coach puede modificar el plan del atleta.

### Calendario Atleta
- [ ] El atleta ve su calendario mensual con el día actual resaltado.
- [ ] El código de color refleja el estado de cada sesión (verde/amarillo/rojo/gris).
- [ ] Al hacer click en un día, ve el detalle de la sesión planificada.
- [ ] El atleta puede registrar: distancia, tiempo, RPE y comentarios.
- [ ] Al guardar el registro, el estado del día cambia y las métricas se actualizan.
- [ ] El atleta puede editar su registro dentro de 24-48 horas.
- [ ] Fuera de la ventana de 24-48h, el atleta no puede editar.
- [ ] El atleta puede marcar "No realizada" con motivo predefinido o libre.
- [ ] El atleta no puede registrar sesiones futuras.

### Calendario Coach
- [ ] El coach ve el calendario de cada atleta con badges de cumplimiento por día.
- [ ] El coach ve el registro real de cada sesión.
- [ ] El coach puede dejar feedback en una sesión.
- [ ] El atleta recibe notificación in-app del feedback.

### Métricas
- [ ] El atleta ve sus métricas: cumplimiento %, carga semanal, progresión, distribución por tipo, RPE medio, rachas, VO2max, zonas FC.
- [ ] El coach ve el resumen del team: % atletas por cumplimiento, carga media, alertas.
- [ ] El Director Técnico ve la comparativa de teams y cumplimiento por coach.
- [ ] Las métricas se actualizan en tiempo real al guardar un registro.
- [ ] Se pueden exportar a PDF y Excel.

### Notificaciones
- [ ] El atleta recibe notificación in-app cuando el coach publica un plan.
- [ ] El coach recibe notificación in-app y email cuando el atleta completa una sesión.
- [ ] El sistema envía email de bienvenida al activar cuenta.
- [ ] El Admin y Director Técnico pueden enviar anuncios masivos (in-app + email).
- [ ] El usuario ve el centro de notificaciones con contador de no leídas.

### Avatar
- [ ] El usuario puede subir una foto de perfil (JPG/PNG/WebP, máx. 2-3 MB).
- [ ] La imagen se redimensiona a 256×256 px.
- [ ] El avatar se muestra en header, lista de atletas y perfil.
- [ ] Sin foto, se muestra avatar de iniciales.
- [ ] El usuario puede eliminar su foto y volver al avatar de iniciales.

### Admin
- [ ] El admin puede gestionar coaches (alta, edición, desactivación, eliminación, reset pwd, reenviar invitación).
- [ ] El admin puede gestionar grupos (CRUD, solicitudes, Director Técnico).
- [ ] El admin puede ver atletas globales con filtros y trasladar entre teams/coaches.
- [ ] El admin puede gestionar configuración global (plantillas oficiales, email, límites, motivos, tipos de sesión).
- [ ] El admin puede consultar logs de auditoría.
- [ ] El admin puede exportar listados globales.
- [ ] El admin puede realizar mantenimiento (limpieza avatares huérfanos).

### Accesibilidad y UX
- [ ] El sistema es responsive (desktop, tablet, móvil).
- [ ] Las acciones destructivas piden confirmación.
- [ ] Los estados vacíos muestran mensajes orientativos.
- [ ] Los errores muestran mensajes claros y accionables.

---

## 11. Alcance del MVP

### Incluido en el MVP

| # | Funcionalidad |
|---|---------------|
| 1 | Autenticación por sesión (login/logout, cookies) |
| 2 | Gestión de usuarios: Admin crea/edita/desactiva/elimina coaches |
| 3 | Gestión de grupos/escuelas: Admin crea/edita/elimina, aprueba solicitudes, asigna Director Técnico |
| 4 | Solicitud de unión a grupo: Coach solicita, Admin aprueba/rechaza |
| 5 | Gestión de teams: Coach crea/edita teams (nombre por defecto = apellido), asigna atletas |
| 6 | Gestión de atletas: Coach da de alta y asigna a teams; Admin gestiona globalmente con filtros y traslados |
| 7 | Biblioteca de plantillas: crear, editar, clonar, compartir al grupo, plantillas oficiales |
| 8 | Planificación semanal: drag & drop, generador, multi-asignación, copiar semana anterior |
| 9 | Calendario mensual atleta: vista mes, código de color, detalle de sesión, registro de resultados |
| 10 | Registro de sesiones: distancia, tiempo, RPE, comentarios, edición 24-48h, motivo "no realizada" |
| 11 | Calendario coach: visualización, badges cumplimiento, feedback en sesiones |
| 12 | Métricas: atleta (detalle), team (resumen), grupo (agregado) |
| 13 | Exportación a PDF y Excel |
| 14 | Notificaciones in-app (campanita) |
| 15 | Email automático (plan publicado, sesión completada, anuncios masivos) |
| 16 | Avatar por usuario (subida, redimensionado, R2, iniciales por defecto) |
| 17 | Panel Admin: configuración global (plantillas oficiales, email, límites, motivos, tipos de sesión) |
| 18 | Logs / Auditoría |
| 19 | Exportes globales (Admin) |
| 20 | Vista Director Técnico (lectura agregada, anuncios masivos, métricas por grupo) |

### Fuera del MVP (fases futuras)

| # | Funcionalidad | Justificación |
|---|---------------|---------------|
| 1 | API pública | El sistema es SSR, uso directo vía navegador. No se requiere. |
| 2 | Tiempo real (WebSockets) | Las actualizaciones se hacen al guardar. No se necesita push en tiempo real. |
| 3 | App móvil nativa | El MVP es responsive web. App puede ser fase futura. |
| 4 | Integración con wearables/GPS (Garmin, Strava, Apple Watch) | Requiere APIs externas y autorizaciones. No esencial para MVP. |
| 5 | Evidencia fotográfica por sesión | Se decidió simplificar a solo avatar. |
| 6 | Pagos / suscripciones | El modelo de negocio no está definido en esta etapa. |
| 7 | Chat en tiempo real coach-atleta | Se maneja con notificaciones + feedback en sesiones. |
| 8 | Sistema multi-idioma (i18n) | Solo español (Chile) por ahora. El stack lo soporta a futuro. |
| 9 | Festivos regionales automáticos | La configuración es manual por coach. Automatización es fase futura. |
| 10 | Gestión de lesiones / historial médico | No mencionado en el scope. |
| 11 | Planes de entrenamiento por objetivos (maratón, 10k, etc.) | Puede ser fase futura como plantillas oficiales avanzadas. |
| 12 | Módulo de competencias / carreras | Fuera del alcance del MVP. |
| 13 | IA / recomendaciones automáticas | No mencionado en el scope. |
| 14 | Dominio propio | Se usa el dominio *.pages.dev de Cloudflare por ahora. |

---

*Documento generado a partir de `AGENTS.md` — RunOsorno. Este documento define el qué del producto. El plan técnico de desarrollo se elaborará a partir de esta especificación.*
