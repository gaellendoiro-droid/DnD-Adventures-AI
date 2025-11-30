# Plan de Implementación: Sistema de Exploración de Mazmorras (Fase 2)

**Estado:** En Curso
**Prioridad:** Alta
**Dependencias:** [Sistema de Movimiento y Conciencia Espacial (Fase 1)](../completados/sistema-movimiento-conciencia-espacial.md) ✅

## 1. Visión General
Mientras que la Fase 1 resolvió el movimiento entre puntos conocidos (viaje), la Fase 2 se centra en la **exploración de lo desconocido**. El objetivo es simular la tensión de adentrarse en una mazmorra, donde no sabes qué hay en la siguiente habitación, si hay trampas o si te están observando.

### Objetivos Principales
1.  **Niebla de Guerra Semántica:** El sistema debe recordar qué habitaciones han sido visitadas, cuáles han sido solo "vistas" desde la puerta y cuáles son totalmente desconocidas.
2.  **Percepción Pasiva Automática:** Al entrar en una nueva zona, el sistema debe comparar automáticamente la Percepción Pasiva de los personajes contra la CD de trampas o enemigos ocultos.
3.  **Narrativa Contextual:** La descripción de una sala debe cambiar si es la primera vez que entras o si ya la conoces.

---

## 2. Nueva Arquitectura de Datos

### 2.1. Estado de Exploración (`GameState`)
Necesitamos persistir el conocimiento que los jugadores tienen del mapa. El estado del juego deberá incluir un registro de **Ubicaciones Conocidas**, donde para cada ubicación se almacene:
*   **Estado de Visibilidad:** Si es *Desconocida*, *Vista* (desde una conexión adyacente) o *Visitada* (el jugador ha entrado).
*   **Última Visita:** Marca de tiempo para saber cuánto hace que estuvieron allí.
*   **Secretos Descubiertos:** Lista de secretos que ya han sido revelados.
*   **Peligros Neutralizados:** Lista de trampas o amenazas que ya no están activas.

### 2.2. Definición de Peligros (`LocationSchema`)
Las ubicaciones ahora podrán contener una lista de **Peligros** ocultos. Cada peligro definirá:
*   **Tipo:** Trampa mecánica, emboscada de enemigos o peligro ambiental.
*   **Dificultad de Detección (CD):** El valor que la Percepción Pasiva debe superar.
*   **Dificultad de Desarme (CD):** (Opcional) Para intentos activos de neutralización.
*   **Descripción de Detección:** Lo que el DM narra si el personaje nota algo raro.
*   **Descripción de Activación:** Lo que sucede si la trampa se dispara.
*   **Efecto/Daño:** Las consecuencias mecánicas (daño, condiciones).
*   **Estado Activo:** Si el peligro sigue siendo una amenaza.

### 2.3. Detección de Contexto (`LocationSchema`)
Para saber cuándo activar este sistema, añadiremos una propiedad explícita que defina el "ritmo" de la exploración en esa ubicación.

*   **`explorationMode` (Enum):**
    *   `"safe"` (Default): Zonas seguras (ciudades, posadas). No hay niebla de guerra (todo visible o irrelevante), no hay chequeos pasivos automáticos.
    *   `"dungeon"`: Modo exploración tensa. Activa la Niebla de Guerra (solo ves lo visitado/visto) y los chequeos de Percepción Pasiva al entrar.
    *   `"wilderness"`: Similar a dungeon pero con distancias más largas y reglas de supervivencia (reservado para futuro).

### 2.4. Visibilidad en Conexiones (`ConnectionSchema`)
Para gestionar espacios abiertos (donde ves la siguiente zona sin haber entrado), añadiremos una propiedad a las conexiones.

*   **`visibility` (Enum):**
    *   `"restricted"` (Default): Bloquea la visión (puertas, muros, esquinas). Solo ves la descripción de la conexión. El destino permanece `unknown` hasta que interactúas/cruzas.
    *   **`"open"`**: Línea de visión clara (arcos, campo abierto, pasillo recto). Al entrar en el nodo origen, el nodo destino se marca automáticamente como `seen` y el Narrador puede describir lo que se ve a lo lejos.

### 2.5. Iluminación (`LocationSchema`)
Añadiremos el nivel de luz base de la zona para dar contexto al Narrador, pero **no bloquearemos la visión mecánicamente** en esta fase (se asume que los aventureros llevan fuentes de luz básicas).

*   **`lightLevel` (Enum):**
    *   `"bright"`: Luz brillante.
    *   `"dim"`: Luz tenue.
    *   `"dark"`: Oscuridad total. (Mecánica de bloqueo de visión pospuesta hasta tener Sistema de Inventario/Estados).

---

## 3. Componentes del Sistema

### 3.1. `ExplorationManager` (Nuevo Servicio)
Este servicio orquestará la lógica de exploración y expondrá funciones para:

1.  **Determinar Modo Activo:**
    *   Verificar `location.explorationMode`.
    *   Si es `safe`, el sistema se comporta como en la Fase 1.
    *   Si es `dungeon`, se activan los subsistemas de Niebla y Peligros.

2.  **Actualizar Estado de Exploración:**
    *   Marcar la ubicación actual como *Visitada*.
    *   Identificar conexiones salientes.
    *   **Cálculo de Visibilidad:**
        *   Si `connection.visibility` es `restricted` -> Destino `unknown`.
        *   Si `connection.visibility` es `open` -> Destino `seen` (La lógica de bloqueo por oscuridad se implementará en el futuro).

2.  **Verificar Percepción Pasiva (Automático):**
    *   Calcular la Percepción Pasiva de cada miembro del grupo (10 + Modificadores).
    *   Comparar estos valores contra la CD de los peligros activos en la ubicación.
    *   Determinar qué peligros han sido detectados automáticamente al entrar.

3.  **Realizar Búsqueda Activa (Manual):**
    *   Permitir que el jugador solicite explícitamente buscar ("Investigo la pared", "Busco trampas").
    *   Realizar una tirada de **Percepción** o **Investigación** (d20 + Modificadores).
    *   Comparar el resultado con la CD. Esto permite encontrar peligros que la pasiva no detectó.

4.  **Resolver Activación de Peligros:**
    *   Gestionar la lógica cuando un peligro no detectado se dispara.
    *   **Nota sobre Efectos:** Como el sistema de *Saving Throws* aún no está implementado, los efectos de las trampas serán simplificados en esta fase (Daño Automático o Ataque contra CA). La mecánica completa de evasión se añadirá en el futuro.
    *   **Transición a Combate:** Si el peligro es de tipo `ambush` (emboscada), el sistema debe iniciar automáticamente el Modo Combate. (La condición mecánica de *Sorpresa* será narrativa por ahora).

### 3.2. Integración con `NarrativeManager`
El generador de narrativa recibirá un objeto de contexto enriquecido (`ExplorationContext`) para modular la respuesta del LLM:

1.  **Tono y Atmósfera (`explorationMode`):**
    *   `safe`: Narración relajada, enfocada en la belleza o actividad social.
    *   `dungeon`: Narración tensa, enfocada en sonidos, olores, sombras y la sensación de peligro inminente.

2.  **Gestión de la Información (`visitState`):**
    *   **Primera Visita:** Descripción completa y detallada ("Entráis en una vasta sala...").
    *   **Revisita:** Descripción breve y funcional ("Volvéis a la sala del trono...").

3.  **Iluminación y Visibilidad (`lightLevel` + `connections`):**
    *   Si es `dark/dim`, la narración debe enfatizar la falta de luz y cómo las sombras se mueven.
    *   **Conexiones Abiertas:** El DM debe describir explícitamente lo que se ve a través de las conexiones `open` ("Al norte, el arco de piedra revela un pasillo iluminado por antorchas..."), dando sensación de profundidad.

4.  **Peligros Detectados (`hazards`):**
    *   Si se detectan, la narración debe integrar la pista sensorial ("...pero algo llama tu atención: una losa ligeramente levantada en el centro").
    *   Si NO se detectan, la narración debe omitirlos completamente (el jugador no sabe que existen).

---

## 4. Flujo de Usuario (Ejemplo)

1.  **Jugador:** "Abro la puerta norte y entro con cuidado."
2.  **Sistema (NavigationManager):** Valida movimiento y mueve al grupo a `sala-trampa-foso`.
3.  **Sistema (ExplorationManager):**
    *   Marca `sala-trampa-foso` como `visited`.
    *   Marca conexiones salientes como `seen`.
    *   Calcula Percepción Pasiva del grupo (ej: Pícaro tiene 15).
    *   Compara con Trampa de Foso (CD 14). **¡Éxito!**
4.  **Sistema (NarrativeManager):** Recibe `detectedHazards: ["Suelo inestable"]`.
5.  **Respuesta:** "Entráis en una sala húmeda y oscura. El Pícaro levanta la mano de golpe: nota que las baldosas del centro del suelo están ligeramente hundidas y no tienen polvo, sugiriendo un mecanismo reciente. Parece una trampa de foso."

---

## 5. Plan de Trabajo

### Fase 2.1: Estructura de Datos y Estado
1.  Actualizar `GameStateSchema` con `ExplorationState`.
2.  Actualizar `LocationSchema` con `HazardSchema`.
3.  Actualizar `adventure.schema.json` y plantillas.

### Fase 2.2: Lógica de Detección (`ExplorationManager`)
1.  Implementar cálculo de Percepción Pasiva (10 + Mod Sabiduría + Proficiencia si aplica).
2.  Implementar lógica de chequeo de peligros.
3.  Implementar actualización de "Niebla de Guerra" (Visited/Seen).

### Fase 2.3: Integración Narrativa
1.  Modificar `NarrativeManager` para aceptar contexto de exploración.
2.  Ajustar prompts para variar descripción según estado de visita y detección.

### Fase 2.4: Testing
1.  Crear escenario de prueba con una trampa oculta y una emboscada.
2.  Verificar que personajes con baja percepción caen en la trampa.
3.  Verificar que personajes con alta percepción la detectan.
4.  Verificar persistencia del estado (volver a una sala ya visitada).

---

## 6. Consideraciones Futuras
*   **Iluminación:** En el futuro, cruzar esto con si los personajes llevan antorchas o tienen visión en la oscuridad.
*   **Sigilo:** Permitir modo "Sigilo" que reduce la velocidad de movimiento pero permite tirar Sigilo contra la Percepción Pasiva de los enemigos.
