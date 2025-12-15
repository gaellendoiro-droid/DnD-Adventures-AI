# Issues Pendientes

> ⚠️ **IMPORTANTE:** Cada vez que se modifique este archivo (añadir, mover o actualizar issues), **debe actualizarse también el [README.md](./README.md)** de esta carpeta con las estadísticas y enlaces actualizados.

> ✅ **NOTA:** Si un issue se completa o resuelve, **debe moverse al archivo [corregidos.md](./corregidos.md)**. Este archivo (`pendientes.md`) solo debe contener issues que aún están pendientes de resolver.

---

Issues que aún no han sido resueltos y requieren atención. Ordenados por prioridad (PMA → PA → PM → PB → PMB).

**Total:** 10 issues  
**Última actualización:** 2025-01-27 (Issue #33 eliminado - ya no relevante)

---

## 🔴 Prioridad Muy Alta (PMA) - Críticos

> No hay issues críticos pendientes actualmente.

### Issue #132: Errores de Quota Exceeded (ElevenLabs/Gemini) 🔴 CRÍTICO

- **Fecha de creación:** 2025-01-28
- **Origen:** Notas de Gael #2
- **Severidad:** 🔴 **CRÍTICA** (Bloquea el funcionamiento del juego)
- **Descripción:** El sistema falla cuando se exceden las cuotas de las APIs de Eleven Labs o Gemini, causando interrupciones en la partida.
- **Problema:**
  - Falta de manejo robusto de errores de "quota exceeded".
  - El juego puede quedarse colgado o mostrar errores técnicos al usuario.
- **Solución propuesta:**
  - Implementar capturas de error específicas para errores 429/QuotaExceeded.
  - Implementar fallback automático (ej: texto sin voz si ElevenLabs falla, modelo menor si Gemini pro falla).
  - Mostrar mensajes de error amigables al usuario ("El narrador está descansando la voz...").
- **Estado:** 📝 **PENDIENTE**

### Issue #134: Cálculo Incorrecto de Daño Crítico 🔴 CRÍTICO

- **Fecha de creación:** 2025-01-28
- **Origen:** Notas de Gael #5
- **Severidad:** 🔴 **CRÍTICA** (Afecta reglas core del juego)
- **Descripción:** Los golpes críticos no parecen estar duplicando los dados de daño correctamente, al menos notado con Merryl.
- **Problema:**
  - El cálculo de daño en críticos debería tirar el doble de dados (o duplicar el resultado de los dados, según regla de casa, pero por defecto es doble dados).
  - Actualmente parece aplicar daño normal.
- **Solución propuesta:**
  - Revisar `DiceEngine` y la lógica de resolución de ataque crítico.
  - Asegurar que se aplique la regla correcta (doblar número de dados de daño).
- **Estado:** 📝 **PENDIENTE**

### Issue #136: Refactorización Sistema de Combate - Fase 3 (Narrative Turn Manager) 🔴 DEUDA TÉCNICA

- **Fecha de creación:** 2025-01-28
- **Origen:** Notas de Gael #7
- **Severidad:** 🔴 **MUY ALTA** (Mantenibilidad y Estabilidad)
- **Descripción:** Completar la refactorización del sistema de combate, específicamente la división y limpieza de `narrative-turn-manager.ts` que quedó pendiente tras la modularización de la FSM.
- **Estado:** 📝 **PENDIENTE**

## 🟡 Prioridad Alta (PA) - Advertencias

> No hay issues de prioridad alta pendientes actualmente.

### Issue #131: Inconsistencia de Género en Narración del DM (Merryl) 🟡 BUG

- **Fecha de creación:** 2025-01-28
- **Origen:** Notas de Gael #1
- **Severidad:** 🟡 **ALTA** (Inmersión)
- **Descripción:** El DM se refiere a Merryl en femenino cuando su ficha indica que es varón.
- **Solución propuesta:**
  - Revisar el prompt de sistema del DM (`narrative-manager.ts` o `game-coordinator.ts`) para asegurar que recibe y respeta el género de los personajes.
  - Verificar la ficha de Merryl para asegurar que el campo de género es claro.
- **Estado:** 📝 **PENDIENTE**

### Issue #133: Revisión y Ajuste de Archivos de Audio 🟡 UX

- **Fecha de creación:** 2025-01-28
- **Origen:** Notas de Gael #3
- **Severidad:** 🟡 **ALTA** (Calidad de producto)
- **Descripción:** Revisar y ajustar los archivos de audio (música y ambiente) para asegurar coherencia y calidad con el nuevo sistema de audio dinámico.
- **Estado:** 📝 **PENDIENTE**

### Issue #135: Revisión de Logs para Claridad 🟡 DX

- **Fecha de creación:** 2025-01-28
- **Origen:** Notas de Gael #6
- **Severidad:** 🟡 **ALTA** (Desarrollo/Debugging)
- **Descripción:** El sistema de logs necesita ser más claro. Las etiquetas (INFO, DEBUG) deberían ir seguidas inmediatamente del nombre del módulo responsable.
- **Solución propuesta:**
  - Estandarizar el formato de logs: `[LEVEL] [Module] Message`.
  - Revisar `logger.ts` o utilidades de log.
- **Estado:** 📝 **PENDIENTE**

### Issue #138: Optimización de Latencia DM (Streaming/Keep-Alive) 🟡 UX

- **Fecha de creación:** 2025-01-28
- **Origen:** Notas de Gael #9
- **Severidad:** 🟡 **ALTA** (Experiencia de Usuario)
- **Descripción:** Las respuestas del DM se sienten lentas.
- **Solución propuesta:**
  - Estudiar mantener conexión abierta con API (si no se hace ya con la mejora 1.2).
  - Implementar respuesta en streaming para que el usuario lea mientras se genera.
- **Estado:** 📝 **PENDIENTE**

---


## 🟢 Prioridad Media (PM) - Mejoras

### Issue #116: DM narra palabras textuales de compañeros cuando tienen su propia voz 🟢 MEJORA

- **Fecha de creación:** 2025-01-20
- **Ubicación:** `src/ai/flows/game-coordinator.ts`, `src/ai/flows/narrative-manager.ts`, `src/ai/tools/companion-expert.ts`
- **Severidad:** 🟢 **MEDIA** (afecta calidad narrativa y coherencia del sistema de mensajes)
- **Descripción:** El DM a veces narra lo que dice algún compañero cuando los compañeros tienen su propia voz en el chat. El DM no debe narrar sus palabras textuales, ya que los compañeros generan sus propios mensajes directamente en el chat.
- **Problema:**
  - Los compañeros generan sus propios mensajes a través de `companionExpertTool` que aparecen directamente en el chat con su propia voz
  - El DM está narrando las palabras textuales de los compañeros en sus narraciones, creando duplicación y confusión
  - Falta coordinación entre el sistema de narración del DM y el sistema de mensajes de los compañeros
  - El DM debería narrar acciones y contexto, no repetir lo que los compañeros ya dijeron
- **Comportamiento actual:**
  - Los compañeros generan mensajes (ej: "Elara dice: '¡Cuidado, hay un goblin!'")
  - El DM luego narra: "Elara te advierte: '¡Cuidado, hay un goblin!'" (duplicación)
- **Comportamiento esperado:**
  - Los compañeros generan sus mensajes directamente en el chat con su propia voz
  - El DM narra el contexto y las acciones, pero NO repite las palabras textuales de los compañeros
  - El DM puede referenciar que un compañero habló (ej: "Elara te advierte sobre el peligro") sin citar sus palabras exactas
  - Coordinación clara: el DM debe saber qué compañeros ya hablaron para no duplicar su contenido
- **Impacto:** Medio - Afecta la calidad narrativa, crea duplicación de contenido y confusión sobre quién está hablando
- **Solución propuesta:**
  - **Fase 1:** Estudiar el flujo actual de coordinación entre `game-coordinator.ts`, `narrative-manager.ts` y `companion-expert.ts`
  - **Fase 2:** Identificar dónde el DM está recibiendo información sobre lo que dijeron los compañeros
  - **Fase 3:** Modificar el prompt del `narrativeExpert` para que:
    - No narre las palabras textuales de los compañeros
    - Solo referencie que un compañero habló sin citar sus palabras exactas
    - Se enfoque en narrar acciones, contexto y consecuencias, no diálogos directos
  - **Fase 4:** Asegurar que el contexto pasado al DM incluya información sobre qué compañeros hablaron, pero no sus palabras exactas
  - **Fase 5:** Testing para verificar que no hay duplicación y que la coordinación es clara
- **Archivos afectados:**
  - `src/ai/flows/game-coordinator.ts` (coordinación entre compañeros y DM)
  - `src/ai/flows/narrative-manager.ts` (prompt del narrativeExpert)
  - `src/ai/tools/companion-expert.ts` (generación de mensajes de compañeros)
- **Estado:** 📝 **PENDIENTE**
- **Prioridad:** Media (mejora calidad narrativa, no bloqueador)
- **Relacionado con:**
  - Issue #94 (Refactorización de Prompts de Tacticians) - Similar problema de coordinación narrativa
  - Roadmap - Sección 9 "Narración Unificada para Todos los Turnos"
- **Detección:** Observado durante gameplay manual - duplicación de contenido entre mensajes de compañeros y narraciones del DM

---


---



---



### Issue #80: Permitir múltiples acciones del jugador en un turno (movimiento/acción adicional) 🟢 MEJORA

- **Fecha de creación:** 2025-11-17
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/components/game/game-view.tsx`
- **Severidad:** 🟢 **MEDIA** (mejora UX; actualmente el turno se consume automáticamente tras una acción)
- **Descripción:** Tras implementar el auto-avance del turno del jugador (Issue #78), cualquier acción consume el turno inmediatamente. A futuro se necesitará permitir que el jugador realice acciones adicionales (movimiento, acción adicional, interacción) antes de pasar turno.
- **Comportamiento esperado:** El jugador debería poder realizar su acción principal, luego decidir si quiere moverse o usar una acción adicional, y finalmente pulsar “Pasar 1 Turno” para entregar el turno. El sistema debe llevar un registro claro de si la acción principal ya se consumió y qué acciones secundarias quedan disponibles.
- **Impacto:** Medio – No bloquea el gameplay actual, pero limita la profundidad táctica y futuras mecánicas.
- **Solución propuesta:**
  - Añadir flags de “acción principal consumida”, “movimiento disponible”, etc.
  - Solo auto-avanzar si el jugador ya marcó explícitamente que terminó (botón “Pasar 1 Turno”) o si consumió todas las acciones disponibles.
  - Adaptar la UI para mostrar el estado de acciones restante.
- **Estado:** 📝 **PENDIENTE (Mejora futura)**
- **Detección:** Discusión tras corregir el Issue #78 (2025-11-17).

---



---



### Issue #22: Sistema completo de Saving Throws (tiradas de salvación del objetivo) 🟡 FEATURE INCOMPLETA

- **Fecha de creación:** 2025-11-13
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`
- **Severidad:** Media (feature incompleta)
- **Descripción:** Los saving throw spells funcionan pero de forma simplificada. El daño se aplica automáticamente sin simular la tirada de salvación del objetivo (1d20+bonus vs Spell Save DC) ni aplicar la regla de mitad de daño si el target acierta.
- **Problema:**
  - Sistema actual funcional pero no 100% fiel a D&D 5e
  - Falta cálculo de Spell Save DC del lanzador
  - Falta tirada de salvación del objetivo
  - Falta regla de mitad de daño si acierta
- **Impacto:** Medio (afecta fidelidad a reglas de D&D 5e)
- **Solución propuesta:**
  - PASO 1: Lanzador declara hechizo → Target específico
  - PASO 2: Sistema calcula Spell Save DC del lanzador
  - PASO 3: Target tira salvación (automática, generada por el sistema)
  - PASO 4: Comparar resultado vs DC
  - PASO 5: Mostrar en panel de Tiradas con información completa
  - PASO 6: Aplicar daño completo o mitad según resultado
- **Prioridad:** Media
- **Estimación:** 9-12 horas
- **Estado:** 📝 Pendiente (feature incompleta, implementar después del refactoring de `combat-manager.ts`)


## ⚪ Prioridad Baja (PB) - Mejoras menores

### Issue #31: Gestión de ataques múltiples en combate 🟢 MEJORA

- **Fecha de creación:** 2025-11-14
- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`
- **Severidad:** 🟢 **BAJA** (funcionalidad incompleta)
- **Descripción:** Algunos enemigos (como la mantícora) tienen múltiples ataques en su turno según las reglas de D&D 5e, pero el sistema parece solo procesar un ataque por turno.
- **Causa Raíz posible:**
  1. AI Tactician: El `enemyTacticianTool` puede no estar generando múltiples ataques cuando corresponde
  2. Procesamiento: El `combat-manager.ts` puede estar procesando solo el primer ataque de la lista
  3. Datos de monstruo: La ficha del monstruo puede no incluir información sobre múltiples ataques
- **Impacto:** Bajo (afecta la fidelidad a las reglas de D&D)
- **Solución propuesta:**
  1. Verificar datos de monstruo (asegurar que incluyen información sobre múltiples ataques)
  2. Mejorar AI Tactician (instruir a la IA a generar múltiples ataques cuando el monstruo los tiene)
  3. Procesar todos los ataques (en `combat-manager.ts`, procesar todos los ataques generados, no solo el primero)
  4. Validar orden (asegurar que los ataques múltiples se procesan en el orden correcto)
- **Archivos afectados:**
  - `src/ai/tools/enemy-tactician.ts` (prompt y generación de ataques)
  - `src/ai/tools/combat-manager.ts` (procesamiento de ataques múltiples)
  - Sistema de obtención de datos de monstruos
- **Estado:** 📝 **PENDIENTE** - Funcionalidad incompleta pendiente de implementación

---

## ⚫ Prioridad Muy Baja (PMB) - Mejoras muy menores

> No hay issues de prioridad muy baja pendientes actualmente.

### Issue #137: Lenguaje Inapropiado/Coloquial en Compañeros y DM ⚪ CALIDAD

- **Fecha de creación:** 2025-01-28
- **Origen:** Notas de Gael #8
- **Severidad:** ⚪ **BAJA** (Estilo)
- **Descripción:** Se han detectado mensajes que rompen la inmersión por ser demasiado coloquiales o meta-referenciales (ej: "Merryl @ 19:26...").
- **Solución propuesta:**
  - Refinar prompts para evitar lenguaje técnico o meta-juego en diálogos.
  - Filtrar cabeceras de mensajes si se están colando en el prompt.
- **Estado:** 📝 **PENDIENTE**

---

### Issue #65: Ataque a compañero fuera de combate no inicia combate 🟢 MEJORA

- **Fecha de creación:** 2025-11-16
- **Ubicación:** `src/ai/flows/action-interpreter.ts`, `src/ai/flows/game-coordinator.ts`
- **Severidad:** 🟢 **MEDIA** (mejora de funcionalidad, no crítica)
- **Descripción:** Estando fuera de combate, si el jugador ataca a uno de sus compañeros, el sistema no entra en modo combate. El DM responde como si el ataque no fuera real, ignorando completamente la acción.
- **Ejemplo del comportamiento actual:**
  ```
  Jugador: "Ataco a Elara!"
  DM: "Atacas fervientemente al aire, pero no parece haber ninguna amenaza real a la vista." ❌ IGNORA LA ACCIÓN
  ```
- **Problema:**
  - El sistema no detecta que un ataque a un compañero debería iniciar combate o al menos reconocer la acción como un ataque real
  - El `action-interpreter` o `game-coordinator` no está procesando correctamente los ataques a compañeros fuera de combate
  - Puede estar relacionado con el sistema de inicio de combate dinámico (pendiente de implementar)
- **Impacto:** Medio (limita funcionalidad, pero no bloquea el gameplay principal)
- **Solución propuesta:**
  - Detectar ataques a compañeros en `action-interpreter`
  - Iniciar combate automáticamente cuando se detecta un ataque a un compañero
  - O al menos reconocer la acción como un ataque real y mostrar un mensaje apropiado
  - Relacionado con: [Sistema de Inicio de Combate Dinámico](../roadmap.md#3-sistema-de-inicio-de-combate-dinámico-prioridad-alta) - ✅ **COMPLETADO (2025-12-03)**
- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (detección de ataques)
  - `src/ai/flows/game-coordinator.ts` (inicio de combate)
- **Estado:** 📝 **PENDIENTE (Mejora futura)** - Funcionalidad no crítica, marcada para implementación futura

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Cuando un issue se resuelve, se mueve a [corregidos.md](./corregidos.md)
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../../CHANGELOG.md)

