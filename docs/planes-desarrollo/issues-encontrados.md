# Issues Encontrados Durante el Saneamiento

Este documento registra todos los problemas, bugs y mejoras identificados durante la revisión sistemática de la aplicación.

**Fecha de inicio:** Durante el saneamiento general de la aplicación  
**Última actualización:** 16 issues identificados, 10 corregidos (63%), 7 mejoras opcionales documentadas

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

### Issue #13: Manejo de errores de conectividad/timeout en llamadas a la API de Gemini
- **Ubicación:** `src/ai/flows/action-interpreter.ts` y otros flows/tools que usan prompts de Genkit
- **Severidad:** Media
- **Descripción:** Cuando hay problemas de conectividad o timeout al llamar a la API de Google Gemini, los errores no se manejan de forma específica, causando que el sistema haga fallback genérico (ej: `actionType: 'narrate'` en lugar de `'attack'`) sin informar claramente al usuario sobre el problema.
- **Problema:** 
  - Los errores de timeout/conectividad (`Connect Timeout Error`, `UND_ERR_CONNECT_TIMEOUT`) no se detectan específicamente
  - El usuario no recibe un mensaje claro sobre el problema de conectividad
  - El sistema hace fallback silencioso que puede cambiar el comportamiento esperado (ej: no iniciar combate cuando debería)
- **Impacto:** Medio (afecta la experiencia del usuario cuando hay problemas de red, puede causar comportamientos inesperados)
- **Solución propuesta:** 
  - Detectar específicamente errores de timeout/conectividad en los flows y tools
  - Mostrar mensajes claros al usuario indicando el problema de conectividad
  - Ofrecer opción de reintentar la acción
  - Considerar implementar retry automático con backoff exponencial para errores transitorios
  - Mejorar el logging para distinguir entre errores de red y otros tipos de errores
- **Estado:** 📝 Pendiente (mejora recomendada para mejor UX)

### Issue #14: Enemigos a veces no eligen acción (targetId=null) en combate
- **Ubicación:** `src/ai/tools/enemy-tactician.ts`, `src/ai/tools/combat-manager.ts`
- **Severidad:** Media
- **Descripción:** Durante el combate, algunos enemigos (especialmente cuando la IA no encuentra información en la D&D API) devuelven `targetId=null` y `hasDiceRolls=false`, causando que no realicen ninguna acción en su turno.
- **Problema:** 
  - El prompt del `enemyTacticianTool` no es lo suficientemente enfático sobre que SIEMPRE debe atacar
  - Cuando la IA no encuentra información en la D&D API, a veces no elige un objetivo
  - El código actual solo registra un log cuando `targetId` es null, pero no toma acción por defecto
  - Esto causa que los enemigos "pasen" su turno sin hacer nada
- **Impacto:** Medio (afecta la experiencia de combate, los enemigos deberían ser siempre agresivos)
- **Solución propuesta:** 
  - Mejorar el prompt del `enemyTacticianTool` para ser más enfático: añadir regla explícita "YOU MUST ALWAYS ATTACK" similar a la regla "YOU MUST NOT BE PASSIVE" del `companionTacticianTool`
  - Añadir lógica de fallback en `combat-manager.ts`: si `targetId` es null, elegir automáticamente el personaje más vulnerable o el primero de la lista
  - Considerar hacer el prompt más simple y directo: "You MUST attack. Choose the most vulnerable target."
  - Añadir validación más estricta del output antes de procesarlo
- **Estado:** 📝 Pendiente (mejora recomendada para mejor experiencia de combate)

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

