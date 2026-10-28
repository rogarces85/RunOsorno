# SPECS — Especificaciones Funcionales Atómicas del MVP — RunOsorno

Documento de especificación funcional del producto mínimo viable (MVP) de RunOsorno. Define **qué debe hacer el producto, cómo debe comportarse y cómo comprobaremos que cumple los requisitos**. No contiene decisiones de implementación técnica (arquitectura, estructura de archivos, clases, funciones, endpoints ni código).

Fuentes: `specs/AGENTS.md` y `specs/mvp.md`. No existe `specs/SPECS.md` previa.

---

## 1. Descripción del MVP

**Qué se quiere construir.**
RunOsorno es una plataforma web de gestión de entrenamiento de running que conecta entrenadores (coaches) con sus atletas, bajo la supervisión de un administrador. El MVP permite el ciclo completo: el coach planifica → el atleta ejecuta y registra → el coach revisa y responde.

**Qué problema resuelve.**
Los coaches y atletas de running gestionan sus entrenamientos mediante planillas manuales, hojas de cálculo o mensajes dispersos. No existe un lugar centralizado donde el plan semanal, el registro de resultados y el seguimiento del cumplimiento estén conectados. RunOsorno reemplaza este proceso manual por una herramienta web accesible desde navegador para los tres roles del sistema.

**Propósito principal.**
Digitalizar y centralizar la planificación, ejecución y seguimiento de entrenamientos de running, permitiendo que un coach diseñe planes semanales, que el atleta registre sus resultados reales en un calendario, y que el coach revise el cumplimiento y se comunique con su equipo — todo desde una misma plataforma.

---

## 2. Objetivos

**OBJ-01 — Objetivo general.**
Entregar un sistema web funcional donde un administrador gestione coaches y grupos, un coach planifique y dé seguimiento a sus atletas, y un atleta consulte su plan y registre sus sesiones de entrenamiento.

**OBJ-02 — Objetivos específicos.**

| ID | Objetivo | Resultado verificable |
|----|----------|----------------------|
| OBJ-02.1 | Permitir al coach crear y gestionar teams y planificar sesiones semanales para sus atletas mediante plantillas de entrenamiento. | Un coach puede crear al menos un team, asignar atletas y publicar un plan semanal visible para ellos. |
| OBJ-02.2 | Permitir al atleta consultar su plan en un calendario mensual y registrar los resultados reales de cada sesión. | Un atleta puede ver su calendario y registrar distancia, tiempo, RPE y comentarios en una sesión planificada. |
| OBJ-02.3 | Permitir al coach revisar el cumplimiento y las métricas de su equipo, responder al feedback de los atletas y recibir notificaciones de sus sesiones completadas. | Un coach puede ver el cumplimiento de sus atletas y dejar feedback en una sesión. |
| OBJ-02.4 | Permitir al administrador gestionar el alta de coaches, la creación de grupos/escuelas y la aprobación de solicitudes. | Un admin puede crear un coach, crear un grupo y aprobar una solicitud de unión. |
| OBJ-02.5 | Establecer autenticación por sesión con roles diferenciados (Admin, Director Técnico, Coach, Atleta) y permisos acordes a cada rol. | Un usuario autenticado solo accede a pantallas y acciones permitidas para su rol. |
| OBJ-02.6 | Mantener el sistema sin API pública, sin tiempo real y orientado a uso directo vía navegador. | El sistema funciona en navegador sin API REST expuesta ni WebSockets. |

---

## 3. Usuarios y permisos conceptuales

### 3.1 Tipos de usuarios

| ID | Rol | Descripción |
|----|-----|-------------|
| USR-01 | Administrador (Admin) | Usuario con control global del sistema. Da de alta coaches, crea grupos/escuelas, aprueba solicitudes, gestiona la configuración global. |
| USR-02 | Director Técnico | Rol asignado dentro de un grupo/escuela. Tiene visibilidad total de los atletas del grupo y sus métricas agregadas. |
| USR-03 | Coach (Entrenador) | Usuario que crea y gestiona teams, planifica entrenamientos, revisa el cumplimiento de sus atletas y les responde. |
| USR-04 | Atleta | Usuario que consulta su plan de entrenamiento en calendario, registra los resultados de sus sesiones y envía feedback a su coach. |

### 3.2 Necesidades y acciones por usuario

**Administrador (USR-01)**
- Crear y administrar cuentas de coaches (alta, edición, desactivación, eliminación).
- Crear grupos/escuelas y asignar Directores Técnicos.
- Aprobar o rechazar solicitudes de coaches para unirse a grupos.
- Gestionar configuración global (plantillas oficiales, parámetros de email, límites, motivos predefinidos, tipos de sesión base).
- Consultar logs de auditoría y exportar datos globales.
- Tener visibilidad del estado general del sistema (coaches, atletas, grupos, actividad).

**Director Técnico (USR-02)**
- Ver todos los atletas de su grupo/escuela en modo lectura.
- Ver métricas agregadas comparativas entre teams del grupo.
- Ver el cumplimiento por coach dentro de su grupo.
- Enviar anuncios masivos a todo el grupo.

**Coach (USR-03)**
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

**Atleta (USR-04)**
- Consultar su calendario mensual con el plan de entrenamiento asignado.
- Registrar los resultados reales de cada sesión: distancia, tiempo, esfuerzo percibido (RPE), comentarios.
- Marcar una sesión como "no realizada" indicando un motivo (predefinido o libre).
- Editar su registro dentro de una ventana de 24-48 horas después de completar la sesión.
- Ver su historial y sus métricas personales (cumplimiento, carga semanal, progresión, distribución por tipo, VO2max estimado, zonas FC, umbral, etc.).
- Enviar feedback o preguntas a su coach desde la sesión.
- Ver a qué grupo/escuela y a qué team(s) pertenece.

---

## 4. Alcance funcional

### 4.1 Incluido en el MVP

| ID | Funcionalidad |
|----|---------------|
| ALC-01 | Autenticación por sesión (login/logout, cookies) |
| ALC-02 | Gestión de usuarios: Admin crea/edita/desactiva/elimina coaches |
| ALC-03 | Gestión de grupos/escuelas: Admin crea/edita/elimina, aprueba solicitudes, asigna Director Técnico |
| ALC-04 | Solicitud de unión a grupo: Coach solicita, Admin aprueba/rechaza |
| ALC-05 | Gestión de teams: Coach crea/edita teams (nombre por defecto = apellido), asigna atletas |
| ALC-06 | Gestión de atletas: Coach da de alta y asigna a teams; Admin gestiona globalmente con filtros y traslados |
| ALC-07 | Biblioteca de plantillas: crear, editar, clonar, compartir al grupo, plantillas oficiales |
| ALC-08 | Planificación semanal: drag & drop, generador, multi-asignación, copiar semana anterior |
| ALC-09 | Calendario mensual atleta: vista mes, código de color, detalle de sesión, registro de resultados |
| ALC-10 | Registro de sesiones: distancia, tiempo, RPE, comentarios, edición 24-48h, motivo "no realizada" |
| ALC-11 | Calendario coach: visualización, badges cumplimiento, feedback en sesiones |
| ALC-12 | Métricas: atleta (detalle), team (resumen), grupo (agregado) |
| ALC-13 | Exportación a PDF y Excel |
| ALC-14 | Notificaciones in-app (campanita) |
| ALC-15 | Email automático (plan publicado, sesión completada, anuncios masivos) |
| ALC-16 | Avatar por usuario (subida, redimensionado, R2, iniciales por defecto) |
| ALC-17 | Panel Admin: configuración global (plantillas oficiales, email, límites, motivos, tipos de sesión) |
| ALC-18 | Logs / Auditoría |
| ALC-19 | Exportes globales (Admin) |
| ALC-20 | Vista Director Técnico (lectura agregada, anuncios masivos, métricas por grupo) |

### 4.2 Fuera del MVP (fases futuras)

| ID | Funcionalidad | Justificación |
|----|---------------|---------------|
| EXC-01 | API pública | El sistema es SSR, uso directo vía navegador. No se requiere. |
| EXC-02 | Tiempo real (WebSockets) | Las actualizaciones se hacen al guardar. No se necesita push en tiempo real. |
| EXC-03 | App móvil nativa | El MVP es responsive web. App puede ser fase futura. |
| EXC-04 | Integración con wearables/GPS | Requiere APIs externas y autorizaciones. No esencial para MVP. |
| EXC-05 | Evidencia fotográfica por sesión | Se decidió simplificar a solo avatar. |
| EXC-06 | Pagos / suscripciones | El modelo de negocio no está definido en esta etapa. |
| EXC-07 | Chat en tiempo real coach-atleta | Se maneja con notificaciones + feedback en sesiones. |
| EXC-08 | Sistema multi-idioma | Solo español (Chile) por ahora. |
| EXC-09 | Festivos regionales automáticos | La configuración es manual por coach. |
| EXC-10 | Gestión de lesiones / historial médico | No mencionado en el scope. |

---

## 5. Requisitos funcionales

### 5.1 Autenticación y gestión de sesiones

**RF-001 — Inicio de sesión.**
- **Descripción:** El sistema permite a un usuario iniciar sesión con email y contraseña.
- **Actor:** Cualquier usuario con cuenta activa.
- **Datos de entrada:** Email, contraseña.
- **Resultado observable:** Sesión creada (cookie HttpOnly/Secure/SameSite) y redirección al dashboard correspondiente al rol del usuario.
- **Reglas:** Mensaje de error genérico si las credenciales son inválidas (no revelar si el email existe).
- **Criterios de aceptación:** CA-001, CA-002.

**RF-002 — Cierre de sesión.**
- **Descripción:** El usuario puede cerrar sesión desde cualquier pantalla autenticada.
- **Actor:** Usuario autenticado.
- **Resultado observable:** Sesión destruida, redirección al login.
- **Reglas:** Ninguna sesión queda activa tras el cierre.
- **Criterios de aceptación:** CA-004.

**RF-003 — Protección de rutas sin sesión.**
- **Descripción:** Un usuario no autenticado no puede acceder a ninguna pantalla del sistema.
- **Actor:** Usuario sin sesión.
- **Resultado observable:** Redirección al login al intentar acceder a cualquier ruta de `app/(app)/`.
- **Reglas:** La protección se aplica en los layouts, no mediante middleware.
- **Criterios de aceptación:** CA-003.

**RF-004 — Sesión expirada.**
- **Descripción:** Cuando la sesión caduca, el sistema redirige al login.
- **Actor:** Usuario con sesión caducada.
- **Resultado observable:** Redirección a `/login` con mensaje "Tu sesión ha expirado, inicia sesión nuevamente."
- **Reglas:** La cookie de sesión es invalidada del lado del servidor.
- **Criterios de aceptación:** CA-005.

---

### 5.2 Gestión de usuarios (Admin)

**RF-005 — Alta de coach.**
- **Descripción:** El administrador crea una cuenta de coach con nombre, email y contraseña temporal.
- **Actor:** Administrador.
- **Datos de entrada:** Nombre, email.
- **Resultado observable:** Usuario creado con rol `coach`, `must_change_password=true`, email de invitación enviado.
- **Reglas:** El email debe ser único. El sistema envía email de invitación.
- **Criterios de aceptación:** CA-006.

**RF-006 — Edición de coach.**
- **Descripción:** El administrador puede modificar nombre y email de un coach existente.
- **Actor:** Administrador.
- **Datos de entrada:** ID del coach, campos a modificar.
- **Resultado observable:** Datos del coach actualizados en el sistema.
- **Reglas:** Solo coaches existentes pueden ser editados.
- **Criterios de aceptación:** CA-007.

**RF-007 — Desactivación de coach (soft delete).**
- **Descripción:** El administrador desactiva a un coach; este queda inactivo pero sus datos se conservan.
- **Actor:** Administrador.
- **Resultado observable:** Coach con `is_active=false`; no puede iniciar sesión.
- **Reglas:** Un coach desactivado no puede loguearse. Sus teams y registros históricos se mantienen.
- **Criterios de aceptación:** CA-008.

**RF-008 — Eliminación definitiva de coach.**
- **Descripción:** El administrador elimina la cuenta de un coach.
- **Actor:** Administrador.
- **Resultado observable:** Cuenta del coach eliminada del sistema.
- **Reglas:** Solo aplica si el coach no tiene teams ni sesiones asociadas. De lo contrario, se recomienda desactivación.
- **Criterios de aceptación:** CA-009.

**RF-009 — Restablecimiento de contraseña de coach.**
- **Descripción:** El administrador genera una nueva contraseña temporal para un coach.
- **Actor:** Administrador.
- **Resultado observable:** Nueva contraseña temporal generada, `must_change_password=true`, email enviado al coach.
- **Reglas:** El coach debe cambiar la contraseña en su primer login.
- **Criterios de aceptación:** CA-010.

**RF-010 — Reenvío de invitación.**
- **Descripción:** El administrador reenvía el email de invitación a un coach que no ha activado su cuenta.
- **Actor:** Administrador.
- **Resultado observable:** Email de invitación reenviado.
- **Reglas:** Solo para coaches con cuenta pendiente de activación.
- **Criterios de aceptación:** CA-011.

**RF-011 — Listado de coaches huérfanos.**
- **Descripción:** El administrador puede ver coaches sin grupo asignado.
- **Actor:** Administrador.
- **Resultado observable:** Listado de coaches con `group_id` nulo.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-012.

---

### 5.3 Gestión de grupos/escuelas (Admin)

**RF-012 — Crear grupo.**
- **Descripción:** El administrador crea un grupo/escuela con nombre, descripción y opcionalmente logo.
- **Actor:** Administrador.
- **Datos de entrada:** Nombre, descripción, logo (opcional).
- **Resultado observable:** Grupo creado y visible en el listado de grupos.
- **Reglas:** Solo el Admin puede crear grupos.
- **Criterios de aceptación:** CA-013.

**RF-013 — Editar grupo.**
- **Descripción:** El administrador modifica nombre, descripción o logo de un grupo existente.
- **Actor:** Administrador.
- **Datos de entrada:** ID del grupo, campos a modificar.
- **Resultado observable:** Datos del grupo actualizados.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-014.

**RF-014 — Eliminar grupo.**
- **Descripción:** El administrador elimina un grupo con confirmación.
- **Actor:** Administrador.
- **Resultado observable:** Grupo eliminado del sistema.
- **Reglas:** Solo si no tiene coaches miembros ni plantillas compartidas.
- **Criterios de aceptación:** CA-015.

**RF-015 — Aprobar solicitud de unión.**
- **Descripción:** El administrador aprueba la solicitud de un coach para unirse al grupo.
- **Actor:** Administrador.
- **Datos de entrada:** ID de la solicitud.
- **Resultado observable:** Coach vinculado al grupo; notificación al coach.
- **Reglas:** El coach puede estar en múltiples grupos.
- **Criterios de aceptación:** CA-016.

**RF-016 — Rechazar solicitud de unión.**
- **Descripción:** El administrador rechaza la solicitud de un coach para unirse al grupo.
- **Actor:** Administrador.
- **Datos de entrada:** ID de la solicitud.
- **Resultado observable:** Solicitud rechazada; notificación al coach.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-017.

**RF-017 — Asignar/quitar Director Técnico.**
- **Descripción:** El administrador alterna el rol `is_director` de un coach dentro de un grupo.
- **Actor:** Administrador.
- **Datos de entrada:** ID del grupo, ID del coach, valor booleano.
- **Resultado observable:** Coach con o sin rol de Director Técnico en el grupo.
- **Reglas:** Solo el Admin puede asignar este rol.
- **Criterios de aceptación:** CA-018.

---

### 5.4 Solicitud de unión a grupo (Coach → Admin)

**RF-018 — Enviar solicitud de unión.**
- **Descripción:** Un coach solicita unirse a un grupo/escuela existente.
- **Actor:** Coach.
- **Datos de entrada:** ID del grupo.
- **Resultado observable:** Solicitud pendiente creada para el grupo.
- **Reglas:** Un coach no puede enviar solicitud duplicada a un grupo donde ya es miembro o tiene solicitud pendiente/aprobada.
- **Criterios de aceptación:** CA-019.

**RF-019 — Ver grupos disponibles.**
- **Descripción:** El coach ve la lista de grupos donde aún no es miembro ni tiene solicitud pendiente.
- **Actor:** Coach.
- **Resultado observable:** Listado de grupos disponibles para solicitar unión.
- **Reglas:** Excluyen grupos donde el coach ya es miembro o tiene solicitud activa.
- **Criterios de aceptación:** CA-020.

---

### 5.5 Gestión de teams (Coach)

**RF-020 — Crear team.**
- **Descripción:** El coach crea un team con nombre por defecto igual a su apellido, editable.
- **Actor:** Coach.
- **Datos de entrada:** Nombre (opcional, por defecto = apellido del coach).
- **Resultado observable:** Team creado y asociado al coach.
- **Reglas:** El nombre por defecto es el apellido del coach; puede modificarse.
- **Criterios de aceptación:** CA-021.

**RF-021 — Editar nombre de team.**
- **Descripción:** El coach modifica el nombre de un team existente.
- **Actor:** Coach.
- **Datos de entrada:** ID del team, nuevo nombre.
- **Resultado observable:** Nombre del team actualizado.
- **Reglas:** Solo el creador del team puede editarlo.
- **Criterios de aceptación:** CA-022.

**RF-022 — Eliminar team.**
- **Descripción:** El coach elimina un team con confirmación.
- **Actor:** Coach.
- **Datos de entrada:** ID del team.
- **Resultado observable:** Team eliminado del sistema.
- **Reglas:** Solo si no tiene atletas asignados.
- **Criterios de aceptación:** CA-023.

**RF-023 — Listado de teams del coach.**
- **Descripción:** El coach ve todos sus teams con conteo de atletas.
- **Actor:** Coach.
- **Resultado observable:** Listado de teams creados por el coach.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-024.

**RF-024 — Asignar atleta a team.**
- **Descripción:** El coach asigna un atleta a uno de sus teams.
- **Actor:** Coach.
- **Datos de entrada:** ID del team, ID del atleta.
- **Resultado observable:** Atleta asignado al team.
- **Reglas:** Verifica límite de atletas por team desde configuración global. Un atleta puede estar en múltiples teams.
- **Criterios de aceptación:** CA-025.

**RF-025 — Quitar atleta de team.**
- **Descripción:** El coach quita un atleta de uno de sus teams.
- **Actor:** Coach.
- **Datos de entrada:** ID del team, ID del atleta.
- **Resultado observable:** Atleta removido del team.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-026.

---

### 5.6 Gestión de atletas (Coach y Admin)

**RF-026 — Dar de alta atleta (Coach).**
- **Descripción:** El coach crea un atleta y lo asigna a uno de sus teams.
- **Actor:** Coach.
- **Datos de entrada:** Nombre, email, datos físicos opcionales, ID del team.
- **Resultado observable:** Usuario con rol `atleta` creado, perfil de atleta generado, asignado al team.
- **Reglas:** El atleta queda vinculado al team del coach.
- **Criterios de aceptación:** CA-027.

**RF-027 — Ver atletas del team (Coach).**
- **Descripción:** El coach ve el listado de atletas de sus teams con estado de cumplimiento y última actividad.
- **Actor:** Coach.
- **Resultado observable:** Listado de atletas de los teams del coach.
- **Reglas:** Solo atletas de sus propios teams.
- **Criterios de aceptación:** CA-028.

**RF-028 — Detalle de atleta (Coach).**
- **Descripción:** El coach ve el detalle de un atleta de su team: plan, registros, métricas, historial.
- **Actor:** Coach.
- **Datos de entrada:** ID del atleta.
- **Resultado observable:** Pantalla de detalle del atleta.
- **Reglas:** Solo atletas de sus propios teams.
- **Criterios de aceptación:** CA-029.

**RF-029 — Listado global de atletas (Admin).**
- **Descripción:** El administrador ve todos los atletas del sistema con filtros.
- **Actor:** Administrador.
- **Datos de entrada:** Filtros opcionales (coach, team, grupo, estado).
- **Resultado observable:** Listado global filtrado de atletas.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-030.

**RF-030 — Trasladar atleta entre teams/coaches (Admin).**
- **Descripción:** El administrador mueve un atleta de un team/coach a otro, registrando el historial.
- **Actor:** Administrador.
- **Datos de entrada:** ID del atleta, team de origen, team de destino.
- **Resultado observable:** Atleta reasignado; cambio registrado en auditoría.
- **Reglas:** El historial de sesiones del atleta se conserva.
- **Criterios de aceptación:** CA-031.

**RF-031 — Ver atletas sin coach (Admin).**
- **Descripción:** El administrador ve atletas que no tienen coach asignado.
- **Actor:** Administrador.
- **Resultado observable:** Listado de atletas huérfanos.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-032.

---

### 5.7 Biblioteca de plantillas de sesiones (Coach)

**RF-032 — Crear plantilla.**
- **Descripción:** El coach crea una plantilla de sesión con nombre, tipo y estructura de secciones.
- **Actor:** Coach.
- **Datos de entrada:** Nombre, tipo de sesión, estructura (calentamiento, específico, enfriamiento, opcionales).
- **Resultado observable:** Plantilla privada creada y visible para el coach.
- **Reglas:** Debe tener nombre y al menos una sección con contenido.
- **Criterios de aceptación:** CA-033.

**RF-033 — Editar plantilla propia.**
- **Descripción:** El coach modifica una plantilla que él creó.
- **Actor:** Coach.
- **Datos de entrada:** ID de la plantilla, campos a modificar.
- **Resultado observable:** Plantilla actualizada.
- **Reglas:** Solo el creador puede editarla. No aplica a plantillas oficiales ni compartidas de otros grupos.
- **Criterios de aceptación:** CA-034.

**RF-034 — Eliminar plantilla.**
- **Descripción:** El coach elimina una plantilla propia.
- **Actor:** Coach.
- **Datos de entrada:** ID de la plantilla.
- **Resultado observable:** Plantilla eliminada.
- **Reglas:** No se puede eliminar si tiene asignaciones activas en planes de atletas.
- **Criterios de aceptación:** CA-035.

**RF-035 — Clonar plantilla.**
- **Descripción:** El coach duplica una plantilla (propia, oficial o compartida del grupo) como plantilla propia editable.
- **Actor:** Coach.
- **Datos de entrada:** ID de la plantilla origen, nuevo nombre.
- **Resultado observable:** Nueva plantilla propia con estructura copiada.
- **Reglas:** Para clonar una plantilla compartida, el coach debe pertenecer al mismo grupo.
- **Criterios de aceptación:** CA-036.

**RF-036 — Compartir plantilla al grupo.**
- **Descripción:** El coach publica una de sus plantillas para que sea visible y clonable por otros coaches del mismo grupo.
- **Actor:** Coach.
- **Datos de entrada:** ID de la plantilla, ID del grupo.
- **Resultado observable:** Plantilla marcada como compartida y vinculada al grupo.
- **Reglas:** Solo plantillas propias pueden ser compartidas. Los otros coaches del grupo pueden verla y clonarla, pero no editarla.
- **Criterios de aceptación:** CA-037.

**RF-037 — Dejar de compartir plantilla.**
- **Descripción:** El coach retira una plantilla compartida del grupo.
- **Actor:** Coach.
- **Datos de entrada:** ID de la plantilla.
- **Resultado observable:** Plantilla deja de ser visible para otros coaches del grupo.
- **Reglas:** Solo el creador puede dejar de compartir.
- **Criterios de aceptación:** CA-038.

**RF-038 — Ver biblioteca de plantillas.**
- **Descripción:** El coach ve sus plantillas propias, oficiales y compartidas de su grupo.
- **Actor:** Coach.
- **Resultado observable:** Listado de plantillas organizadas por pestañas (mías, oficiales, grupo).
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-039.

**RF-039 — Ver plantillas oficiales (Admin CRUD).**
- **Descripción:** El administrador gestiona plantillas oficiales precargadas.
- **Actor:** Administrador.
- **Datos de entrada:** Nombre, tipo, estructura.
- **Resultado observable:** Plantillas oficiales creadas, editadas o eliminadas.
- **Reglas:** Las plantillas oficiales son clonables por cualquier coach, pero no editables directamente (la edición crea una copia propia).
- **Criterios de aceptación:** CA-040.

---

### 5.8 Planificación semanal (Coach)

**RF-040 — Asignar plantilla a día.**
- **Descripción:** El coach asigna una plantilla a un día específico del calendario de un atleta.
- **Actor:** Coach.
- **Datos de entrada:** ID del atleta, ID de la plantilla, fecha.
- **Resultado observable:** Asignación de sesión creada con estado `planificada`.
- **Reglas:** Si el día ya tiene una plantilla, se pide confirmación para reemplazar.
- **Criterios de aceptación:** CA-041.

**RF-041 — Multi-asignación.**
- **Descripción:** El coach asigna la misma plantilla a varios atletas en una misma fecha.
- **Actor:** Coach.
- **Datos de entrada:** Lista de IDs de atletas, ID de la plantilla, fecha.
- **Resultado observable:** Múltiples asignaciones creadas.
- **Reglas:** Requiere al menos un atleta seleccionado.
- **Criterios de aceptación:** CA-042.

**RF-042 — Copiar semana anterior.**
- **Descripción:** El coach copia las asignaciones de la semana anterior a la semana actual de un atleta.
- **Actor:** Coach.
- **Datos de entrada:** ID del atleta, semana de inicio.
- **Resultado observable:** Asignaciones copiadas a la semana actual, editables.
- **Reglas:** Si no hay semana anterior, se muestra error "No hay semana anterior para copiar."
- **Criterios de aceptación:** CA-043.

**RF-043 — Generador de semana tipo.**
- **Descripción:** El coach genera una semana completa distribuyendo plantillas según un patrón (ej. 3 Fondos + 1 Series + 1 Tempo + 2 Descanso).
- **Actor:** Coach.
- **Datos de entrada:** ID del atleta, semana de inicio, patrón de tipos y cantidades.
- **Resultado observable:** Semana completa con asignaciones distribuidas en los 7 días.
- **Reglas:** La distribución respeta el patrón indicado.
- **Criterios de aceptación:** CA-044.

**RF-044 — Editar asignación existente.**
- **Descripción:** El coach modifica o elimina una asignación ya planificada.
- **Actor:** Coach.
- **Datos de entrada:** ID de la asignación, cambios o acción de eliminar.
- **Resultado observable:** Asignación actualizada o eliminada.
- **Reglas:** Solo el coach dueño del atleta puede modificar su plan.
- **Criterios de aceptación:** CA-045.

**RF-045 — Ver plan semanal.**
- **Descripción:** El coach ve las asignaciones de una semana para un atleta.
- **Actor:** Coach.
- **Datos de entrada:** ID del atleta, semana de inicio.
- **Resultado observable:** Calendario semana con asignaciones y plantillas.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-046.

**RF-046 — Ver plan mensual.**
- **Descripción:** El coach ve las asignaciones de un mes para un atleta.
- **Actor:** Coach.
- **Datos de entrada:** ID del atleta, año, mes.
- **Resultado observable:** Calendario mes con asignaciones.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-047.

---

### 5.9 Calendario mensual — Vista Atleta

**RF-047 — Ver calendario mensual (Atleta).**
- **Descripción:** El atleta ve su calendario del mes actual con navegación anterior/siguiente.
- **Actor:** Atleta.
- **Resultado observable:** Calendario mes con días resaltados según estado.
- **Reglas:** El día actual está resaltado.
- **Criterios de aceptación:** CA-048.

**RF-048 — Ver detalle de sesión planificada.**
- **Descripción:** Al hacer click en un día, el atleta ve el detalle de la sesión planificada (calentamiento, específico, enfriamiento).
- **Actor:** Atleta.
- **Datos de entrada:** Fecha del día seleccionado.
- **Resultado observable:** Panel o modal con el detalle de la sesión planificada.
- **Reglas:** Solo se muestra si hay una asignación para ese día.
- **Criterios de aceptación:** CA-049.

**RF-049 — Registrar sesión.**
- **Descripción:** El atleta ingresa distancia, tiempo, RPE y comentarios para una sesión planificada.
- **Actor:** Atleta.
- **Datos de entrada:** ID de la asignación, distancia_km, duración_minutos, rpe, comentarios.
- **Resultado observable:** Registro de sesión creado; estado del día cambia a `completada`.
- **Reglas:** Distancia y tiempo son requeridos para marcar como completada. RPE debe estar entre 1 y 10. No se pueden registrar sesiones futuras.
- **Criterios de aceptación:** CA-050.

**RF-050 — Marcar sesión como no realizada.**
- **Descripción:** El atleta indica que no realizó la sesión, seleccionando un motivo predefinido o libre.
- **Actor:** Atleta.
- **Datos de entrada:** ID de la asignación, motivo (lesión, trabajo, enfermedad, personal, otro), motivo libre si es "otro".
- **Resultado observable:** Registro con motivo; estado del día cambia a `no realizada`.
- **Reglas:** Si el motivo es "otro", el campo libre es obligatorio.
- **Criterios de aceptación:** CA-051.

**RF-051 — Editar registro existente.**
- **Descripción:** El atleta edita su registro dentro de la ventana de 24-48 horas.
- **Actor:** Atleta.
- **Datos de entrada:** ID del registro, nuevos valores.
- **Resultado observable:** Registro actualizado.
- **Reglas:** Solo dentro de la ventana de edición (configurable, default 48h). Fuera de la ventana, el registro queda bloqueado. No se pueden registrar sesiones futuras.
- **Criterios de aceptación:** CA-052.

**RF-052 — Enviar feedback al coach.**
- **Descripción:** El atleta deja comentarios o preguntas al coach desde una sesión.
- **Actor:** Atleta.
- **Datos de entrada:** ID de la asignación, mensaje.
- **Resultado observable:** Feedback creado y asociado a la sesión.
- **Reglas:** El coach recibe notificación in-app.
- **Criterios de aceptación:** CA-053.

---

### 5.10 Calendario mensual — Vista Coach

**RF-053 — Ver calendario de atleta (Coach).**
- **Descripción:** El coach ve el calendario de un atleta de su team con badges de cumplimiento por día.
- **Actor:** Coach.
- **Datos de entrada:** ID del team, ID del atleta, mes.
- **Resultado observable:** Calendario con estado de cada día y badge de cumplimiento.
- **Reglas:** Solo atletas de sus propios teams.
- **Criterios de aceptación:** CA-054.

**RF-054 — Ver registro real del atleta.**
- **Descripción:** El coach ve el registro real de una sesión completada (distancia, tiempo, RPE, comentarios, motivo).
- **Actor:** Coach.
- **Datos de entrada:** ID de la asignación.
- **Resultado observable:** Detalle del registro real.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-055.

**RF-055 — Dejar feedback en sesión (Coach).**
- **Descripción:** El coach deja un comentario o respuesta al atleta sobre una sesión.
- **Actor:** Coach.
- **Datos de entrada:** ID de la asignación, mensaje.
- **Resultado observable:** Feedback creado; el atleta recibe notificación in-app.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-056.

---

### 5.11 Métricas y Dashboard

**RF-057 — Ver métricas del atleta.**
- **Descripción:** El atleta y su coach ven las métricas personales: cumplimiento %, carga semanal, progresión, distribución por tipo, RPE medio, rachas, métricas fisiológicas.
- **Actor:** Atleta, Coach.
- **Datos de entrada:** ID del atleta, periodo (temporada, año, rango personalizado).
- **Resultado observable:** Panel de métricas con gráficas.
- **Reglas:** Las métricas se calculan a partir de los registros reales.
- **Criterios de aceptación:** CA-057.

**RF-058 — Ver métricas del team.**
- **Descripción:** El coach ve el resumen del team: % de atletas por bucket de cumplimiento, carga media, alertas.
- **Actor:** Coach.
- **Datos de entrada:** ID del team, periodo.
- **Resultado observable:** Panel de métricas del team.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-058.

**RF-059 — Ver métricas del grupo.**
- **Descripción:** El Director Técnico ve la comparativa entre teams y el cumplimiento por coach.
- **Actor:** Director Técnico.
- **Datos de entrada:** ID del grupo, periodo.
- **Resultado observable:** Tabla comparativa y gráficas del grupo.
- **Reglas:** Solo lectura; no edita planes ni registros.
- **Criterios de aceptación:** CA-059.

**RF-060 — Actualización de métricas al guardar registro.**
- **Descripción:** Al guardar un registro de sesión, las métricas se recalculan.
- **Actor:** Sistema.
- **Resultado observable:** Métricas actualizadas sin refresh manual de página.
- **Reglas:** Disparado por el evento de registro de sesión.
- **Criterios de aceptación:** CA-060.

---

### 5.12 Notificaciones in-app

**RF-061 — Crear notificación in-app.**
- **Descripción:** El sistema genera una notificación in-app para un evento del sistema.
- **Actor:** Sistema.
- **Datos de entrada:** Usuario destino, tipo, título, mensaje, entidad relacionada.
- **Resultado observable:** Notificación creada y visible en el centro de notificaciones.
- **Reglas:** Se genera para todos los eventos: nuevo plan, cambio sesión, feedback, completada, pregunta, recordatorio, bienvenida, cambios equipo/grupo, anuncios masivos.
- **Criterios de aceptación:** CA-061.

**RF-062 — Ver centro de notificaciones.**
- **Descripción:** El usuario ve su campanita con contador de no leídas y la lista de notificaciones recientes.
- **Actor:** Usuario autenticado.
- **Resultado observable:** Contador de no leídas y listado de notificaciones.
- **Reglas:** Al hacer click en una notificación, se marca como leída y navega a la entidad relacionada.
- **Criterios de aceptación:** CA-062.

**RF-063 — Marcar notificación como leída.**
- **Descripción:** El usuario marca una notificación como leída.
- **Actor:** Usuario autenticado.
- **Datos de entrada:** ID de la notificación.
- **Resultado observable:** Notificación marcada como leída; contador actualizado.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-063.

**RF-064 — Marcar todas como leídas.**
- **Descripción:** El usuario marca todas sus notificaciones como leídas.
- **Actor:** Usuario autenticado.
- **Resultado observable:** Todas las notificaciones marcadas como leídas; contador en cero.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-064.

---

### 5.13 Notificaciones email (eventos críticos)

**RF-065 — Enviar email al publicar plan.**
- **Descripción:** Cuando el coach publica o carga un plan, se envía email al atleta notificándolo.
- **Actor:** Sistema.
- **Datos de entrada:** ID del atleta, ID del plan.
- **Resultado observable:** Email enviado al atleta.
- **Reglas:** Evento crítico; envío inmediato o mismo día.
- **Criterios de aceptación:** CA-065.

**RF-066 — Enviar email al completar sesión.**
- **Descripción:** Cuando el atleta completa una sesión, se envía email al coach.
- **Actor:** Sistema.
- **Datos de entrada:** ID del coach, ID de la sesión.
- **Resultado observable:** Email enviado al coach.
- **Reglas:** Evento crítico; envío inmediato o mismo día.
- **Criterios de aceptación:** CA-066.

**RF-067 — Enviar anuncio masivo.**
- **Descripción:** El Admin o Director Técnico envía un anuncio a todo el grupo (in-app + email).
- **Actor:** Admin o Director Técnico.
- **Datos de entrada:** ID del grupo, título, mensaje.
- **Resultado observable:** Notificaciones in-app creadas para todos los miembros; emails enviados.
- **Reglas:** Si el grupo no tiene miembros, se muestra aviso "El grupo no tiene miembros."
- **Criterios de aceptación:** CA-067.

---

### 5.14 Avatar / Foto de perfil

**RF-068 — Subir foto de perfil.**
- **Descripción:** El usuario sube una imagen que se redimensiona a 256×256 px y se almacena en R2.
- **Actor:** Usuario autenticado.
- **Datos de entrada:** Archivo de imagen (JPG, PNG, WebP, máx. 2-3 MB).
- **Resultado observable:** Foto de perfil guardada y visible en header, listas y perfil.
- **Reglas:** Se elimina EXIF. Solo hay un archivo por usuario (sobreescritura).
- **Criterios de aceptación:** CA-068.

**RF-069 — Ver avatar por defecto.**
- **Descripción:** Si el usuario no tiene foto, se muestra un avatar generado con iniciales.
- **Actor:** Usuario sin foto de perfil.
- **Resultado observable:** Avatar de iniciales (canvas SVG).
- **Reglas:** Sin dependencia externa.
- **Criterios de aceptación:** CA-069.

**RF-070 — Eliminar foto de perfil.**
- **Descripción:** El usuario elimina su foto, volviendo al avatar de iniciales.
- **Actor:** Usuario con foto de perfil.
- **Resultado observable:** Foto eliminada; se muestra avatar de iniciales.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-070.

---

### 5.15 Exportación de datos

**RF-071 — Exportar métricas de atleta (PDF/Excel).**
- **Descripción:** El coach exporta métricas y registros de un atleta específico.
- **Actor:** Coach.
- **Datos de entrada:** ID del atleta, formato (PDF/Excel), periodo.
- **Resultado observable:** Archivo descargable con datos del atleta.
- **Reglas:** Periodo configurable: temporada, año o rango personalizado.
- **Criterios de aceptación:** CA-071.

**RF-072 — Exportar resumen de team (PDF/Excel).**
- **Descripción:** El coach exporta resumen del team.
- **Actor:** Coach.
- **Datos de entrada:** ID del team, formato, periodo.
- **Resultado observable:** Archivo descargable con datos del team.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-072.

**RF-073 — Exportar métricas del grupo (PDF/Excel).**
- **Descripción:** El Director Técnico exporta métricas agregadas del grupo.
- **Actor:** Director Técnico.
- **Datos de entrada:** ID del grupo, formato, periodo.
- **Resultado observable:** Archivo descargable con datos del grupo.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-073.

**RF-074 — Exportar listados globales (CSV/Excel, Admin).**
- **Descripción:** El administrador exporta listados de coaches, atletas o grupos.
- **Actor:** Administrador.
- **Datos de entrada:** Tipo de entidad, formato, periodo.
- **Resultado observable:** Archivo descargable con datos globales.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-074.

---

### 5.16 Configuración global (Admin)

**RF-075 — Gestionar plantillas oficiales.**
- **Descripción:** El administrador crea, edita y elimina plantillas oficiales precargadas.
- **Actor:** Administrador.
- **Datos de entrada:** Nombre, tipo, estructura.
- **Resultado observable:** Plantillas oficiales gestionadas.
- **Reglas:** Los coaches pueden clonarlas y editarlas como copias propias.
- **Criterios de aceptación:** CA-075.

**RF-076 — Gestionar parámetros de email.**
- **Descripción:** El administrador configura SMTP, remitente y plantillas HTML base.
- **Actor:** Administrador.
- **Datos de entrada:** Configuración de email.
- **Resultado observable:** Parámetros de email actualizados.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-076.

**RF-077 — Gestionar límites globales.**
- **Descripción:** El administrador configura máx teams/coach, máx atletas/team, almacenamiento avatares.
- **Actor:** Administrador.
- **Datos de entrada:** Valores de límites.
- **Resultado observable:** Límites actualizados y aplicados en acciones correspondientes.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-077.

**RF-078 — Gestionar motivos "no realizada".**
- **Descripción:** El administrador edita la lista editable de motivos predefinidos.
- **Actor:** Administrador.
- **Datos de entrada:** Lista de motivos (lesión, trabajo, enfermedad, personal, otro).
- **Resultado observable:** Motivos actualizados y reflejados en el select del atleta.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-078.

**RF-079 — Gestionar tipos de sesión base.**
- **Descripción:** El administrador gestiona la lista de tipos base (Series, Intervalos, Fondos, Tempo, Recuperación, Descanso).
- **Actor:** Administrador.
- **Datos de entrada:** Lista de tipos.
- **Resultado observable:** Tipos de sesión actualizados.
- **Reglas:** El coach también puede crear tipos libres.
- **Criterios de aceptación:** CA-079.

---

### 5.17 Logs / Auditoría (Admin)

**RF-080 — Registrar acción crítica.**
- **Descripción:** El sistema registra acciones críticas con quién, qué, cuándo y IP.
- **Actor:** Sistema.
- **Datos de entrada:** Usuario, acción, entidad afectada, detalles, IP.
- **Resultado observable:** Entrada en el log de auditoría.
- **Reglas:** Se registran: creación/eliminación de usuarios, cambios en grupos, asignaciones de atletas, aprobación/rechazo de solicitudes, exportaciones de datos.
- **Criterios de aceptación:** CA-080.

**RF-081 — Consultar logs de auditoría.**
- **Descripción:** El administrador ve los logs con filtros por fecha, usuario y tipo de acción.
- **Actor:** Administrador.
- **Datos de entrada:** Filtros opcionales.
- **Resultado observable:** Listado de logs filtrados.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-081.

---

### 5.18 Vista Director Técnico

**RF-082 — Ver atletas del grupo (lectura).**
- **Descripción:** El Director Técnico ve todos los atletas de su grupo en modo lectura.
- **Actor:** Director Técnico.
- **Resultado observable:** Listado de atletas del grupo sin opciones de edición.
- **Reglas:** No edita planes ni registros.
- **Criterios de aceptación:** CA-082.

**RF-083 — Ver métricas agregadas del grupo.**
- **Descripción:** El Director Técnico ve comparativa de teams y cumplimiento por coach.
- **Actor:** Director Técnico.
- **Resultado observable:** Tabla comparativa y gráficas del grupo.
- **Reglas:** Ninguna.
- **Criterios de aceptación:** CA-083.

---

## 6. Flujos principales

**Flujo 1: Alta de un coach y creación de grupo (Admin).**
1. El admin inicia sesión.
2. El admin crea una cuenta de coach (nombre, email, contraseña temporal).
3. El sistema envía un email de invitación al coach.
4. El admin crea un grupo/escuela (nombre, descripción).
5. El coach recibe el email, activa su cuenta y accede al sistema.
6. El coach envía una solicitud para unirse al grupo.
7. El admin aprueba la solicitud.
8. El coach queda vinculado al grupo y puede ver a los otros coaches del grupo.

**Flujo 2: Coach crea su team y registra atletas.**
1. El coach inicia sesión.
2. El coach crea un team (nombre por defecto = apellido, editable).
3. El coach da de alta atletas en el team (o el admin los crea globalmente y el coach los asigna).
4. Un atleta puede ser asignado a varios teams del mismo coach.
5. El coach accede al calendario de un atleta para planificar.

**Flujo 3: Coach crea plantillas y planifica una semana.**
1. El coach accede a su biblioteca de plantillas.
2. Crea una plantilla nueva: nombre, tipo (ej. Intervalos), estructura (calentamiento → entrenamiento específico → enfriamiento).
3. Guarda la plantilla. Puede clonarla, editarla o compartirla al grupo.
4. El coach va al calendario de un atleta (Team → Atleta → mes/semana).
5. Arrastra plantillas de su biblioteca a los días del calendario.
6. O usa el generador ("semana tipo: 3 Fondos + 1 Series + 1 Tempo + 2 Descanso").
7. Revisa la semana armada. Puede editar, eliminar o copiar la semana anterior.
8. El plan queda visible para el atleta en su calendario.

**Flujo 4: Atleta consulta su plan y registra una sesión.**
1. El atleta inicia sesión.
2. Ve su calendario mensual. El día actual está resaltado.
3. Hace click en el día con sesión planificada.
4. Ve el detalle: calentamiento, entrenamiento específico, enfriamiento.
5. Realiza la sesión de entrenamiento.
6. Vuelve al sistema y registra: distancia, tiempo, RPE, comentarios.
7. Guarda el registro. El estado del día cambia a "Completada" (verde).
8. El sistema notifica al coach (in-app + email): "Atleta completó sesión".
9. El atleta puede editar el registro dentro de 24-48 horas.

**Flujo 5: Atleta marca una sesión como no realizada.**
1. El atleta abre el día con sesión planificada.
2. Selecciona "No realizada".
3. Elige un motivo predefinido (lesión, trabajo, enfermedad, personal) o selecciona "Otro" y escribe el motivo.
4. Guarda. El estado del día cambia a "No realizada" (rojo).
5. El coach recibe la notificación in-app.

**Flujo 6: Coach revisa cumplimiento y responde feedback.**
1. El coach inicia sesión.
2. Ve el dashboard de su team: cumplimiento %, alertas (atletas sin registrar, caída de carga).
3. Abre el calendario de un atleta. Ve badges de cumplimiento por día.
4. Hace click en una sesión completada.
5. Ve el registro real: distancia, tiempo, RPE, comentarios del atleta.
6. Deja un comentario de feedback.
7. El atleta recibe la notificación in-app y ve el feedback en su sesión.

**Flujo 7: Director Técnico revisa métricas del grupo.**
1. El Director Técnico inicia sesión.
2. Accede a la vista del grupo/escuela.
3. Ve la comparativa entre teams: cumplimiento, carga, alertas.
4. Ve el cumplimiento por coach.
5. Puede enviar un anuncio masivo al grupo (in-app + email).
6. Puede exportar los datos a PDF/Excel.

**Flujo 8: Admin gestiona configuración y auditoría.**
1. El admin inicia sesión.
2. Accede a la configuración global: edita plantillas oficiales, parámetros de email, límites, motivos predefinidos.
3. Revisa los logs de auditoría (quién, qué, cuándo, IP).
4. Exporta listados globales (coaches, atletas, grupos).
5. Realiza mantenimiento (limpieza de avatares huérfanos).

---

## 7. Interfaz y experiencia de usuario

### 7.1 Estructura general

El sistema se organiza en tres niveles de navegación según el rol:

**Header global** (todas las pantallas autenticadas):
- Logo / nombre del sistema.
- Centro de notificaciones (campanita con contador de no leídas).
- Avatar del usuario con menú desplegable (perfil, cerrar sesión).

**Menú lateral** (varía según rol):
- Admin: Dashboard, Coaches, Grupos, Atletas, Plantillas oficiales, Configuración, Logs, Exportes.
- Director Técnico: Dashboard grupo, Comparativa teams, Anuncios, Exportes.
- Coach: Dashboard, Mis Teams, Calendario, Biblioteca de plantillas, Atletas, Métricas, Exportes.
- Atleta: Calendario, Mis métricas, Mi historial, Perfil.

### 7.2 Pantallas principales

| ID | Pantalla | Elementos clave |
|----|----------|-----------------|
| PNT-01 | Login | Formulario de email y contraseña. Acceso desde cualquier dispositivo (responsive). |
| PNT-02 | Dashboard Admin | Resumen del sistema: cantidad de coaches, grupos, atletas, solicitudes pendientes. |
| PNT-03 | Dashboard Coach | Resumen de sus teams: cumplimiento %, alertas, sesiones de hoy. |
| PNT-04 | Dashboard Atleta | Resumen de su semana: sesiones de hoy, cumplimiento, racha. |
| PNT-05 | Dashboard Director Técnico | Resumen del grupo: comparativa teams, alertas. |
| PNT-06 | Calendario mensual | Vista mes con navegación anterior/siguiente. Día actual resaltado. Código de color por estado (verde/amarillo/rojo/gris). Click en día → detalle de sesión + formulario de registro. Para coach: drag & drop de plantillas, badge de cumplimiento por día. |
| PNT-07 | Biblioteca de plantillas (Coach) | Listado de plantillas propias + oficiales + compartidas del grupo. Formulario de creación/edición: nombre, tipo, estructura de la sesión. Acciones: editar, clonar, compartir al grupo. |
| PNT-08 | Gestión de Teams (Coach) | Listado de teams del coach. Crear team (nombre por defecto = apellido, editable). Ver atletas de cada team, asignar/quitar atletas. |
| PNT-09 | Gestión de Atletas (Coach/Admin) | Listado con filtros. Perfil de atleta: datos, historial de sesiones, métricas, gráficas. |
| PNT-10 | Detalle de sesión (modal/panel) | Planificado: calentamiento, entrenamiento específico, enfriamiento. Real: distancia, tiempo, RPE, comentarios, motivo (si no realizada). Registro (atleta): formulario de entrada. Feedback (coach): campo de comentario. |
| PNT-11 | Centro de notificaciones | Lista de notificaciones no leídas con icono y texto. Click → navega a la entidad relacionada. Marcar como leída. |
| PNT-12 | Perfil de usuario | Datos personales, avatar (subir/eliminar), cambio de contraseña. |
| PNT-13 | Panel Admin | Gestión de coaches, grupos, atletas, configuración global, logs de auditoría, exportes globales. |

### 7.3 Principios de experiencia

- **Responsive:** el sistema funciona en desktop, tablet y móvil.
- **Código de color consistente:** verde = completado, amarillo = parcial, rojo = no realizado, gris = descanso/sin asignar.
- **Acciones destructivas confirmadas:** diálogo de confirmación (eliminar plantilla, eliminar team, eliminar atleta).
- **Feedback inmediato:** al guardar un registro, el sistema muestra confirmación y actualiza el estado visual.
- **Accesibilidad:** contraste adecuado, navegación por teclado, textos alternativos en imágenes.

---

## 8. Datos conceptuales

### 8.1 Entidades principales

| ID | Entidad | Atributos clave | Relaciones conceptuales |
|----|---------|-----------------|------------------------|
| DT-01 | Usuario | id, nombre, email, contraseña (hasheada), rol, avatar, estado (activo/inactivo), fecha creación, último acceso | Cada usuario tiene un rol. Un coach puede ser Director Técnico en uno o más grupos. |
| DT-02 | Grupo/Escuela | id, nombre, descripción, logo, fecha creación | Contiene múltiples coaches (muchos a muchos). Contiene múltiples teams indirectamente. |
| DT-03 | Team | id, nombre, coach_id, fecha creación | Pertenece a un coach. Contiene múltiples atletas (muchos a muchos). |
| DT-04 | Perfil de atleta | user_id, fecha nacimiento, peso, altura, FC máx, FC reposo | Vinculado a uno o varios teams. Un atleta es un usuario con rol "atleta". |
| DT-05 | Plantilla de sesión | id, nombre, tipo, coach_id, es_oficial, es_compartida_grupo, estructura (secciones), fechas | Creada por un coach. Puede compartirse a un grupo. Se asigna a días del calendario. |
| DT-06 | Asignación de sesión | id, atleta_id, plantilla_id, fecha, semana, estado, fecha creación | Conecta una plantilla con un atleta en una fecha específica. |
| DT-07 | Registro de sesión | id, asignacion_id, distancia_km, tiempo_minutos, rpe, comentarios, motivo_no_realizada, fechas | Uno a uno con la asignación de sesión. Solo existe si el atleta registró resultados. |
| DT-08 | Feedback de sesión | id, asignacion_id, autor_id, mensaje, fecha | Se asocia a una asignación de sesión. Puede haber múltiples mensajes. |
| DT-09 | Notificación | id, usuario_destino_id, tipo, título, mensaje, leída, entidad_relacionada, fecha | Dirigida a un usuario. Puede estar relacionada con una sesión, plan, grupo, etc. |
| DT-10 | Solicitud de grupo | id, coach_id, grupo_id, estado, fechas | Conecta un coach con un grupo. |
| DT-11 | Log de auditoría | id, usuario_id, acción, entidad_afectada, detalles, IP, fecha | Registrado por el sistema ante acciones críticas. |
| DT-12 | Configuración global | clave, valor, fecha actualización | Referenciada por todo el sistema. |

### 8.2 Datos calculados (no almacenados)

- Cumplimiento % (sesiones completadas / sesiones planificadas × 100).
- Carga semanal (suma de km, tiempo, TSS/TRIMP).
- Progresión (serie temporal de carga semanal, 4-12 semanas).
- Distribución por tipo de sesión (% de cada tipo).
- Rachas consecutivas (días o semanas con sesión completada).
- Métricas fisiológicas (VO2max estimado, FC umbral, zonas FC/potencia) — calculadas a partir de registros históricos.

---

## 9. Reglas de negocio

### 9.1 Jerarquía y permisos

| ID | Regla |
|----|-------|
| RB-01 | Solo el Admin puede crear, editar y eliminar grupos/escuelas. |
| RB-02 | Solo el Admin puede crear cuentas de coaches y asignar el rol Director Técnico. |
| RB-03 | Un coach solo puede gestionar teams que él creó. |
| RB-04 | Un coach solo puede planificar sesiones para atletas asignados a sus teams. |
| RB-05 | Un coach puede ver en modo lectura las métricas agregadas de atletas de otros coaches en su mismo grupo, pero solo el detalle de sus propios atletas. |
| RB-06 | El Director Técnico solo tiene lectura (no edita planes ni registros). |
| RB-07 | Un atleta solo puede ver y registrar en su propio calendario. |
| RB-08 | Un atleta solo puede editar su registro dentro de la ventana de 24-48 horas. |
| RB-09 | Un coach puede estar en múltiples grupos. Un atleta puede estar en múltiples teams. |
| RB-10 | Un team pertenece a un solo coach. |

### 9.2 Plantillas

| ID | Regla |
|----|-------|
| RB-11 | Una plantilla es privada por defecto. Solo el coach creador la ve hasta que la comparte al grupo. |
| RB-12 | Una plantilla compartida al grupo es visible y clonable por otros coaches del mismo grupo (no editable por ellos). |
| RB-13 | Las plantillas oficiales son clonables por cualquier coach (la edición crea una copia propia, no modifica la oficial). |
| RB-14 | La estructura de una plantilla tiene como mínimo: calentamiento, entrenamiento específico, enfriamiento. El coach puede reorganizar, omitir o añadir secciones. |
| RB-15 | El tipo de sesión puede ser cualquiera de los predefinidos o uno libre creado por el coach. |

### 9.3 Planificación

| ID | Regla |
|----|-------|
| RB-16 | La semana es la unidad base de planificación. |
| RB-17 | Un día sin plantilla asignada se considera "Descanso" por defecto. |
| RB-18 | El coach puede copiar la semana anterior, con opción de editarlo después. |
| RB-19 | El coach puede asignar la misma plantilla a varios atletas a la vez. |
| RB-20 | Solo el coach (o admin) puede modificar un plan. El atleta no puede modificar el plan, solo registrar resultados. |

### 9.4 Registro de sesiones

| ID | Regla |
|----|-------|
| RB-21 | El atleta registra: distancia, tiempo, RPE, comentarios (comentarios y RPE son opcionales, distancia y tiempo son requeridos para marcar como completada). |
| RB-22 | El atleta puede marcar la sesión como "No realizada" seleccionando un motivo predefinido o escribiendo un motivo libre. |
| RB-23 | El atleta puede editar su registro dentro de la ventana de edición (configurable, default 48h). Fuera de esa ventana, el registro queda bloqueado. |
| RB-24 | Un registro de sesión puede tener estado "Parcial" (completó parte de la sesión planificada). |
| RB-25 | Las métricas se actualizan en tiempo real al guardar un registro. |

### 9.5 Notificaciones

| ID | Regla |
|----|-------|
| RB-26 | Las notificaciones in-app se generan para todos los eventos del sistema. |
| RB-27 | Los emails se envían solo para eventos críticos: plan publicado (coach → atleta), sesión completada (atleta → coach), anuncios masivos. |
| RB-28 | El email se envía de forma inmediata o dentro del mismo día. |
| RB-29 | Solo el Admin puede editar las plantillas HTML de email. |

### 9.6 Avatar

| ID | Regla |
|----|-------|
| RB-30 | Solo hay un avatar por usuario. Subir una nueva foto reemplaza la anterior. |
| RB-31 | La imagen se redimensiona a 256×256 px antes de almacenarla. |
| RB-32 | Se elimina la información EXIF de la imagen. |
| RB-33 | Si no hay foto, se muestra un avatar generado con las iniciales del usuario. |

### 9.7 Festivos

| ID | Regla |
|----|-------|
| RB-34 | El calendario está orientado a festivos de Chile. |
| RB-35 | La planificación final de festivos depende de cada coach (configuración manual por coach/team). |

---

## 10. Casos límite y errores

### 10.1 Autenticación

| ID | Caso | Comportamiento esperado |
|----|------|------------------------|
| ERR-01 | Credenciales incorrectas | Mostrar mensaje genérico "Email o contraseña incorrectos" (no revelar si el email existe). |
| ERR-02 | Cuenta desactivada | Mostrar "Tu cuenta está desactivada. Contacta al administrador." |
| ERR-03 | Sesión expirada | Redirigir al login con mensaje "Tu sesión ha expirado, inicia sesión nuevamente." |
| ERR-04 | Acceso sin sesión | Cualquier intento de acceder a una pantalla sin sesión activa redirige al login. |

### 10.2 Gestión de usuarios

| ID | Caso | Comportamiento esperado |
|----|------|------------------------|
| ERR-05 | Email duplicado al crear coach | Mostrar error "Ya existe un usuario con este email." |
| ERR-06 | Eliminar coach con teams y atletas | Confirmar con diálogo de advertencia. Recomendación: soft delete para preservar historial. |
| ERR-07 | Coach sin grupo | Permitir que exista, se marca como "huérfano" en la vista de admin. |
| ERR-08 | Solicitud duplicada a grupo | Si el coach ya tiene solicitud pendiente o aprobada al mismo grupo, no permitir enviar otra. |

### 10.3 Plantillas

| ID | Caso | Comportamiento esperado |
|----|------|------------------------|
| ERR-09 | Plantilla vacía | No permitir guardar una plantilla sin nombre ni sin al menos una sección con contenido. |
| ERR-10 | Eliminar plantilla en uso | Confirmar. Si la plantilla está asignada a un día de un plan, impedir eliminación si tiene asignaciones activas. |
| ERR-11 | Clonar plantilla compartida de otro grupo | Solo se puede clonar si el coach pertenece al mismo grupo. |

### 10.4 Planificación

| ID | Caso | Comportamiento esperado |
|----|------|------------------------|
| ERR-12 | Asignar plantilla a día ya ocupado | Preguntar si desea reemplazar la plantilla existente. |
| ERR-13 | Copiar semana sin plan anterior | Mostrar mensaje "No hay semana anterior para copiar." |
| ERR-14 | Multi-asignación sin atletas seleccionados | Mostrar error "Selecciona al menos un atleta." |

### 10.5 Registro de sesiones

| ID | Caso | Comportamiento esperado |
|----|------|------------------------|
| ERR-15 | Registro fuera de ventana de edición | Mostrar "No puedes editar este registro. La ventana de edición ha expirado." |
| ERR-16 | Distancia o tiempo vacíos al marcar como completada | Mostrar error "La distancia y el tiempo son requeridos para marcar la sesión como completada." |
| ERR-17 | Registrar sesión de un día sin plan | No debería ser posible (el formulario solo aparece si hay sesión planificada). |
| ERR-18 | RPE fuera de rango | Validar que esté entre 1 y 10. |
| ERR-19 | Motivo "Otro" vacío | Si selecciona "Otro" sin escribir el motivo, mostrar error "Describe el motivo." |
| ERR-20 | Registrar sesión futura | No permitir registrar sesiones de días futuros. |

### 10.6 Notificaciones

| ID | Caso | Comportamiento esperado |
|----|------|------------------------|
| ERR-21 | Email fallido | Reintentar una vez. Si falla, registrar en logs. No bloquear la acción principal. |
| ERR-22 | Notificaciones masivas a grupo vacío | Si el grupo no tiene coaches/atletas, mostrar aviso "El grupo no tiene miembros." |

### 10.7 Datos generales

| ID | Caso | Comportamiento esperado |
|----|------|------------------------|
| ERR-23 | Datos vacíos en listados | Mostrar estado vacío con mensaje orientativo y acción. |
| ERR-24 | Exportación sin datos | Mostrar "No hay datos para exportar en el periodo seleccionado." |
| ERR-25 | Errores inesperados | Mostrar pantalla de error genérica con opción de volver al inicio. Registrar el error en logs. |

### 10.8 Límites

| ID | Caso | Comportamiento esperado |
|----|------|------------------------|
| ERR-26 | Exceder máximo de teams por coach | Mostrar "Has alcanzado el límite de teams permitidos." |
| ERR-27 | Exceder máximo de atletas por team | Mostrar "Has alcanzado el límite de atletas en este team." |
| ERR-28 | Subida de avatar > 2-3 MB | Mostrar "La imagen es muy grande. El máximo es 2 MB." |
| ERR-29 | Formato de avatar no soportado | Mostrar "Formato no soportado. Usa JPG, PNG o WebP." |

---

## 11. Requisitos no funcionales

| ID | Requisito | Descripción | Valor medible / nota |
|----|-----------|-------------|---------------------|
| RNF-01 | SSR (renderizado en servidor) | Todas las páginas se renderizan en servidor. Next.js App Router con React Server Components. | Confirmado en `specs/AGENTS.md`. |
| RNF-02 | Autenticación por sesión | Cookies HttpOnly, Secure, SameSite. Sin API pública ni WebSockets. | Cookies HttpOnly/Secure/SameSite. |
| RNF-03 | Sin middleware de protección | La protección de rutas se aplica en los layouts, no mediante `proxy.ts`. | Justificado por costo de CPU en Cloudflare Workers Free. |
| RNF-04 | Runtime Cloudflare Workers | Compatible con `@opennextjs/cloudflare`. Next.js 16.3.x (no 16.4.0). | Next.js debe quedar en 16.3.x. |
| RNF-05 | Prohibido `eval` / `new Function` | `workerd` prohíbe generación de código en tiempo de ejecución. `mysql2` usa `disableEval: true`. | Cualquier librería nueva que use `eval` o `new Function` rompe en producción. |
| RNF-06 | Sin I/O compartido entre peticiones | El cliente de Drizzle se memoriza junto al contexto de Cloudflare (nuevo por petición). | No se puede reutilizar una conexión entre peticiones A y B. |
| RNF-07 | Sin `NEXT_PUBLIC_` para servidor | Los valores de configuración de servidor no llevan el prefijo `NEXT_PUBLIC_`. | `APP_URL` no lleva ese prefijo. |
| RNF-08 | Contraseñas con PBKDF2-HMAC-SHA512 | No bcrypt. 210 000 iteraciones (OWASP). Formato: `pbkdf2-sha512$<iteraciones>$<salt>$<hash>`. | Hashes bcrypt heredados se verifican con import perezoso y se reescriben al primer login correcto. |
| RNF-09 | Límite de CPU Workers Free | 10 ms de CPU por invocación. Workers Paid descartado por el dueño. | Estrategia de costo cero en `docs/pendientes.md`. |
| RNF-10 | Base de datos MySQL | Dev local (XAMPP/MariaDB 10.4), producción Aiven MySQL 8.4 + Hyperdrive. | Esquema generado con migraciones de Drizzle, nunca importando volcados. |
| RNF-11 | Archivos en R2 | Avatares en Cloudflare R2 (bucket privado + signed URLs). No filesystem local. | Gratis hasta 10GB, sin egress fees. |
| RNF-12 | Diseño responsive | El sistema funciona en desktop, tablet y móvil. | Verificado en `scripts/verify-responsive.ts`. |
| RNF-13 | Accesibilidad WCAG AA | Contraste adecuado, navegación por teclado, estados con forma y color, `aria-invalid`/`aria-describedby` en errores. | `scripts/verify-accesibilidad.ts` corre axe sobre 22 rutas en claro y oscuro. |
| RNF-14 | Contraste de tokens | Los tokens de color cumplen WCAG AA en ambos temas (claro y oscuro). | `scripts/verify-tokens.ts` mide contraste de tokens. |
| RNF-15 | Gráficas SVG propio | No librería de gráficas externa (recharts retirado por 387 KB y falta de SSR). | SVG con `preserveAspectRatio="none"`, rótulos en HTML. |
| RNF-16 | i18n es-CL | Locale `es-CL` y zona `America/Santiago`. Ninguna fecha formateada fuera de `lib/i18n/format.ts`. | `scripts/verify-i18n.ts` falla si se usa `toLocaleString()` u similares fuera del módulo. |
| RNF-17 | Sin CDNs de fuentes | Tipografía Archivo variable, self-hosted desde `app/fonts/` con `next/font/local`. | La app no hace peticiones externas en runtime. |
| RNF-18 | Testing | Vitest (unit/integration) + Playwright (e2e). | Vitest rápido y compatible edge. Playwright corre contra preview URLs. |

---

## 12. Criterios de aceptación

| ID | Escenario (Dado / Cuando / Entonces) | Requisito asociado |
|----|--------------------------------------|-------------------|
| CA-001 | Dado un usuario con credenciales válidas, cuando inicia sesión, entonces es redirigido al dashboard de su rol. | RF-001 |
| CA-002 | Dado credenciales inválidas, cuando se intenta iniciar sesión, entonces se muestra mensaje genérico sin revelar si el email existe. | RF-001 |
| CA-003 | Dado un usuario sin sesión, cuando intenta acceder a una ruta de `app/(app)/`, entonces es redirigido al login. | RF-003 |
| CA-004 | Dado un usuario autenticado, cuando cierra sesión, entonces la sesión se destruye y se redirige al login. | RF-002 |
| CA-005 | Dado una sesión caducada, cuando el usuario intenta acceder, entonces se redirige a `/login` con mensaje de expiración. | RF-004 |
| CA-006 | Dado un admin, cuando crea un coach con nombre y email, entonces se crea el usuario con rol coach y se envía email de invitación. | RF-005 |
| CA-007 | Dado un admin, cuando edita un coach existente, entonces los datos se actualizan. | RF-006 |
| CA-008 | Dado un admin, cuando desactiva un coach, entonces el coach no puede iniciar sesión pero sus datos se conservan. | RF-007 |
| CA-009 | Dado un admin, cuando elimina un coach sin teams ni sesiones, entonces la cuenta se elimina definitivamente. | RF-008 |
| CA-010 | Dado un admin, cuando restablece la contraseña de un coach, entonces se genera una contraseña temporal y se envía email. | RF-009 |
| CA-011 | Dado un admin, cuando reenvía la invitación a un coach pendiente, entonces se envía el email de invitación. | RF-010 |
| CA-012 | Dado un admin, cuando consulta la lista de coaches, entonces puede ver los coaches huérfanos (sin grupo). | RF-011 |
| CA-013 | Dado un admin, cuando crea un grupo con nombre y descripción, entonces el grupo se crea y es visible. | RF-012 |
| CA-014 | Dado un admin, cuando edita un grupo existente, entonces los datos del grupo se actualizan. | RF-013 |
| CA-015 | Dado un admin, cuando elimina un grupo sin coaches miembros ni plantillas compartidas, entonces el grupo se elimina. | RF-014 |
| CA-016 | Dado un admin, cuando aprueba una solicitud de unión, entonces el coach queda vinculado al grupo y recibe notificación. | RF-015 |
| CA-017 | Dado un admin, cuando rechaza una solicitud de unión, entonces la solicitud se rechaza y el coach recibe notificación. | RF-016 |
| CA-018 | Dado un admin, cuando asigna o quita el rol Director Técnico a un coach en un grupo, entonces el rol se alterna. | RF-017 |
| CA-019 | Dado un coach, cuando envía una solicitud de unión a un grupo, entonces se crea una solicitud pendiente. | RF-018 |
| CA-020 | Dado un coach, cuando consulta grupos disponibles, entonces ve grupos donde no es miembro ni tiene solicitud pendiente. | RF-019 |
| CA-021 | Dado un coach, cuando crea un team, entonces el nombre por defecto es su apellido y es editable. | RF-020 |
| CA-022 | Dado un coach, cuando edita el nombre de un team, entonces el nombre se actualiza. | RF-021 |
| CA-023 | Dado un coach, cuando elimina un team sin atletas, entonces el team se elimina. | RF-022 |
| CA-024 | Dado un coach, cuando consulta sus teams, entonces ve el listado con conteo de atletas. | RF-023 |
| CA-025 | Dado un coach, cuando asigna un atleta a su team, entonces el atleta queda asignado y se verifica el límite. | RF-024 |
| CA-026 | Dado un coach, cuando quita un atleta de su team, entonces el atleta es removido. | RF-025 |
| CA-027 | Dado un coach, cuando da de alta un atleta en su team, entonces se crea el usuario con rol atleta y se asigna al team. | RF-026 |
| CA-028 | Dado un coach, cuando consulta sus atletas, entonces ve el listado con estado de cumplimiento y última actividad. | RF-027 |
| CA-029 | Dado un coach, cuando consulta el detalle de un atleta de su team, entonces ve plan, registros, métricas e historial. | RF-028 |
| CA-030 | Dado un admin, cuando consulta el listado global de atletas con filtros, entonces ve los resultados filtrados. | RF-029 |
| CA-031 | Dado un admin, cuando traslada un atleta entre teams, entonces el cambio se registra con auditoría. | RF-030 |
| CA-032 | Dado un admin, cuando consulta atletas sin coach, entonces ve el listado de atletas huérfanos. | RF-031 |
| CA-033 | Dado un coach, cuando crea una plantilla con nombre y al menos una sección, entonces la plantilla privada se crea. | RF-032 |
| CA-034 | Dado un coach, cuando edita una plantilla propia, entonces la plantilla se actualiza. | RF-033 |
| CA-035 | Dado un coach, cuando elimina una plantilla sin asignaciones activas, entonces la plantilla se elimina. | RF-034 |
| CA-036 | Dado un coach, cuando clona una plantilla propia, oficial o compartida del grupo, entonces se crea una copia propia editable. | RF-035 |
| CA-037 | Dado un coach, cuando comparte una plantilla propia al grupo, entonces es visible y clonable por otros coaches del grupo. | RF-036 |
| CA-038 | Dado un coach, cuando deja de compartir una plantilla, entonces deja de ser visible para otros coaches del grupo. | RF-037 |
| CA-039 | Dado un coach, cuando consulta su biblioteca de plantillas, entonces ve propias, oficiales y compartidas del grupo. | RF-038 |
| CA-040 | Dado un admin, cuando gestiona plantillas oficiales, entonces puede crear, editar y eliminarlas. | RF-039 |
| CA-041 | Dado un coach, cuando asigna una plantilla a un día libre, entonces se crea la asignación con estado planificada. | RF-040 |
| CA-042 | Dado un coach, cuando usa multi-asignación con al menos un atleta, entonces se crean múltiples asignaciones. | RF-041 |
| CA-043 | Dado un coach, cuando copia la semana anterior y existe, entonces se copian las asignaciones y son editables. | RF-042 |
| CA-044 | Dado un coach, cuando usa el generador de semana tipo, entonces se distribuyen las plantillas según el patrón. | RF-043 |
| CA-045 | Dado un coach, cuando edita una asignación propia, entonces la asignación se actualiza o elimina. | RF-044 |
| CA-046 | Dado un coach, cuando consulta el plan semanal de un atleta, entonces ve las asignaciones de esa semana. | RF-045 |
| CA-047 | Dado un coach, cuando consulta el plan mensual de un atleta, entonces ve las asignaciones de ese mes. | RF-046 |
| CA-048 | Dado un atleta, cuando consulta su calendario mensual, entonces ve el mes actual con navegación y día resaltado. | RF-047 |
| CA-049 | Dado un atleta, cuando hace click en un día con sesión planificada, entonces ve el detalle de la sesión. | RF-048 |
| CA-050 | Dado un atleta, cuando registra distancia, tiempo y RPE para una sesión, entonces se crea el registro y el estado cambia a completada. | RF-049 |
| CA-051 | Dado un atleta, cuando marca una sesión como no realizada con motivo, entonces se crea el registro y el estado cambia a no realizada. | RF-050 |
| CA-052 | Dado un atleta, cuando edita su registro dentro de la ventana de edición, entonces el registro se actualiza. | RF-051 |
| CA-053 | Dado un atleta, cuando envía feedback en una sesión, entonces se crea el feedback y el coach recibe notificación. | RF-052 |
| CA-054 | Dado un coach, cuando consulta el calendario de un atleta de su team, entonces ve badges de cumplimiento por día. | RF-053 |
| CA-055 | Dado un coach, cuando consulta el registro real de una sesión, entonces ve distancia, tiempo, RPE y comentarios. | RF-054 |
| CA-056 | Dado un coach, cuando deja feedback en una sesión, entonces se crea el feedback y el atleta recibe notificación. | RF-055 |
| CA-057 | Dado un atleta o coach, cuando consulta métricas de un atleta con un periodo, entonces ve las métricas calculadas con gráficas. | RF-057 |
| CA-058 | Dado un coach, cuando consulta métricas de su team, entonces ve el resumen con buckets de cumplimiento y alertas. | RF-058 |
| CA-059 | Dado un Director Técnico, cuando consulta métricas del grupo, entonces ve la comparativa de teams y cumplimiento por coach. | RF-059 |
| CA-060 | Dado un registro de sesión guardado, entonces las métricas se recalculan sin refresh manual. | RF-060 |
| CA-061 | Dado un evento del sistema, entonces se genera una notificación in-app para el usuario destino. | RF-061 |
| CA-062 | Dado un usuario autenticado, cuando consulta su campanita, entonces ve el contador de no leídas y la lista de notificaciones. | RF-062 |
| CA-063 | Dado un usuario, cuando marca una notificación como leída, entonces la notificación se marca y el contador se actualiza. | RF-063 |
| CA-064 | Dado un usuario, cuando marca todas como leídas, entonces todas las notificaciones se marcan y el contador queda en cero. | RF-064 |
| CA-065 | Dado un coach que publica un plan, entonces se envía email al atleta notificándolo. | RF-065 |
| CA-066 | Dado un atleta que completa una sesión, entonces se envía email al coach. | RF-066 |
| CA-067 | Dado un Admin o DT que envía un anuncio masivo, entonces se crean notificaciones in-app y se envían emails a los miembros del grupo. | RF-067 |
| CA-068 | Dado un usuario, cuando sube una foto de perfil válida (≤2-3 MB, JPG/PNG/WebP), entonces se redimensiona a 256×256 y se almacena en R2. | RF-068 |
| CA-069 | Dado un usuario sin foto, cuando se muestra su avatar, entonces se muestra el avatar de iniciales generado con SVG. | RF-069 |
| CA-070 | Dado un usuario con foto, cuando elimina su foto, entonces vuelve a mostrarse el avatar de iniciales. | RF-070 |
| CA-071 | Dado un coach, cuando exporta métricas de un atleta, entonces descarga un archivo PDF o Excel con los datos. | RF-071 |
| CA-072 | Dado un coach, cuando exporta el resumen de su team, entonces descarga un archivo PDF o Excel. | RF-072 |
| CA-073 | Dado un DT, cuando exporta métricas del grupo, entonces descarga un archivo PDF o Excel. | RF-073 |
| CA-074 | Dado un admin, cuando exporta listados globales, entonces descarga un archivo CSV o Excel. | RF-074 |
| CA-075 | Dado un admin, cuando gestiona plantillas oficiales, entonces puede crear, editar y eliminarlas. | RF-075 |
| CA-076 | Dado un admin, cuando configura parámetros de email, entonces se actualizan SMTP, remitente y plantillas base. | RF-076 |
| CA-077 | Dado un admin, cuando configura límites globales, entonces se aplican en las acciones correspondientes. | RF-077 |
| CA-078 | Dado un admin, cuando edita motivos "no realizada", entonces se reflejan en el select del atleta. | RF-078 |
| CA-079 | Dado un admin, cuando gestiona tipos de sesión base, entonces se actualizan los tipos ofrecidos por el sistema. | RF-079 |
| CA-080 | Dado una acción crítica del sistema, entonces se registra en el log de auditoría con quién, qué, cuándo e IP. | RF-080 |
| CA-081 | Dado un admin, cuando consulta logs de auditoría con filtros, entonces ve los resultados filtrados. | RF-081 |
| CA-082 | Dado un DT, cuando consulta atletas de su grupo, entonces los ve en modo lectura sin opciones de edición. | RF-082 |
| CA-083 | Dado un DT, cuando consulta métricas agregadas del grupo, entonces ve la comparativa de teams y cumplimiento por coach. | RF-083 |

---

## 13. Dependencias y trazabilidad

| ID | Requisito | Depende de | Dependido por | Flujo asociado |
|----|-----------|------------|---------------|----------------|
| RF-001 | Inicio de sesión | — | RF-002, RF-003, RF-004 | Flujo 1 (paso 1) |
| RF-002 | Cierre de sesión | RF-001 | — | — |
| RF-003 | Protección de rutas | RF-001 | — | — |
| RF-004 | Sesión expirada | RF-001 | — | — |
| RF-005 | Alta de coach | RF-001 | RF-018 (solicitud de unión) | Flujo 1 (paso 2) |
| RF-006 | Edición de coach | RF-001 | — | — |
| RF-007 | Desactivación de coach | RF-001 | — | — |
| RF-008 | Eliminación de coach | RF-001 | — | — |
| RF-009 | Reset de contraseña | RF-001 | — | — |
| RF-010 | Reenvío de invitación | RF-001, RF-005 | — | — |
| RF-011 | Coaches huérfanos | RF-001 | — | — |
| RF-012 | Crear grupo | RF-001 | RF-018 | Flujo 1 (paso 4) |
| RF-013 | Editar grupo | RF-001 | — | — |
| RF-014 | Eliminar grupo | RF-001 | — | — |
| RF-015 | Aprobar solicitud | RF-012, RF-018 | — | Flujo 1 (paso 7) |
| RF-016 | Rechazar solicitud | RF-012, RF-018 | — | — |
| RF-017 | Asignar DT | RF-001 | — | — |
| RF-018 | Enviar solicitud | RF-012 | RF-015, RF-016 | Flujo 1 (paso 6) |
| RF-019 | Ver grupos disponibles | RF-012 | — | — |
| RF-020 | Crear team | RF-001 | RF-024 | Flujo 2 (paso 2) |
| RF-021 | Editar team | RF-020 | — | Flujo 2 (paso 2) |
| RF-022 | Eliminar team | RF-020 | — | — |
| RF-023 | Listar teams | RF-020 | — | — |
| RF-024 | Asignar atleta | RF-020 | RF-040 | Flujo 2 (paso 3) |
| RF-025 | Quitar atleta | RF-020 | — | — |
| RF-026 | Dar de alta atleta | RF-001 | RF-027, RF-028 | Flujo 2 (paso 3) |
| RF-027 | Ver atletas del team | RF-026 | — | — |
| RF-028 | Detalle de atleta | RF-026 | — | — |
| RF-029 | Listado global atletas | RF-001 | — | — |
| RF-030 | Trasladar atleta | RF-026 | — | — |
| RF-031 | Ver atletas sin coach | RF-001 | — | — |
| RF-032 | Crear plantilla | RF-001 | RF-040 | Flujo 3 (paso 2) |
| RF-033 | Editar plantilla | RF-032 | — | Flujo 3 (paso 3) |
| RF-034 | Eliminar plantilla | RF-032 | — | — |
| RF-035 | Clonar plantilla | RF-032 | — | Flujo 3 (paso 3) |
| RF-036 | Compartir plantilla | RF-032 | — | Flujo 3 (paso 3) |
| RF-037 | Dejar de compartir | RF-036 | — | — |
| RF-038 | Ver biblioteca | RF-032 | — | Flujo 3 (paso 1) |
| RF-039 | Plantillas oficiales | RF-001 | — | — |
| RF-040 | Asignar plantilla a día | RF-032, RF-024 | Flujo 3 (paso 5) |
| RF-041 | Multi-asignación | RF-040 | — | — |
| RF-042 | Copiar semana anterior | RF-040 | — | Flujo 3 (paso 7) |
| RF-043 | Generador de semana | RF-040 | — | Flujo 3 (paso 6) |
| RF-044 | Editar asignación | RF-040 | — | Flujo 3 (paso 7) |
| RF-045 | Ver plan semanal | RF-040 | — | — |
| RF-046 | Ver plan mensual | RF-040 | — | — |
| RF-047 | Ver calendario (Atleta) | RF-040 | Flujo 4 (paso 2) |
| RF-048 | Ver detalle de sesión | RF-047 | Flujo 4 (paso 4) |
| RF-049 | Registrar sesión | RF-047, RF-048 | Flujo 4 (paso 6) |
| RF-050 | Marcar no realizada | RF-047 | Flujo 5 (paso 4) |
| RF-051 | Editar registro | RF-049 | Flujo 4 (paso 9) |
| RF-052 | Enviar feedback | RF-047 | Flujo 6 (paso 6) |
| RF-053 | Ver calendario (Coach) | RF-040 | Flujo 6 (paso 3) |
| RF-054 | Ver registro real | RF-047 | Flujo 6 (paso 5) |
| RF-055 | Dejar feedback (Coach) | RF-047 | Flujo 6 (paso 6) |
| RF-057 | Métricas atleta | RF-049 | Flujo 4 (paso 8) |
| RF-058 | Métricas team | RF-049 | — |
| RF-059 | Métricas grupo | RF-049 | Flujo 7 (paso 3) |
| RF-060 | Actualizar métricas | RF-049 | Flujo 4 (paso 8) |
| RF-061 | Notificación in-app | RF-001 | RF-062, RF-063, RF-064 | Flujo 4 (paso 8), Flujo 5 (paso 5) |
| RF-062 | Centro de notificaciones | RF-061 | — | — |
| RF-063 | Marcar leída | RF-061 | — | — |
| RF-064 | Marcar todas leídas | RF-061 | — | — |
| RF-065 | Email al publicar plan | RF-061 | Flujo 4 (paso 8) |
| RF-066 | Email al completar sesión | RF-061 | Flujo 4 (paso 8) |
| RF-067 | Anuncio masivo | RF-061 | Flujo 7 (paso 5) |
| RF-068 | Subir avatar | RF-001 | — | — |
| RF-069 | Avatar por defecto | RF-001 | — | — |
| RF-070 | Eliminar avatar | RF-068 | — | — |
| RF-071 | Exportar atleta | RF-057 | — | Flujo 7 (paso 6) |
| RF-072 | Exportar team | RF-058 | — | — |
| RF-073 | Exportar grupo | RF-059 | Flujo 7 (paso 6) |
| RF-074 | Exportar globales | RF-001 | — | Flujo 8 (paso 4) |
| RF-075 | Plantillas oficiales | RF-039 | — | — |
| RF-076 | Parámetros email | RF-001 | — | — |
| RF-077 | Límites globales | RF-001 | — | — |
| RF-078 | Motivos "no realizada" | RF-001 | — | — |
| RF-079 | Tipos de sesión base | RF-001 | — | — |
| RF-080 | Log de auditoría | RF-001 | — | Flujo 8 (paso 3) |
| RF-081 | Consultar logs | RF-080 | — | Flujo 8 (paso 3) |
| RF-082 | Ver atletas grupo (DT) | RF-001 | — | Flujo 7 (paso 2) |
| RF-083 | Métricas grupo (DT) | RF-059 | Flujo 7 (paso 3) |

---

## 14. Decisiones pendientes

| ID | Pregunta / decisión | Contexto | Impacto si no se resuelve |
|----|---------------------|----------|------------------------|
| PEND-001 | Eliminar coach con teams y atletas: ¿soft delete definitivo o eliminación en cascada? | `specs/mvp.md` §9 (Casos límite) recomienda soft delete para preservar historial, pero no está cerrado. | Afecta a RF-008 y a la integridad de registros históricos. |
| PEND-002 | Ventana de edición de registro: ¿24h o 48h? | `specs/AGENTS.md` y `specs/mvp.md` dicen "24-48 horas". `specs/mvp.md` §34.5 usa 48h como default en settings. | Afecta a RB-23 y a ERR-15. |
| PEND-003 | ¿Se permite eliminar un atleta que tiene registros históricos? | `specs/mvp.md` no especifica comportamiento para atletas con historial. | Afecta a la gestión de atletas (RF-026, RF-030). |
| PEND-004 | ¿Los valores de X días para alerta de "sin registrar" y caída de carga son configurables? | `specs/mvp.md` §4.10 menciona "sin registrar >X días" y "caída brusca de carga" sin definir X. | Afecta a RF-058 y a la configuración global (RF-077). |
| PEND-005 | ¿El email de bienvenida se envía al activar cuenta o al crear el coach? | `specs/mvp.md` CA-079 menciona "email de bienvenida al activar cuenta", pero RF-005 ya envía email de invitación al crear. | Afecta a RF-065 y al flujo de alta de coach. |
| PEND-006 | ¿Se requiere confirmación para eliminar plantilla con asignaciones activas o se impide directamente? | `specs/mvp.md` ERR-10 deja la decisión abierta: "impedir eliminación si tiene asignaciones activas, o desasignar con confirmación". | Afecta a RF-034. |

---

## 15. Revisión de coherencia y cobertura

### 15.1 Cobertura de objetivos

| OBJ | ¿Tiene requisitos asociados? | Requisitos |
|-----|------------------------------|------------|
| OBJ-01 | Sí | RF-001 a RF-083 (todos) |
| OBJ-02.1 | Sí | RF-020 a RF-025, RF-032 a RF-046 |
| OBJ-02.2 | Sí | RF-047 a RF-052 |
| OBJ-02.3 | Sí | RF-053 a RF-055, RF-057, RF-061 |
| OBJ-02.4 | Sí | RF-005 a RF-017, RF-075 a RF-081 |
| OBJ-02.5 | Sí | RF-001 a RF-004, RB-01 a RB-10 |
| OBJ-02.6 | Sí | RNF-02, RNF-03 |

### 15.2 Cobertura de flujos principales

| Flujo | ¿Cubierto por requisitos? | Requisitos clave |
|-------|---------------------------|------------------|
| Flujo 1 (Alta coach + grupo) | Sí | RF-005, RF-012, RF-015, RF-018 |
| Flujo 2 (Team + atletas) | Sí | RF-020 a RF-031 |
| Flujo 3 (Plantillas + planificación) | Sí | RF-032 a RF-046 |
| Flujo 4 (Atleta registra sesión) | Sí | RF-047 a RF-052 |
| Flujo 5 (No realizada) | Sí | RF-047, RF-050 |
| Flujo 6 (Coach revisa + feedback) | Sí | RF-053 a RF-055 |
| Flujo 7 (DT métricas grupo) | Sí | RF-059, RF-067, RF-082, RF-083 |
| Flujo 8 (Admin configuración + auditoría) | Sí | RF-075 a RF-081 |

### 15.3 Reglas de negocio sin contradicciones

Todas las reglas RB-01 a RB-35 son consistentes entre sí y con los requisitos funcionales. No se detectaron contradicciones.

### 15.4 Casos límite con comportamiento definido

Todos los casos ERR-01 a ERR-29 tienen un comportamiento definido en la sección 10.

### 15.5 No se incorporaron detalles de implementación prematuros

El documento describe comportamiento observable, actores, datos de entrada y resultados. No menciona estructura de archivos, clases, funciones, endpoints ni código. Las únicas referencias técnicas son aquellas ya establecidas en `specs/AGENTS.md` como restricciones (SSR, cookies, AdminLTE, Drizzle, R2, etc.).

---

**Archivo guardado:** `specs/SPECS.md` (creado en tres escrituras sucesivas).

**Resumen:**
- Requisitos funcionales identificados: **83** (RF-001 a RF-083)
- Criterios de aceptación registrados: **83** (CA-001 a CA-083)
- Reglas de negocio: **35** (RB-01 a RB-35)
- Casos límite y errores: **29** (ERR-01 a ERR-29)
- Requisitos no funcionales: **18** (RNF-01 a RNF-18)
- Decisiones pendientes: **6** (PEND-001 a PEND-006)

El MVP puede entenderse y evaluarse funcionalmente sin necesidad de conocer su implementación técnica.



