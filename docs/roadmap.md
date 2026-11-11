# Roadmap y Control de Issues Completo

Este documento centraliza toda la planificación futura, características pendientes e issues identificados en el proyecto, organizados por prioridad para evitar la pérdida de cualquier tarea. Cada tarea cuenta con un identificador permanente (`[TASK-XXX]`) para facilitar su trazabilidad en commits, branches y conversaciones.

---

## 🧭 Hoja de Ruta a Corto Plazo: Estabilización (≈ 6 semanas, desde 2026-11-11)

> **Objetivo principal:** que el juego sea **fiable antes de crecer**, y poder demostrarlo con pruebas automáticas.
>
> **Hito de salida:** jugar *La caza de la oveja salvaje* completa y las 3 primeras localizaciones de *El Dragón del Pico Agujahelada* **sin escribir código específico de ninguna aventura**.
>
> **Congelado hasta superar el hito:** voz/TTS, música y mecánicas nuevas (ranuras de conjuro, comercio, niveles, acciones compuestas).
>
> **El conversor PDF → JSON es primordial:** los JSON de aventura son su producto, así que los fallos de datos se corrigen en el conversor (y en el validador de TASK-015) y se regenera la aventura, no se parchea el JSON a mano. Los escenarios de la Fase 1 demostraron que el hito está **bloqueado por los datos** (TASK-084 y TASK-085), así que esos arreglos del conversor forman parte de este plan.
>
> **Cómo se trabaja:** una rama por tarea; antes del merge a `main` pasan en local `tsc`, los tests y los escenarios; merge directo sin PR y la CI de `main` en verde tras el push (ver [Normas de Trabajo](./normas-de-trabajo.md)). Revisión al final de cada fase para decidir si seguir o reordenar.

### Fase 0 — Higiene del repositorio (1–2 días)
- [x] **[TASK-066] Ordenar el trabajo sin commitear** en commits temáticos (rama `chore/fase-0-higiene`).
- [x] **[TASK-067] Build estricto:** eliminado `ignoreBuildErrors` de `next.config.ts`; `next build` pasa con comprobación de tipos. *Pendiente:* activar ESLint en el build cuando exista configuración de ESLint.
- [x] **[TASK-068] Integración continua:** GitHub Actions con `tsc --noEmit` y `vitest run --maxWorkers=4`; si está en rojo, no se hace merge. Declarado `uuid` y eliminado `chart.tsx` sin uso (con su declaración falsa de `recharts`) para que `npm ci` sea reproducible.
- [x] **[TASK-069] Limpieza de ficheros:** eliminado `input.json`; documentado el uso de `knowledge/dnd-local.db` como semilla/caché versionada.
- [x] **[TASK-070] Normas de trabajo documentadas** en [`docs/normas-de-trabajo.md`](./normas-de-trabajo.md).

### Fase 1 — Banco de pruebas narrativo (semanas 1–2) ⭐ *prioridad principal*
- [x] **[TASK-071] Escenarios de referencia:** cinco escenarios de la aventura de la oveja (`oveja-01-encuentro`, `oveja-02-pergamino`, `oveja-03-guz-aparece`, `oveja-04-combate-guz`, `oveja-05-viaje-torre`), con estados iniciales tipo "partida guardada" y registro de problemas conocidos enlazados a su tarea. Criterios de "turno correcto" validados con el usuario el 2026-11-11. Se eliminó la conversión duplicada `la-persecucion-de-la-oveja-salvaje` (menos completa que `la-caza-de-la-oveja-salvaje`). *Corregido de paso:* `MoveFailed` no llegaba al narrador y "acercarse" a algo de la sala contaba como viaje fallido.
- [x] **[TASK-072] Comprobaciones de estado** tras cada paso (inventario, flags, localización, tiradas) mediante el cliente simulado de `tests/scenarios/harness/`.
- [x] **[TASK-073] Comprobaciones de texto:** invariantes en todos los turnos (sin spoilers declarados en la aventura, sin restos técnicos, sin errores), coherencia narración-tirada en el escenario del pergamino, y CD en la narración como aviso mientras TASK-007 siga abierta.
- [x] **[TASK-074] Modo grabado y modo en vivo:** `npm run test:scenarios` (replay, en la CI), `test:scenarios:record` y `test:scenarios:live`, con llamadas a la IA y latencia por turno en el informe.

### 🔁 Rediseño del núcleo (decidido el 2026-11-11)
Tras dos pruebas manuales, el usuario decidió **rehacer el núcleo del turno** en lugar de seguir parcheándolo, con un principio rector: **el PDF original es la verdad absoluta** y cada test se contrasta con él. El diseño está en [`docs/nucleo-v2.md`](./nucleo-v2.md) (pendiente de validar). Las Fases 2–4 de abajo se reorganizan en los pasos A–F de ese documento; sus tareas siguen siendo válidas como requisitos del núcleo nuevo.
- [ ] **[TASK-093] Escenarios basados en el PDF:** reescribir los escenarios de la oveja escena a escena, citando el pasaje del PDF en cada expectativa. *Detectado:* `oveja-02-pergamino` exige una tirada de Arcanos para leer el pergamino, pero el PDF dice que basta con leerlo en voz alta y que el sello indica qué es.
- [ ] **[TASK-094] Arreglos de la segunda prueba manual:** rama `fix/conjuro-persistente` (sin merge): regrabar `oveja-02` y `oveja-03` y grabar `oveja-06` cuando haya cuota de IA.
- [ ] **[TASK-095] Núcleo v2:** pasos B–F de [`docs/nucleo-v2.md`](./nucleo-v2.md).

### Fase 2 — Un solo flujo de juego (semanas 2–3)
- [ ] **[TASK-075] Unificar coordinadores:** `gameCoordinatorFlow` pasa a ser un envoltorio de `gameStreamCoordinator`.
- [ ] **[TASK-076] No perder estado al entrar en combate:** el combate debe arrancar con el grupo y el `worldState` ya actualizados por el turno narrativo (y con los enemigos de la sala de destino).
- [ ] **[TASK-077] Invalidación genérica de la caché de aventura activa:** que funcione con cualquier aventura, no solo con la del Dragón.
- [ ] **[TASK-088] Participantes del combate decididos por código:** hoy `combatInitiationExpertTool` (IA) mete a la oveja aliada en la iniciativa. Los combatientes deben salir de la disposición/hostilidad de las entidades, no de una recomendación del modelo. *Escenario:* `oveja-04-combate-guz`.
- [ ] **[TASK-089] Error en el turno de Elara:** `Cannot read properties of undefined (reading 'split')` en `TurnProcessor`; se muestra "Hubo un error al procesar el turno" al jugador y un turno automático no produce mensaje. *Escenario:* `oveja-04-combate-guz`.
- [ ] **[TASK-090] Objetivo no resuelto al volver a atacar:** "Vuelvo a atacar a Guz" devuelve `TARGET_NOT_FOUND`, que además se muestra en bruto como narración del DM. *Escenario:* `oveja-04-combate-guz`.
- [ ] **[TASK-091] Estadísticas de combate de la aventura ignoradas:** al iniciar el combate se buscan las de "Guz" en la API de D&D y en la IA (que devuelve las de un Ghoul, rechazadas por el esquema) aunque el JSON ya trae sus estadísticas.

### Fase 3 — Que la Capa 2 sea de verdad la que decide (semanas 3–5)
- [ ] **[TASK-078] Acciones tipadas:** el intérprete devuelve una unión discriminada de acciones (`take`, `use_item`, `rest`, `open`, `give`…) con IDs reales de la aventura.
- [ ] **[TASK-079] Reglas sin regex sobre el texto del jugador:** los módulos de reglas trabajan solo sobre acciones tipadas (fuera "abr", "descans", "pergamino"…).
- [ ] **[TASK-080] Todo lo específico de una aventura, en datos:** p. ej. pergaminos genéricos con campo `spellEffect` en el JSON en lugar de 3 conjuros fijos. Enlaza con [TASK-015].
- [ ] **[TASK-081] De prompt a código:** cada norma tipo "PROHIBIDO…" eliminada de un prompt se sustituye por código y por un test o escenario que la cubra. *Caso detectado:* aunque el narrador recibe la directiva de `MoveFailed`, el modelo narra igualmente que el grupo sale de la plaza (`oveja-05-viaje-torre`).
- [ ] **[TASK-084] ⛔ Eventos de la historia que cambian el estado (bloquea el hito):** los flags de presencia (`guz_aparece`, `guz_persigue_a_torre`, `oso_en_retrete`, `noke_*`) no los activa nada: el `storyline` solo lo lee el prompt del director, que puede *narrar* la llegada de Guz sin que entre en escena. Hace falta que el conversor genere disparadores explícitos (evento → flags) y que la Capa 2 los evalúe. *Escenario:* `oveja-03-guz-aparece`.
- [ ] **[TASK-085] ⛔ Conversor: mapa completo y estable (bloquea el hito):** en la aventura de la oveja no hay conexiones más allá de `la-casa-en-el-bosque` (la torre y sus plataformas son inalcanzables); sobra la localización genérica `ciudad-inicial` (el conversor actual ya no la genera desde bf893de; desaparecerá al regenerar, y el juego ya no empieza en ella porque lee `settings.startingLocationId`); y el `adventureId` depende de cómo se traduzca el título ("Chase" → caza/persecución), lo que generó dos versiones de la misma aventura. Corregir en `scripts/pdf-to-json.ts`, validar con TASK-015 y regenerar. *Escenario:* `oveja-05-viaje-torre`.
- [ ] **[TASK-086] Conversor: generar `roleplay.hiddenIdentityTerms`:** hoy esos términos de spoiler se añadieron a mano al JSON de la oveja; deben salir del conversor (identidades ocultas, antagonistas, artefactos clave).
- [ ] **[TASK-087] Nombres de clase con género:** las listas de clases de `scroll-rules.ts` no reconocen "Clériga" (Elara) ni otras variantes femeninas; normalizar la clase antes de compararla.

### Fase 4 — Menos llamadas a la IA por turno (semanas 5–6)
- [ ] **[TASK-082] Medir y recortar a ≤ 3 llamadas por turno:** integrar el router en el intérprete, generar las reacciones de los compañeros en la misma llamada que la narración (u opcionales) y reservar el director para escenas clave.
- [ ] **[TASK-083] Revisar el plugin de Groq** (rotación, límite de tokens) una vez reducidas las llamadas: simplificarlo o mantenerlo según los datos. *Detectado:* la compactación recorta el centro de los prompts (`...[context compacted]...`), así que el modelo puede perder instrucciones o contexto.
- [ ] **[TASK-092] Markdown → HTML sin IA:** cada turno hace una llamada al modelo solo para convertir la narración de Markdown a HTML; se puede hacer con código, sin coste ni latencia.

> **Datos de partida medidos por los escenarios (2026-11-11, `groq/qwen/qwen3.8-27b`):** entre 3 y 14 llamadas a la IA por turno, con turnos de hasta 45 s.

---

## 🔴 Prioridad Muy Alta (Críticos y Bloqueantes)

### Características Clave:
- **[TASK-015] Herramienta de Sanitización de Aventuras JSON:** Crear un script CLI para validar y actualizar archivos JSON de aventuras antiguos a los nuevos esquemas Zod (inyección de campos de FSM, luces, trampas, etc.).
- **[TASK-016] Sistema de Etiquetado Global de Entidades (Fase 5):** Diseñar e implementar un sistema de etiquetado en el `worldState` de las aventuras bajo cuatro ejes clave (Epistémico, Perceptivo, Físico y Operativo), destacando las etiquetas `unrevealed` y `revealed` para gobernar la "niebla de guerra". Esto permitirá que el DM conozca de antemano la ubicación de secretos y trampas para arbitrar e introducir pistas contextuales, impidiendo estrictamente su revelación prematura hasta que el jugador realice la acción desencadenante.

---

## 🔴 Prioridad Alta (Mejoras Core y UX)

### Sistema de Combate y Reglas:
- **[TASK-003] [COMPLETADO] Revisión del Sistema de Tiradas de Skill Checks:** Ajustadas las comprobaciones automáticas en `ActionInterpreter` para clasificar preguntas abiertas o informativas ("¿Quién eres?", "¿Quién te persigue?") y la recogida de objetos ofrecidos como interacción pura y nunca como `skill_check`. Se impuso además un anclaje estricto en `SkillCheckExpert` para evitar inventar guardias o escenarios ajenos en el razonamiento de las tiradas. *(Origen: Ideas Rápidas)*
- **[TASK-006] / [TASK-019] Tiradas de Habilidad Grupales (Group Checks):** Implementar tiradas colectivas de la party (ej. Sigilo grupal) donde el éxito de la mitad del grupo decida el resultado, corrigiendo el problema actual donde solo el personaje activo efectúa la tirada ante acciones declaradas para todo el grupo. *(Origen: Ideas Rápidas / Core)*
- **[TASK-017] Visualización de Acciones Disponibles:** Mostrar gráficamente en la interfaz las acciones principales, bonus actions, reacciones y movimiento restantes del personaje activo en su turno.
- **[TASK-018] Múltiples Acciones en Turno de Jugador:** Permitir realizar movimiento y acciones adicionales antes de que el turno pase obligatoriamente (reemplazar auto-avance por paso manual / fin de turno explícito).
- **[TASK-020] Compañeros Agénticos Avanzados:** Dar proactividad a la IA de los compañeros para solicitar o realizar tiradas de habilidad automáticas basadas en su percepción y el peligro detectado.
- **[TASK-021] Revisión del sistema de movimiento en salas en modo exploración:** Analizar y diseñar un sistema de foco de proximidad dinámico (`focusedTargetId` / `proximityFocus`) o puntos de interés (POIs) dentro de una localización para evitar la transición inmediata a la siguiente sala cuando el jugador declara "ir hacia" una puerta o verja, distinguiendo entre acercarse a interactuar y cruzar de habitación.
- **[TASK-022] Soporte de Acciones Secuenciales/Compuestas:** Permitir al `ActionInterpreter` identificar y devolver un array de acciones ordenadas a realizar en un solo turno (ej: coger una llave de un cofre y seguidamente intentar abrir la verja) y ejecutar secuencialmente cada una de ellas actualizando el estado de la party entre pasos en el motor de reglas.

### IA y Narrativa (Inmersión y Metajuego):
- **[TASK-004] Gestión de Conocimiento Prematuro del Jugador:** Diseñar e implementar el control para situaciones donde el jugador describe o interactúa con cosas/localizaciones que su personaje no debería conocer todavía al inicio de la aventura (metajuego). *(Origen: Ideas Rápidas)*
- **[TASK-007] Ocultación de Detalles Mecánicos en Narración del DM:** Evitar que el DM mencione explícitamente clases de dificultad numéricas (CD) o mecánicas internas en su narración (ej. "Para abrirla, tendréis que intentar forzar la cerradura (Juego de Manos CD 15)..."), reservando estos datos solo si el jugador pregunta o si es estrictamente necesario para la escena. *(Origen: Ideas Rápidas)*

### Interfaz y Fichas:
- **[TASK-012] Visualización Gráfica No Numérica del Daño:** Desarrollar una representación visual de la salud de los combatientes en el orden de combate (ej. tinte de color de nombre de blanco -> rosa -> rojo -> marrón -> negro -> tachado al morir) para actuar como pista intuitiva sin exponer puntos de vida numéricos exactos. *(Origen: Ideas Rápidas)*
- **[TASK-044] [COMPLETADO] Sistema Visual de Estados y Efectos Activos (`activeEffects`):** Implementado `CharacterEffectSchema` en `CharacterSchema`, catálogo de efectos en `effect-utils.ts` e indicadores visuales en `PartyPanel` y `CharacterSheet` para mostrar en tiempo real qué conjuros o estados (ej. *Hablar con los Animales*) tiene activos cada miembro del grupo, diferenciando claramente entre identificar un pergamino y tener su efecto activo.
- **[TASK-013] Restricción de Envío de Mensajes en Selección de Personajes:** Asegurar que la selección de un personaje en la UI sirva exclusivamente para consultar su ficha; los mensajes enviados por el chat siempre deben corresponder al personaje controlado por el jugador, impidiendo enviar mensajes en nombre de compañeros IA. *(Origen: Ideas Rápidas)*
- **[TASK-023] Modos de Juego Diferenciados:** Adaptar explícitamente las reglas y acciones de interfaz según el modo activo: Exploración (movimiento por salas), Combate (turnos tácticos) o Interacción Social (diálogos).

### Estabilidad y RAG:
- **[TASK-010] Verificación Temprana de Libros de Reglas:** Validar la disponibilidad y carga automática de los libros de reglas al iniciar la partida en lugar de a mitad de la sesión, evitando pausas o latencias prolongadas durante el juego. *(Origen: Ideas Rápidas)*

---

## 🟡 Prioridad Media (Mecánicas de Juego y Sistemas de IA)

### IA y Narrativa:
- **[TASK-008] [COMPLETADO] Omisión de Narraciones Redundantes en Acciones Simples:** Se forzó un límite de 1-2 frases concisas (máximo 40 palabras) en acciones físicas cotidianas (recoger objetos, abrir puertas) y se erradicó la meta-narración en `ExplorationExpert` y `NarrativeTurnManager` (prohibición de frases como *"permanece inactivo"*, *"sin emitir brillos de magia"* o *"queda registrado en su inventario"*). *(Origen: Ideas Rápidas)*
- **[TASK-024] Filtro de Diálogos Textuales del DM:** Evitar que el DM narre entre comillas las frases exactas de los compañeros cuando estos tienen su propio canal/burbuja de voz activa en el chat.
- **[TASK-025] Sistema de Influencia y Actitud de PNJs:** Guardar y persistir el estado de actitud de los PNJs (amistoso, neutral, hostil) influenciado por las interacciones del jugador y tiradas de persuasión/engaño.

### Interfaz y UX:
- **[TASK-014] Modal/Panel Dedicado para Consultas Fuera de Personaje (OOC):** Replantear las consultas OOC (mensajes con `//`) para presentarlas en un modal o ventana dedicada (fichas, reglas, aclaraciones) evitando sobrecargar el historial del chat principal. *(Origen: Ideas Rápidas)*

### 🔮 Sistema de Magia y Conjuros (D&D 5e):

#### ⚔️ Magia en Combate
- **[TASK-026] Resolución Matemática de Conjuros y Curaciones (`resolveSpell` / `resolveHeal`):** Desarrollar la lógica en `CombatActionResolver` para calcular de manera formal las tiradas mágicas ofensivas y curativas utilizando las características reales del lanzador (modificador de aptitud mágica + competencia), sustituyendo el parche temporal.
- **[TASK-027] Sistema de Saving Throws Completo:** Implementar tirada de salvación del objetivo (1d20 + modificador vs Spell Save DC del lanzador) con aplicación de daño completo o mitad según el resultado del conjuro.
- **[TASK-028] Límites de Lanzamiento (Spell Slots):** Controlar y descontar las ranuras de conjuro disponibles por nivel de los personajes, evitando que se lancen hechizos de nivel sin recursos.

#### 📜 Magia Fuera de Combate y Utilidad
- **[TASK-029] Registro de Efectos y Duración de Estados Mágicos:** Crear un sistema para registrar y persistir efectos temporales activos (ej: *Hablar con los animales* o *Invisibilidad*) en el `worldState`, manteniendo un contador de turnos/tiempo para que el DM arbitre congruentemente y la UI muestre el estado activo.

### Mecánicas de Rol (D&D 5e):
- **[TASK-002] Diferenciación entre Inventario (Mochila) y Equipamiento Equipado:** Distinguir explícitamente entre el inventario general y los ítems equipados activamente (armaduras puestas, armas en mano, accesorios), calculando automáticamente su repercusión en la Clase de Armadura (CA) y tiradas. *(Origen: Ideas Rápidas)*
- **[TASK-030] Sistema de Progresión y Niveles:** Implementar la ganancia de experiencia (XP) y subida de nivel de 1 a 5 con aumento de estadísticas de personaje.
- **[TASK-031] Sistema de Comercio y Tiendas:** Compras, ventas, regateos y dinero dinámico en bazares integrados mecánicamente.
- **[TASK-032] Depósito de Objetos en Contenedores (Fase 4):** Extender `InventoryRuleModule` para soportar acciones de tipo `drop` con destino a interactuables de tipo contenedor (ej: *"meto la llave en el cofre"*). En lugar de tirar el ítem al suelo (`droppedItems`), se debe descontar del inventario del PJ y agregar al array `items` del contenedor correspondiente en el `worldState`.
- **[TASK-033] Gestión Física y Deducción de Oro (Fase 4):** Implementar lógica en el motor de reglas para descontar oro dinámicamente de la ficha de personaje cuando el jugador realiza transacciones, decide depositar monedas en cofres o soltarlas (ej: *"dejo 20 monedas de oro en el cofre"*), previniendo que la acción solo sea un adorno narrativo de la IA y no afecte a las estadísticas reales.
- **[TASK-034] Sistema de Death Saving Throws y Revivencia:** Reglas de tiradas de salvación contra la muerte cuando un PJ cae a 0 HP.
- **[TASK-035] Sistema de Estados y Condiciones:** Soporte técnico y visual para estados como envenenado, bendecido, paralizado, aturdido, etc., y su impacto en las tiradas.
- **[TASK-036] Sistema de Foco de Objetivo:** Táctica inteligente de la IA enemiga para priorizar objetivos según distancia o nivel de HP.
- **[TASK-037] Hidratación de Entidades por Herencia (Data Hydration):** Permitir herencia de monstruos a partir de plantillas base en JSON para reducir el tamaño de las aventuras.
- **[TASK-038] Refactorización de Combate a Event-Driven Híbrido:** Migrar la resolución de turnos y acciones dentro del combate para usar el `EventDispatcher` y esquemas de `GameEvents`. Se mantendrá el FSM (`CombatSession`) para gobernar el ritmo de turnos, pero las acciones físicas, ataques y hechizos se procesarán reactivamente emitiendo y escuchando eventos, facilitando un log preciso para el narrador.

### Estabilidad y RAG:
- **[TASK-039] Sistema de Testing de Integración y E2E:** Ampliar la cobertura de pruebas a flujos completos del navegador usando Playwright.

---

## 🟢 Prioridad Baja (Calidad de Vida y Extras)

- **[TASK-001] Selección de Presets de Party al Iniciar Partida:** Permitir la elección de configuraciones y grupos de personajes preestablecidos al momento de comenzar una nueva partida. *(Origen: Ideas Rápidas)*
- **[TASK-005] Flechas de Navegación Lateral en Ficha de Personaje:** Incorporar controles laterales en el encabezado de la ficha de personaje para conmutar ágilmente entre los miembros del grupo. *(Origen: Ideas Rápidas)*
- **[TASK-009] Barra de Mensajes de Sistema en Tiempo Real:** Reemplazar el aviso estático del input por una barra de sistema dinámica que informe del estado del juego y motor de IA, moviendo la ayuda de comandos a un tooltip contextual. *(Origen: Ideas Rápidas)*
- **[TASK-011] Configuraciones de Voz Personalizadas por Personaje:** Permitir parametrizar perfiles y voces sintéticas independientes para cada héroe y PNJ desde sus fichas. *(Origen: Ideas Rápidas)*
- **[TASK-040] Historial de Comandos en Input:** Permitir recuperar las últimas acciones enviadas al chat usando las flechas arriba/abajo del teclado.
- **[TASK-041] Optimización y Escalabilidad del Motor de Reglas (GameRulesEngine):** Evolucionar el motor de reglas secuencial para soportar prioridades de ejecución (`priority`), mapeo indexado por tipo de acción (`actionType`) para evitar evaluar todos los módulos de forma plana, y carga dinámica de módulos por aventura para asegurar un escalado limpio ante docenas de reglas nuevas.
- **[TASK-042] Audio Dinámico Avanzado:** Colores de tirada específicos (ej. verde para curación) y un botón de toggle de pausa durante el avance automático de turnos.
- **[TASK-043] Personajes Predefinidos:** Soporte para que las aventuras JSON empaqueten personajes predefinidos con niveles específicos.
- **[TASK-044] Guardado Automático de Partidas:** Guardado incremental automático cada cierto número de turnos.
- **[TASK-045] Comandos de Voz:** Integración de Speech-to-Text para dictar acciones al DM.
- **[TASK-046] Automatización del Versionado:** Integración de herramientas para automatizar el changelog y el versionado semántico desde los commits.

---

## ✅ Tareas Completadas

Esta sección centraliza las iniciativas y tareas del roadmap que han sido finalizadas con éxito, manteniendo su ID permanente para auditoría y trazabilidad histórica. El histórico completo y detallado de versiones anteriores puede consultarse también en [`docs/roadmap-historico.md`](./roadmap-historico.md).

### 💡 Ideas Rápidas Finalizadas:
- **[TASK-047] [COMPLETADO en v0.6.1] Desactivar los comentarios automáticos del compañero que esté activo como personaje seleccionado.** *(Antigua Idea #3)*
- **[TASK-048] [COMPLETADO en v0.6.2] Incluir fichas de monstruos automáticas en el conversor de PDF a JSON:** Inclusión de fichas de monstruos no catalogados durante la conversión para evitar llamadas a la API en medio de la partida. *(Antigua Idea #4)*
- **[TASK-049] [COMPLETADO] Nombres de personajes en el orden de combate:** Corrección para que si no hay duplicados de una entidad (ej. una sola oveja o un solo Guz), no se le añada sufijo numérico al nombre. *(Antigua Idea #16)*

### 🔴 Prioridad Alta Finalizada:
#### Sistema de Conversión y Datos:
- **[TASK-050] [COMPLETADO] Prevención de Spoilers en Narración Inicial y Conversión:** Separación estricta de `summary` (catálogo) e `introductoryNarration` (mesa de rol en segunda persona) en `scripts/pdf-to-json.ts`, con saneamiento de spawns condicionales en el minuto 0 para evitar revelar la trama o entidades antes de tiempo.
- **[TASK-051] [COMPLETADO] Actualización a Gemini 3.5 Flash:** Migración del modelo principal del proyecto en `src/ai/model-config.ts` y Genkit de `gemini-2.5-flash` a `gemini-3.5-flash`, con fallback automático a `gemini-2.5-flash-lite` para evitar caídas por límites diarios de cuota en el Free Tier de Google AI Studio.
- **[TASK-052] [COMPLETADO en v0.6.2] Robustecimiento del Conversor PDF a JSON:** Adaptado el script `scripts/pdf-to-json.ts` para resolver estadísticas y aplicar overrides a monstruos y NPCs, desactivar IA RAG en PNJs únicos, y validar el JSON generado contra el esquema Zod `AdventureDataSchema`.
- **[TASK-053] [COMPLETADO en v0.6.2] Entidades Condicionales Simplificadas:** Integrar el soporte para NPCs con presencia condicional en localizaciones mediante flags de presencia y ausencia (`presenceFlag` y `absenceFlag`), permitiendo que el conversor de PDF a JSON sitúe de forma dinámica y temporal a las criaturas a lo largo del mapa y la Capa 2 (TypeScript) evalúe su presencia física basándose en el estado global del juego.

#### Arquitectura y Flujos de IA:
- **[TASK-054] [COMPLETADO en v0.6.1] Rediseño a Arquitectura Neuro-Simbólica de 3 Capas (Robustez):** Desacoplar completamente la lógica dura del juego de la narración creativa:
  1. *Capa 1 (IA Árbitro):* Un agente interpretativo traduce la acción creativa y libre del jugador a un JSON que propone cambios físicos y mecánicos en el estado.
  2. *Capa 2 (Código TypeScript):* El motor de reglas de TypeScript procesa y valida este JSON, gestionando estados, inventarios, tiradas de dados reales y actualizando la base de datos de forma robusta y determinista, generando un JSON final de "Hechos Absolutos del Turno".
  3. *Capa 3 (IA Narradora/DM):* Un prompt de DM simplificado toma el JSON de Hechos Absolutos del Turno y se limita a vestirlo de gala literaria en prosa evocadora de D&D, previniendo alucinaciones lógicas, double-binds y colapsos de esquema.
- **[TASK-061] [COMPLETADO] Sistema de Gestión de Errores de Proveedores de IA en 3 Capas:**
  1. *Capa 1 (Parsing Universal):* Detección y normalización de errores 429 (TPM/RPM/OTPM), 413 y 503 con extracción de tiempos exactos de espera para Groq y Google AI Studio / Gemini en `ai-error-handler.ts`.
  2. *Capa 2 (Auto-Recuperación y Rotación):* Rotación multi-modelo dinámica en Groq, espera activa automática cuando el cooldown es breve ($\le 15\text{ s}$), compactación de JSON inline y limitación adaptativa de `max_tokens` (700 tokens) para evitar sobrepasar cuotas de salida.
  3. *Capa 3 (UI Diagnóstica y Resiliente):* Evento `ai_provider_error` en streaming y componentes frontend con tarjeta explicativa amigable, cuenta atrás en tiempo real y botón de reintento en un clic.
- **[TASK-062] [COMPLETADO] Acción 'clarify' y Prevención de Acciones Arbitrarias / Erratas:** Integración del tipo `'clarify'` y campo `clarificationQuestion` en `schemas.ts`, `action-interpreter.ts` y coordinadores de flujo. Ante acciones dudosas o con erratas evidentes (ej. *"Caojo el pergamino"*), el DM solicita amigablemente confirmación al jugador sin forzar tiradas de dados ni alterar el estado.
- **[TASK-064] [COMPLETADO] Barrera Estricta de Comunicación Animal y Control de Spoilers:** Imposición de la regla de oro de la bestia en `narrative-manager.ts`, `exploration-expert.ts`, `interaction-expert.ts` y `companion-expert.ts`: ningún animal puede articular palabras en Común ni desvelar nombres propios (*Finethir Shinebright*, *Ahmed Noke*, *Vara de Polimorfia Verdadera*) si `speak_with_animals` no está activo. Sanitización de `presentEntities` y `locationContext` en `companionExpertTool` para evitar metajuego en los compañeros.
- **[TASK-065] [COMPLETADO] Optimización de Tokens de Expertos (Bypass de Director Redundante):** En `narrative-manager.ts`, las acciones clasificadas en un solo experto devuelven directamente su narración sin invocar una segunda llamada de $\sim 4.200\text{ tokens}$ a `narrativeDirectorPrompt`, reduciendo el consumo a la mitad y evitando sobreescrituras con spoilers.

#### Sistema de Combate y Reglas:
- **[TASK-055] [COMPLETADO] Sincronización Bidireccional de WorldState y Reglas de Combate:** Sincronización completa entre `enemiesByLocation` y `worldState.locations[locId].enemies`, activación automática de flags globales de victoria (`<id>_derrotado`) en `combatManagerTool` y `StatsSystem`, y desbloqueo bidireccional de puertas en `SkillCheckSystem`.
- **[TASK-056] [COMPLETADO] Prevención de Doble Ejecución en GameRulesEngine:** Bloqueo de reencolado de eventos en `narrative-turn-manager.ts` cuando la regla intercepta la acción, y emisión de eventos `ItemCollected` en `ScrollRuleModule`.
- **[TASK-057] [COMPLETADO] Alucinaciones del Tactician Enemigo (Acciones inventadas):** Evitar que la IA del tactician enemigo (`enemyTacticianTool`) alucine acciones o armas inexistentes (ej. "Multiataque (Barba y Glaive)" para un Oso Pardo). Implementar que se pasen las acciones disponibles (`availableActions`) directamente en el prompt del tactician o forzarlo a consultar las estadísticas oficiales antes de elegir la acción.
- **[TASK-063] [COMPLETADO] Delegación y Arbitraje de Pergaminos a Compañeros (D&D 5e):** Extensión de `ScrollRuleModule` para soportar acciones compuestas de entrega y orden de lectura en la misma frase (ej. *"Le paso el pergamino a Merryl y le digo: 'Merryl, léelo'"*), transfiriendo el pergamino al inventario del compañero y ejecutando la tirada de Arcanos (CD 10) con las estadísticas del compañero. Control de no-revelación de hechizos ante fallos de tirada.

### 🟡 Prioridad Media Finalizada:
#### 📜 Magia Fuera de Combate y Utilidad:
- **[TASK-058] [COMPLETADO en v0.6.1] Ciclo de Vida y Uso de Pergaminos Mágicos:** Integrar con el inventario físico el uso de consumibles mágicos (restar el pergamino al activarlo, validar si el personaje tiene la habilidad de usarlo y realizar la transferencia correcta entre mochilas de compañeros sin duplicidades).

#### Mecánicas de Rol (D&D 5e):
- **[TASK-059] [COMPLETADO en v0.6.1] Unificación de Inventarios Iniciales:** Homologar los inventarios de las fichas iniciales de personajes para que utilicen exactamente los mismos IDs y estructuras estándar sincronizadas con `adventureData.items` (ej: evitar IDs genéricos y resolver sinónimos semánticos de forma genérica).
- **[TASK-060] [COMPLETADO en v0.6.1] Mapeo de Sinónimos de Inventario Personal:** Añadir reglas específicas en los prompts de los expertos conversacionales de la IA para que apliquen la misma tabla de sinónimos a las pertenencias de los personajes (ej: comprender que si el jugador pregunta por *"la llave"*, Merryl la tiene porque su ficha indica `llave-calabozo` o `key_1`).
