# Spec Delta

## Purpose

Define la identidad visual de RunOsorno y los invariantes de accesibilidad que toda
pantalla respeta, para que la interfaz pueda evolucionar sin volver a un panel
administrativo genérico y sin perder contraste, foco ni legibilidad.

## ADDED Requirements

### Requirement: Tokens de color con contraste verificado

La interfaz DEBE (MUST) expresarse con un conjunto único de tokens de color —fondo de
página, superficie, superficie secundaria, bordes, tres niveles de texto y acento— y
toda combinación de texto sobre fondo usada en pantalla DEBE (MUST) alcanzar 4,5:1, o 3:1
cuando el texto es grande, el borde delimita un control o el anillo indica foco.

#### Scenario: Par de tokens por debajo del mínimo

- **WHEN** la verificación calcula el contraste de un par declarado
- **THEN** si el resultado queda bajo el mínimo, la verificación falla e informa el par y el valor obtenido

#### Scenario: Texto de estado sobre fondo tintado

- **WHEN** se muestra un badge o un aviso de estado sobre su tinte claro
- **THEN** su texto alcanza 4,5:1 medido, no estimado, y el tono no depende de utilidades de color genéricas

### Requirement: Tema claro por defecto y oscuro con paridad

La aplicación DEBE (MUST) abrir en tema claro, ofrecer un control accesible para cambiarlo y
conservar la elección entre visitas. Ambos temas DEBEN (MUST) declarar el juego completo de
tokens y cumplir los mismos mínimos de contraste. Afecta a los cuatro roles por
igual; ningún rol tiene una apariencia distinta más allá de su menú.

#### Scenario: Primera visita en un equipo configurado en oscuro

- **WHEN** una persona entra por primera vez desde un sistema operativo con preferencia oscura
- **THEN** la aplicación muestra el tema claro, porque el claro es el valor por defecto del producto

#### Scenario: Elección que sobrevive a la recarga

- **WHEN** la persona elige el tema oscuro y vuelve a cargar o navega a otra pantalla
- **THEN** el tema oscuro sigue activo y el control anuncia el estado actual

#### Scenario: Tema declarado en el HTML inicial

- **WHEN** se inspecciona el documento antes de ejecutar scripts del cliente
- **THEN** el tema aplicado ya está declarado, sin destello de tema incorrecto al cargar

### Requirement: Ningún estado se comunica solo con color

Todo estado visible —Planificada, En curso, Completada, Parcial, No realizada,
Descanso, y cualquier alerta— DEBE (MUST) distinguirse además por forma, icono, etiqueta o
patrón, de modo que siga siendo identificable sin percibir color.

#### Scenario: Revisión sin color

- **WHEN** una pantalla con estados se revisa en escala de grises
- **THEN** cada estado sigue siendo distinguible por su forma o su etiqueta

#### Scenario: Estado nuevo sin forma propia

- **WHEN** se incorpora un estado que no existía
- **THEN** su definición incluye una forma o etiqueta propia antes de darse por terminado

### Requirement: Foco visible y orden de tabulación

Todo elemento interactivo DEBE (MUST) mostrar un anillo de foco de al menos 3:1 contra el
fondo adyacente, DEBE (MUST) mantenerse alcanzable con teclado y DEBE seguir el orden
visual de la pantalla.

#### Scenario: Recorrido completo con teclado

- **WHEN** se recorre una pantalla con Tab y Shift+Tab
- **THEN** cada control muestra foco visible y el recorrido sigue el orden visual, sin trampas ni saltos

#### Scenario: Foco sobre fondo tintado

- **WHEN** el foco cae sobre un elemento dentro de una tarjeta o fila tintada
- **THEN** el anillo mantiene al menos 3:1 contra ese fondo

### Requirement: Tipografía propia y cifras alineadas

La aplicación DEBE (MUST) servir su propia familia tipográfica, con una escala de tamaños y
pesos definida, sin depender de servicios de terceros en tiempo de ejecución. Las
cifras de métricas, distancias, tiempos y porcentajes DEBEN (MUST) usar numeración tabular,
alinearse en columnas y respetar el formato es-CL.

#### Scenario: Red externa bloqueada

- **WHEN** se bloquea el tráfico hacia dominios externos
- **THEN** la tipografía sigue cargando y el texto no cambia de familia

#### Scenario: Columna de cifras

- **WHEN** una tabla o una tarjeta muestra varias cifras en vertical
- **THEN** los dígitos quedan alineados y las unidades se leen en formato es-CL

#### Scenario: Pantalla sin conexión al medir métricas

- **WHEN** la persona consulta sus métricas desde un móvil con red lenta
- **THEN** el texto se muestra con la fuente definitiva, sin salto de composición perceptible

### Requirement: Densidad y objetivos táctiles

La interfaz DEBE (MUST) usar una escala de espaciado basada en 4 píxeles y, en viewports
móviles, todo control accionable DEBE (MUST) ofrecer un objetivo táctil de al menos 44 por 44
píxeles.

#### Scenario: Uso a 375 píxeles de ancho

- **WHEN** se usa la aplicación a 375 píxeles de ancho
- **THEN** las acciones principales se alcanzan sin solaparse y ninguna queda por debajo del objetivo táctil mínimo

#### Scenario: Tabla ancha en móvil

- **WHEN** una tabla no cabe en la pantalla
- **THEN** la información se presenta de forma legible y desplazable con teclado, sin exigir zoom

### Requirement: Movimiento contenido y respetuoso

Las transiciones y animaciones DEBEN (MUST) durar 200 milisegundos o menos y DEBEN
desactivarse cuando el sistema operativo declara preferencia por movimiento reducido.

#### Scenario: Preferencia de movimiento reducido activa

- **WHEN** el sistema declara movimiento reducido
- **THEN** no se ejecutan transiciones ni desplazamientos animados y la interfaz sigue siendo comprensible

#### Scenario: Interacción con hover

- **WHEN** se pasa el puntero sobre una tarjeta o un botón accionable
- **THEN** el cambio de estado es perceptible y su duración no excede el máximo declarado

### Requirement: Marca provisional reemplazable

La identidad DEBE (MUST) resolverse en un único componente de marca con dos formas —wordmark
y marcador—, con medidas y área de resguardo definidas, de modo que el logo definitivo
se incorpore más adelante sin cambiar layouts. Mientras no exista logo, la marca
provisional DEBE (MUST) ser tipográfica. El icono del sitio DEBE derivarse de la misma marca.

#### Scenario: Sustitución del logo

- **WHEN** se reemplaza el contenido del componente de marca por el logo definitivo
- **THEN** sidebar, header, inicio de sesión e icono del sitio muestran el nuevo logo con las mismas medidas y sin ajustes de layout

#### Scenario: Marca en tamaño reducido

- **WHEN** la marca se muestra en el ancho mínimo declarado
- **THEN** sigue siendo legible y conserva su área de resguardo

### Requirement: Series de gráfica legibles en ambos temas

Las gráficas DEBEN (MUST) tomar sus colores de los tokens del tema activo, mantener
contraste suficiente entre serie, grilla y fondo, y permitir distinguir sus series sin
depender solo del color.

#### Scenario: Métricas en tema oscuro

- **WHEN** se abre una pantalla de métricas con el tema oscuro activo
- **THEN** series, grilla y rótulos conservan contraste y cada serie se identifica además por etiqueta o patrón

#### Scenario: Serie sin datos suficientes

- **WHEN** un periodo no tiene registros
- **THEN** la gráfica muestra un estado vacío explicativo en lugar de una serie plana o un error

### Requirement: Cobertura de verificación visual y de accesibilidad

Toda pantalla rediseñada o nueva DEBE (MUST) quedar incluida en la verificación automática
de accesibilidad, con sus credenciales y su ruta, y DEBE (MUST) evaluarse en ambos temas. El
inicio de sesión DEBE (MUST) formar parte de esa cobertura.

#### Scenario: Pantalla rediseñada sin cobertura

- **WHEN** una pantalla se rediseña y no está en la lista de verificación
- **THEN** el cambio no se considera terminado

#### Scenario: Inicio de sesión en ambos temas

- **WHEN** se ejecuta la verificación de accesibilidad sobre el inicio de sesión
- **THEN** se evalúa en tema claro y oscuro y no reporta violaciones

### Requirement: El rediseño no altera el comportamiento funcional

El cambio visual DEBE (MUST) conservar intactos los flujos, permisos, reglas de negocio y
datos: las pruebas de extremo a extremo y los verificadores existentes DEBEN (MUST) pasar sin
modificar su lógica.

#### Scenario: Suite de extremo a extremo sin ajustes

- **WHEN** se ejecutan las pruebas de extremo a extremo después del rediseño
- **THEN** pasan sin cambios en su lógica ni en sus aserciones funcionales

#### Scenario: Permiso denegado se comporta igual

- **WHEN** un rol intenta acceder a una pantalla que no le corresponde
- **THEN** recibe la misma redirección o el mismo mensaje que antes del rediseño
