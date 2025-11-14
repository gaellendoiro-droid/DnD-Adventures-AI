# Issues Encontrados Durante el Desarrollo

Este documento registra todos los problemas, bugs y mejoras identificados durante la revisión sistemática de la aplicación.

**Fecha de inicio:** Durante el saneamiento general de la aplicación  
**Última actualización:** 33 issues identificados, 18 resueltos (55%), 5 mejoras opcionales pendientes, 3 deuda técnica/features incompletas documentadas, 7 nuevos issues pendientes

---

## 🔴 Críticos (Deben corregirse inmediatamente)

### Issue #1: Archivo Duplicado `game-view.tsx` ✅ CORREGIDO
- **Ubicación:** `src/app/game-view.tsx`
- **Severidad:** Media (no crítico, pero causa confusión)
- **Descripción:** Existe un archivo `src/app/game-view.tsx` que no se está usando. El componente real está en `src/components/game/game-view.tsx` y es el que se importa en `page.tsx`.
- **Problema:** 
  - El archivo duplicado no tiene validación con `GameStateSchema`
  - No incluye `turnIndex` en el `actionInput`
  - No incluye `enemies` en el `actionInput`
  - Puede causar confusión durante el desarrollo
- **Impacto:** Bajo (no afecta la funcionalidad actual, pero puede causar problemas futuros)
- **Solución aplicada:** ✅ Eliminado `src/app/game-view.tsx`
- **Estado:** ✅ Corregido

---

## 🟡 Advertencias (Deben corregirse pronto)

### Issue #2: Falta de validación en `page.tsx` al cargar aventura ✅ CORREGIDO
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Media
- **Descripción:** Al cargar una aventura desde JSON, no se valida que el `initialGameData` tenga todos los campos requeridos antes de pasarlo a `GameView`.
- **Problema:** Si el JSON cargado no tiene todos los campos necesarios, puede causar errores en tiempo de ejecución.
- **Impacto:** Medio (puede causar errores al cargar aventuras mal formadas)
- **Solución aplicada:** ✅ Añadido esquema `AdventureDataSchema` para validar la estructura de la aventura antes de usarla. Validación añadida en `handleNewGame` y `handleLoadAdventure`.
- **Estado:** ✅ Corregido

### Issue #3: Falta de validación en `page.tsx` al cargar partida guardada ✅ CORREGIDO
- **Ubicación:** `src/app/page.tsx`, función `handleLoadGame`
- **Severidad:** Media
- **Descripción:** Al cargar una partida guardada, solo se valida que existan `party`, `messages` y `locationId`, pero no se valida la estructura completa de los datos.
- **Problema:** Si el archivo de guardado está corrupto o tiene campos faltantes, puede causar errores.
- **Impacto:** Medio (puede causar errores al cargar partidas corruptas)
- **Solución aplicada:** ✅ Añadido esquema `SaveGameDataSchema` para validar la estructura completa del archivo de guardado antes de usarlo.
- **Estado:** ✅ Corregido

### Issue #4: `conversationHistory` incorrecto en `handleLoadAdventure` ✅ CORREGIDO
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Media
- **Descripción:** En `handleLoadAdventure`, `conversationHistory` se pasaba como string vacío `""` en lugar de un array vacío `[]`, lo cual es inconsistente con el esquema `GameStateSchema` que espera un array.
- **Problema:** Inconsistencia de tipos que puede causar errores de validación.
- **Impacto:** Medio (puede causar errores de validación)
- **Solución aplicada:** ✅ Cambiado `conversationHistory: ""` a `conversationHistory: []` en la llamada a `processPlayerAction`.
- **Estado:** ✅ Corregido

### Issue #5: Inconsistencia de tipos en `actions.ts` ✅ CORREGIDO
- **Ubicación:** `src/app/actions.ts`
- **Severidad:** Media
- **Descripción:** `processPlayerAction` esperaba `GameCoordinatorInput` (que tiene `conversationHistory` como string), pero `gameCoordinator` espera `GameState` (que tiene `conversationHistory` como array).
- **Problema:** Inconsistencia de tipos que puede causar errores en tiempo de ejecución.
- **Impacto:** Medio (puede causar errores de tipo)
- **Solución aplicada:** ✅ Cambiado el tipo de parámetro de `processPlayerAction` de `GameCoordinatorInput` a `GameState` para mantener consistencia.
- **Estado:** ✅ Corregido

---

## 🟢 Mejoras (Opcionales pero recomendadas)

### Issue #6: Manejo de errores en `handleLoadAdventure`
- **Ubicación:** `src/app/page.tsx`
- **Severidad:** Baja
- **Descripción:** El manejo de errores en `handleLoadAdventure` podría ser más específico, diferenciando entre errores de parseo JSON, errores de la IA, y errores de red.
- **Impacto:** Bajo (mejora la experiencia del usuario al mostrar mensajes más claros)
- **Solución propuesta:** Añadir diferentes mensajes de error según el tipo de error
- **Estado:** 📝 Pendiente (mejora opcional, no crítica)

### Issue #7: Advertencia de Content Security Policy sobre 'eval'
- **Ubicación:** Consola del navegador
- **Severidad:** Baja (solo advertencia, no error)
- **Descripción:** Aparece el mensaje "Content Security Policy of your site blocks the use of 'eval' in JavaScript" en la consola del navegador.
- **Problema:** Este mensaje es común en Next.js en modo desarrollo debido a source maps y hot reloading. No afecta la funcionalidad de la aplicación.
- **Impacto:** Ninguno (solo advertencia, no bloquea funcionalidad)
- **Solución propuesta:** 
  - En desarrollo: Es normal y puede ignorarse
  - En producción: Next.js no debería mostrar este mensaje
  - Si persiste en producción, se puede configurar CSP headers en `next.config.js`
- **Estado:** 📝 Documentado (no crítico, comportamiento esperado en desarrollo)

### Issue #8: Fallos al cargar aventura desde JSON
- **Ubicación:** `src/app/page.tsx`, función `handleLoadAdventure`
- **Severidad:** Baja (funcionalidad aún no implementada completamente)
- **Descripción:** Al intentar cargar una aventura desde un archivo JSON, se producen varios fallos.
- **Problema:** Esta funcionalidad aún no está completamente implementada según el usuario.
- **Impacto:** Bajo (funcionalidad en desarrollo)
- **Solución propuesta:** Implementar completamente la funcionalidad de carga de aventuras desde JSON cuando se desarrolle esta característica.
- **Estado:** 📝 Documentado (funcionalidad pendiente de implementación)

### Issue #13: Connect Timeout Error al iniciar combate 🔴 CRÍTICO

- **Ubicación:** `src/ai/flows/action-interpreter.ts` (y otros flows/tools que usan prompts de Genkit)
- **Severidad:** 🔴 **ALTA** (intermitente pero bloquea completamente el combate cuando ocurre)
- **Descripción:** Al intentar iniciar combate, ocasionalmente se produce un `TypeError: fetch failed` con `ConnectTimeoutError` al intentar conectar con la API de Google Gemini (`generativelanguage.googleapis.com:443`, timeout: 10s).

**Ejemplo de Error:**
```
TypeError: fetch failed
  [cause]: [Error [ConnectTimeoutError]: Connect Timeout Error 
    (attempted address: generativelanguage.googleapis.com:443, timeout: 10000ms)]
    code: 'UND_ERR_CONNECT_TIMEOUT'
```

**Contexto:**
- Ocurre al llamar a `actionInterpreterPrompt` en `action-interpreter.ts` (línea 94)
- El timeout está configurado a 10 segundos
- Cuando falla, el sistema **default a `actionType: 'narrate'`** en lugar de `'attack'`
- **Consecuencia crítica:** El jugador escribe "ataco" pero el combate NO se inicia

**Impacto en Jugabilidad:**
- ❌ El combate no se puede iniciar
- ❌ El jugador pierde su turno/acción
- ❌ Experiencia de usuario muy negativa (acción ignorada sin explicación clara)

**Posible Causa:**
- Problemas de conectividad de red intermitentes
- Servidor de Google Gemini sobrecargado o con latencia alta
- Hot reload de Next.js que puede causar problemas de conexión temporales
- Primera llamada después de hot reload (conexión fría)

---

### **Soluciones Propuestas:**

#### **Opción A: Fallback Inteligente (RÁPIDA - Prioridad Alta)**

Cuando el `actionInterpreter` falla, usar análisis simple por palabras clave en lugar de siempre defaultear a `'narrate'`:

**Implementación:**
```typescript
// En action-interpreter.ts, función de fallback mejorada
function intelligentFallback(playerAction: string): ActionInterpreterOutput {
    const actionLower = playerAction.toLowerCase();
    
    // Detectar ataques
    if (actionLower.includes('atac') || actionLower.includes('attack') || 
        actionLower.includes('golpe') || actionLower.includes('hit')) {
        log.warn('Using intelligent fallback: detected ATTACK action');
        return { actionType: 'attack', targetId: null };
    }
    
    // Detectar diálogo
    if (actionLower.includes('habla') || actionLower.includes('talk') || 
        actionLower.includes('di') || actionLower.includes('pregunta')) {
        log.warn('Using intelligent fallback: detected TALK action');
        return { actionType: 'talk', targetId: null };
    }
    
    // Detectar búsqueda/investigación
    if (actionLower.includes('busca') || actionLower.includes('search') || 
        actionLower.includes('investiga') || actionLower.includes('examine')) {
        log.warn('Using intelligent fallback: detected SEARCH action');
        return { actionType: 'search', targetId: null };
    }
    
    // Default a narrate
    log.warn('Using intelligent fallback: defaulting to NARRATE');
    return { actionType: 'narrate', targetId: null };
}
```

**Ventajas:**
- ✅ Implementación rápida (< 15 min)
- ✅ Mejora inmediata de la experiencia de usuario
- ✅ El juego sigue siendo jugable cuando falla la API
- ✅ No requiere cambios complejos

**Desventajas:**
- ❌ No resuelve el problema subyacente (el timeout)
- ❌ No detecta el `targetId` específico
- ❌ Menos preciso que el AI

---

#### **Opción B: Retry Logic con Exponential Backoff (ROBUSTA)**

Implementar reintentos automáticos similar a `parseAdventureFromJson`:

**Implementación:**
```typescript
// En action-interpreter.ts
const MAX_RETRIES = 3;
const INITIAL_DELAY = 500; // ms

async function actionInterpreterWithRetry(input: ActionInterpreterInput): Promise<ActionInterpreterOutput> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            log.debug('ActionInterpreter attempt', { 
                attempt, 
                maxRetries: MAX_RETRIES,
                playerAction: input.playerAction 
            });
            
            const llmResponse = await actionInterpreterPrompt({
                playerAction: input.playerAction,
                locationContext: input.locationContext,
                party: input.party,
            });
            
            log.info('ActionInterpreter successful', { attempt });
            return llmResponse.output;
            
        } catch (error: any) {
            lastError = error;
            
            log.warn('ActionInterpreter attempt failed', {
                attempt,
                maxRetries: MAX_RETRIES,
                error: error.message,
                isTimeout: error.message?.includes('Timeout') || error.code === 'UND_ERR_CONNECT_TIMEOUT'
            });
            
            // Si es el último intento, usar fallback
            if (attempt >= MAX_RETRIES) {
                log.error('ActionInterpreter failed after all retries, using intelligent fallback');
                return intelligentFallback(input.playerAction);
            }
            
            // Exponential backoff
            const delay = INITIAL_DELAY * Math.pow(2, attempt - 1);
            log.debug('Waiting before retry', { delay, nextAttempt: attempt + 1 });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // Fallback (nunca debería llegar aquí, pero por seguridad)
    return intelligentFallback(input.playerAction);
}
```

**Ventajas:**
- ✅ Reduce significativamente la frecuencia de fallos (si el 1er intento falla, el 2do/3ro podría tener éxito)
- ✅ Usa el AI real en la mayoría de casos
- ✅ Fallback inteligente solo como última opción
- ✅ Exponential backoff evita sobrecargar la API

**Desventajas:**
- ❌ Añade latencia cuando hay fallos (0.5s + 1s + 2s = 3.5s extra en peor caso)
- ❌ Implementación más compleja
- ❌ Más llamadas a la API (costo)

---

#### **Opción C: Combinada (RECOMENDADA - Mejor de ambos mundos)**

Implementar ambas soluciones:
1. **Retry Logic** (2-3 intentos con backoff corto: 500ms, 1s)
2. **Fallback Inteligente** si todos los intentos fallan

**Ventajas:**
- ✅ Máxima robustez
- ✅ Mejor experiencia de usuario
- ✅ Fallback solo en casos extremos

**Desventajas:**
- ❌ Más código para mantener
- ❌ Latencia adicional en casos de fallo total

---

### **Archivos a Modificar:**
- `src/ai/flows/action-interpreter.ts` (implementar retry + fallback)
- Otros flows críticos pueden beneficiarse de la misma lógica:
  - `src/ai/flows/narrative-expert.ts`
  - `src/ai/tools/enemy-tactician.ts`
  - `src/ai/tools/companion-tactician.ts`

### **Prioridad:** 🔴 **CRÍTICA** - Afecta directamente a la jugabilidad

### **Solución Implementada:** ✅ **Opción C (Combinada)**

Modificado `src/ai/flows/action-interpreter.ts` para implementar retry logic con exponential backoff + fallback inteligente:

1. **Retry Logic con Exponential Backoff:**
   - Función `retryWithExponentialBackoff` genérica y reutilizable
   - Máximo 3 reintentos (4 intentos totales)
   - Delay inicial de 1 segundo, duplicándose en cada intento (1s, 2s, 4s)
   - Solo reintenta errores de red/timeout (no errores de validación o lógica)
   - Logging detallado de cada intento

2. **Fallback Inteligente (si todos los reintentos fallan):**
   - Análisis por palabras clave en español para detectar acciones
   - **Patrones de ataque:** 'ataco', 'atacar', 'atacamos', 'ataque', 'lucho', 'luchamos', 'golpeo', 'golpeamos'
   - Intenta extraer `targetId` desde el `locationContext` si el jugador menciona un objetivo específico
   - Si no se menciona objetivo, usa el primer enemigo hostil de la ubicación
   - Si no se detecta patrón, default a `'narrate'`

3. **Impacto:**
   - ✅ Reduce significativamente la frecuencia de fallos (4 intentos en lugar de 1)
   - ✅ El jugador puede atacar incluso cuando la API de Gemini tiene problemas
   - ✅ Experiencia de juego más confiable y fluida
   - ✅ Logging mejorado para debugging

**Archivos Modificados:**
- `src/ai/flows/action-interpreter.ts` (líneas 14-217)

**Nota:** Otros flows críticos podrían beneficiarse de la misma lógica en el futuro (narrative-expert, enemy-tactician, companion-tactician).

### **Estado:** ✅ **RESUELTO** - Implementado y listo para probar

### Issue #14: AI Tacticians (enemigos y companions) a veces devuelven output inválido/null en combate
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 ALTA (bloquea turnos completos de combatientes)
- **Descripción:** Durante el combate, tanto enemigos como companions a veces devuelven output nulo o inválido que falla la validación del schema de Genkit, causando que no realicen ninguna acción en su turno y se muestre el mensaje por defecto "X parece confundido/a y no hace nada en su turno."

- **Casos reportados:**
  1. **Enemigos:** Devuelven `targetId=null` y `hasDiceRolls=false` (caso original)
  2. **Companions:** Devuelven output que falla validación del schema (caso reportado: Merryl en turno de iniciación de combate vs Mantícora)

- **Logs del error:**
  ```
  WARN  AI returned null/invalid output for companion, using default action [AITool] tool=companionTacticianTool activeCombatant=Merryl
  ```

- **Problema identificado:**
  - **Fallo de schema validation:** El AI de Gemini está devolviendo output que no cumple con el `CompanionTacticianOutputSchema` o `EnemyTacticianOutputSchema`
  - **Posibles causas:**
    - El AI no encuentra información en la D&D API y no puede generar dice rolls válidos
    - El prompt no es lo suficientemente claro sobre el formato exacto requerido
    - El AI está devolviendo null directamente por algún filtro de seguridad o error interno
    - Los prompts son muy largos y complejos, confundiendo al modelo
  - **Fallback actual:** El código detecta el error y devuelve acción por defecto (no hacer nada), pero no proporciona información suficiente sobre QUÉ falló exactamente

- **Impacto:** 
  - 🔴 **CRÍTICO:** Bloquea turnos completos de combatientes, rompiendo el flujo del combate
  - Los companions/enemigos "pasan" su turno sin atacar/curar, afectando el balance del combate
  - Frustrante para el usuario cuando companions aliados no actúan
  - Puede hacer combates imposibles si múltiples combatientes fallan

- **Mejoras implementadas (Logging):**
  - Añadido logging detallado en `companion-tactician.ts` para capturar:
    - Input del prompt (activeCombatant, partySize, enemiesCount)
    - Respuesta del AI (hasOutput, outputKeys)
    - Detalles del error (errorMessage, errorCode, errorDetails)
  - Esto permitirá diagnosticar exactamente qué está devolviendo el AI y por qué falla

- **Solución propuesta (Completa - Multi-fase):**

  **Fase 1: Diagnóstico (IMPLEMENTADO)**
  - ✅ Añadir logging extensivo para capturar:
    - El input completo que recibe el prompt
    - La respuesta exacta del AI (antes de validación)
    - Los errores específicos de validación del schema
  - ✅ Guardar casos de fallo para análisis posterior

  **Fase 2: Mejorar prompts (PENDIENTE)**
  - Simplificar los prompts actuales (son muy largos: ~165 líneas para companions, ~140 para enemies)
  - Hacer las reglas más explícitas y menos ambiguas:
    - "YOU MUST ALWAYS return a valid action" 
    - "NEVER return null or empty response"
  - Añadir ejemplos de output COMPLETOS y VÁLIDOS al final del prompt
  - Reducir la complejidad: dividir instrucciones complejas en pasos más simples

  **Fase 3: Validación y fallback inteligente (PENDIENTE)**
  - Implementar validación parcial: si el AI devuelve output incompleto pero parcialmente válido, completar los campos faltantes
  - Mejorar el fallback: en lugar de "no hacer nada", generar una acción básica válida:
    - **Enemies:** Atacar al personaje con menor HP con ataque básico (1d20+4, 1d6+2)
    - **Companions:** Atacar al enemigo con menor HP o curar al aliado más herido (según contexto)
  - Añadir retry logic: si el AI devuelve null, reintentar 1-2 veces con un prompt simplificado

  **Fase 4: Refactoring de prompts (PENDIENTE - OPCIONAL)**
  - Considerar usar prompt chaining: dividir la decisión en múltiples pasos más simples
  - Paso 1: "¿Qué acción tomar?" (attack/heal/buff)
  - Paso 2: "¿A quién dirigir la acción?" (targetId)
  - Paso 3: "¿Qué dice rolls generar?" (diceRolls array)
  - Esto podría reducir la complejidad y mejorar la tasa de éxito

- **Estado:** 🔴 **EN INVESTIGACIÓN** - Logging implementado, esperando datos de diagnóstico para siguiente fase

- **Próximos pasos:**
  1. Recoger logs detallados del próximo fallo (con la información añadida)
  2. Analizar exactamente qué está devolviendo el AI
  3. Implementar Fase 2 (mejorar prompts) basado en los datos recopilados
  4. Testear exhaustivamente con diferentes combinaciones de party/enemies
  5. Implementar Fase 3 (fallback inteligente) si los prompts mejorados no resuelven el problema

### Issue #15: Mejora de búsqueda en D&D API para monstruos no mapeados
- **Ubicación:** `src/ai/tools/dnd-api-lookup.ts`
- **Severidad:** Baja
- **Descripción:** Cuando un monstruo, hechizo o equipo no está en el mapeo español→inglés, el sistema intenta buscar con el nombre normalizado (sin acentos), pero si el nombre está en español y no tiene equivalente directo, la búsqueda falla. Esto limita la capacidad del sistema para encontrar información de monstruos personalizados o menos comunes.
- **Problema:** 
  - El mapeo actual cubre monstruos comunes, pero no todos los posibles
  - Si un monstruo no está mapeado, se normaliza (quita acentos) pero sigue siendo español
  - La API de D&D está en inglés, por lo que búsquedas en español generalmente fallan
  - La búsqueda por nombre actual (línea 186) usa el `query` original en lugar del `normalizedQuery`
  - No hay mecanismo para traducir automáticamente nombres no mapeados
- **Impacto:** Bajo (el sistema funciona, pero la IA puede no tener información precisa de algunos monstruos, afectando ligeramente las decisiones tácticas)
- **Solución propuesta (Combinada - Opción 1 + Opción 3):** 
  - **Opción 1 - Mejorar búsqueda por nombre:**
    - Usar `normalizedQuery` en la búsqueda por nombre (línea 186) en lugar del `query` original
    - Implementar búsquedas parciales más flexibles (buscar en todos los resultados y hacer matching por similitud)
    - Intentar múltiples variantes del nombre (singular/plural, con/sin guiones, etc.)
  - **Opción 3 - Usar IA para traducir:**
    - Si no hay mapeo directo y la búsqueda normalizada falla, usar un prompt de IA simple para traducir el nombre al inglés antes de buscar
    - Esto sería más flexible y cubriría casos no previstos
    - Considerar cachear traducciones exitosas para evitar llamadas repetidas
  - **Implementación combinada:**
    - Primero intentar con el mapeo existente (rápido)
    - Si falla, intentar búsqueda mejorada por nombre con el nombre normalizado
    - Si aún falla, usar IA para traducir y luego buscar
    - Documentar cómo añadir nuevos mapeos cuando se encuentren traducciones exitosas
- **Estado:** 📝 Pendiente (mejora futura, se abordará después de completar el plan de combate por turnos)

### Issue #16: Gestión de nombres de múltiples monstruos debería estar en un módulo separado
- **Ubicación:** `src/ai/tools/combat-manager.ts` (líneas 250-571)
- **Severidad:** Media (mejora de arquitectura)
- **Descripción:** La gestión y unificación de nombres de múltiples monstruos del mismo tipo está actualmente mezclada con la lógica de combate en `combat-manager.ts`. Esto incluye funciones para generar nombres diferenciados ("Goblin 1", "Goblin 2"), normalizar nombres para matching, reemplazar referencias ordinales en narraciones ("primer goblin", "goblin más cercano"), y resolver identificadores ambiguos. Esta funcionalidad debería estar centralizada en un módulo dedicado que pueda ser reutilizado en narraciones del DM, combat manager, y narraciones de compañeros.
- **Problema:** 
  - **Separación de responsabilidades:** `combat-manager.ts` debería enfocarse en la lógica de combate, no en la gestión de nombres de monstruos
  - **Reutilización:** La gestión de nombres diferenciados se necesita en múltiples contextos:
    - Narraciones del DM (post-procesamiento de texto)
    - Combat manager (generación de nombres visuales, resolución de targets)
    - Narraciones de compañeros (post-procesamiento de texto)
    - Potencialmente en otros flows (narrative-expert, companion-expert, etc.)
  - **Mantenibilidad:** Un módulo separado sería más fácil de testear y depurar
  - **Escalabilidad:** Añadir nuevas reglas de procesamiento de nombres no debería requerir modificar el combat manager
  - **Consistencia:** Centralizar la lógica asegura que todos los lugares usen el mismo sistema de nombres diferenciados
- **Impacto:** Medio (mejora la arquitectura, mantenibilidad y consistencia del código)
- **Solución propuesta:** 
  - Crear un nuevo módulo: `src/lib/enemy-name-manager.ts` o `src/ai/utils/enemy-name-manager.ts`
  - Mover las siguientes funciones al nuevo módulo:
    - `generateDifferentiatedNames()` (líneas 250-287) - Genera mapa de nombres diferenciados ("Goblin 1", "Goblin 2") para múltiples monstruos del mismo tipo
    - `getVisualName()` (líneas 482-497) - Obtiene el nombre visual de un combatiente desde el initiative order o enemies
    - `normalizeNameForMatching()` (líneas 293-299) - Normaliza nombres para matching (quita acentos, convierte a minúsculas)
    - `escapeRegex()` (líneas 304-306) - Escapa caracteres especiales de regex
    - `replaceOrdinalReferences()` (líneas 317-471) - Reemplaza referencias ordinales ("primer goblin", "segundo orco", "goblin más cercano") con nombres visuales diferenciados
    - `resolveEnemyId()` (líneas 509-571) - Resuelve un targetId (puede ser nombre visual como "Goblin 1" o uniqueId como "goblin-0") al uniqueId real, detectando ambigüedades
  - El nuevo módulo exportaría funciones principales:
    ```typescript
    // Generar nombres diferenciados
    export function generateDifferentiatedNames(enemies: any[]): Map<string, string>
    
    // Obtener nombre visual de un combatiente
    export function getVisualName(combatantId: string, initiativeOrder: Combatant[], enemies: any[]): string
    
    // Procesar narraciones para unificar nombres
    export function processNarrationForEnemyNames(
      narration: string, 
      enemies: any[], 
      visualNamesMap: Map<string, string>
    ): string
    
    // Resolver targetId ambiguo
    export function resolveEnemyId(
      targetId: string | null | undefined,
      enemies: any[],
      initiativeOrder: Combatant[],
      party: any[]
    ): { uniqueId: string | null; ambiguous: boolean; matches: string[] }
    ```
  - `combat-manager.ts` importaría y usaría:
    ```typescript
    import { 
      generateDifferentiatedNames, 
      getVisualName, 
      processNarrationForEnemyNames,
      resolveEnemyId 
    } from '@/lib/enemy-name-manager';
    ```
  - Beneficios adicionales:
    - Fácil de testear unitariamente (todas las funciones son puras o casi puras)
    - Reutilizable en narraciones del DM, combat manager, y narraciones de compañeros
    - Más fácil de extender con nuevas reglas de procesamiento de nombres
    - Garantiza consistencia en el uso de nombres diferenciados en toda la aplicación
- **Estado:** 📝 Pendiente (mejora de arquitectura, se abordará después de completar el plan de combate por turnos)

### Issue #9: Dependencia incorrecta en useEffect de chat-message.tsx ✅ CORREGIDO
- **Ubicación:** `src/components/game/chat-message.tsx`, línea 114
- **Severidad:** Baja (no crítico, pero puede causar problemas)
- **Descripción:** El `useEffect` que maneja los event listeners del audio tenía `[audioRef]` como dependencia, pero los refs no deberían estar en las dependencias de `useEffect`.
- **Problema:** Los refs no cambian entre renders, así que incluir `audioRef` en las dependencias es innecesario y puede causar re-renders innecesarios o problemas de limpieza.
- **Impacto:** Bajo (puede causar problemas menores de rendimiento o limpieza de event listeners)
- **Solución aplicada:** ✅ Cambiada la dependencia de `[audioRef]` a `[]` (array vacío) ya que el efecto solo necesita ejecutarse una vez al montar el componente.
- **Estado:** ✅ Corregido

### Issue #10: Campos de formulario sin atributos id o name ✅ CORREGIDO
- **Ubicación:** `src/components/game/main-menu.tsx` y `src/components/game/player-input.tsx`
- **Severidad:** Baja (warning de accesibilidad)
- **Descripción:** Los campos de formulario (`input` y `textarea`) no tenían atributos `id` o `name`, lo cual genera un warning en la consola del navegador sobre accesibilidad.
- **Problema:** Los navegadores modernos recomiendan que los campos de formulario tengan `id` o `name` para mejorar la accesibilidad y el seguimiento de formularios.
- **Impacto:** Bajo (solo un warning, no afecta funcionalidad)
- **Solución aplicada:** ✅ Añadidos atributos `id` y `name` a:
  - Input de carga de aventura: `id="adventure-file-input"`, `name="adventure-file"`
  - Input de carga de partida: `id="save-game-file-input"`, `name="save-game-file"`
  - Textarea de input del jugador: `id="player-action-input"`, `name="player-action"`
- **Estado:** ✅ Corregido

### Issue #11: Estados de combate no sincronizados ✅ CORREGIDO
- **Ubicación:** `src/components/game/game-view.tsx`, función `handleSendMessage`
- **Severidad:** Media
- **Descripción:** Los estados relacionados con combate (`inCombat`, `initiativeOrder`, `turnIndex`, `enemies`) se actualizaban de forma independiente, lo que podía causar inconsistencias. Cuando `inCombat` se establecía en `false`, los otros estados no se limpiaban automáticamente.
- **Problema:** 
  - Si el combate termina (`inCombat = false`), los estados `initiativeOrder`, `turnIndex` y `enemies` deberían limpiarse para mantener consistencia
  - La falta de sincronización puede causar que la UI muestre información de combate cuando no hay combate activo
- **Impacto:** Medio (puede causar confusión en la UI y estados inconsistentes)
- **Solución aplicada:** ✅ Implementada lógica de sincronización que:
  - Cuando `inCombat` se establece en `false`, automáticamente limpia `initiativeOrder`, `turnIndex` y `enemies`
  - Cuando `inCombat` se establece en `true` o se mantiene, actualiza los estados de combate si están presentes en el resultado
- **Estado:** ✅ Corregido

### Issue #12: `enemies` no se inicializa desde `initialData` ✅ CORREGIDO
- **Ubicación:** `src/components/game/game-view.tsx`
- **Severidad:** Media
- **Descripción:** El estado `enemies` se inicializaba siempre como array vacío `[]`, ignorando cualquier valor de `initialData.enemies`. Además, en el `useEffect` que sincroniza con `initialData`, siempre se establecía `setEnemies([])`, perdiendo los enemigos guardados al cargar una partida.
- **Problema:** 
  - Al cargar una partida guardada que estaba en combate, los enemigos no se restauraban
  - La interfaz `GameViewProps` no incluía `enemies` en `initialData`
  - La interfaz `InitialGameData` en `page.tsx` no incluía `enemies`
- **Impacto:** Medio (los enemigos no se restauran al cargar partidas en combate)
- **Solución aplicada:** ✅ 
  - Añadido `enemies?: any[]` a `InitialGameData` en `page.tsx`
  - Añadido `enemies?: any[]` a `GameViewProps.initialData` en `game-view.tsx`
  - Cambiado inicialización de `enemies` de `useState<any[]>([])` a `useState<any[]>(initialData.enemies || [])`
  - Cambiado `setEnemies([])` a `setEnemies(initialData.enemies || [])` en el `useEffect`
  - Añadido `enemies: validatedSaveData.enemies || []` al cargar partida en `handleLoadGame`
- **Estado:** ✅ Corregido

---

## 📝 Notas de Revisión

### Componentes Revisados hasta ahora:
- ✅ `src/app/page.tsx` - Revisado
- ✅ `src/app/game-view.tsx` - Identificado como duplicado (eliminado)
- ✅ `src/components/game/game-view.tsx` - Revisado (componente activo)
- ✅ `src/components/game/chat-panel.tsx` - Revisado
- ✅ `src/components/game/chat-message.tsx` - Revisado (Issue #9 encontrado)
- ✅ `src/components/game/player-input.tsx` - Revisado
- ✅ `src/components/game/character-sheet.tsx` - Revisado
- ✅ `src/components/game/party-panel.tsx` - Revisado
- ✅ `src/components/game/initiative-tracker.tsx` - Revisado
- ✅ `src/components/layout/left-panel.tsx` - Revisado
- ✅ `src/components/game/main-menu.tsx` - Revisado

---

## 🔄 Historial de Cambios

- **[Fecha]:** Inicio de la revisión del Frontend
- **[Fecha]:** Issues #1, #2, #3, #4, #5 identificados
- **[Fecha]:** ✅ Issues #1, #2, #3, #4, #5 corregidos
  - Eliminado archivo duplicado `src/app/game-view.tsx`
  - Añadida validación con `AdventureDataSchema` en `handleNewGame` y `handleLoadAdventure`
  - Añadida validación con `SaveGameDataSchema` en `handleLoadGame`
  - Corregido `conversationHistory` de string a array en `handleLoadAdventure`
  - Corregida inconsistencia de tipos en `actions.ts` (cambiado de `GameCoordinatorInput` a `GameState`)
- **[Fecha]:** Issues #7, #8, #9 identificados y documentados
- **[Fecha]:** ✅ Issues #9 y #10 corregidos
  - Corregida dependencia incorrecta en `useEffect` de `chat-message.tsx` (cambiado de `[audioRef]` a `[]`)
  - Añadidos atributos `id` y `name` a campos de formulario en `main-menu.tsx` y `player-input.tsx`
- **[Fecha]:** ✅ Sistema de logging centralizado implementado
  - Creado endpoint `/api/log` para recibir logs del cliente
  - Modificado `logger-client.ts` para enviar logs al servidor automáticamente
  - Añadidos logs estructurados para guardado de partida
  - Todos los logs del cliente (INFO, WARN, ERROR) ahora aparecen en la terminal del servidor
- **[Fecha]:** Issues #11 y #12 identificados y corregidos
  - ✅ Corregida sincronización de estados de combate (cuando `inCombat = false`, se limpian automáticamente `initiativeOrder`, `turnIndex` y `enemies`)
  - ✅ Corregida inicialización de `enemies` desde `initialData` para restaurar correctamente al cargar partidas
  - ✅ Añadido `enemies` a interfaces `InitialGameData` y `GameViewProps.initialData`
  - ✅ Añadido `enemies` al proceso de carga de partidas guardadas
- **[Fecha]:** ✅ Mejora en manejo de errores de validación
  - ✅ Añadido manejo específico de errores de Zod (`ZodError`) en `game-view.tsx`
  - ✅ Los errores de validación ahora muestran mensajes claros indicando qué campos fallaron
  - ✅ Los errores de validación se registran en los logs del cliente con detalles completos
  - ✅ Verificado que los datos se formatean correctamente antes de enviar (todos los campos en `actionInput` están correctamente formateados)
- **[Fecha]:** ✅ Revisión de manejo de errores completada
  - ✅ Revisados 6 bloques `catch` en el frontend (game-view.tsx: 2, chat-message.tsx: 1, page.tsx: 3)
  - ✅ Todos los bloques `catch` registran errores en logs del cliente usando `logClient.uiError`
  - ✅ Todos los bloques `catch` muestran mensajes claros al usuario (toast o mensajes en chat)
  - ✅ Los bloques críticos (game-view) incluyen funcionalidad de retry
  - ✅ Los bloques que necesitan limpieza usan `finally` para resetear estados (loading, etc.)
- **[Fecha]:** ✅ Revisión de UX/UI completada
  - ✅ Mensajes de carga: Main menu muestra spinners y texto "Cargando...", chat panel muestra skeleton con "DM está pensando..."
  - ✅ Botones de retry: Aparecen en mensajes de error y funcionan correctamente llamando a `handleSendMessage` con `isRetry: true`
  - ✅ Scroll automático: Implementado en chat-panel, dice-log-panel y debug-panel usando `useEffect` con `scrollTo`
  - ✅ Paneles redimensionables: Left panel usa `ResizablePanelGroup` con handles funcionales para redimensionar verticalmente
  - ✅ Responsividad: Game layout usa breakpoints de Tailwind (md: y lg:) para adaptarse a diferentes tamaños de pantalla
- **[Fecha]:** ✅ Revisión del Backend (Flujos y Herramientas de IA) completada
  - ✅ Revisados 4 flujos principales: game-coordinator, action-interpreter, narrative-expert, ooc-assistant
  - ✅ Revisadas 4 herramientas de combate: combat-manager, combat-initiation-expert, enemy-tactician, companion-tactician
  - ✅ Revisadas 6 herramientas de soporte: companion-expert, character-lookup, location-lookup, adventure-lookup, dice-roller, dnd-api-lookup
  - ✅ Validación de datos: Todos los flows y tools tienen schemas Zod definidos, Genkit valida automáticamente
  - ✅ Manejo de errores: 6 bloques try-catch revisados (todos correctos), Genkit maneja errores automáticamente en flows/tools
  - ✅ Logging: Todos los errores se registran usando el sistema de logging estructurado (`log.error`, `log.warn`, `log.aiTool`)
- **[Fecha]:** ✅ Revisión de Integración (Server Actions y Flujo de Datos) completada
  - ✅ Revisados 3 server actions: actions.ts (processPlayerAction), game-state-actions.ts (getAdventureData, lookupAdventureEntityInDb), api/load-adventure/route.ts
  - ✅ Flujo de datos: Validación en frontend (GameStateSchema.parse) y backend (Genkit inputSchema), serialización correcta
  - ✅ Sincronización de estado: turnIndex, initiativeOrder, inCombat, locationId, party se sincronizan correctamente entre frontend y backend
  - ✅ Casos límite: party vacío validado, locationId no existe lanza error claro, conversationHistory vacío manejado correctamente, datos inesperados validados
  - ✅ Manejo de errores: Todos los server actions tienen try-catch, errores se retornan estructurados al cliente
- **[Fecha]:** ✅ Revisión de Logs y Errores (Sistema de Logging) completada
  - ✅ Sistema de logging del servidor: Implementado correctamente con niveles (DEBUG, INFO, WARN, ERROR), timestamps, contexto estructurado
  - ✅ Sistema de logging del cliente: Implementado correctamente, logs INFO/WARN/ERROR se envían automáticamente al servidor
  - ✅ Endpoint `/api/log`: Funciona correctamente, centraliza logs del cliente en el servidor
  - ✅ Uso del sistema: Todos los archivos usan el sistema estructurado (20 archivos importan logger), solo hay un log temporal de debugging en game-view.tsx
  - ✅ DebugPanel: Funciona correctamente, muestra debugLogs de forma útil
  - ✅ Nota: El único `console.log` fuera del sistema es un log temporal de debugging en game-view.tsx (documentado como temporal)
- **[Fecha]:** ✅ Revisión de Flujos Críticos de Usuario completada
  - ✅ Inicio de Nueva Partida: Implementado correctamente, valida estructura de aventura, establece estado inicial
  - ✅ Exploración y Narración: Implementado correctamente, flujo completo desde actionInterpreter hasta narrativeExpert
  - ✅ Interacción con PNJs: Implementado correctamente, narrativeExpert interpreta interactionResults
  - ✅ Inicio de Combate: Implementado correctamente, combatInitiationExpertTool y combatManagerTool funcionan
  - ✅ Combate por Turnos: Implementado correctamente, bucle de turnos de IA, sincronización de turnIndex
  - ✅ Fin de Combate: Implementado correctamente, limpieza de estados cuando inCombat es false
  - ✅ Guardado y Carga: Implementado correctamente, guarda y restaura todos los estados relevantes (incluyendo enemies, turnIndex, initiativeOrder)
  - ✅ Nota: Revisión basada en análisis de código. Se recomienda pruebas manuales para verificar comportamiento en tiempo de ejecución.
- **[Fecha]:** ✅ Revisión de Rendimiento completada
  - ✅ Optimizaciones existentes: Cache de adventure data, uso de useCallback (9 funciones), limitación de arrays (debugMessages: 200, conversationHistory: 10)
  - ✅ Uso de recursos: No hay memory leaks obvios, arrays limitados, cache implementado
  - ✅ Tiempos de respuesta: Dependen de la IA (esperado), no hay operaciones bloqueantes innecesarias
  - 💡 Mejoras potenciales: Componentes hijos podrían usar React.memo, valores calculados podrían usar useMemo si se vuelven costosos
  - ⚠️ Nota: Log temporal de debugging usa JSON.stringify y múltiples console.log, pero solo se ejecuta cuando cambia el estado
- **[Fecha]:** ✅ Revisión de Validación y Seguridad completada
  - ✅ Validación de inputs: GameStateSchema valida en frontend, Genkit valida en backend, errores manejados con try-catch
  - ✅ Validación de esquemas: Todos los flows y tools tienen schemas Zod definidos, schemas centralizados y consistentes
  - ✅ Datos sensibles: API keys no expuestas en cliente, logs no incluyen información sensible
  - ✅ Sanitización de HTML: Implementada con DOMPurify en `src/lib/sanitize-html.ts`, aplicada en `chat-message.tsx` antes de usar `dangerouslySetInnerHTML`
  - 💡 Mejoras potenciales: Añadir límites de longitud a inputs de texto (ej: `z.string().max(1000)`)

---

## 🟡 Advertencias (Deben corregirse pronto)

### Issue #17: IA no incluye todos los enemigos hostiles en el combate
- **Ubicación:** `src/ai/tools/combat-initiation-expert.ts`, `src/ai/flows/action-interpreter.ts`
- **Severidad:** Media (afecta la experiencia de juego)
- **Descripción:** La IA que decide qué combatientes participan en el combate a veces omite enemigos hostiles que están presentes en la ubicación. Por ejemplo, si hay 2 goblins y 1 orco en la misma ubicación, la IA podría incluir solo los goblins y omitir el orco.
- **Problema:**
  - La IA toma decisiones contextuales sobre qué entidades participan, pero a veces es demasiado conservadora
  - El prompt actual no es lo suficientemente explícito sobre incluir TODOS los enemigos hostiles presentes
  - La descripción de la ubicación puede no ser clara sobre si todos los enemigos están juntos o separados
  - **Problema secundario:** El `actionInterpreter` puede asignar un `targetId` específico cuando el jugador no especifica un objetivo (ej: "atacamos" → `targetId: "goblin-1"`), lo que puede hacer que la IA del `combatInitiationExpertTool` piense que solo ese enemigo está involucrado
- **Diseño del Sistema:**
  - **IMPORTANTE:** La IA SIEMPRE decide qué combatientes participan. No se fuerza la inclusión de entidades.
  - Esto permite escenarios donde no todos los enemigos participan (ej: si están muy lejos, son neutrales, o el combate es muy específico)
  - Sin embargo, cuando hay múltiples enemigos hostiles en la misma ubicación, todos deberían participar normalmente
- **Solución aplicada:**
  - ✅ Mejorado el prompt de `combatInitiationExpertTool` para ser más explícito sobre incluir todos los enemigos hostiles presentes
  - ✅ Añadida regla explícita: "If there are multiple hostile entities in the same location, include ALL of them"
  - ✅ Mejorada la explicación del `Direct Target ID` para que la IA entienda que es solo el objetivo inicial, no el único enemigo
  - ✅ Mejorado el prompt de `actionInterpreter` para que sea más conservador al asignar `targetId` cuando el jugador no especifica un objetivo
  - ✅ Añadida nota en el prompt del `actionInterpreter` explicando que el `targetId` es solo el objetivo inicial
  - ✅ Documentado en el código que la IA siempre decide (no se fuerza inclusión)
- **Estado:** ✅ RESUELTO - Prompts mejorados y probados. La IA ahora incluye correctamente todos los enemigos hostiles presentes en la ubicación, independientemente del `targetId` específico o si el jugador no especifica un objetivo.

---

## Issue #18: IA Táctica ataca a personajes ya derrotados (HP <= 0)

- **Ubicación:** `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** Alta (afecta jugabilidad y lógica del combate)
- **Descripción:** Los AI tácticians (enemigos y compañeros) continúan seleccionando como objetivo a personajes que ya han sido derrotados (HP llegó a 0 o menos). Esto resulta en acciones desperdiciadas y comportamiento no realista en combate.
- **Ejemplo Observado:**
  - Merryl muere en combate (HP = 0)
  - En el siguiente turno, un Goblin intenta atacar a Merryl nuevamente
  - La acción se procesa normalmente pero no tiene sentido narrativo ni mecánico
- **Causa Raíz:**
  - Los prompts de `enemyTacticianTool` y `companionTacticianTool` no filtran ni instruyen al AI sobre qué objetivos son válidos
  - El AI recibe la lista completa del party/enemies sin información sobre si están conscientes o derrotados
  - No hay validación post-AI que rechace objetivos inválidos
- **Impacto:**
  - **Jugabilidad:** Turnos desperdiciados de enemigos/aliados
  - **Narrativa:** Incoherente (atacar a alguien ya caído)
  - **Balance:** Puede favorecer injustamente a un bando si desperdician turnos
- **Soluciones Propuestas:**
  - **Opción A (Recomendada):** Filtrado Pre-AI - Filtrar objetivos con HP <= 0 antes de pasarlos al AI táctician. Garantiza que el AI solo vea objetivos válidos.
  - **Opción B:** Instrucción en Prompt - Añadir instrucciones explícitas al prompt para que el AI ignore objetivos derrotados. Más flexible pero no garantizado.
  - **Opción C:** Combinada - Filtrado + validación post-AI. Más robusto pero más complejo.
- **Solución Implementada:** ✅
  - Modificado `src/ai/tools/combat-manager.ts` para filtrar personajes con HP <= 0 antes de pasarlos a los AI tacticians
  - **Filtrado en turno normal de combate** (líneas 1026-1049): Se filtran `updatedParty` y `updatedEnemies` para obtener solo personajes vivos
  - **Filtrado en iniciación de combate** (líneas 1838-1861): Mismo filtrado aplicado durante la primera ronda de combate
  - Los arrays filtrados (`aliveParty`, `aliveEnemies`) se pasan a `baseTacticianInput`
  - Se añade logging detallado para tracking de personajes vivos vs muertos
- **Impacto:**
  - Los AI tacticians ahora solo ven personajes vivos como objetivos válidos
  - Previene comportamiento ilógico de atacar cadáveres
  - Mejora la experiencia de juego y realismo del combate
- **Archivos Modificados:**
  - `src/ai/tools/combat-manager.ts` (implementado filtrado de objetivos válidos)
- **Relacionado con:**
  - Paso 4 del plan de combate por turnos (detección de fin de combate)
  - Sistema de HP (análisis de HP)
- **Estado:** ✅ **RESUELTO** - Implementado y listo para probar

---

## Issue #19: Turno del jugador no procesa tiradas de dados ni narración del DM 🔴 CRÍTICO

- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/flows/game-coordinator.ts`
- **Severidad:** 🔴 **CRÍTICA** (bloquea completamente el combate para el jugador)
- **Descripción:** Cuando el jugador realiza una acción de ataque durante su turno en combate (ej: "ataco goblin 1"), el sistema interpreta correctamente la acción pero **NO genera tiradas de dados** para el ataque del jugador y **NO genera una narración del DM** sobre el resultado de la acción. El sistema salta directamente a procesar los turnos de los AI combatientes subsecuentes.

**Síntomas Observados:**
1. El jugador escribe "ataco goblin 1"
2. El `actionInterpreter` interpreta correctamente: `actionType=attack targetId=goblin-1` ✅
3. El sistema procesa los turnos de AI subsecuentes (enemigos y compañeros) ✅
4. **PERO:** No se generan tiradas de dados para el ataque del jugador ❌
5. **PERO:** El DM no narra el resultado de la acción del jugador ❌
6. El jugador queda sin poder atacar efectivamente

**Logs Observados:**
```
163|2025-11-13 14:59:31.902 DEBUG Action interpreted [AIFlow] flow=actionInterpreter actionType=attack targetId=goblin-1
164|2025-11-13 14:59:31.902 INFO  Processing combat turn [GameCoordinator] turnIndex=3 actionType=attack
165|2025-11-13 14:59:31.902 DEBUG Enemy mapping: uniqueId=goblin-0, originalName="Goblin", visualName="Goblin 1" [CombatManager] <getVisualNames>
166|2025-11-13 14:59:31.902 DEBUG Enemy mapping: uniqueId=goblin-1, originalName="Goblin", visualName="Goblin 2" [CombatManager] <getVisualNames>
167|2025-11-13 14:59:31.903 DEBUG Enemy mapping: uniqueId=orco-0, originalName="Orco", visualName="Orco 1" [CombatManager] <getVisualNames>
168|2025-11-13 14:59:31.903 DEBUG Processing enemy turn [AITool] tool=enemyTacticianTool activeCombatant=Goblin 2 enemiesCount=3 partySize=3
```
**Nota:** El sistema salta directamente de "Processing combat turn" (línea 164) a "Processing enemy turn" para Goblin 2 (línea 168) **sin procesar el turno del jugador**.

**Causa Raíz:**
El `combatManagerTool` **no está procesando el turno del jugador** cuando `interpretedAction` está presente durante el combate. El código actual:
1. Recibe el `interpretedAction` correctamente
2. Pero NO genera tiradas de dados para el jugador
3. NO genera narración del DM sobre la acción del jugador
4. Salta directamente a procesar los turnos de AI

**Impacto en Jugabilidad:**
- ❌ **El jugador NO puede atacar** efectivamente en combate
- ❌ No recibe feedback visual (tiradas de dados)
- ❌ No recibe feedback narrativo (narración del DM)
- ❌ El combate es completamente unilateral (solo los AI actúan)
- ❌ **BLOQUEO TOTAL DEL GAMEPLAY DE COMBATE**

**Solución Propuesta:**

Modificar `src/ai/tools/combat-manager.ts` para que cuando se recibe un `interpretedAction` durante el combate (`inCombat=true`), el sistema:

1. **Genere tiradas de dados para el jugador:**
   - Llamar a `diceRollerTool` para el ataque (1d20 + modificador)
   - Si el ataque acierta, llamar a `diceRollerTool` para el daño
   - Seguir el mismo formato que los AI tacticians (attack + damage)

2. **Genere narración del DM sobre la acción del jugador:**
   - Llamar a `narrativeExpert` o similar para generar una descripción del ataque
   - Incluir el resultado (acierto/fallo) y el daño si aplica
   - Aplicar post-processing de nombres (para enemigos diferenciados)

3. **Aplique el daño al enemigo si el ataque acierta:**
   - Actualizar el HP del enemigo objetivo
   - Validar y clampear el HP usando `validateAndClampHP`
   - Actualizar el array `updatedEnemies`

4. **Avance el turno:**
   - Incrementar `newTurnIndex`
   - Continuar con el procesamiento de turnos de AI si es necesario

**Archivos a Modificar:**
- `src/ai/tools/combat-manager.ts` (implementar procesamiento del turno del jugador)
- Posible necesidad de crear una función helper para generar tiradas de jugador (similar a AI tacticians)

**Relacionado con:**
- Sistema de tiradas de dados (Fase 4 del plan de combate)
- Sistema de HP (Fase 1 del plan de combate)
- Issue #18 (AI táctica ataca a derrotados - el jugador debería poder derrotar enemigos)

**Prioridad:** 🔴 **CRÍTICA** - Sin esto, el jugador no puede jugar el combate

**Solución Implementada:** ✅ 
Modificado `src/ai/tools/combat-manager.ts` (líneas 738-1005) para procesar completamente el turno del jugador:
1. **Generación de tiradas de dados:**
   - Calcula modificadores de ataque y daño desde `abilityModifiers` (Fuerza o Destreza, el que sea mayor)
   - Genera attack roll (`1d20+modificador`)
   - Si el ataque acierta, genera damage roll (`1d8+modificador` por defecto)
   - Nota: El dado de daño por defecto es `1d8`. TODO: Leer del arma equipada en el futuro.

2. **Generación de narración del DM:**
   - Mensajes de acierto/fallo con resultado detallado (roll vs AC)
   - Mensajes de daño con información de HP (antes → después)
   - Mensajes especiales para críticos y pifias
   - Mensaje de derrota si el objetivo llega a 0 HP

3. **Aplicación de daño:**
   - Actualiza HP del enemigo objetivo
   - Valida y clampea HP usando `validateAndClampHP`
   - Actualiza `updatedEnemies` correctamente

4. **Información en tiradas:**
   - Incluye `targetName`, `targetAC`, `attackHit` en attack rolls
   - Incluye `targetName`, `damageDealt` en damage rolls
   - Compatible con el panel de tiradas mejorado

**Estado:** ✅ **RESUELTO** - Implementado y listo para probar

---

### Issue #20: Hechizos con tiradas de salvación no funcionan 🔴 CRÍTICO

- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/enemy-tactician.ts`, `src/components/game/dice-roll-result.tsx`
- **Severidad:** 🔴 ALTA (bloquea el uso de una categoría completa de hechizos en combate)
- **Descripción:** 
  Los hechizos que usan tiradas de salvación (saving throws) del objetivo en lugar de tiradas de ataque del lanzador no funcionaban correctamente. Ejemplo: Sacred Flame (Llama Sagrada), Fireball, etc.
  
- **Problema identificado:**
  1. El `combat-manager.ts` rechazaba damage rolls que no tuvieran un attack roll previo (línea 1363-1373)
  2. Los prompts de los tacticians no distinguían entre:
     - **Attack roll spells:** Requieren 1d20+modifier para atacar, luego damage roll si acierta
     - **Saving throw spells:** El objetivo tira salvación, si falla recibe daño automático (no hay attack roll del lanzador)
  3. El panel de tiradas no mostraba información específica para saving throw spells
  
- **Síntoma real reportado por usuario:**
  > "En el turno de Elara, esta hace un ataque que al parecer no necesita tirada de ataque ya que funciona con tirada de salvación del objetivo al que ataca. Creo que por esta razón aunque el DM narra el ataque de Elara en el panel de Tiradas no aparece su ataque, la tirada de salvación del enemigo ni el daño causado."
  
  El log mostraba:
  ```
  WARN  Damage roll without prior attack roll - SKIPPING [CombatManager] 
  roller=Elara rollDescription=Daño radiante de Llama Sagrada
  ```

- **Impacto:** 
  - Los companions y enemies con habilidades de spellcasting no podían usar hechizos de salvación
  - Reducía significativamente la variedad táctica del combate
  - Causaba confusión al narrar el ataque pero no mostrar tiradas ni aplicar daño

- **Solución implementada (MEJORADA CON METADATA EXPLÍCITA):**

**Iteración 1 (keywords):** Detección por palabras clave - FRÁGIL, requiere mantener listas de keywords

**Iteración 2 (metadata explícita):** Sistema robusto basado en información proporcionada por los AI tacticians

1. **Schemas actualizados** (`companion-tactician.ts` y `enemy-tactician.ts`):
   - Agregado campo `attackType` en el schema de `diceRolls`: 
     ```typescript
     attackType: z.enum(['attack_roll', 'saving_throw', 'healing', 'other']).optional()
     ```
   - Los AI tacticians ahora especifican explícitamente el tipo de cada roll
   - **Ventaja clave:** Los tacticians ya consultan `dndApiLookupTool`, por lo que conocen el tipo exacto del hechizo

2. **Prompts mejorados:**
   - Instrucciones claras sobre cuándo usar cada `attackType`
   - Ejemplos completos con el campo `attackType`:
     ```javascript
     // Attack roll spell
     {"rollNotation": "1d20+5", "description": "Tirada de ataque de Rayo de Escarcha", "attackType": "attack_roll"}
     
     // Saving throw spell
     {"rollNotation": "1d8", "description": "Daño radiante de Llama Sagrada", "attackType": "saving_throw"}
     
     // Healing spell
     {"rollNotation": "1d8+3", "description": "Curación", "attackType": "healing"}
     ```

3. **`combat-manager.ts` actualizado** (líneas 1248-1267, 1372-1409):
   - Lee `attackType` del `rollData` proporcionado por los tacticians
   - Fallback a detección por keywords para retrocompatibilidad (si `attackType` no está presente)
   - Validación robusta: `const isSavingThrow = attackType === 'saving_throw' || (!attackType && isSavingThrowFromKeywords);`
   - Log mejorado que muestra el `attackType` recibido para debugging

4. **`dice-roll-result.tsx`** (sin cambios necesarios):
   - Ya detecta saving throw spells por keywords (fallback funciona)
   - Muestra mensaje específico: "X sufre N puntos de daño radiante (hechizo de salvación)"

- **Archivos modificados:**
  - `src/ai/tools/combat-manager.ts` (líneas 1248-1267, 1372-1409)
  - `src/ai/tools/companion-tactician.ts` (schema y prompt)
  - `src/ai/tools/enemy-tactician.ts` (schema y prompt)

- **Ventajas de la solución con metadata explícita:**
  - **Robusto:** No depende de parsing de strings ni keywords específicas
  - **Mantenible:** No requiere añadir keywords para cada nuevo hechizo
  - **Escalable:** Funciona para cualquier mecánica de D&D 5e (área de efecto, reacciones, etc.)
  - **Explícito > Implícito:** Menos errores, más fácil de debuggear
  - **Eficiente:** Los AI tacticians ya conocen el tipo, no requiere procesamiento adicional

- **Resultado esperado:**
  - Sacred Flame, Fireball y otros saving throw spells generan solo damage roll (sin attack roll) ✓
  - El daño se aplica correctamente al objetivo ✓
  - El panel de tiradas muestra información clara sobre el tipo de hechizo ✓
  - Los AI tacticians especifican explícitamente el tipo de ataque/hechizo ✓
  - Sistema robusto que no requiere mantenimiento para nuevos hechizos ✓

**Estado:** ✅ **RESUELTO (MEJORADO)** - Sistema robusto con metadata explícita implementado, listo para probar

---

### Issue #21: Código duplicado en `combat-manager.ts` para procesamiento de rolls (DEUDA TÉCNICA)

- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🟡 MEDIA (deuda técnica, no afecta funcionalidad pero dificulta mantenimiento)
- **Categoría:** Refactoring / Code Quality

- **Descripción:**
  El procesamiento de dice rolls para AI combatants está **duplicado casi idénticamente** en dos lugares:
  - **Líneas 1241-1500** (~260 líneas): Procesamiento durante turnos normales (loop de combate)
  - **Líneas 2081-2340** (~260 líneas): Procesamiento durante iniciación de combate (primer turno)

- **Problema identificado:**
  1. **~260 líneas de código duplicado** con lógica idéntica
  2. **Mantenimiento doble:** Cualquier bug fix o mejora debe aplicarse en ambos lugares
  3. **Propenso a errores:** Fácil olvidar actualizar uno de los dos lugares (ocurrió con Issue #20)
  4. **Dificulta testing:** Cada cambio debe probarse en dos contextos diferentes
  5. **Código God Object:** `combat-manager.ts` tiene 2455 líneas, de las cuales ~520 son duplicadas

- **Ejemplo real del problema:**
  Al implementar soporte para saving throw spells (Issue #20), los cambios se aplicaron inicialmente solo en las líneas 1241-1500 (turnos normales), olvidando las líneas 2081-2340 (iniciación). Esto causó que Sacred Flame no funcionara en el primer turno de combate, pero sí en turnos posteriores.

- **Código duplicado incluye:**
  - Extracción y validación de `attackType` del rollData
  - Detección de saving throw spells (keywords + metadata)
  - Procesamiento de attack rolls (validación de AC, cálculo de hit/miss)
  - Procesamiento de damage rolls (validación de attack previo, aplicación de daño)
  - Procesamiento de healing rolls
  - Actualización de HP con `validateAndClampHP`
  - Generación de mensajes del DM
  - Actualización de `DiceRoll` con información de combate
  - Detección de muerte de targets

- **Impacto:**
  - **Mantenibilidad:** Dificulta añadir nuevas mecánicas (ej: críticos, resistencias, inmunidades)
  - **Confiabilidad:** Aumenta la probabilidad de bugs por inconsistencia entre ambas versiones
  - **Testing:** Requiere probar cada cambio en dos contextos (iniciación y turnos normales)
  - **Onboarding:** Dificulta que nuevos desarrolladores entiendan el código

- **Solución propuesta:**

Extraer la lógica común en una función separada:

```typescript
/**
 * Processes dice rolls for an AI combatant (enemy or companion) during combat.
 * Handles attack rolls, damage rolls, healing rolls, and saving throw spells.
 * 
 * @returns Updated game state after processing all rolls
 */
async function processAICombatantRolls(
  activeCombatant: InitiativeEntry,
  requestedRolls: any[],
  target: Character | EnemyInCombat,
  targetVisualName: string,
  updatedParty: Character[],
  updatedEnemies: EnemyInCombat[],
  diceRolls: DiceRoll[],
  messages: Message[]
): Promise<{
  updatedParty: Character[];
  updatedEnemies: EnemyInCombat[];
  diceRolls: DiceRoll[];
  messages: Message[];
}> {
  // Toda la lógica de procesamiento de rolls aquí
  // Las ~260 líneas duplicadas se mueven aquí
}
```

Luego usar en ambos lugares:
```typescript
// En turnos normales (línea ~1241)
const result = await processAICombatantRolls(
  activeCombatant, requestedRolls, target, targetVisualName,
  updatedParty, updatedEnemies, diceRolls, messages
);
updatedParty = result.updatedParty;
updatedEnemies = result.updatedEnemies;
// ...

// En iniciación de combate (línea ~2081) - mismo código
const result = await processAICombatantRolls(
  activeCombatant, requestedRolls, target, targetVisualName,
  updatedParty, updatedEnemies, diceRolls, messages
);
// ...
```

- **Beneficios de la refactorización:**
  1. **DRY (Don't Repeat Yourself):** Una sola fuente de verdad
  2. **Mantenibilidad:** Bug fixes y mejoras en un solo lugar
  3. **Testing:** Más fácil escribir unit tests para lógica aislada
  4. **Legibilidad:** Función con propósito claro y bien definido
  5. **Extensibilidad:** Más fácil añadir nuevas mecánicas (críticos con doble daño, resistencias, etc.)

- **Relación con otros issues:**
  - **Issue #16:** Gestión de nombres (también afectado por duplicación)
  - **Refactoring general de `combat-manager.ts`:** Este issue forma parte del refactoring mayor identificado
  - **Issue #20:** El código duplicado causó que el fix de saving throw spells no funcionara en iniciación de combate

- **Prioridad:** 🟡 MEDIA
  - No afecta funcionalidad actual (ambas versiones están actualizadas ahora)
  - Importante para mantenibilidad a largo plazo
  - Debería abordarse como parte del refactoring mayor de `combat-manager.ts`

- **Estimación de esfuerzo:**
  - Extracción de función: ~2-3 horas
  - Testing exhaustivo: ~2-3 horas
  - **Total:** 4-6 horas

- **Nota importante:**
  Este refactoring debe hacerse con cuidado y testing exhaustivo. Afecta el núcleo del sistema de combate. Se recomienda:
  1. Tener tests automatizados antes de refactorizar
  2. Probar exhaustivamente después: iniciación de combate, turnos normales, saving throws, healing, etc.
  3. Considerar hacerlo como parte del refactoring mayor de `combat-manager.ts` (dividir en módulos)

**Estado:** 📝 **DOCUMENTADO** - Deuda técnica identificada, pendiente de refactoring

---

### Issue #22: Sistema completo de Saving Throws (tiradas de salvación del objetivo) 🟡 FEATURE INCOMPLETA

- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/companion-tactician.ts`, `src/ai/tools/enemy-tactician.ts`, `src/components/game/dice-roll-result.tsx`
- **Severidad:** 🟡 MEDIA (funcional pero no 100% fiel a D&D 5e)
- **Categoría:** Feature / Game Mechanics

- **Descripción:**
  Los hechizos con tiradas de salvación (saving throw spells) actualmente **funcionan** pero de forma simplificada: aplican el daño automáticamente sin simular la tirada de salvación del objetivo ni calcular el Spell Save DC del lanzador.

- **Estado actual (funciona pero incompleto):**
  ✅ El AI tactician genera correctamente el hechizo con `attackType: 'saving_throw'`
  ✅ El DM narra el hechizo (ej: "Elara alza su símbolo sagrado...")
  ✅ La tirada de daño aparece en el panel de Tiradas
  ✅ El daño se aplica al objetivo
  ✅ Mensaje específico para saving throw spells: "X sufre N puntos de daño radiante (hechizo de salvación)"
  ❌ **No se muestra la tirada de salvación del objetivo (1d20 + bonus)**
  ❌ **No se calcula el Spell Save DC del lanzador**
  ❌ **No se compara el resultado vs DC**
  ❌ **No se aplica la regla de mitad de daño si el target acierta la salvación**

- **Mecánica completa según D&D 5e:**
  ```
  PASO 1: Lanzador declara hechizo → Target específico
  PASO 2: Sistema calcula Spell Save DC del lanzador
          DC = 8 + proficiency bonus + spellcasting ability modifier
          Ejemplo: Clérigo nivel 1 (WIS +3, proficiency +2) → DC 13
  
  PASO 3: Target tira salvación (automática, generada por el sistema)
          1d20 + saving throw modifier del target
          Ejemplo: Goblin (DEX +2) → 1d20+2
  
  PASO 4: Comparar resultado vs DC
          - Si resultado < DC → Target FALLA → Daño completo
          - Si resultado >= DC → Target ACIERTA → Mitad de daño (o nada, según hechizo)
  
  PASO 5: Mostrar en panel de Tiradas:
          - Tirada de daño del lanzador (1d8, 2d6, etc.)
          - Tirada de salvación del target (1d20+modifier)
          - Resultado: "Goblin 2 falló su salvación de Destreza (10 vs DC 13)" o
                      "Goblin 2 acertó su salvación de Destreza (15 vs DC 13) - mitad de daño"
  ```

- **Impacto:**
  - **Jugabilidad:** El sistema funciona pero es menos estratégico (no hay posibilidad de que el target evite/reduzca daño)
  - **Fidelidad D&D 5e:** No sigue las reglas oficiales completamente
  - **Cosmético:** Falta información visual importante en el panel de Tiradas
  - **Balance:** Los saving throw spells son más poderosos de lo que deberían (100% de daño siempre)

- **Implementación requerida:**

  1. **Extender `Character` y `EnemyInCombat` interfaces** (`src/lib/types.ts`):
     ```typescript
     interface Character {
       // ... existing fields
       spellcastingAbility?: 'int' | 'wis' | 'cha'; // Para calcular Spell Save DC
       savingThrows: {
         str: number;
         dex: number;
         con: number;
         int: number;
         wis: number;
         cha: number;
       };
     }
     ```

  2. **Calcular Spell Save DC** en `combat-manager.ts`:
     ```typescript
     function calculateSpellSaveDC(caster: Character | EnemyInCombat): number {
       const proficiencyBonus = calculateProficiencyBonus(caster.level);
       const spellcastingModifier = caster.abilityModifiers[caster.spellcastingAbility || 'wis'];
       return 8 + proficiencyBonus + spellcastingModifier;
     }
     ```

  3. **Generar tirada de salvación automática** del target:
     ```typescript
     // Cuando se detecta attackType === 'saving_throw'
     const savingThrowType = determineSavingThrowType(spellName); // 'dex', 'wis', 'con', etc.
     const savingThrowModifier = target.savingThrows[savingThrowType];
     const savingThrowRoll = await diceRollerTool({
       roller: target.characterName,
       rollNotation: `1d20+${savingThrowModifier}`,
       description: `Tirada de salvación de ${savingThrowType.toUpperCase()} vs ${spellName}`,
     });
     ```

  4. **Comparar y aplicar daño según resultado**:
     ```typescript
     const spellSaveDC = calculateSpellSaveDC(activeCombatant);
     const savingThrowSucceeded = savingThrowRoll.totalResult >= spellSaveDC;
     
     let finalDamage = damageRoll.totalResult;
     if (savingThrowSucceeded) {
       finalDamage = Math.floor(finalDamage / 2); // Mitad de daño si acierta
     }
     
     // Aplicar finalDamage en lugar de damageRoll.totalResult
     ```

  5. **Actualizar `DiceRoll` interface** para incluir info de salvación:
     ```typescript
     interface DiceRoll {
       // ... existing fields
       savingThrowResult?: number; // Resultado de la tirada de salvación
       savingThrowDC?: number; // DC que debía superar
       savingThrowSuccess?: boolean; // Si el target acertó la salvación
       savingThrowType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'; // Tipo de salvación
     }
     ```

  6. **Actualizar `dice-roll-result.tsx`** para mostrar info completa:
     ```tsx
     {roll.savingThrowResult !== undefined && (
       <p className="text-xs text-muted-foreground/80">
         <span className="font-semibold">{roll.targetName}</span> tiró salvación de{' '}
         <span className="font-semibold">{roll.savingThrowType?.toUpperCase()}</span>:{' '}
         <span className={roll.savingThrowSuccess ? 'text-green-400' : 'text-red-400'}>
           {roll.savingThrowResult} vs DC {roll.savingThrowDC}
         </span>
         {' - '}
         {roll.savingThrowSuccess ? '¡Acertó! (mitad de daño)' : 'Falló (daño completo)'}
       </p>
     )}
     ```

  7. **Actualizar schemas de AI tacticians**:
     - Añadir campo opcional `savingThrowType` para que el AI especifique qué salvación usa el hechizo
     - Consultar `dndApiLookupTool` para obtener esta información de cada hechizo

- **Relación con otros issues:**
  - **Issue #21:** El código duplicado dificulta implementar esto (habría que hacerlo en 2 lugares)
  - **Refactoring de `combat-manager.ts`:** Esta feature debería implementarse **DESPUÉS** del refactoring
  - **Sistema de resistencias/inmunidades:** Mecánica relacionada para implementar después

- **Archivos a modificar:**
  - `src/lib/types.ts` (interfaces `Character`, `EnemyInCombat`, `DiceRoll`)
  - `src/ai/tools/combat-manager.ts` (lógica de saving throws)
  - `src/ai/tools/companion-tactician.ts` (schema con `savingThrowType`)
  - `src/ai/tools/enemy-tactician.ts` (schema con `savingThrowType`)
  - `src/components/game/dice-roll-result.tsx` (display de saving throw info)

- **Complejidad estimada:**
  - Implementación core: ~4-6 horas
  - Testing exhaustivo: ~3-4 horas
  - Ajustes de prompts y schemas: ~2 horas
  - **Total:** 9-12 horas

- **Prioridad:** 🟡 MEDIA
  - El sistema funciona actualmente (no es bloqueante)
  - Importante para fidelidad a D&D 5e
  - Mejora significativa de jugabilidad y estrategia
  - **Recomendación:** Implementar después del refactoring de `combat-manager.ts`

- **Consideraciones adicionales:**
  - Algunos hechizos hacen mitad de daño si el target acierta la salvación
  - Otros hechizos no hacen daño si el target acierta (ej: Hold Person)
  - Esta información debe venir del `dndApiLookupTool` o estar en la data del hechizo
  - También aplica a habilidades especiales de monstruos (ej: aliento de dragón)

- **Beneficios de implementar:**
  1. **Fidelidad D&D 5e:** Sistema completo según reglas oficiales
  2. **Balance:** Los enemies pueden resistir/reducir daño de hechizos
  3. **Estrategia:** Jugadores deben considerar las salvaciones de los enemies al elegir hechizos
  4. **Visual:** Panel de Tiradas más completo e informativo
  5. **Realismo:** Refleja la mecánica de "tirar para resistir" del juego de mesa

**Estado:** 📝 **DOCUMENTADO** - Feature funcional pero incompleta, pendiente de implementación completa

---

### Issue #23: Selección automática de objetivo único y manejo de acciones ambiguas 🔴 CRÍTICO ✅ RESUELTO COMPLETAMENTE

- **Ubicación:** `src/ai/tools/combat-manager.ts`
- **Severidad:** 🔴 **ALTA** (rompía el flujo de combate y causaba frustración)
- **Categoría:** Jugabilidad / UX

- **Descripción:**
  Se identificaron **tres problemas relacionados** cuando un jugador realizaba una acción de ataque sin especificar un objetivo:

  1.  **Fallo con Objetivo Único:** En un combate contra un solo enemigo, si el jugador decía "ataco con mi mandoble" (sin nombrar al único enemigo obvio), el sistema respondía "No puedes encontrar ese objetivo." y el turno del jugador se saltaba.
  2.  **Salto de Turno ante Ambigüedad:** Si una acción del jugador no estaba clara o no se podía resolver (como un ataque sin objetivo cuando había múltiples enemigos), el sistema saltaba el turno del jugador en lugar de pedir una aclaración.
  3.  **Resolución de Nombres con Acentos (BUG):** Aún después de implementar las Partes 1 y 2, el sistema seguía fallando cuando el `actionInterpreter` devolvía nombres sin acentos (ej: "manticora") pero el JSON de aventura tenía nombres con acentos (ej: "Mantícora").

- **Síntoma reportado por usuario:**
  > "cuando nos enfrentamos a un solo enemigo yo (el jugador) en mi turno digo "ataco con mi mandoble" ya que solo hay un enemigo obvio especificar mi objetivo. Entonces el DM dice "No puedes encontrar ese objetivo." no se ejecuta mi ataque y salta mi turno."

- **Causa Raíz:**
  1.  **Problema 1 & 2:** El `actionInterpreter` devolvía `actionType: 'attack'` con `targetId: null` o inferido, pero el `combat-manager.ts` no tenía lógica para auto-seleccionar targets únicos ni para pedir aclaraciones.
  2.  **Problema 3:** La función `resolveEnemyId` en `combat-manager.ts` comparaba nombres directamente (`"mantícora" === "manticora"` → false) sin normalizar acentos, causando que targets válidos no se encontraran.
  3.  **Problema 3 (detalle técnico):** El `actionInterpreter` devuelve nombres normalizados sin acentos ("manticora"), pero el JSON de la aventura tiene nombres con acentos ("Mantícora"), y la comparación de strings directa fallaba.

- **Impacto:**
  - **Crítico para la Jugabilidad:** El jugador perdía su turno de forma injusta.
  - **Rompía la Inmersión:** El comportamiento del DM era poco inteligente y frustrante.
  - **Mala Experiencia de Usuario:** Penalizaba al jugador por una acción natural y lógica.

- **Solución Implementada:**

  **Parte 1: Selección Automática de Objetivo Único ✅**
  - Modificado `src/ai/tools/combat-manager.ts` (líneas 766-842) para implementar auto-selección inteligente:
    1. Cuando `interpretedAction.actionType === 'attack'` y `targetId` es `null` o `undefined`:
       - Se filtran los enemigos vivos (`hp.current > 0`)
       - **Si solo hay 1 enemigo:** Se auto-selecciona automáticamente
       - **Si hay múltiples enemigos:** Se pide aclaración (Parte 2)
       - **Si no hay enemigos:** Se muestra mensaje y se avanza turno
    2. Logging detallado para tracking de la lógica de selección
    3. Mensaje del DM para clarificar la auto-selección: `"Galador ataca a Goblin 1."`

  **Parte 2: Petición de Aclaración con Múltiples Combatientes ✅**
  - Implementado sistema de petición de aclaración (líneas 798-826):
    1. Cuando hay múltiples combatientes posibles y no se especifica objetivo:
       - Se muestra mensaje abierto: `"No has especificado un objetivo. ¿A quién o qué quieres atacar?"`
       - **Diseño abierto:** No lista enemigos específicos para no restringir opciones (el jugador puede atacar enemigos, compañeros, PNJs, objetos, etc.)
       - **NO se avanza el `turnIndex`** (turno sigue siendo del jugador)
       - Se devuelve el estado al frontend esperando respuesta
    2. El jugador puede entonces especificar cualquier objetivo válido en la siguiente acción

  **Parte 3: Resolución de Nombres con Acentos (BUG FIX) ✅**
  - Modificada función `resolveEnemyId` en `combat-manager.ts` (líneas 595-616):
    1. **Problema identificado:** Comparación de strings directa sin normalizar acentos
       ```typescript
       // ANTES (líneas 596-609 - FALLABA)
       const exactMatch = initiativeOrder.find(c => c.characterName === targetId); // "Mantícora 1" !== "manticora"
       const matchingEnemies = enemies.filter(e => {
           const enemyBaseName = e.name || e.id?.split('-')[0] || '';
           return enemyBaseName.toLowerCase() === baseName.toLowerCase(); // "mantícora" !== "manticora"
       });
       ```
    2. **Solución implementada:** Usar función `normalizeNameForMatching` (que ya existía) para normalizar nombres
       ```typescript
       // AHORA (líneas 595-616 - FUNCIONA)
       const normalizedTargetId = normalizeNameForMatching(targetId); // "manticora" → "manticora"
       const exactMatch = initiativeOrder.find(c => 
           normalizeNameForMatching(c.characterName) === normalizedTargetId // "Mantícora 1" → "manticora 1" ✓
       );
       const normalizedBaseName = normalizeNameForMatching(baseName);
       const matchingEnemies = enemies.filter(e => {
           const enemyBaseName = e.name || e.id?.split('-')[0] || '';
           const normalizedEnemyBaseName = normalizeNameForMatching(enemyBaseName); // "Mantícora" → "manticora"
           return normalizedEnemyBaseName === normalizedBaseName; // "manticora" === "manticora" ✓
       });
       ```
    3. **Beneficio:** La función `normalizeNameForMatching` quita acentos usando `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`, asegurando que "Mantícora" y "manticora" se traten como iguales

- **Resultados:**
  - **Escenario 1 (Un enemigo):**
    - **Antes:** "ataco con mi mandoble" → "No puedes encontrar ese objetivo" → turno saltado ❌
    - **Ahora:** "ataco con mi mandoble" → Auto-selección → Ataque procesado correctamente ✅
  - **Escenario 2 (Múltiples combatientes):**
    - **Antes:** "ataco" → Fallo → Turno saltado ❌
    - **Ahora:** "ataco" → "No has especificado un objetivo. ¿A quién o qué quieres atacar?" → Turno NO avanza, espera respuesta ✅
  - **Escenario 3 (Sin enemigos):**
    - **Ahora:** "ataco" → "No hay enemigos vivos para atacar." → Turno avanza (comportamiento correcto) ✅
  - **Escenario 4 (Nombres con acentos - BUG FIX):**
    - **Antes:** "ataco" → actionInterpreter infiere `targetId="manticora"` → resolveEnemyId no encuentra "Mantícora" (con acento) → "No puedes encontrar ese objetivo" → turno saltado ❌
    - **Ahora:** "ataco" → actionInterpreter infiere `targetId="manticora"` → resolveEnemyId normaliza y encuentra "Mantícora" (con acento) → Ataque procesado correctamente ✅

- **Archivos Modificados:**
  - `src/ai/tools/combat-manager.ts`
    - **Parte 1 & 2** (líneas 766-1109): Auto-selección de target único y petición de aclaración
      - Eliminada condición `&& interpretedAction.targetId` que causaba el problema
      - Añadida lógica de inferencia de `targetIdToUse`
      - Implementado sistema de petición de aclaración
      - Todo el procesamiento del ataque ahora está dentro de `if (targetIdToUse)`
    - **Parte 3** (líneas 595-616): Resolución de nombres con acentos
      - Función `resolveEnemyId` ahora usa `normalizeNameForMatching` en dos lugares
      - Paso 2: Búsqueda en `initiativeOrder` por `characterName` (ahora normalizado)
      - Paso 3: Búsqueda por base name en `enemies` (ahora normalizado)

- **Impacto:**
  - ✅ Mejora drástica de UX en combate
  - ✅ Elimina turnos perdidos injustamente
  - ✅ Comportamiento más inteligente del DM
  - ✅ Sistema más justo y predecible para el jugador
  - ✅ Reduce frustración y mejora inmersión
  - ✅ Funciona correctamente con nombres que tienen acentos (español auténtico)
  - ✅ Robusto ante inconsistencias de normalización del AI

**Estado:** ✅ **RESUELTO COMPLETAMENTE** - Las 3 partes implementadas, testeadas y funcionando

---

### Issue #24: Helper `eq` de Handlebars no disponible en Genkit bloqueaba reacciones de compañeros 🔴 CRÍTICO ✅ RESUELTO

- **Ubicación:** `src/ai/tools/companion-expert.ts`
- **Severidad:** 🔴 **ALTA** (bloqueaba completamente el sistema de reacciones de compañeros)
- **Categoría:** Bug / Compatibilidad de framework

- **Descripción:**
  El prompt de `companion-expert.ts` usaba el helper `eq` de Handlebars para comparar strings (`{{#if (eq reactionTiming "before_dm")}}`), pero **Genkit usa Handlebars con `knownHelpersOnly: true`**, que no incluye el helper `eq`.

- **Síntoma reportado por usuario:**
  > "En mi última prueba los compañeros no reaccionan a nada."

- **Error en Terminal:**
  ```
  Error: You specified knownHelpersOnly, but used the unknown helper eq - 15:10
      at Compiler.helperSexpr (T:\...\node_modules_handlebars_dist_cjs_670ea975._.js:8017:19)
      ...
  ```
  Este error se repetía para cada compañero (Elara, Merryl) y para cada momento de reacción (`before_dm`, `after_dm`).

- **Causa Raíz:**
  - Genkit/Handlebars no proporciona el helper `eq` por defecto
  - La sintaxis `{{#if (eq variable "valor")}}` es inválida en este contexto
  - El error ocurría en las líneas 49 y 56 del template del prompt

- **Impacto:**
  - **Crítico para la jugabilidad:** Ningún compañero reaccionaba a ninguna acción del jugador
  - **Sistema completo bloqueado:** Las reacciones `before_dm` y `after_dm` fallaban silenciosamente
  - **Mala experiencia de usuario:** Los compañeros parecían "mudos" o desconectados

- **Solución Implementada:**

**Cambio 1: Schema del prompt** (líneas 29-34)
```typescript
// ANTES (NO FUNCIONABA):
input: {schema: z.object({
    character: CharacterSchema,
    context: z.string(),
    reactionTiming: z.string().optional(), // ❌ Requería helper 'eq' para comparar
})}

// AHORA (FUNCIONA):
input: {schema: z.object({
    character: CharacterSchema,
    context: z.string(),
    isBeforeDm: z.boolean().optional(), // ✅ Directo en template
    isAfterDm: z.boolean().optional(),   // ✅ Directo en template
})}
```

**Cambio 2: Template del prompt** (líneas 48 y 56)
```handlebars
<!-- ANTES (NO FUNCIONABA): -->
{{#if (eq reactionTiming "before_dm")}} ❌ Helper 'eq' no existe
{{#if (eq reactionTiming "after_dm")}}  ❌ Helper 'eq' no existe

<!-- AHORA (FUNCIONA): -->
{{#if isBeforeDm}} ✅ Variable booleana directa
{{#if isAfterDm}}  ✅ Variable booleana directa
```

**Cambio 3: Llamada al prompt** (líneas 109-114)
```typescript
// ANTES:
await reactionGenerationPrompt({
    character: characterData,
    context: context,
    reactionTiming: input.reactionTiming || 'after_dm',
});

// AHORA:
await reactionGenerationPrompt({
    character: characterData,
    context: context,
    isBeforeDm: input.reactionTiming === 'before_dm',
    isAfterDm: input.reactionTiming === 'after_dm' || !input.reactionTiming,
});
```

- **Resultados:**
  - ✅ **Errores de Handlebars eliminados** (no más `unknown helper eq`)
  - ✅ **Reacciones `before_dm` funcionan** (compañeros reaccionan a propuestas del jugador)
  - ✅ **Reacciones `after_dm` funcionan** (compañeros reaccionan a narración del DM)
  - ✅ **Sistema de dos momentos restaurado** (jugabilidad normal)

- **Archivos Modificados:**
  - `src/ai/tools/companion-expert.ts` (líneas 27-77, 109-114)
  - `docs/arquitectura/reacciones-companeros.md` (añadida sección sobre este fix)

- **Lección Aprendida:**
  - Genkit/Handlebars tiene limitaciones en helpers disponibles
  - Para comparaciones en templates, usar variables booleanas pre-calculadas es más robusto
  - Importante testear templates de prompts con datos reales para detectar estos errores temprano

- **Relacionado con:**
  - Sistema de reacciones de compañeros en dos momentos (feature principal)
  - `docs/arquitectura/reacciones-companeros.md`

**Estado:** ✅ **RESUELTO** - Sistema de reacciones funcionando completamente

---

### Issue #25: Logs del navegador colapsados por defecto 🟡 ADVERTENCIA

- **Ubicación:** Consola del navegador (frontend)
- **Severidad:** 🟡 **BAJA** (mejora de UX/legibilidad)
- **Categoría:** Interfaz de Usuario / UX

- **Descripción:**
  Los logs de estado en la consola del navegador aparecen expandidos por defecto, lo que dificulta la legibilidad cuando hay muchos logs.

- **Problema:**
  - Los logs ocupan mucho espacio visual
  - Dificulta encontrar información específica
  - Mejora de UX necesaria para desarrollo

- **Impacto:**
  - **Bajo:** No afecta funcionalidad, solo legibilidad durante desarrollo
  - Mejora la experiencia del desarrollador al depurar

- **Solución propuesta:**
  - Hacer que los logs de estado aparezcan colapsados por defecto
  - Permitir expandirlos al hacer clic si se necesita ver detalles

- **Archivos afectados:**
  - Componente que renderiza los logs en la consola del navegador (frontend)

**Estado:** 📝 **PENDIENTE** - Mejora de UX pendiente de implementación

---

### Issue #26: Compañero muerto sigue reaccionando después de combate 🔴 CRÍTICO

- **Ubicación:** `src/ai/tools/companion-expert.ts`, `src/ai/flows/game-coordinator.ts`
- **Severidad:** 🔴 **MUY ALTA** (rompe la inmersión y lógica del juego)
- **Categoría:** Sistema de Personajes / Lógica de juego

- **Descripción:**
  Después de un combate, si uno de los compañeros ha muerto, el sistema sigue generando reacciones para ese compañero como si estuviera vivo.

- **Síntoma reportado por usuario:**
  > "Después de un combate, uno de nuestros compañeros ha muerto sin embargo sigue reaccionando a nuestros comentarios."

- **Causa Raíz:**
  - El sistema de reacciones de compañeros (`companion-expert.ts`) no verifica el estado de vida (`hp.current > 0`) antes de generar reacciones
  - `game-coordinator.ts` no filtra compañeros muertos antes de llamar a `companionExpertTool`

- **Impacto:**
  - **Crítico para la inmersión:** Rompe completamente la lógica del juego
  - **Confusión del jugador:** Los compañeros muertos "hablan desde el más allá"
  - **Inconsistencia:** El sistema muestra que están muertos pero siguen reaccionando

- **Solución propuesta:**
  1. En `game-coordinator.ts`, antes de generar reacciones de compañeros:
     - Filtrar compañeros con `hp.current <= 0`
     - Solo procesar reacciones para compañeros vivos
  2. En `companion-expert.ts` (opcional, defensivo):
     - Verificar estado de vida antes de generar reacción
     - Retornar `{ action: "" }` si el compañero está muerto

- **Archivos afectados:**
  - `src/ai/flows/game-coordinator.ts` (líneas donde se generan reacciones de compañeros)
  - `src/ai/tools/companion-expert.ts` (validación defensiva opcional)

- **Relacionado con:**
  - Issue #27: Verificación de muerte de personajes (más amplio)
  - Sistema de reacciones de compañeros en dos momentos

- **Solución Implementada:**

**Cambio 1: Filtrado en `game-coordinator.ts` (líneas 178 y 243)**
```typescript
// ANTES (NO FILTRABA COMPAÑEROS MUERTOS):
for (const character of party) {
    if (character.controlledBy === 'AI') {
        // ... generar reacción
    }
}

// AHORA (FILTRA COMPAÑEROS MUERTOS):
for (const character of party) {
    // Issue #26: Skip dead companions - they cannot react
    if (character.controlledBy === 'AI' && character.hp.current > 0) {
        // ... generar reacción
    }
}
```

**Cambio 2: Validación defensiva en `companion-expert.ts` (líneas 102-111)**
```typescript
// Issue #26: Defensive check - dead companions cannot react
if (characterData.hp && characterData.hp.current <= 0) {
    log.debug('Skipping reaction for dead companion', { 
        module: 'AITool',
        tool: 'companionExpertTool',
        characterName,
        hp: characterData.hp.current,
    });
    return { action: "" };
}
```

- **Resultados:**
  - ✅ **Compañeros muertos ya no reaccionan** (ni `before_dm` ni `after_dm`)
  - ✅ **Doble protección:** Filtrado en `game-coordinator.ts` + validación defensiva en `companion-expert.ts`
  - ✅ **Mejora de inmersión:** El sistema respeta el estado de vida de los personajes
  - ✅ **Logging mejorado:** Se registra cuando se omite una reacción por muerte

- **Archivos Modificados:**
  - `src/ai/flows/game-coordinator.ts` (líneas 178 y 243)
  - `src/ai/tools/companion-expert.ts` (líneas 102-111)

**Estado:** ✅ **RESUELTO** - Compañeros muertos ya no generan reacciones

---

### Issue #27: Verificación de muerte de personajes en combate y fuera de combate 🔴 CRÍTICO

- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/flows/game-coordinator.ts`, `src/ai/tools/combat-initiation-expert.ts`, `src/ai/flows/action-interpreter.ts`
- **Severidad:** 🔴 **ALTA** (afecta jugabilidad y lógica del juego)
- **Categoría:** Sistema de Combate / Lógica de juego

- **Descripción:**
  El sistema no verificaba consistentemente el estado de vida de los personajes antes de permitirles actuar, participar en combates o generar acciones.

- **Problemas identificados:**
  1. **En combate:** Personajes muertos podían recibir turnos o acciones
  2. **Iniciación de combate:** Enemigos y compañeros muertos se incluían en nuevos combates
  3. **Interpretación de ataques:** El jugador podía atacar enemigos muertos
  4. **Jugador muerto:** El sistema seguía preguntando qué quiere hacer al jugador muerto
  5. **Muerte del grupo:** No había detección de "game over" cuando todo el grupo muere

- **Impacto:**
  - **Crítico para la jugabilidad:** Rompía las reglas básicas de D&D
  - **Frustración del jugador:** El juego permitía acciones imposibles
  - **Falta de consecuencias:** La muerte no tenía impacto real en el juego

- **Solución Implementada (6 Fases):**

**Fase 1: Filtrar combatientes muertos en iniciación de combate** (`combat-manager.ts` líneas 1729-1754)
```typescript
// Verificar HP antes de incluir en combatantData
if (found.hp && found.hp.current > 0) {
    combatantData.push({ ...found, entityType: 'player', ... });
}
// Similar para enemigos, verificando en updatedEnemies
```

**Fase 2: Filtrar enemigos muertos en `combatInitiationExpertTool`** (`combat-initiation-expert.ts`)
```typescript
// Añadido updatedEnemies al schema
updatedEnemies: z.array(z.any()).optional()

// Filtrar enemigos muertos antes de pasar a IA
const aliveEntityIds = updatedEnemies 
    ? allEntityIds.filter(id => {
        const enemy = updatedEnemies.find(...);
        return !enemy || (enemy.hp && enemy.hp.current > 0);
    })
    : allEntityIds;
```

**Fase 3: Mejorar `actionInterpreter`** (`action-interpreter.ts` líneas 180-215)
```typescript
// Filtrar enemigos muertos antes de interpretar ataques
const aliveEntities = locationContextObj.entitiesPresent.filter((entity: any) => {
    if (!input.updatedEnemies) return true;
    const enemy = input.updatedEnemies.find(...);
    return !enemy || (enemy.hp && enemy.hp.current > 0);
});

if (aliveEntities.length === 0) {
    return { actionType: 'narrate', targetId: null };
}
```

**Fase 4: Verificar muerte del jugador** (`game-coordinator.ts` líneas 55-83)
```typescript
const player = party.find(p => p.controlledBy === 'Player') || party[0];
if (player && player.hp && player.hp.current <= 0) {
    const allDead = party.every(p => p.hp && p.hp.current <= 0);
    if (allDead) {
        return { messages: [{ sender: 'DM', content: 'Game over...' }], ... };
    }
    return { messages: [{ sender: 'DM', content: 'Jugador inconsciente...' }], ... };
}
```

**Fase 5: Actualizar llamadas** (`game-coordinator.ts`)
```typescript
// Pasar updatedEnemies a actionInterpreter (línea 123)
updatedEnemies: input.enemies

// Pasar updatedEnemies a combatInitiationExpertTool (línea 158)
updatedEnemies: input.enemies
```

**Fase 6: Verificar muerte en iniciación de combate** (`combat-manager.ts` líneas 2029-2049)
```typescript
// Similar a verificación en turnos normales
const activeCombatantDataInit = isCompanion 
    ? updatedParty.find(p => p.id === activeCombatant.id)
    : updatedEnemies.find(e => e.uniqueId === activeCombatant.id);

if (activeCombatantDataInit && activeCombatantDataInit.hp.current <= 0) {
    // Skip turn, advance to next
    continue;
}
```

- **Principio de diseño:**
  - Los cadáveres permanecen en `locationContext.entitiesPresent` como objetos narrativos
  - Se filtran SOLO para selección de combatientes y ataques
  - Mantiene consistencia narrativa del mundo

- **Resultados:**
  - ✅ Enemigos muertos no inician nuevos combates
  - ✅ Compañeros muertos no toman turnos
  - ✅ Jugador muerto muestra mensaje apropiado
  - ✅ Detección de "game over" funcional
  - ✅ Cadáveres permanecen para narrativa
  - ✅ Sistema robusto con múltiples capas de verificación

- **Archivos modificados:**
  - `src/ai/tools/combat-manager.ts` (líneas 1729-1754, 2029-2049)
  - `src/ai/tools/combat-initiation-expert.ts` (líneas 26-85, prompt)
  - `src/ai/flows/action-interpreter.ts` (líneas 180-215)
  - `src/ai/flows/game-coordinator.ts` (líneas 55-83, 123, 158)
  - `src/ai/flows/schemas.ts` (línea 15)

- **Relacionado con:**
  - Issue #26: Compañero muerto sigue reaccionando (resuelto independientemente)
  - [Sistema de Death Saving Throws y Revivencia](../planes-desarrollo/sin-comenzar/sistema-death-saving-throws.md) (plan futuro)

**Mejora adicional implementada (Sistema de Inconsciencia y Muerte Masiva):**
- [2024] Implementada distinción entre "inconsciente" (HP 0, isDead = false) y "muerto" (isDead = true) según regla de muerte masiva D&D 5e
- Regla: Muerte instantánea si `daño restante >= hp.max` (donde `daño restante = damage - hp.current`)
- Narrativa mejorada: mensajes específicos para inconsciente vs muerte, narrativa de revivencia al recibir curación
- Verificaciones expandidas en `game-coordinator.ts` distinguen entre ambos estados
- Solo aplicable a jugador/compañeros; enemigos mantienen comportamiento simple (HP 0 = derrotado)
- Base sólida para futuro sistema de Death Saving Throws ([plan detallado](../planes-desarrollo/sin-comenzar/sistema-death-saving-throws.md))

**Estado:** ✅ **RESUELTO** - Sistema completo de verificación de muerte implementado con distinción inconsciente/muerto

---

### Issue #28: Visualización de barra de vida en panel Grupo 🟡 ADVERTENCIA

- **Ubicación:** `src/components/game/` (componente del panel Grupo)
- **Severidad:** 🟡 **MEDIA** (bug visual)
- **Categoría:** Interfaz de Usuario / Visual

- **Descripción:**
  En el panel Grupo, cuando un personaje está seleccionado, la visualización de la barra de vida no se muestra correctamente. El trozo de la barra que está vacío (HP perdido) no se ve bien.

- **Síntoma reportado por usuario:**
  > "En el panel Grupo cuando un personaje está seleccionado no se ve bien el trozo de la barra de vida que está vacío."

- **Problema:**
  - Posible problema de CSS/styling cuando el personaje está seleccionado
  - La barra de vida puede tener un color de fondo que se confunde con el estado seleccionado
  - O el contraste no es suficiente para distinguir HP perdido

- **Impacto:**
  - **Medio:** Afecta la legibilidad de la información de HP
  - **UX:** El jugador no puede ver claramente cuánto HP ha perdido el personaje seleccionado

- **Solución propuesta:**
  - Revisar el CSS del componente del panel Grupo
  - Asegurar que la barra de vida tenga suficiente contraste cuando el personaje está seleccionado
  - Posiblemente usar colores diferentes o bordes más marcados para el estado seleccionado

- **Archivos afectados:**
  - Componente del panel Grupo (frontend)
  - Estilos CSS relacionados

**Estado:** 📝 **PENDIENTE** - Bug visual pendiente de corrección

---

### Issue #29: Stats de enemigos incorrectos en combate 🟡 ADVERTENCIA

- **Ubicación:** `src/ai/tools/combat-initiation-expert.ts`, sistema de obtención de stats de enemigos
- **Severidad:** 🟡 **MEDIA** (afecta balance del juego)
- **Categoría:** Sistema de Combate / Datos de enemigos

- **Descripción:**
  Los stats de los enemigos (especialmente HP) no se están obteniendo correctamente desde las fichas oficiales de D&D. Los enemigos tienen menos HP del que deberían tener según su ficha oficial.

- **Síntoma reportado por usuario:**
  > "Cuando luchamos contra la mantícora parece que tiene menos HP de los que debería tener según su ficha oficial de D&D."

- **Causa Raíz posible:**
  1. **Problema en la API de D&D:** Los datos obtenidos de la API pueden estar incompletos o incorrectos
  2. **Problema en el parseo:** El sistema puede no estar parseando correctamente los HP desde la ficha del monstruo
  3. **Problema en la inicialización:** Los HP pueden no estar inicializándose correctamente al crear el enemigo en combate
  4. **Datos cacheados incorrectos:** Si hay caché de datos de monstruos, puede estar desactualizado o incorrecto

- **Impacto:**
  - **Medio:** Afecta el balance del combate
  - **Jugabilidad:** Los combates pueden ser más fáciles de lo que deberían ser
  - **Inmersión:** Rompe la fidelidad a las reglas oficiales de D&D

- **Solución propuesta:**
  1. **Verificar obtención de datos:**
     - Revisar cómo se obtienen los HP desde la API de D&D
     - Verificar que se está usando el campo correcto (ej: `hit_points` vs `hp`)
  2. **Verificar inicialización:**
     - Revisar `combat-initiation-expert.ts` y cómo se inicializan los enemigos
     - Asegurar que los HP se inicializan correctamente desde la ficha del monstruo
  3. **Añadir logging:**
     - Loggear los HP obtenidos vs los esperados para debugging
  4. **Verificar caché:**
     - Si hay caché de datos de monstruos, verificar que está actualizado

- **Archivos afectados:**
  - `src/ai/tools/combat-initiation-expert.ts` (inicialización de enemigos)
  - Sistema de obtención de datos de monstruos (API o caché)
  - Posiblemente `src/lib/dnd-api.ts` o similar

- **Relacionado con:**
  - Issue #20: Compendio de D&D Local (mejora de obtención de datos)

**Estado:** 📝 **PENDIENTE** - Bug de datos pendiente de investigación y corrección

---

### Issue #30: Errores de conexión a APIs con logs verbosos 🟡 ADVERTENCIA

- **Ubicación:** `src/ai/flows/action-interpreter.ts` y otros módulos que usan APIs
- **Severidad:** 🟡 **MEDIA** (afecta legibilidad de logs)
- **Categoría:** Calidad y Pulido / Logging

- **Descripción:**
  Los errores de conexión a las APIs (especialmente Gemini API) generan logs muy verbosos que ocupan mucho espacio en la terminal, dificultando la lectura de otros logs importantes.

- **Problema:**
  - Los stack traces completos de errores de conexión son muy largos
  - Se repiten múltiples veces durante un fallo
  - Ocupan demasiado espacio visual en la terminal
  - Dificultan encontrar otros logs importantes

- **Impacto:**
  - **Medio:** Afecta la experiencia del desarrollador al depurar
  - **Productividad:** Dificulta encontrar información relevante en los logs

- **Solución propuesta:**
  1. **Simplificar mensajes de error:**
     - Mostrar solo el mensaje esencial del error (ej: "Timeout conectando a Gemini API")
     - Ocultar el stack trace completo a menos que se active modo debug
  2. **Agrupar errores repetidos:**
     - Si el mismo error ocurre múltiples veces, mostrar un resumen (ej: "Error de conexión ocurrió 5 veces")
  3. **Usar niveles de log apropiados:**
     - Errores de conexión transitorios pueden ser `warn` en lugar de `error`
     - Solo mostrar `error` si es crítico

- **Archivos afectados:**
  - `src/ai/flows/action-interpreter.ts` (retry logic y logging)
  - Otros módulos que manejan errores de API
  - `src/lib/logger.ts` (posible mejora de formato de errores)

- **Relacionado con:**
  - Issue #13: Connect Timeout Error (ya tiene retry logic, pero los logs pueden mejorarse)

**Estado:** 📝 **PENDIENTE** - Mejora de logging pendiente de implementación

---

### Issue #31: Gestión de ataques múltiples en combate 🟢 MEJORA

- **Ubicación:** `src/ai/tools/combat-manager.ts`, `src/ai/tools/enemy-tactician.ts`
- **Severidad:** 🟢 **BAJA** (funcionalidad incompleta)
- **Categoría:** Sistema de Combate / Mecánicas de combate

- **Descripción:**
  Algunos enemigos (como la mantícora) tienen múltiples ataques en su turno según las reglas de D&D 5e, pero el sistema parece solo procesar un ataque por turno.

- **Síntoma reportado por usuario:**
  > "La mantícora hace varios ataques en su turno pero parece que el sistema solo tiene en cuenta 1."

- **Causa Raíz posible:**
  1. **AI Tactician:** El `enemyTacticianTool` puede no estar generando múltiples ataques cuando corresponde
  2. **Procesamiento:** El `combat-manager.ts` puede estar procesando solo el primer ataque de la lista
  3. **Datos de monstruo:** La ficha del monstruo puede no incluir información sobre múltiples ataques

- **Impacto:**
  - **Bajo:** Afecta la fidelidad a las reglas de D&D
  - **Balance:** Los enemigos con múltiples ataques son menos peligrosos de lo que deberían ser

- **Solución propuesta:**
  1. **Verificar datos de monstruo:**
     - Asegurar que las fichas de monstruos incluyen información sobre múltiples ataques
  2. **Mejorar AI Tactician:**
     - El prompt de `enemyTacticianTool` debe instruir a la IA a generar múltiples ataques cuando el monstruo los tiene
  3. **Procesar todos los ataques:**
     - En `combat-manager.ts`, procesar todos los ataques generados por el AI Tactician, no solo el primero
  4. **Validar orden:**
     - Asegurar que los ataques múltiples se procesan en el orden correcto

- **Archivos afectados:**
  - `src/ai/tools/enemy-tactician.ts` (prompt y generación de ataques)
  - `src/ai/tools/combat-manager.ts` (procesamiento de ataques múltiples)
  - Sistema de obtención de datos de monstruos

- **Relacionado con:**
  - Issue #29: Stats de enemigos incorrectos (ambos relacionados con datos de monstruos)
  - Issue #45: Gestión de ataques múltiples que matan (caso especial)

**Estado:** 📝 **PENDIENTE** - Funcionalidad incompleta pendiente de implementación

---

### Issue #32: Paneles de combate se limpian de forma inconsistente 🟢 MEJORA

- **Ubicación:** `src/components/game/` (componentes de paneles de combate)
- **Severidad:** 🟢 **BAJA** (inconsistencia de UX)
- **Categoría:** Interfaz de Usuario / UX

- **Descripción:**
  Al terminar un combate, el panel de orden de combate se limpia automáticamente, pero el panel de tiradas no se limpia. Esta inconsistencia puede confundir al jugador.

- **Síntoma reportado por usuario:**
  > "Al terminar el combate el panel de orden de combate se limpia pero el de tiradas no."

- **Problema:**
  - Inconsistencia en el comportamiento de los paneles
  - El jugador puede querer revisar las tiradas después del combate
  - O puede querer que ambos paneles se mantengan limpios

- **Impacto:**
  - **Bajo:** Inconsistencia de UX, no afecta funcionalidad
  - **Confusión:** El jugador puede esperar que ambos paneles se comporten igual

- **Solución propuesta:**
  1. **No limpiar automáticamente ningún panel:**
     - Mantener ambos paneles con su contenido después del combate
  2. **Implementar botón de limpieza manual:**
     - Añadir un botón para limpiar los paneles cuando el jugador lo desee
     - Solo disponible cuando estamos fuera de combate
  3. **Consistencia:**
     - Ambos paneles deben comportarse igual (ambos se limpian o ambos se mantienen)

- **Archivos afectados:**
  - Componentes de paneles de combate (frontend)
  - Lógica de limpieza de paneles al terminar combate

**Estado:** 📝 **PENDIENTE** - Mejora de UX pendiente de implementación

---

### Issue #33: Logs muestran turnIndex cuando inCombat es false 🟢 MEJORA

- **Ubicación:** `src/lib/logger.ts`, llamadas a `log.gameCoordinator`
- **Severidad:** 🟢 **MUY BAJA** (inconsistencia menor en logs)
- **Categoría:** Calidad y Pulido / Logging

- **Descripción:**
  Los logs muestran `turnIndex` incluso cuando `inCombat` es `false`, lo cual no tiene sentido ya que fuera de combate no hay turnos.

- **Problema:**
  - Inconsistencia en los logs
  - Información confusa o irrelevante cuando no hay combate
  - Puede confundir al leer los logs

- **Impacto:**
  - **Muy bajo:** Solo afecta la legibilidad de los logs
  - **No crítico:** No afecta funcionalidad

- **Solución propuesta:**
  - En `log.gameCoordinator`, solo incluir `turnIndex` en el contexto cuando `inCombat === true`
  - O filtrar `turnIndex` del contexto antes de loggear si `inCombat` es `false`

- **Archivos afectados:**
  - `src/lib/logger.ts` (función `gameCoordinator`)
  - Llamadas a `log.gameCoordinator` que pasan `turnIndex` cuando `inCombat` es `false`

**Estado:** 📝 **PENDIENTE** - Mejora menor de logging pendiente de implementación

