# Plan en curso: Botón de pausa para el avance automático en combate

## Contexto
- Actualmente el botón **“Avance automático”** inicia un bucle IA→IA que procesa turnos consecutivos sin intervención del jugador.
- No existe una manera de detener ese bucle una vez iniciado; la única salida es esperar a que termine o provocar un error.
- El `roadmap` (punto 18) mantiene pendiente la mejora “Botón de pausa en avance automático”.
- Queremos permitir al jugador recuperar el control sin forzar un reinicio del combate ni dejar estados inconsistentes.

## Objetivo
Implementar un flujo de pausa/reanudación seguro que:
1. Convierta el botón “Avance automático” en “Pausar avance automático” mientras el modo está activo.
2. Detenga inmediatamente los turnos pendientes sin duplicar narraciones ni dejar la UI bloqueada.
3. Mantenga la sincronización con el backend para que éste no siga procesando turnos cuando el cliente ha pausado.

## Alcance
Incluido:
- Cambios en `game-view.tsx`, `chat-panel.tsx` y hooks auxiliares para manejar la pausa.
- Señales claras en la UI (texto e iconos de botón).
- Mecanismo de cancelación seguro (AbortController, refs o flags) que corte el pipeline de auto avance.
- Validaciones y logs que ayuden a diagnosticar el flujo pausa/reanudar.

Excluido:
- Re-escritura completa del TurnProcessor o de la lógica de combate.
- Mejoras de UX adicionales (animaciones, confirmaciones, etc.).

## Plan de acción

### Fase 1 – Diagnóstico del flujo actual
1. Revisar cómo `autoAdvancing` se establece y se libera en `game-view.tsx` / `useAIAdvance` (si aplica).
2. Identificar dónde se encadenan los turnos automáticos (timeouts/promesas) para saber cómo cancelarlos.
3. Confirmar qué señales envía el backend para auto avance y si necesita flag adicional para pausar.

### Fase 2 – Diseño del mecanismo de pausa
1. Decidir enfoque de cancelación:
   - `AbortController` compartido entre cliente y backend (si se usan fetch/tool calls).
   - Ref con `cancelAutoAdvance()` que limpia timeouts y evita encolar nuevos turnos.
2. Definir estados necesarios: `isPausing`, `autoAdvanceAbortRef`, etc.
3. Documentar cómo se reanuda (volver a pulsar “Avance automático” tras pausar).

### Fase 3 – Implementación UI
1. Añadir handler `handlePauseAutoAdvance` en `game-view.tsx`.
2. Pasar `onPauseAutoAdvance` a `ChatPanel`.
3. Modificar el botón:
   - Cuando `autoAdvancing=true`, mostrar icono de pausa + texto “Pausar avance automático”.
   - Deshabilitar mientras `isPausing` (feedback visual “Pausando...”).

### Fase 4 – Integración con lógica de turnos
1. Insertar la lógica de cancelación en el punto donde se programa el siguiente turno automático.
2. Asegurar que al pausar:
   - `autoAdvancing` pasa a `false`.
   - Se limpian timers/promesas.
   - Se restablecen `justProcessedAITurn`, `playerActionCompleted` y los botones vuelven a estar disponibles.
3. Añadir logs (`logClient.uiEvent`, `logClient.info`) para seguimiento.

### Fase 5 – QA y validación
1. Escenario IA→IA con avance automático: iniciar, pausar en mitad del ciclo, verificar que se detiene.
2. Escenario Jugador→IA: activar auto avance durante turno de IA, pausar antes de que concluya, asegurar que no se repiten turnos.
3. Probar reanudación: tras pausar, volver a pulsar “Avance automático” y comprobar que el flujo continúa.
4. Revisar que la pausa también detenga `Avance automático` cuando se invoca desde pruebas con múltiples enemigos.

### Fase 6 – Documentación
1. Actualizar `docs/roadmap.md` punto 18 marcando la sub-mejora como completada.
2. Añadir breve nota en `CHANGELOG.md` (sección “Unreleased”).
3. Registrar cualquier flag/toggle en `docs/planes-desarrollo/completados` cuando se cierre.

## Entregables
- Código que permite pausar el auto avance sin inconsistencias.
- Tests manuales documentados (breve checklist en el PR o notas internas).
- Actualización de roadmap y changelog.

## Riesgos y mitigaciones
| Riesgo | Mitigación |
| --- | --- |
| Turnos se siguen ejecutando pese a la pausa | Usar cancelación explícita (AbortController o limpieza de timers) antes de programar el siguiente turno |
| Estados UI inconsistentes (botones bloqueados) | Resetear `autoAdvancing`, `isPausing`, `playerActionCompleted` y `justProcessedAITurn` en la misma transición |
| Pausa se activa durante llamadas en curso al backend | Añadir guardas para no cancelar hasta recibir el resultado del turno actual, evitando duplicados |

## Cronograma estimado
1. Análisis + diseño del mecanismo (0.25 d)
2. Implementación (0.5 d)
3. Validación + documentación (0.25 d)

Tiempo total: **~1 día**.

