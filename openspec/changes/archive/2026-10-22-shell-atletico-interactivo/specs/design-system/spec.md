# Spec Delta: design-system

## ADDED Requirements

### Requirement: Acento del shell por rol

El shell autenticado DEBE (MUST) distinguir sutilmente al rol de la sesión acentuando el
ítem activo del menú lateral y la línea inferior del navbar, en claro y oscuro, a partir de
tokens declarados en la única fuente de color del sistema. La diferenciación DEBE (MUST) ser
superficial: no cambia comportamiento, contenido ni permisos de ninguna pantalla.

#### Scenario: Visita de cada rol

- **WHEN** una persona inicia sesión como atleta, entrenador o administrador
- **THEN** el ítem activo del menú y la línea del navbar presentan el acento de su rol y el menú lateral un fondo propio, distinto del lienzo del contenido

#### Scenario: Contraste del acento

- **WHEN** se calcula el contraste del acento de rol sobre su tinte en cada tema
- **THEN** alcanza al menos 4,5:1 como texto y la verificación de tokens no reporta faltantes ni sobrantes entre claro y oscuro

### Requirement: Celebración accesible de logros

La aplicación DEBE (MUST) poder celebrar un registro exitoso con una animación breve de
confeti, sin dependencias nuevas, sin el bundle de JavaScript de Bootstrap y respetando la
preferencia de movimiento reducido del sistema. La celebración DEBE (MUST) desaparecer sola
sin bloquear interacciones.

#### Scenario: Registro exitoso con movimiento reducido

- **WHEN** una persona con `prefers-reduced-motion: reduce` completa un registro
- **THEN** no se reproduce ninguna animación de confeti y el resto de la retroalimentación (aviso de éxito, refresco de datos) se mantiene

#### Scenario: Celebración que no estorba

- **WHEN** se dispara el confeti y se sigue interactuando con la página
- **THEN** ningún elemento queda bloqueado y el lienzo de la animación se retira del documento al terminar

### Requirement: Tarjeta de métrica con sello y tarjeta-enlace

El sistema visual DEBE (MUST) ofrecer en sus primitivas la variante de tarjeta con sello
decorativo (`card-stamp`) y la tarjeta que en su totalidad es un enlace con elevación al
pasar el cursor. El sello DEBE (MUST) ser decorativo (oculto a las tecnologías de asistencia)
y la elevación DEBE (MUST) partir de la sombra del sistema, no de utilidades crudas.

#### Scenario: Tarjeta de métrica deportiva

- **WHEN** se muestra una tarjeta de estadística con sello
- **THEN** el ícono del sello no aparece en el árbol de accesibilidad y el contenido de la tarjeta se lee en el orden normal

#### Scenario: Tarjeta que lleva a otra pantalla

- **WHEN** la tarjeta completa se recorre con teclado y recibe el foco
- **THEN** se comporta como un enlace, muestra su anillo de foco y eleva su sombra al pasar el cursor
