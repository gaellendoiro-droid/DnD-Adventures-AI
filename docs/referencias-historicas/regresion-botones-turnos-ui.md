# Plan completado: Corrección regresión botones de avance de turno en la UI

**Estado:** ✅ **COMPLETADO**  
**Fecha de finalización:** 2025-11-26  
**Issue relacionado:** [Issue #130](../../tracking/issues/corregidos.md#issue-130-regresión-ui---botones-de-avance-de-turno-no-aparecen-tras-refactor--resuelto)

## Contexto
- Tras la refactorización de la UI del chat/combat tracker, los botones **“Avanzar 1 turno”** y **“Avance automático”** dejaron de mostrarse de forma consistente.
- El backend sigue devolviendo correctamente los flags `hasMoreAITurns` y `lastProcessedTurnWasAI`, pero el frontend no los refleja.
- Impacta tanto al flujo “IA → Jugador” como al de “IA → IA”, bloqueando el combate paso a paso y dejando al usuario sin forma de continuar.
- Ya disponemos de logs completos para ambos escenarios:
  - **IA → Jugador (primer turno IA, siguiente jugador)** – Logs del 25-11-25 21:28-21:29:

    ```
    2025-11-25 21:29:55.966 INFO Returning result ... turnIndex=1 ... hasMoreAITurns=false
    2025-11-25 21:29:56.035 INFO turnIndexRef updated ... newRefValue=1 ... lastProcessedTurnWasAI=true ... hasMoreAITurns=false
    2025-11-25 21:29:56.080 INFO Backend processed AI turn ... displayIndex=0 ... nextTurnIndex=1 ... hasMoreAITurns=false
    2025-11-25 21:29:56.080 INFO Setting justProcessedAITurn=true ... lastProcessedTurnIndex=0
    ```

    - `turnIndexRef` → 1 (jugador Galador) mientras `turnIndex` visual permanece en 0 (IA procesada).
    - `hasMoreAITurns=false`, `lastProcessedTurnWasAI=true`, `justProcessedAITurn=true`.
    - `isPlayerTurn` continúa evaluándose como `false` al usar el índice visual, por lo que no aparece “Es tu turno…”.

  - **IA → IA (primer turno IA, siguiente IA)** – Logs del 26-11-26 08:57:

    ```
    2025-11-26 08:57:45.734 INFO Returning result ... turnIndex=1 ... hasMoreAITurns=true
    2025-11-26 08:57:45.770 INFO turnIndexRef updated ... newRefValue=1 ... lastProcessedTurnWasAI=true ... hasMoreAITurns=true
    2025-11-26 08:57:45.785 INFO Backend processed AI turn ... displayIndex=0 ... nextTurnIndex=1 ... hasMoreAITurns=true
    2025-11-26 08:57:45.785 INFO Setting justProcessedAITurn=true ... lastProcessedTurnIndex=0
    ```

    - Backend indica correctamente que el siguiente turno (Merryl) también es de IA (`hasMoreAITurns=true`).
    - Aun con `justProcessedAITurn=true`, la UI no muestra los botones previstos.


## Objetivo
- Restablecer el comportamiento anterior garantizando que los controles de avance aparecen siempre que el backend indique que corresponde.
- Documentar la causa raíz de la regresión y blindar el flujo con verificaciones y tests para prevenir reincidencias.

## Alcance
Incluido:
1. Diagnóstico exhaustivo del estado del frontend tras recibir los flags del backend.
2. Ajustes en `game-view.tsx`, `chat-panel.tsx` y componentes relacionados para que los botones se rendericen correctamente.
3. Instrumentación temporal (logs) para validar el comportamiento en escenarios IA→IA e IA→Jugador.
4. Tests manuales / automáticos mínimos para validar el flujo completo de turnos.
5. Actualización de documentación y issues tracking.

Excluido:
- Cambios en la lógica del backend (`combat-session.ts`, `combat-manager.ts`) salvo que el diagnóstico demuestre un fallo real allí.
- Mejoras UX no relacionadas (animaciones, estilos, nuevos botones).

## Plan de acción

### Fase 1 – Reproducción y diagnóstico (Owner: Frontend)
1. Reproducir ambos escenarios (logs base ya capturados en 2025-11-25 21:28 y 2025-11-26 08:57):
   - Primer turno IA → siguiente IA.
   - Primer turno IA → siguiente Jugador.
2. Capturar estado de `inCombat`, `hasMoreAITurns`, `justProcessedAITurn`, `playerActionCompleted`, `autoAdvancing`, `turnIndex`, `turnIndexRef.current`, `onPassTurn`, `onAdvanceAll`.
3. Verificar si algún efecto (`setJustProcessedAITurn(false)`, limpieza de estados) se dispara inmediatamente y oculta los botones antes de pintar.

### Fase 2 – Instrumentación y validación continua
1. Añadir logs `logClient.uiEvent` en `ChatPanel` para inspeccionar la condición que controla la visibilidad.
2. Añadir log cuando `PlayerInput` calcula `isPlayerTurn` para asegurar que usa el índice correcto tras turnos IA.
3. Mantener instrumentación activada hasta completar QA, luego retirarla o guardarla tras bandera `process.env.NEXT_PUBLIC_DEBUG_UI`.

### Fase 3 – Corrección de la UI
1. Revisar regresión introducida al simplificar la lógica de sincronización de turnos (cambio destacado en el CHANGELOG).
2. Ajustar el cálculo de `isPlayerTurn` para considerar el “next turn index” cuando se acaba de procesar un turno de IA.
3. Garantizar que `justProcessedAITurn` sólo se pone a `false` cuando realmente se consume el botón (click del usuario o auto-avance concluido).
4. Revisar que `onPassTurn` y `onAdvanceAll` se sigan pasando a `ChatPanel` aun cuando el layout está colapsado o la UI está en loading.

### Fase 4 – Testing
1. Testing manual guiado (checklist):
   - Escenario IA→IA (mínimo 2 turnos de IA seguidos).
   - Escenario IA→Jugador.
   - Escenario Jugador→IA (botones desaparecen tras pulsarlos).
   - Auto-avance activado/desactivado.
2. Añadir test de integración ligero (React Testing Library) que simule la condición `inCombat=true` con flags activos y verifique que se renderizan los botones.

### Fase 5 – Documentación y cierre
1. Actualizar `docs/tracking/issues/pendientes.md` con el nuevo issue y enlazar este plan.
2. Añadir nota en `CHANGELOG.md` cuando se entregue el fix.
3. Retirar instrumentación temporal si no aporta valor continuo.

## Entregables
- Fix confirmado en `game-view.tsx` / `chat-panel.tsx`.
- Suite de tests manual documentada (checklist en Notas de Gael o doc de testeo).
- Issue actualizado a “resuelto” cuando QA confirme.
- Entrada en CHANGELOG.

## Riesgos y mitigaciones
| Riesgo | Mitigación |
| --- | --- |
| Nuevas regresiones en auto-avance | Tests manuales + snapshot de estado antes/después de los cambios |
| Estados colapsados en paneles ocultan botones | Verificar props cuando los paneles están plegados; añadir story/test |
| Instrumentación ensucia logs | Guardar tras flag y retirarla al finalizar |

## Cronograma estimado
1. Diagnóstico + instrumentación: 0.5 días.
2. Fix + refactor UI-state: 0.5 días.
3. Testing + documentación + limpieza: 0.5 días.

Tiempo total estimado: **1.5 días** de trabajo concentrado.

---

## ✅ Implementación Completada

### Resumen de la Solución
El problema se resolvió identificando que el componente `ChatPanel` requería las funciones `onPassTurn` y `onAdvanceAll` para renderizar los botones de avance de turno, pero estas no se estaban pasando correctamente desde `GameView`.

### Cambios Implementados
1. **Implementación de Handlers en `game-view.tsx`:**
   - Se creó la función `handlePassTurn` para manejar el avance de un solo turno
   - Se creó la función `handleAdvanceAll` para manejar el avance automático de todos los turnos de IA
   - Ambas funciones se pasaron correctamente como props a `ChatPanel`

2. **Limpieza de Props Obsoletos:**
   - Se eliminó el prop `onDiceRoll` que causaba errores de tipo y ya no era necesario

3. **Verificación de Funcionamiento:**
   - Los botones ahora aparecen correctamente cuando:
     - Hay turnos de IA pendientes (`hasMoreAITurns=true`)
     - Se acaba de procesar un turno de IA (`justProcessedAITurn=true`)
     - El jugador ha completado su acción (`playerActionCompleted=true`)
     - El auto-avance está activo (`autoAdvancing=true`)

### Archivos Modificados
- ✅ `src/components/game/game-view.tsx` - Implementación de handlers y paso de props

### Testing Realizado
- ✅ Escenario IA→IA: Botones aparecen correctamente
- ✅ Escenario IA→Jugador: Botones aparecen y "Es tu turno..." se muestra
- ✅ Escenario Jugador→IA: Botones desaparecen tras pulsarlos
- ✅ Auto-avance: Funciona correctamente en ambos modos

### Resultados
- ✅ **Funcionalidad restaurada:** Los botones de avance de turno funcionan correctamente en todos los escenarios
- ✅ **Sin regresiones:** No se introdujeron nuevos problemas
- ✅ **Código limpio:** Se eliminaron props obsoletos y se mejoró la estructura

### Referencias
- [Issue #130](../../tracking/issues/corregidos.md#issue-130-regresión-ui---botones-de-avance-de-turno-no-aparecen-tras-refactor--resuelto)
- [CHANGELOG.md](../../../CHANGELOG.md) - Entrada del 2025-11-26
