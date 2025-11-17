# NOTAS DE DESARROLLO - D&D ADVENTURES AI

**Última actualización:** [16/11/2025 16:00]

## 📝 PROPÓSITO DE ESTE DOCUMENTO

Este documento sirve como **punto de entrada rápida e informal** para el desarrollador. Es un área de **brainstorming general** donde se pueden anotar rápidamente:

- **Issues detectados** (bugs, problemas)
- **Nuevas funcionalidades** propuestas
- **Revisiones** de funcionalidades existentes
- **Ideas rápidas** de desarrollo
- **Notas informales** de desarrollo

### 🔄 Flujo de Información

Este documento es **intencionalmente informal** y sirve como "borrador" antes de formalizar en el sistema oficial de documentación:

1. **Detección/Idea** → Se anota aquí rápidamente (informal)
2. **Formalización** → Se mueve al sistema oficial correspondiente:
   - **Issues** → `docs/tracking/issues/pendientes.md` (documentación formal)
   - **Nuevas funcionalidades** → `docs/roadmap.md` o `docs/planes-desarrollo/`
   - **Revisiones** → `docs/roadmap.md` o issues tracker

### ✅ Proceso Recomendado

- **Anotar rápidamente** ideas, issues o funcionalidades aquí
- **Revisar periódicamente** este documento
- **Formalizar** items relevantes moviéndolos al sistema oficial correspondiente
- **Mantener este documento** como área de trabajo temporal

**Nota:** La información en este documento es informal. Para documentación oficial y formal, consulta el sistema de documentación correspondiente (issues tracker, roadmap, planes de desarrollo).

---

## LEYENDA DE CLASIFICACIÓN

### TIPOS DE IDEA:
- `[ISSUE]` = Bug o problema que necesita corrección
- `[NUEVA FUNCIONALIDAD]` = Feature nueva a implementar
- `[REVISION]` = Revisar/mejorar funcionalidad existente
- `[DOCUMENTACION]` = Tarea de documentación
- `[TESTING]` = Tarea relacionada con pruebas

### PRIORIDADES:
- `[PMA]` = Prioridad Muy Alta
- `[PA]` = Prioridad Alta
- `[PM]` = Prioridad Media
- `[PB]` = Prioridad Baja
- `[PMB]` = Prioridad Muy Baja

### CATEGORÍAS:
- `[INTERFAZ DE USUARIO]` = UI/UX, componentes visuales
- `[SISTEMA DE COMBATE]` = Mecánicas de combate, turnos, acciones
- `[SISTEMA DE PERSONAJES]` = Fichas, compañeros, estados de personajes
- `[SISTEMA DE AVENTURAS Y DATOS]` = Aventuras JSON, datos, APIs
- `[CALIDAD Y PULIDO]` = Testing, corrección ortográfica, logs

### ESTADO DE DOCUMENTACIÓN:
- `[EN ROADMAP]` = Ya documentado en docs/roadmap.md
- `[EN PLAN]` = Ya documentado en docs/planes-desarrollo/
- `[SIN DOCUMENTAR]` = Aún no está en documentación oficial

---

## ISSUES (Bugs/Problemas)

*(Ninguna en esta sección - todos los issues activos se documentan en `docs/tracking/issues/`)* 

---

## NUEVAS FUNCIONALIDADES

### PRIORIDAD MEDIA

#### [#78] `[NUEVA FUNCIONALIDAD]` `[PM]` `[SISTEMA DE AVENTURAS Y DATOS]` `[SIN DOCUMENTAR]`
**Sistema de detección automática de pruebas de característica en interacciones**

- Implementar un sistema para que la IA sepa cuándo una interacción requiere una prueba de característica (como Carisma, Persuasión o Engaño) para resolver la situación con un elemento de suerte.
- El sistema debe identificar automáticamente situaciones que requieren tiradas de habilidad.
- Debe funcionar en modo exploración e interacción social.

### PRIORIDAD ALTA

#### [#79] `[NUEVA FUNCIONALIDAD]` `[PA]` `[SISTEMA DE AVENTURAS Y DATOS]` `[SIN DOCUMENTAR]`
**Sistema de modos de juego diferenciados**

- Diferenciar claramente entre Modo exploración, Modo combate y Modo social o interacción.
- Cada modo debe tener sus propias reglas, acciones disponibles y mecánicas específicas.
- La interfaz y el comportamiento del sistema deben adaptarse según el modo activo.

#### [#80] `[NUEVA FUNCIONALIDAD]` `[PA]` `[SISTEMA DE AVENTURAS Y DATOS]` `[SIN DOCUMENTAR]`
**Acciones de movimiento en modo exploración**

- En modo exploración implementar las acciones de movimiento:
  - Ritmo de viaje
  - Saltar
  - Trepar
  - Nadar
  - Arrastrarse
- Cada acción debe tener sus propias reglas y posibles pruebas de característica asociadas.

#### [#81] `[NUEVA FUNCIONALIDAD]` `[PA]` `[SISTEMA DE AVENTURAS Y DATOS]` `[SIN DOCUMENTAR]`
**Pruebas de características en modos de exploración e interacción**

- Implementar las pruebas de características en los modos de exploración e interacción.
- El sistema debe permitir realizar tiradas de habilidades cuando sea apropiado según el contexto.
- Debe integrarse con el sistema de detección automática de pruebas (#78).

#### [#82] `[NUEVA FUNCIONALIDAD]` `[PA]` `[SISTEMA DE COMBATE]` `[SIN DOCUMENTAR]`
**Sistema de ventaja y desventaja en todos los modos**

- Implementar las tiradas de ventaja y desventaja para los modos de combate, exploración e interacción.
- El sistema debe aplicar correctamente las reglas de D&D 5e para ventaja/desventaja.
- Debe considerar todas las fuentes posibles de ventaja/desventaja (condiciones, hechizos, habilidades, etc.).

#### [#83] `[NUEVA FUNCIONALIDAD]` `[PA]` `[SISTEMA DE COMBATE]` `[SIN DOCUMENTAR]`
**Movimiento y acción adicional en combate**

- Implementar el movimiento y la acción adicional en el combate según las reglas de D&D 5e.
- Los personajes deben poder moverse y realizar acciones en su turno.
- Debe respetar las limitaciones de movimiento (velocidad, terreno difícil, etc.).

#### [#84] `[NUEVA FUNCIONALIDAD]` `[PA]` `[SISTEMA DE COMBATE]` `[SIN DOCUMENTAR]`
**Acciones completas en combate**

- Implementar todas las acciones disponibles en combate según D&D 5e:
  - Atacar
  - Lanzar conjuro
  - Esquivar
  - Destrabarse
  - Ayudar
  - Moverse
  - Correr
  - Preparar una acción
  - Buscar
  - Usar un objeto
  - Esconderse
- Cada acción debe tener sus propias reglas y validaciones.
- Relacionado con #23 (Sistema de gestión de acciones) y #70 (Aceptar más acciones en turno del jugador).

### PRIORIDAD BAJA

#### [#85] `[NUEVA FUNCIONALIDAD]` `[PB]` `[SISTEMA DE PERSONAJES]` `[SIN DOCUMENTAR]`
**Rasgos de clase**

- Implementar los rasgos de clase (como Furia del Bárbaro, Ataque Furtivo del Pícaro o Inspiración Bárdica).
- Cada clase debe tener sus rasgos específicos implementados según las reglas de D&D 5e.
- Los rasgos deben activarse automáticamente cuando corresponda o permitir su uso manual.

#### [#86] `[NUEVA FUNCIONALIDAD]` `[PB]` `[SISTEMA DE AVENTURAS Y DATOS]` `[SIN DOCUMENTAR]`
**Sistema de influencia de PNJs**

- La IA debe mantener el estado de actitud del PNJ (amistosa, indiferente u hostil).
- Permitir que los resultados de las tiradas y la interpretación del jugador influyan en esa actitud.
- El sistema debe rastrear cambios en las relaciones y reflejarlos en las interacciones futuras.

#### [#87] `[NUEVA FUNCIONALIDAD]` `[PB]` `[SISTEMA DE PERSONAJES]` `[SIN DOCUMENTAR]`
**Sistema de inspiración**

- La IA debe reconocer cuándo la interpretación del jugador es fiel a los rasgos de personalidad, ideales o defectos (establecidos en la creación del personaje).
- Otorgar el beneficio de Inspiración cuando corresponda (que permite obtener Ventaja en tiradas).
- El sistema debe rastrear cuándo se usa la inspiración y cuándo se puede otorgar de nuevo.

### PRIORIDAD MUY BAJA

*(Ninguna en esta sección - los items de esta prioridad están documentados en `docs/roadmap.md`.)*

---

## REVISIONES (Mejoras/Análisis)

*(Ninguna en esta sección - todas las revisiones listadas en este documento ya están cubiertas en `docs/roadmap.md`.)*

---

## TESTING

*(Ninguna en esta sección)*

---

## DOCUMENTACION

*(Ninguna en esta sección)*

---

## NOTAS FINALES

→ Para ver el estado actual del desarrollo, consultar:
- `CHANGELOG.md` (cambios implementados)
- `docs/roadmap.md` (mejoras planificadas a largo plazo)
- `docs/planes-desarrollo/` (planes activos y completados)
- `docs/tracking/issues/README.md`

→ Items marcados con `[EN ROADMAP]` o `[EN PLAN]` están ya documentados exhaustivamente en su ubicación correspondiente.

→ Este documento es para notas rápidas y brainstorming. Para planificación formal, usar los documentos del proyecto.

→ Clasificación de ideas:
1. Tipo de idea (ISSUE, NUEVA FUNCIONALIDAD, REVISION, DOCUMENTACION, TESTING)
2. Prioridad (PMA, PA, PM, PB, PMB)
3. Categoría dentro de la aplicación
4. Estado de documentación oficial (`[EN ROADMAP]`, `[EN PLAN]`, `[SIN DOCUMENTAR]`)

---

## NUEVAS IDEAS Y FALLOS ENCONTRADOS

Esta sección es para apuntar ideas rápidas, fallos detectados y notas informales antes de clasificarlas formalmente en las secciones correspondientes (ISSUES, NUEVAS FUNCIONALIDADES, REVISIONES, etc.).

Al clasificar un item de esta sección, debe moverse a su sección correspondiente y eliminarse de aquí, manteniendo esta sección como un área de trabajo temporal.

1. ISSUE: Aunque la ficha de mi personaje tiene 30 de DES y +10 de modificador, la iniciativa se calcula con 1d20+8. Revisar esto. (PA)

2. Implementar un sistema por el que DM avise de fichas sospechoas o corruptas. (PB)

3. En combate, a veces en un solo turno el DM puede llegar a mandar 5 mensajes: narración inicial, acción, daño, mensaje de "ha dejado inconsciente a X" y mensaje de "X cae inconsciente". Buscar la forma de minimizar esta cantidad de mensajes a lo mínimo. Quizás la mejor forma diferenciar entre mensajes narrativos y mensajes informativos y agrupar estos últimos en un solo mensaje del DM... (PA)

4. Sería interesante tener la posibilidad de que al cambiar datos en los archivos JSON de las fichas de los personajes, el panel de fichas del juego se actualizase automáticamente. Esto sería especialmente para ciertos testeos manuales. He notado que en la consola del navegador sale un log cuando los datos iniciales de la party se han modificado y guardado, quizás podamos usar esto para forzar una actualización de las fichas de los personajes en la UI y en el server. (PA)

5. ISSUE: en combate he detectado que la notación de las tiradasd de daño cuando el modificador es 0 no aparecen completas (1d4) depués del nombre del arma. Deberían aparecer completas incluso cuando el modifcador es 0 (1d4+0). Sin embargo debajo del número total de daño si que aparece completa (1d4+0). (PA)

6. ISSUE: He detectado unas inconsistencias en las tiradas de ataque y de daño: Merryl ataca con su daga con 1d20+2 y hace daño con 1d4+2 (pero en otra partida el daño lo hizo con 1d4+0). Revisar esto. (PMA)

7. ISSUE: La tirada de ataque crítica debería ser de color verde manteniendo el efecto de pulso y el texto de "¡CRITICO!" con la estrellita debería ser verde también. La tirada de daño crítica debería mantenerse amarilla (correcto) pero añadiendole el efecto pulso y la etiqueta de ¡CRITICO! con la estrellita en amarillo. (PA)

8. Probando el combate, en mi turno he escrito "Con mis últimas fuerzas ataco al goblin que me acaba de dar un tajo." refiriendome al Goblin 2 que me acababa de atacar y acertar con su cimitarra. Sin embargo el DM narró que Galador (mi personaje) atacó al Goblin 1. (PM)

9. Implementar un notón de configuración al lado del botó. para ir al menú inicial, para poder cosas como el modelo LLM en uso, la voz de DM, guardado automático, etc (PM)

10. Implementar sistema de guardado automático. (PB)

11. En combate, después de pulsar el botón de avanzar todos. Los turnos empiezan a correr mientras que los botones se desactivan y el botón de "avanzar todos" pone "Avanzando...". Aquí creo que lo ideal es que mientras el botón esté en "Avanzando..." el otro botón se convierta en un botón de pausa para deter el avance automático de turnos. Si se pulsa, el avance se detendrá después de terminar lo que estaba haciendo y los botones volverán a mostrarse como al principio (antes de pulsar el botón de "avanzar todos"). (PM)

12. Hay que eliminar el botón de y supongo que su funcionalidad. Las tiradas ya se ejecutan en el server. No tiene sentido. O quizás si, ¿Y si hacemos que cuando sea el turno del jugador en combate o se le pida una tirada, la haga el mismo? No se si merece la pena. (PB)

13. En combate, aparte de el tema de la música dinámica ya comentado en otro punto estaría genial que hubiese efectos de sonido para cada turno para ambientar un poco más la acción. Cada tipo de enemigo podría hacer gritos de ataque, quejidos si se les hace daño, etc. Choque de espadas, golpes de escudo, etc. (PB)

14. El panel izquierdo necesita un rediseño. Hay que quitar los recuadros para el DebugLog (retirar todos los logs para este recuadro para limpiar código) y el botón de guardar partida hay que moverlo a la barra superior y ponerlo al lado del botón de ir a menú principal. Los recuadros de Tiradas y Orden de Combate debrían estar acoplados por defecto y solo maximizarse si hay información que necesite ser mostrada. El panel de orden de combate se tiene que ajustar en tamaño al número de participantes en la pelea dejando el resto del espacio al recuadro de tiradas. Revisar bien este planteamiento. (PM)

16. Los botones de avanzar turnos deberían poner "Avanzar 1 turno" y "Avance automático". (PA)

17. En combate, los turnos de los personajes muertos o inconscientes ya no deberían ni ejecutarse para no perder tiempo. El bucle debería ignorar a los personajes que están muertos o inconscientes. Ojo, si un personaje se recupera de la inconsciencia o revive habría que volver a tenerlo en cuenta en el bucle. Esto tiene que ir acompañado de alguna señal visual de qué personajes están fuera del combate (quizás tachando su nombre en el combat tracker o con algún tipo de simbolos para marcar su estado). (PA)

18. Cerca del input de texto podíamos implementar botones para dar órdenes rápidas como "Atacamos", "Huímos", etc. (PB)

19. Investigar sistemas de texto2voz más rápidos y configurables. (PM)

20. Al finalizar un combate el panel de Tiradas podría mostrar un mensaje de victoria o derrota y que el combate ha finalizado. (PM)



