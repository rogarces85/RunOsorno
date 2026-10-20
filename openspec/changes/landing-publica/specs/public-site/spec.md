# Spec Delta

## Purpose

Define el escenario público de RunOsorno Training: qué puede ver y hacer alguien sin
cuenta, cómo se presenta la oferta de productos y cómo se pone en contacto, sin abrir
nada del sistema interno.

## ADDED Requirements

### Requirement: La landing es pública y el sistema sigue cerrado

Un visitante sin sesión DEBE (MUST) poder abrir la raíz del sitio y ver la landing. Las
rutas del sistema (`/admin`, `/coach`, `/athlete`, `/director`, `/profile`,
`/notifications`, `/exports`) DEBEN (MUST) seguir exigiendo sesión y devolver al inicio
de sesión. Afecta a los cuatro roles: ninguno pierde acceso, y el público gana la
portada.

#### Scenario: Visitante anónimo en la raíz

- **WHEN** una persona sin sesión abre `/`
- **THEN** ve la landing con el nombre del producto, la propuesta y los llamados a la acción

#### Scenario: Ruta interna sin sesión

- **WHEN** una persona sin sesión abre `/admin/dashboard`, `/coach/dashboard` o `/athlete/calendar`
- **THEN** es redirigida al inicio de sesión y no ve ningún dato del sistema

#### Scenario: Ruta interna inventada sin sesión

- **WHEN** una persona sin sesión abre una ruta que no existe bajo `/admin`
- **THEN** no obtiene información del sistema: recibe la misma redirección

### Requirement: Con sesión, la raíz lleva al tablero del rol

Un usuario autenticado que abra `/` DEBE (MUST) ser redirigido al tablero que
corresponde a su rol, sin ver la landing.

#### Scenario: Admin, coach y atleta

- **WHEN** un usuario con sesión abre `/`
- **THEN** llega a `/admin/dashboard`, `/coach/dashboard` o `/athlete/dashboard` según su rol

### Requirement: La oferta se explica por rol, sin precios

La landing DEBE (MUST) presentar los productos vigentes en tres bloques —Atleta, Coach y
Escuela/Club— con el beneficio concreto de cada uno y ejemplos de lo que puede hacer,
usando iconos de apoyo. NO DEBE (MUST NOT) mostrar precios, planes de pago ni promesas
de compra mientras el modelo comercial no esté definido.

#### Scenario: Lectura de los tres productos

- **WHEN** una persona recorre la landing
- **THEN** encuentra para cada rol una lista breve de capacidades reales del sistema, sin cifras de precio

#### Scenario: Contenido sin datos inventados

- **WHEN** se revisa el texto publicado
- **THEN** no hay testimonios, cifras de clientes ni logos de terceros que no existan

### Requirement: El contacto se resuelve por correo

Cada llamado a la acción de contacto DEBE (MUST) abrir el cliente de correo con el
destinatario del proyecto y un asunto que identifique la sección. La dirección DEBE
(MUST) estar definida en un único lugar del código para poder cambiarla sin tocar la
página.

#### Scenario: Contacto desde el bloque de producto

- **WHEN** una persona pulsa «Solicitar información» en el bloque de Coach
- **THEN** se abre un correo dirigido a la casilla del proyecto con un asunto que menciona ese bloque

#### Scenario: Dirección única

- **WHEN** se cambia la casilla de contacto
- **THEN** cambia en todos los enlaces de la landing a la vez

### Requirement: La landing respeta el tema claro y oscuro

La landing DEBE (MUST) ofrecer el mismo control de tema que la aplicación y recordar la
elección, tanto para visitantes anónimos como para usuarios con sesión. Ambos temas
DEBEN (MUST) cumplir los mínimos de contraste del sistema visual.

#### Scenario: Visitante anónimo cambia de tema

- **WHEN** una persona sin sesión alterna el tema y recarga
- **THEN** la elección se mantiene y la landing se ve con los tokens del tema elegido

#### Scenario: Paridad de contraste

- **WHEN** se ejecuta la verificación de accesibilidad sobre la landing
- **THEN** no hay violaciones en tema claro ni en oscuro

### Requirement: SEO y compartición

La raíz DEBE (MUST) declarar título, descripción y canónica propias, y ofrecer una imagen
de compartición acorde a la marca. El sitio DEBE (MUST) publicar `sitemap` y `robots`
coherentes con las rutas públicas.

#### Scenario: Enlace compartido

- **WHEN** se comparte la dirección del sitio
- **THEN** la vista previa muestra título, descripción e imagen de marca

#### Scenario: Rastreo

- **WHEN** un buscador solicita el sitemap
- **THEN** recibe las rutas públicas declaradas y no rutas internas

### Requirement: Accesibilidad de la landing

La landing DEBE (MUST) tener un solo encabezado principal, jerarquía de encabezados
correcta, foco visible, contraste suficiente y navegación completa con teclado. Las
imágenes de marca DEBEN (MUST) tener texto alternativo y el resto ser decorativas.

#### Scenario: Recorrido con teclado

- **WHEN** una persona recorre la landing con Tab
- **THEN** el foco sigue el orden visual, es visible en cada control y el enlace de salto lleva al contenido

#### Scenario: Imagen de marca

- **WHEN** se inspecciona el logo
- **THEN** tiene nombre accesible y no duplica el texto que ya está a la vista

### Requirement: Rendimiento de la portada

La landing DEBE (MUST) servirse sin librerías nuevas de interfaz ni de animación, con
las imágenes dimensionadas para evitar saltos de composición, y no DEBE (MUST NOT) cargar
datos del sistema ni consultar la base de datos para renderizarse.

#### Scenario: Peso de la portada

- **WHEN** se mide el peso de los recursos de la landing
- **THEN** las imágenes de marca suman menos de 300 KB y no hay peticiones a la base de datos

#### Scenario: Sin errores de consola

- **WHEN** se abre la landing en el navegador
- **THEN** la consola no registra errores ni advertencias de hidratación
