# Roadmap y Control de Issues Completo

Este documento centraliza toda la planificación futura, características pendientes e issues identificados en el proyecto, organizados por prioridad para evitar la pérdida de cualquier tarea.

---

## 💡 Ideas Rápidas (Gael)

1. **Selección de presets de party al iniciar partida.**
2. **Diferenciación entre inventario (mochila) y equipamiento equipado.**
3. **Desactivar los comentarios automáticos del compañero que esté activo como personaje seleccionado.**
4. **Incluir fichas de monstruos automáticas en el conversor de PDF a JSON.** Cuando se hace la conversión de un pdf a un JSON podríamos incluír las fichas de los monstruos que no estén incluídos para evitar hacer llamadas a la API en medio de la partida.
5. **Revisar el sistema de tiradas de skill checks** Hay veces en que no son necesarias aunque el jugador diga "Necesito hacer una tirada de [skill]".
6. **Pensar como gestionar las situaciones en las que un jugador describe cosas que no debería haber conocido aún** Mere la pena? Por ejemplo al empezar una partida el jugador puede ir a un sitio que aún no se le ha revelado?.
7. **Añadir flechas de desplazamiento lateral en la ficha de personaje (donde está el nombre) para poder cambiar de personaje**
8. **La acciones que requieren tirada de habilidad en grupo solo lo hace el personaje activo** Habría que arreglar esto y hacer que si por ejemplo el jugador dice, entramos con sigilo, todos los personajes hagan su tirada de habilidad.
9. **A veces el DM dice detalles mecánicos que creo que es mejor que no lo haga** Por ejemplo en una prueba me ha dicho: "No tenéis la llave correspondiente. Para abrirla, tendréis que intentar forzar la cerradura (Juego de Manos CD 15) o derribarla por la fuerza (Atletismo CD 20)." Yo no creo que sea necesario que el DM de los detalles mecánicos, debería decirlos solo si el jugador pregunta o si es relevante para la historia.
10. **Quizás haya acciones sencillas que no necesiten de una narración del DM** Algo como coger una llave o algún objeto simple no necesita de una narración del DM. Quizás haya más puntos donde podamos ahorrar narraciones innecesarias.
11. **Sustituir el texto "Para hablar con el DM fuera de personaje, empieza tu mensaje con //." por una barra de mensajes de sistema que nos de información de que está pasando** El mensaje que antes teníamos ahí podría aparecer como tooltip del input text o algo parecido.
12. **La carga automática de los libros de reglas debería comprobarse, si es necesaria, al iniciar cada partida** para evitar pausas demasiado largas en medio de una partida.
13. **Asignar diferentes configuraciones de voz para los personajes** Sería cuestión de configurar en cada ficha de personajes unos atributos de voz únicos para cada uno. 
14. **Desarrollar una forma de visualizar el daño que tiene los personajes del orden de combate** pero que no sea numérica para que funcione como una pista visual más bien sin revelar el daño exacto. Quizás algo como ir tiñendo el nombre del personaje de blanco-> rosa-> rojo-> marrón ->negro->tachado. (Obviamente si se llega al último paso el personaje muere).

---

## 🔴 Prioridad Muy Alta (Críticos y Bloqueantes)

### Características Clave:
- **Herramienta de Sanitización de Aventuras JSON:** Crear un script CLI para validar y actualizar archivos JSON de aventuras antiguos a los nuevos esquemas Zod (inyección de campos de FSM, luces, trampas, etc.).
- **Sistema de Etiquetado Global de Entidades (Fase 5):** Diseñar e implementar un sistema de etiquetado en el `worldState` de las aventuras bajo cuatro ejes clave (Epistémico, Perceptivo, Físico y Operativo), destacando las etiquetas `unrevealed` y `revealed` para gobernar la "niebla de guerra". Esto permitirá que el DM conozca de antemano la ubicación de secretos y trampas para arbitrar e introducir pistas contextuales, pero impidiendo estrictamente su revelación prematura hasta que el jugador realice la acción desencadenante.

---

## 🔴 Prioridad Alta (Mejoras Core y UX)

### Sistema de Conversión y Datos:
- **Robustecimiento del Conversor PDF a JSON:** Revisar y adaptar el script `scripts/pdf-to-json.ts` para que valide estrictamente los JSON generados contra los esquemas Zod de la aventura, normalice coherentemente los IDs de llaves, puertas y contenedores, y genere metadatos de visibilidad y estados iniciales consistentes con el Event-Driven Core.

### Arquitectura y Flujos de IA:
- **Rediseño a Arquitectura Neuro-Simbólica de 3 Capas (Robustez):** Desacoplar completamente la lógica dura del juego de la narración creativa.
  1. *Capa 1 (IA Árbitro):* Un agente interpretativo traduce la acción creativa y libre del jugador a un JSON que propone cambios físicos y mecánicos en el estado.
  2. *Capa 2 (Código TypeScript):* El motor de reglas de TypeScript procesa y valida este JSON, gestionando estados, inventarios, tiradas de dados reales y actualizando la base de datos de forma robusta y determinista, generando un JSON final de "Hechos Absolutos del Turno".
  3. *Capa 3 (IA Narradora/DM):* Un prompt de DM simplificado toma el JSON de Hechos Absolutos del Turno y se limita a vestirlo de gala literaria en prosa evocadora de D&D, previniendo alucinaciones lógicas, double-binds y colapsos de esquema.

### Sistema de Combate y Reglas:
- **Alucinaciones del Tactician Enemigo (Acciones inventadas):** Evitar que la IA del tactician enemigo (`enemyTacticianTool`) alucine acciones o armas inexistentes (ej. "Multiataque (Barba y Glaive)" para un Oso Pardo). Implementar que se pasen las acciones disponibles (`availableActions`) directamente en el prompt del tactician o forzarlo a consultar las estadísticas oficiales antes de elegir la acción.

- **Visualización de Acciones Disponibles:** Mostrar gráficamente en la interfaz las acciones principales, bonus actions, reacciones y movimiento restantes del personaje activo en su turno.
- **Múltiples Acciones en Turno de Jugador:** Permitir realizar movimiento y acciones adicionales antes de que el turno pase obligatoriamente (reemplazar auto-avance por paso manual / fin de turno explícito).
- **Tiradas de Habilidad Grupales (Group Checks):** Implementar tiradas colectivas de la party (ej. Sigilo grupal) donde el éxito de la mitad del grupo decide el resultado.
- **Compañeros Agénticos Avanzados:** Dar proactividad a la IA de los compañeros para solicitar o realizar tiradas de habilidad automáticas basadas en su percepción y el peligro detectado.
- **Revisión del sistema de movimiento en salas en modo exploración:** Analizar y diseñar un sistema de foco de proximidad dinámico (`focusedTargetId` / `proximityFocus`) o puntos de interés (POIs) dentro de una localización para evitar la transición inmediata a la siguiente sala cuando el jugador declara "ir hacia" una puerta o verja, distinguiendo entre acercarse a interactuar y cruzar de habitación.
- **Soporte de Acciones Secuenciales/Compuestas:** Permitir al `ActionInterpreter` identificar y devolver un array de acciones ordenadas a realizar en un solo turno (ej: coger una llave de un cofre y seguidamente intentar abrir la verja) y ejecutar secuencialmente cada una de ellas actualizando el estado de la party entre pasos en el motor de reglas.

### Interfaz y Fichas:
- **Modos de Juego Diferenciados:** Adaptar explícitamente las reglas y acciones de interfaz según el modo activo: Exploración (movimiento por salas), Combate (turnos tácticos) o Interacción Social (diálogos).

---

## 🟡 Prioridad Media (Mecánicas de Juego y Sistemas de IA)

### IA y Narrativa:
- **Filtro de Diálogos Textuales del DM:** Evitar que el DM narre entre comillas las frases exactas de los compañeros cuando estos tienen su propio canal/burbuja de voz activa en el chat.
- **Sistema de Influencia y Actitud de PNJs:** Guardar y persistir el estado de actitud de los PNJs (amistoso, neutral, hostil) influenciado por las interacciones del jugador y tiradas de persuasión/engaño.

### 🔮 Sistema de Magia y Conjuros (D&D 5e):

#### ⚔️ Magia en Combate
- **Resolución Matemática de Conjuros y Curaciones (`resolveSpell` / `resolveHeal`):** Desarrollar la lógica en `CombatActionResolver` para calcular de manera formal las tiradas mágicas ofensivas y curativas utilizando las características reales del lanzador (modificador de aptitud mágica + competencia), sustituyendo el parche temporal.
- **Sistema de Saving Throws Completo:** Implementar tirada de salvación del objetivo (1d20 + modificador vs Spell Save DC del lanzador) con aplicación de daño completo o mitad según el resultado del conjuro.
- **Límites de Lanzamiento (Spell Slots):** Controlar y descontar las ranuras de conjuro disponibles por nivel de los personajes, evitando que se lancen hechizos de nivel sin recursos.

#### 📜 Magia Fuera de Combate y Utilidad
- **Ciclo de Vida y Uso de Pergaminos Mágicos:** Integrar con el inventario físico el uso de consumibles mágicos (restar el pergamino al activarlo, validar si el personaje tiene la habilidad de usarlo y realizar la transferencia correcta entre mochilas de compañeros sin duplicidades).
- **Registro de Efectos y Duración de Estados Mágicos:** Crear un sistema para registrar y persistir efectos temporales activos (ej: *Hablar con los animales* o *Invisibilidad*) en el `worldState`, manteniendo un contador de turnos/tiempo para que el DM arbitre congruentemente y la UI muestre el estado activo.

### Mecánicas de Rol (D&D 5e):
- **Sistema de Progresión y Niveles:** Implementar la ganancia de experiencia (XP) y subida de nivel de 1 a 5 con aumento de estadísticas de personaje.
- **Sistema de Comercio y Tiendas:** Compras, ventas, regateos y dinero dinámico en bazares integrados mecánicamente.
- **Simulación de Transacciones Físicas y Economía (Fase 4):**
  - **Depósito de Objetos en Contenedores**: Extender `InventoryRuleModule` para soportar acciones de tipo `drop` con destino a interactuables de tipo contenedor (ej: *"meto la llave en el cofre"*). En lugar de tirar el ítem al suelo (`droppedItems`), se debe descontar del inventario del PJ y agregar al array `items` del contenedor correspondiente en el `worldState`.
    * *Ejemplo a solucionar:* Al decir *"Meto la llave de nuevo en el cofre"*, el backend debe restar la llave de la mochila y guardarla dinámicamente en el cofre.
  - **Gestión Física y Deducción de Oro**: Implementar lógica en el motor de reglas para descontar oro dinámicamente de la ficha de personaje cuando el jugador realiza transacciones, decide depositar monedas en cofres o soltarlas (ej: *"dejo 20 monedas de oro en el cofre"*), previniendo que la acción solo sea un adorno narrativo de la IA y no afecte a las estadísticas reales.
    * *Ejemplo a solucionar:* Al escribir *"Dejo 20 monedas de oro en el cofre"*, el backend debe restar 20 de oro de la ficha del personaje activo en la party.
  - **Unificación de Inventarios Iniciales**: Homologar los inventarios de las fichas iniciales de personajes para que utilicen exactamente los mismos IDs y estructuras estándar sincronizadas con `adventureData.items` (ej: evitar IDs genéricos y resolver sinónimos semánticos de forma genérica).
  - **Mapeo de Sinónimos de Inventario Personal**: Añadir reglas específicas en los prompts de los expertos conversacionales de la IA para que apliquen la misma tabla de sinónimos a las pertenencias de los personajes (ej: comprender que si el jugador pregunta por *"la llave"*, Merryl la tiene porque su ficha indica `llave-calabozo` o `key_1`).
    * *Ejemplo a solucionar:* Cuando Merryl tiene la llave en su ficha, al preguntar al DM *"¿Dónde está la llave?"*, el DM no sabe responder debido a la inercia de chat y la falta de mapeo de sinónimos de inventario personal.
- **Sistema de Death Saving Throws y Revivencia:** Reglas de tiradas de salvación contra la muerte cuando un PJ cae a 0 HP.
- **Sistema de Estados y Condiciones:** Soporte técnico y visual para estados como envenenado, bendecido, paralizado, aturdido, etc., y su impacto en las tiradas.
- **Sistema de Foco de Objetivo:** Táctica inteligente de la IA enemiga para priorizar objetivos según distancia o nivel de HP.
- **Hidratación de Entidades por Herencia (Data Hydration):** Permitir herencia de monstruos a partir de plantillas base en JSON para reducir el tamaño de las aventuras.
- **Refactorización de Combate a Event-Driven Híbrido:** Migrar la resolución de turnos y acciones dentro del combate para usar el `EventDispatcher` y esquemas de `GameEvents`. Se mantendrá el FSM (`CombatSession`) para gobernar el ritmo de turnos, pero las acciones físicas, ataques y hechizos se procesarán reactivamente emitiendo y escuchando eventos, facilitando un log preciso para el narrador.

### Estabilidad y RAG:
- **Sistema de Testing de Integración y E2E:** Ampliar la cobertura de pruebas a flujos completos del navegador usando Playwright.

---

## 🟢 Prioridad Baja (Calidad de Vida y Extras)

- **Historial de Comandos en Input:** Permitir recuperar las últimas acciones enviadas al chat usando las flechas arriba/abajo del teclado.
- **Optimización y Escalabilidad del Motor de Reglas (GameRulesEngine):** Evolucionar el motor de reglas secuencial para soportar prioridades de ejecución (`priority`), mapeo indexado por tipo de acción (`actionType`) para evitar evaluar todos los módulos de forma plana, y carga dinámica de módulos por aventura para asegurar un escalado limpio ante docenas de reglas nuevas.
- **Audio Dinámico Avanzado:** Colores de tirada específicos (ej. verde para curación) y un botón de toggle de pausa durante el avance automático de turnos.
- **Personajes Predefinidos:** Soporte para que las aventuras JSON empaqueten personajes predefinidos con niveles específicos.
- **Guardado Automático de Partidas:** Guardado incremental automático cada cierto número de turnos.
- **Comandos de Voz:** Integración de Speech-to-Text para dictar acciones al DM.
- **Automatización del Versionado:** Integración de herramientas para automatizar el changelog y el versionado semántico desde los commits.
