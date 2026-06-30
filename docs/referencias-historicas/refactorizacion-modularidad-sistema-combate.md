# Plan de Refactorización: Modularidad del Sistema de Combate

**Estado:** ✅ Completado  
**Prioridad:** 🔴 Muy Alta  
**Fecha de finalización:** 2025-12-07  
**Duración estimada/real:** 24h (incluye tests automáticos)  
**Referencia original:** `docs/planes-desarrollo/en-curso/refactorizacion-modularidad-sistema-combate.md`

---

## Resumen Ejecutivo
- Se completó la modularización del sistema de combate (Fases 1, 2/2.5, 3 y 4).
- FSM de combate estabilizada: fin automático al derrotar enemigos, pill de victoria restaurada.
- Separación de responsabilidades: `InteractionHandler`, `ExplorationContextBuilder`, `CombatInitiationService`, `CombatTriggerEvaluator`, `EnemyStateManager`, `SurpriseManager`.
- Reorganización final: barrel `src/lib/combat/index.ts`, imports actualizados, `CombatTriggerManager` movido a `lib/combat/trigger`.
- Flujo narrativo y exploración coherentes con estado real de puertas y enemigos (sin combates fantasma).

## Cambios Clave
- **FSM de combate:** Transiciones explícitas con `CombatPhase`; combate termina sin pulsar “continuar turno”.
- **Fin de combate y UX:** Se añade tirada sintética `outcome: 'victory'` para mostrar la pastilla de victoria.
- **Estado de enemigos:** `EnemyValidator` prioriza `stats.hp`/`stats.ac` del JSON; se evita sobrescritura por la D&D API.
- **Puertas y exploración:** `openDoors` bidireccional; `ExplorationContextBuilder` usa `enemiesByLocation` antes que el JSON; prompt del DM instruido para respetar `isOpen`.
- **Triggers y sorpresas:** `CombatTriggerEvaluator` ignora enemigos muertos/inconscientes; sorpresa unificada en `SurpriseManager`.
- **Reorganización:** Barrel `lib/combat/index.ts`, imports actualizados; `CombatTriggerManager` eliminado (reubicado).

## Tests y Calidad
- **Automatizados:** `npm run test` (Vitest) pasando; warning conocido de timeout en `retry-utils.test.ts` (no bloqueante).
- **Build:** `npm run build` OK (trazas deshabilitadas con `NEXT_PRIVATE_OUTPUT_TRACE_DISABLED=1` para evitar bloqueo en `.next/trace`).
- **Pendiente opcional:** Test manual exhaustivo de sesión completa (movimiento, puertas, emboscadas, mimics, victoria).

## Documentación Actualizada
- `CHANGELOG.md` ([Unreleased]): entradas de FSM, modularización, fin de combate, AC/HP desde JSON, puertas y triggers.
- `docs/roadmap.md`: “Revisiones de Sistema de Combate” marcado como completado; se añade persistencia general de mutaciones de localización (prioridad media).
- `docs/arquitectura/arquitectura-backend.md`, `combat-session-design.md`, `combat-session-guia.md`, `flujo-datos.md`: FSM, fin de combate automático y pill de victoria, prioridad de stats JSON.
- `docs/planes-desarrollo/plan-maestro.md`: plan movido a completados y referenciado.

## Lecciones Breves
- FSM elimina flags redundantes y desincronizaciones front/back.
- Enriquecer contexto (puertas abiertas, enemigos muertos) es más fiable que instrucciones verbales al DM.
- Priorizar estado de juego (`enemiesByLocation`, `openDoors`) sobre datos estáticos del JSON evita regresiones y combates fantasma.

---

**Estado final:** Plan cerrado. Nuevas mejoras (persistencia unificada de mundo, movimiento táctico) deberán planificarse en fases posteriores.

