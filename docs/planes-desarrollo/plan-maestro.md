# Plan Maestro de Desarrollo

> ⚠️ **IMPORTANTE:** Cada vez que se modifique este archivo (añadir, mover o actualizar planes), **debe actualizarse también el [README.md](./README.md)** si hay cambios en la estructura de carpetas, flujo de trabajo o referencias.

---

Este documento es el plan general que coordina todos los planes de desarrollo específicos del proyecto D&D Adventures AI. Aquí encontrarás una visión de alto nivel de las mejoras planificadas, organizadas por estado y prioridad.

> 💡 **Para información sobre cómo crear nuevos planes o el flujo de trabajo, consulta el [README.md](./README.md)**

## 📋 Índice de Planes

- [🚧 Planes en Curso](#-planes-en-curso) (2 planes activos)
- [✅ Planes Completados](#-planes-completados) (15 planes)
- [💡 Planes Sin Comenzar](#-planes-sin-comenzar-priorizados) (12 planes)
- [🎯 Prioridades Estratégicas](#-prioridades-estratégicas)
- [📊 Resumen Ejecutivo](#-resumen-ejecutivo)

---

## 🚧 Planes en Curso

**Estado:** 2 planes activos | **Última implementación:** Issue #122 - Nombres de Enemigos (2025-11-23) - COMPLETADO

### [Issue #126 - Revisión Completa del Sistema de Carga de Aventuras JSON](en-curso/issue-126-revision-sistema-carga-aventuras.md) 🚧 **EN CURSO**
- **Estado:** Plan creado, pendiente de inicio
- **Objetivo:** Revisar, optimizar y mejorar completamente el sistema de carga de aventuras JSON y el flujo de inicio de partida
- **Prioridad:** 🔴 Muy Alta (Crítico - Afecta experiencia inicial del juego)
- **Problema:**
  - Parseo con IA innecesario (2-5 segundos) solo para extraer título/resumen
  - Manejo de errores genérico sin diferenciación de tipos
  - Validación tardía e incompleta de estructura de datos
  - Feedback limitado sin indicadores de progreso
  - Código con múltiples responsabilidades
- **Solución:**
  - Validación temprana y completa antes del parseo con IA
  - Parseo rápido sin IA (extracción directa de título/resumen)
  - Sistema de clasificación de errores con mensajes específicos
  - Feedback progresivo al usuario durante la carga
  - Refactorización y separación de responsabilidades
  - Sistema de caché mejorado
- **Estimación:** 39-57 horas (6 fases)
- **Referencia:** [Plan Detallado](en-curso/issue-126-revision-sistema-carga-aventuras.md) | [Issue #126](../tracking/issues/pendientes.md#issue-126-revisión-completa-del-sistema-de-carga-de-aventuras-json-e-inicio-de-partida-crítico) | [Informe Detallado](../tracking/issues/issue-126-informe-detallado.md)

### [Issue #121 - Fix Weapon Parsing Regression](en-curso/issue-121-fix-weapon-parsing.md) 🚧 **EN CURSO**
- **Estado:** En desarrollo
- **Objetivo:** Restaurar la funcionalidad de ataques de jugadores implementando parsing robusto de nombres de armas
- **Prioridad:** 🔴 Muy Alta (Crítico - Bloquea ataques de jugadores)
- **Problema:**
  - Tras Issue #120, el sistema pasa toda la acción del jugador como `weaponQuery`
  - Busca armas con nombres como "Ataco al goblin 1" en lugar de extraer el nombre del arma
  - Bloquea completamente los ataques de jugadores en combate
- **Solución:**
  - Implementar función `extractWeaponName()` para parsear acciones de jugador
  - Extraer nombres de armas de patrones comunes ("con [arma]", "mi [arma]", etc.)
  - Fallback seguro a `'ataque'` si no se menciona arma específica
- **Estimación:** 1-2 horas
- **Referencia:** [Plan Detallado](en-curso/issue-121-fix-weapon-parsing.md) | [Issue #121](../tracking/issues/pendientes.md#issue-121-regresión-en-parsing-de-armas-en-ataques-de-jugador--crítico)

---

## ✅ Planes Completados

**Estado:** Finalizados | **Cantidad:** 16 planes

Planes que han sido implementados exitosamente (ordenados por fecha de finalización, más recientes primero):

### [Issue #120 - Fix Dice Rolls Inconsistencias](completados/issue-120-fix-dice-rolls.md) ✅ **COMPLETADO**
- **Estado:** Todas las 4 fases completadas y documentadas
- **Objetivo:** Implementar arquitectura "Cerebro Centralizado, Frontend Obediente" para resolver inconsistencias en cálculo y visualización de tiradas de dados
- **Prioridad:** Muy Alta
- **Resultados:**
  - ✅ Selección inteligente de habilidad basada en reglas D&D 5e (FUE/DES según tipo de arma)
  - ✅ Campo `attributeUsed` inyectado en toda la cadena de resolución
  - ✅ Formateo correcto de modificadores negativos (`1d8-1` en lugar de `1d8+-1`)
  - ✅ Parser robusto con regex mejorada para manejar espacios y signos
  - ✅ Frontend usa `attributeUsed` explícitamente en lugar de adivinar
  - ✅ Notación con etiquetas (`1d20+FUE+BC`) en lugar de valores numéricos
  - ✅ Cálculos correctos: Modificadores negativos aplicados correctamente
  - ✅ Visualización fiel: Desglose muestra atributo realmente usado
- **Fecha de finalización:** 2025-11-23
- **Tiempo invertido:** ~8-10 horas
- **Referencia:** [Plan Detallado](completados/issue-120-fix-dice-rolls.md) | [Issue #120](../tracking/issues/pendientes.md#issue-120-inconsistencia-en-cálculos-de-tiradas-y-visualización-merryl-crítico)

### [Sistema de Tiradas Robusto y Unificado](completados/plan-sistema-tiradas-robusto.md) ✅ **COMPLETADO**
- **Estado:** Todas las 4 fases completadas y documentadas
- **Objetivo:** Eliminar la discrepancia entre la lógica de tiradas de la IA y del Jugador, centralizando la "fuente de la verdad" en las estadísticas del sistema
- **Prioridad:** Muy Alta
- **Resultados:**
  - ✅ Arquitectura "Intención vs. Resolución" implementada: La IA solo provee intención, el sistema calcula las tiradas
  - ✅ `CombatActionResolver` creado: Clase centralizada que calcula tiradas usando estadísticas reales
  - ✅ Tacticians simplificados: `EnemyTactician` y `CompanionTactician` devuelven intenciones de alto nivel (arrays vacíos para ataques)
  - ✅ `TurnProcessor` integrado: Usa `CombatActionResolver` para turnos de IA, asegurando consistencia
  - ✅ Sistema de fallback robusto: Si no encuentra acción específica, calcula tirada básica usando stats del enemigo
  - ✅ Consistencia total: Jugadores y enemigos siguen las mismas reglas matemáticas
  - ✅ Visualización perfecta: El desglose visual siempre coincide con el cálculo matemático
  - ✅ Menor coste de tokens: Prompts más simples y respuestas JSON más pequeñas
- **Fecha de finalización:** 2025-01-22
- **Tiempo invertido:** ~6-8 horas
- **Referencia:** [Plan Detallado](completados/plan-sistema-tiradas-robusto.md)

### [Refactorización y Simplificación Arquitectónica](completados/plan-refactorizacion-arquitectura.md) ✅ **COMPLETADO**
- **Estado:** 3 de 4 fases completadas (Fase 4 pospuesta por baja prioridad)
- **Objetivo:** Descongestionar el `GameCoordinator` y mejorar la modularidad del flujo narrativo
- **Prioridad:** Muy Alta
- **Resultados:**
  - ✅ **Fase 1:** `CompanionReactionManager` creado - Reducción de 42 líneas
  - ✅ **Fase 2:** `EntityStatusUtils` con 11 funciones centralizadas - Lógica duplicada eliminada
  - ✅ **Fase 3:** `NarrativeTurnManager` + `TranscriptFormatter` - Reducción de 130 líneas
  - ✅ **Reducción total:** `game-coordinator.ts` de 493 → 321 líneas (-35% de código)
  - ✅ **Archivos nuevos:** 4 managers/utilidades especializadas
  - ✅ **Tests validados:** Sin nuevos fallos introducidos
  - ✅ **Pruebas manuales:** Flujo narrativo funcionando correctamente
  - ⏸️ **Fase 4 pospuesta:** Normalización de comandos de sistema (no prioritaria)
- **Fecha de finalización:** 2025-11-22
- **Tiempo invertido:** ~4-5 horas
- **Referencia:** [Plan Detallado](completados/plan-refactorizacion-arquitectura.md)

### [Issue #117 - Simplificación de Arquitectura de Combate](completados/issue-117-simplificacion-arquitectura-combate.md) ✅ **COMPLETADO**
- **Estado:** Todas las 6 fases completadas y documentadas
- **Objetivo:** Simplificar la arquitectura del sistema de combate unificando el procesamiento de turnos (jugador e IA) en un flujo único y consolidado
- **Prioridad:** Muy Alta
- **Resultados:**
  - ✅ Arquitectura unificada: Jugador e IA usan el mismo código (`TurnProcessor` y `CombatActionExecutor`)
  - ✅ Complejidad reducida: De 8-9 niveles de profundidad a 3-4 niveles
  - ✅ Duplicación eliminada: `action-processor.ts` y `dice-roll-processor.ts` fusionados en `CombatActionExecutor`
  - ✅ Módulos especiales eliminados: `first-turn-handler.ts` eliminado, flujo normal para todos los turnos
  - ✅ Consistencia total: Mismo flujo para jugador e IA (Planificación → Intención → Ejecución → Resolución)
  - ✅ Tests completos: 11 tests unitarios + 3 tests de integración
  - ✅ Documentación actualizada: Arquitectura, flujo de datos y testing
- **Fecha de finalización:** 2025-11-21
- **Tiempo invertido:** ~36-49 horas
- **Referencia:** [Plan Detallado](completados/issue-117-simplificacion-arquitectura-combate.md) | [Issue #117](../../tracking/issues/corregidos.md#issue-117-simplificación-de-arquitectura-de-combate--resuelto)

### [Issue #94 - Refactorización de Prompts de Tacticians](completados/issue-94-refactorizacion-prompts-tacticians.md) ✅ **COMPLETADO**
- **Estado:** Todas las fases completadas y documentadas
- **Objetivo:** Separar la responsabilidad de decisión táctica de la narración, centralizando toda la narración en `combatNarrationExpertTool`
- **Prioridad:** Alta
- **Resultados:**
  - ✅ Tacticians simplificados: Solo generan decisión táctica (`targetId`, `diceRolls`, `actionDescription`)
  - ✅ Narración centralizada: `combatNarrationExpertTool` genera narraciones completas para todos los turnos
  - ✅ Consistencia narrativa total entre jugador, compañeros y enemigos
  - ✅ Prompts más simples = menos errores de validación
  - ✅ Flujo simplificado: Un solo mensaje narrativo por turno de IA
  - ✅ Schema simplificado: Eliminado `narrationType`, ahora solo narraciones completas
  - ✅ Bug corregido: `combatNarrationExpertTool` disponible desde el primer turno
- **Fecha de finalización:** 2025-11-21
- **Tiempo invertido:** ~15 horas
- **Referencia:** [Plan Detallado](completados/issue-94-refactorizacion-prompts-tacticians.md) | [Issue #94](../../tracking/issues/corregidos.md#issue-94-refactorización-de-prompts-de-tacticians---separación-de-narración-y-decisión-táctica--resuelto)

### [Refactorización CombatSession - State Object Pattern](completados/refactorizacion-combat-session-state.md) ✅ **COMPLETADO**
- **Estado:** Todas las 7 fases completadas y documentadas
- **Objetivo:** Refactorizar `combat-manager.ts` usando patrón State Object para encapsular estado del combate
- **Prioridad:** Media-Alta
- **Resultados:**
  - ✅ Nueva clase `CombatSession` implementada con patrón State Object
  - ✅ Reducción masiva: `combat-manager.ts` de ~926 → ~165 líneas (~80% reducción)
  - ✅ Arquitectura simplificada: Flujo de 3 pasos (Hidratar → Inicializar/Procesar → Serializar)
  - ✅ Eliminación de `debugLogs`: Removido del output y estado (panel DebugLog deprecado)
  - ✅ Tests completos: 36 tests unitarios + 16 tests de integración (100% pasando)
  - ✅ Documentación completa: JSDoc, guía de uso, y documentación de arquitectura
  - ✅ Mejoras de mantenibilidad: Estado centralizado, métodos con responsabilidades únicas, testabilidad mejorada
  - ✅ Compatibilidad mantenida: DI completamente funcional, todos los tests existentes pasando
- **Fecha de finalización:** 2025-01-20
- **Tiempo invertido:** ~30 horas
- **Referencia:** [Plan Detallado](completados/refactorizacion-combat-session-state.md)

### [Mejora de Testabilidad y Refactorización](completados/mejora-testabilidad-refactorizacion.md) ✅ **COMPLETADO PARCIAL**
- **Estado:** Objetivos principales logrados (DI y refactorización completadas; Fases 4-5 pospuestas)
- **Objetivo:** Desacoplar la lógica crítica del sistema de combate, implementar Inyección de Dependencias y habilitar tests de integración fiables
- **Prioridad:** Media-Alta
- **Resultados:**
  - ✅ DI completa en `processAICombatantRolls` y `combatManagerTool` (`executeCombatManager` + wrapper Genkit)
  - ✅ Código desacoplado: lógica pura en `rules-engine`, `turn-manager`, `CombatActionExecutor`, `TurnProcessor`
  - ✅ Todos los tests actualizados (54+ tests pasando, nuevo test con DI explícita)
  - ✅ Documentación ampliada (Testing README, Guía rápida, Patrón DI en arquitectura)
  - ⏸️ Fases 4-5 (UI data-testid + documentación adicional) pospuestas para el futuro
- **Fecha de finalización:** 2025-01-20
- **Referencia:** [Plan Detallado](completados/mejora-testabilidad-refactorizacion.md)

### [Testeo Completo del Sistema de Turnos](completados/testeo-sistema-turnos.md) ✅ **COMPLETADO**
- **Estado:** 30/30 tests completados (100%)
- **Objetivo:** Realizar un testeo exhaustivo del sistema de turnos paso a paso para identificar fallos, inconsistencias, bugs o áreas de mejora, con especial énfasis en el flujo de ejecución y la experiencia del usuario
- **Prioridad:** Alta
- **Resultados:**
  - ✅ Flujo de ejecución verificado (Tests 1.1-1.5): Inicio de combate, orden de turnos, avance manual/automático
  - ✅ Sincronización de estado verificado (Tests 2.1-2.4): Frontend-backend, turnIndex, iniciativa, logs
  - ✅ UX y controles verificado (Tests 3.1-3.4): Botones de avance, visibilidad, estados, placeholders
  - ✅ Casos edge verificado (Tests 4.1-4.5): Personajes inconscientes, muertos, múltiples combates, IDs no consecutivos
  - ✅ Validación de reglas verificado (Tests 5.1-5.3): Daño crítico, muerte masiva, orden de mensajes
  - ✅ Combates múltiples verificado (Tests 6.1-6.3): Múltiples salas, resolución de objetivos, fin de combate
  - ✅ Integración verificado (Tests 7.1-7.2): Frontend-backend, UI-state
  - ✅ Issues conocidos verificados (Issues #50, #52, #63, #65, #66, #68, #78, #79, #81)
- **Bugs detectados:** 7 (Issues #50, #52, #66, #68, #78, #79, #81)
- **Bugs corregidos:** 7 (Issues #50, #52, #66, #68, #78, #79, #81) ✅
- **Mejoras futuras documentadas:** 2 (Issues #65, #80)
- **Fecha de finalización:** 2025-11-18
- **Referencia:** [Plan Detallado](completados/testeo-sistema-turnos.md)

### [Plan de Testeo v0.5.0](completados/plan-testeo-v0.5.0.md) ✅ **COMPLETADO**
- **Estado:** 20/20 tests completados (100%)
- **Objetivo:** Realizar un testeo exhaustivo de la versión 0.5.0 para verificar que todas las funcionalidades implementadas funcionan correctamente
- **Prioridad:** Alta
- **Resultados:**
  - ✅ Sistema de sincronización de turnos verificado (Tests 1-5)
  - ✅ Sistema de inconsciencia y muerte verificado (Tests 6, 7, 14-17)
  - ✅ Sistema de reacciones de compañeros verificado (Tests 12-13)
  - ✅ Retry logic verificado (Test 8)
  - ✅ Combate completo verificado (Tests 9-10)
  - ✅ Verificación de regresiones completada (Tests 19-20)
  - ✅ Bugs corregidos verificados (Tests 11, 18)
- **Bugs detectados:** 2 (Issue #50 - Daño de crítico, Issue #51 - Mensaje "ha matado" incorrecto)
- **Bugs corregidos:** 3 (Issue #49 - Resolución incorrecta de targets, Issue #54 - Combate se detiene si jugador inconsciente, Issue #51 - Mensaje "ha matado" incorrecto)
- **Fecha de finalización:** 2025-11-15
- **Referencia:** [Plan Detallado](completados/plan-testeo-v0.5.0.md)

### [Sistema de Turnos Paso a Paso en Combate](completados/sistema-turnos-paso-a-paso.md) ✅ **COMPLETADO**
- **Estado:** 100% completado (funcional, testing completo, pulido implementado)
- **Objetivo:** Cambiar el sistema de turnos para que el jugador pueda ver los turnos uno a uno, en lugar de mostrar todos los turnos de golpe
- **Prioridad:** Muy Alta
- **Componentes implementados:**
  - ✅ Modificar bucles de turnos en backend (cambio `while` → `if`)
  - ✅ Añadir campo `hasMoreAITurns` al output del combatManagerTool
  - ✅ Botón "Pasar 1 Turno" para avance manual
  - ✅ Botón "Avanzar Todos" para avance automático con delay de 1.5s
  - ✅ Implementar acción especial "continuar turno" en game-coordinator
  - ✅ Corrección de bugs de sincronización de estado usando refs
  - ✅ Sistema de testing completo (68 unit tests + 6 integration tests)
  - ✅ Pulido y optimización (indicadores visuales, animaciones, transiciones)
- **Resultado:** El jugador ahora tiene control total sobre el avance de turnos, puede ver cada turno de IA individualmente y avanzar manualmente o automáticamente. Sistema completamente testeado y pulido.
- **Fecha de implementación:** 2025-11-14
- **Fecha de finalización:** 2025-11-15
- **Tiempo invertido:** ~12-17 horas total
- **Referencia:** [Plan Detallado](completados/sistema-turnos-paso-a-paso.md)

### [Refactorización del Módulo `combat-manager.ts`](completados/plan-refactorizacion-combat-manager.md) ✅ **COMPLETADO**
- **Estado:** 100% completado (4 pasos completados)
- **Objetivo:** Refactorizar `combat-manager.ts` (2723 líneas) en módulos más pequeños y manejables
- **Prioridad:** Alta
- **Resultados:**
  - ✅ Paso 1: Rules Engine - Lógica de reglas de D&D 5e extraída
  - ✅ Paso 2: Turn Manager - Gestión de turnos extraída
  - ✅ Paso 3: Action Processor - Procesamiento de acciones extraída
  - ✅ Paso 4: Combat Initializer - Inicialización de combate extraída
  - ✅ Reducción total: 2723 → ~800 líneas (~70% de reducción)
  - ✅ Módulos creados: 9 módulos especializados
  - ✅ Issues resueltos: #21 (código duplicado), #16 (gestión de nombres)
  - ✅ Testing: Todos los tests de integración pasan sin regresiones
- **Fecha de finalización:** 2025-11-19
- **Referencia:** [Plan Detallado](completados/plan-refactorizacion-combat-manager.md)

### [Sistema de Turnos de Combate](completados/combate-turnos.md) ✅ **COMPLETADO**
- **Estado:** 100% funcional (5 de 5 pasos completamente funcionales)
- **Objetivo:** Implementar un sistema de turnos de combate proactivo y funcional
- **Prioridad:** Alta
- **Resultados:**
  - ✅ Sistema de HP implementado y funcionando (sincronización frontend-backend, validación, inicialización)
  - ✅ Detección de fin de combate funcionando correctamente
  - ✅ Sistema de tiradas de dados validado y funcionando
  - ✅ Soporte para saving throw spells con metadata explícita
  - ✅ Resaltado visual de críticos y pifias
  - ✅ Mensajes de muerte y curación en panel de Tiradas
- **Análisis:** [Análisis: Sistema de Gestión de HP y Fichas](completados/combate-turnos-analisis-hp.md)
- **Referencia:** [Plan Detallado](completados/combate-turnos.md)

### [Saneamiento General de la Aplicación](completados/saneamiento-general.md) ✅ **COMPLETADO**
- **Estado:** 100% completado
- **Objetivo:** Revisión sistemática de la aplicación para identificar y corregir bugs, problemas y errores
- **Prioridad:** Alta
- **Resultados:**
  - ✅ 7 secciones revisadas (Frontend, Backend, Validación, Rendimiento, Seguridad, Logging, Documentación)
  - ✅ 12 issues identificados
  - ✅ 10 issues corregidos
  - ✅ Sistema de logging centralizado implementado
  - ✅ Sanitización HTML con DOMPurify implementada
- **Fecha de finalización:** Completado
- **Documentación:** [Issues Tracker](../tracking/issues/README.md)
- **Referencia:** [Plan Detallado](completados/saneamiento-general.md)

### [Refactorización de Esquemas](completados/refactor-esquemas.md) ✅ **COMPLETADO**
- **Estado:** 100% completado
- **Objetivo:** Eliminar duplicaciones e inconsistencias en la arquitectura de esquemas
- **Prioridad:** Media
- **Resultados:**
  - ✅ Tipos unificados usando Zod como fuente única de verdad
  - ✅ Rutas de importación estandarizadas con alias `@/`
  - ✅ Eliminación de duplicaciones entre `types.ts` y `schemas.ts`
  - ✅ Validación robusta en todos los módulos de IA
- **Fecha de finalización:** Implementado en v0.4.70
- **Referencia:** [Plan Detallado](completados/refactor-esquemas.md)

### [Estandarización de Niveles de Logging](../roadmap.md#0-estandarización-de-niveles-de-logging--completado) ✅ **COMPLETADO**
- **Estado:** 100% completado
- **Objetivo:** Estandarizar los niveles de logging en todo el código base para mejorar la calidad de logs y facilitar depuración
- **Prioridad:** Muy Alta
- **Resultados:**
  - ✅ Guía de estilo de logging creada
  - ✅ Validación automática implementada en el logger
  - ✅ 5 inconsistencias detectadas y corregidas
  - ✅ Documentación actualizada
- **Fecha de finalización:** 2025-01-22
- **Referencia:** 
  - [Roadmap - Sección 0](../roadmap.md#0-estandarización-de-niveles-de-logging--completado)
  - [Guía de Estilo de Logging](../arquitectura/guia-estilo-logging.md)

### [Plan de Implementación: NarrativeManager](completados/plan-implementacion-narrative-manager.md) ✅ **COMPLETADO**
- **Estado:** 100% completado
- **Objetivo:** Refactorizar el sistema de narración actual (`narrativeExpert`) para convertirlo en un Gestor de Narrativa (`NarrativeManager`) que orqueste módulos especializados de Exploración e Interacción
- **Prioridad:** Alta
- **Resultados:**
  - ✅ `ExplorationExpert` creado para descripciones ambientales y movimiento
  - ✅ `InteractionExpert` creado para diálogos con NPCs y tiradas sociales
  - ✅ `NarrativeManager` implementado como orquestador
  - ✅ Arquitectura híbrida funcional (Modo Blando vs Modo Duro)
- **Referencia:** [Plan Detallado](completados/plan-implementacion-narrative-manager.md)

---

## 💡 Planes Sin Comenzar (Priorizados)

**Estado:** 12 planes identificados y planificados

---

### Prioridad Alta

#### [Sistema de Compendio de D&D Local](sin-comenzar/compendio-dnd-local.md)
- **Estado:** Sin comenzar
- **Prioridad:** Alta
- **Referencia:** [Plan Detallado](sin-comenzar/compendio-dnd-local.md) | [Roadmap - Sección 8](../roadmap.md#8-compendio-de-dd-local---base-de-datos-local-prioridad-media)

#### [Issue #115 - Validación de Inventario](sin-comenzar/issue-115-validacion-inventario.md)
- **Estado:** Sin comenzar (pospuesto)
- **Prioridad:** Alta
- **Referencia:** [Plan Detallado](sin-comenzar/issue-115-validacion-inventario.md) | [Issue #115](../../tracking/issues/pendientes.md#issue-115-validación-de-inventario-al-usar-armas-u-objetos-advertencia)

#### [Sistema de Progresión y Gestión](../roadmap.md#2-sistema-de-progresión-y-gestión-prioridad-alta)
- **Estado:** Sin comenzar
- **Prioridad:** Alta
- **Referencia:** Ver detalles completos en [Roadmap - Sección 2](../roadmap.md#2-sistema-de-progresión-y-gestión-prioridad-alta)

#### [Sistema de Inicio de Combate Dinámico](../roadmap.md#3-sistema-de-inicio-de-combate-dinámico-prioridad-alta)
- **Estado:** Sin comenzar
- **Prioridad:** Alta
- **Referencia:** Ver detalles completos en [Roadmap - Sección 3](../roadmap.md#3-sistema-de-inicio-de-combate-dinámico-prioridad-alta)

#### [Mejora de Estructura de Fichas de Personajes](../roadmap.md#4-mejora-de-estructura-de-fichas-de-personajes-prioridad-alta)
- **Estado:** Sin comenzar
- **Prioridad:** Alta
- **Referencia:** Ver detalles completos en [Roadmap - Sección 4](../roadmap.md#4-mejora-de-estructura-de-fichas-de-personajes-prioridad-alta)

#### [Sistema Completo de Saving Throws](../roadmap.md#6-revisiones-de-sistema-de-combate-prioridad-alta)
- **Estado:** Sin comenzar
- **Prioridad:** Alta
- **Referencia:** Ver detalles completos en [Roadmap - Sección 6](../roadmap.md#6-revisiones-de-sistema-de-combate-prioridad-alta) | [Issue #22](../../tracking/issues/pendientes.md#issue-22-sistema-completo-de-saving-throws-tiradas-de-salvación-del-objetivo-feature-incompleta)

### Prioridad Media

#### [Sistema de Testing - Integración y E2E](sin-comenzar/sistema-testing-integracion-e2e.md)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Objetivo:** Implementar tests de integración (Vitest) y tests E2E (Playwright) para cobertura completa
- **Estimación:** 28-40 horas
- **Dependencias:** Sistema de Unit Tests (✅ Completado), Mejora de Testabilidad (✅ Completado)
- **Referencia:** [Plan Detallado](sin-comenzar/sistema-testing-integracion-e2e.md)

#### [Convertidor de PDF a JSON - Aplicación Auxiliar](sin-comenzar/pdf-to-json-converter.md)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencias:**
  - [Plan Detallado](sin-comenzar/pdf-to-json-converter.md) - Plan completo de implementación
  - [Roadmap - Sección 10](../roadmap.md#10-convertidor-de-pdf-a-json---aplicación-auxiliar-prioridad-media) - Visión general

#### [IA Conversacional Avanzada - Streaming](../roadmap.md#9-ia-conversacional-avanzada-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencia:** Ver detalles completos en [Roadmap - Sección 9](../roadmap.md#9-ia-conversacional-avanzada-prioridad-media)

#### [Calidad y Profundidad de la IA - RAG](../roadmap.md#10-calidad-y-profundidad-de-la-ia-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencia:** Ver detalles completos en [Roadmap - Sección 10](../roadmap.md#10-calidad-y-profundidad-de-la-ia-prioridad-media)

#### [Sistema de Death Saving Throws y Revivencia (D&D 5e)](sin-comenzar/sistema-death-saving-throws.md)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Estimación:** 15-20 horas
- **Referencia:** [Plan Detallado](sin-comenzar/sistema-death-saving-throws.md) - Plan completo de implementación

#### [Sistema de Estados y Condiciones en Combate](../roadmap.md#12-mejoras-de-mecánicas-de-dd-5e-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencia:** Ver detalles completos en [Roadmap - Sección 12](../roadmap.md#12-mejoras-de-mecánicas-de-dd-5e-prioridad-media) (subsección "Estados y Condiciones")

#### [Sistema de Foco de Objetivo en Combate](../roadmap.md#12-mejoras-de-mecánicas-de-dd-5e-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencia:** Ver detalles completos en [Roadmap - Sección 12](../roadmap.md#12-mejoras-de-mecánicas-de-dd-5e-prioridad-media) (subsección "Sistema de Foco de Objetivo")

#### [Música y Sonido Dinámicos](../roadmap.md#15-música-y-sonido-dinámicos-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media-Baja
- **Referencia:** Ver detalles completos en [Roadmap - Sección 15](../roadmap.md#15-música-y-sonido-dinámicos-prioridad-media)

### Prioridad Baja

#### [Comandos de Voz](../roadmap.md#19-comandos-de-voz-prioridad-baja)
- **Estado:** Sin comenzar
- **Prioridad:** Baja
- **Referencia:** Ver detalles completos en [Roadmap - Sección 19](../roadmap.md#19-comandos-de-voz-prioridad-baja)

#### [Automatización del Versionado y Changelog](../roadmap.md#20-automatización-del-versionado-y-changelog-prioridad-baja)
- **Estado:** Sin comenzar
- **Prioridad:** Baja
- **Referencia:** Ver detalles completos en [Roadmap - Sección 20](../roadmap.md#20-automatización-del-versionado-y-changelog-prioridad-baja)

---


## 🎯 Prioridades Estratégicas

### Prioridad Muy Alta

1. **✅ Sistema de Tiradas Robusto y Unificado** - Centralizar lógica de tiradas en el sistema, eliminar "doble verdad" entre IA y jugador - **COMPLETADO**
2. **✅ Refactorización y Simplificación Arquitectónica** - Descongestionar GameCoordinator, modularizar flujo narrativo, centralizar utilidades - **COMPLETADO**
3. **✅ Simplificación de Arquitectura de Combate** - Unificar procesamiento de turnos (jugador e IA), eliminar duplicación, reducir complejidad de 8-9 a 3-4 niveles - **COMPLETADO**
4. **✅ Sistema de Turnos Paso a Paso en Combate** - Control manual del jugador para pasar turnos uno a uno - **COMPLETADO**

### Prioridad Alta

1. **✅ Refactorización CombatSession - State Object Pattern** - Reducción de ~926 → ~165 líneas (~80%), patrón State Object implementado, 52 tests pasando - **COMPLETADO**
2. **✅ Refactorización del Módulo `combat-manager.ts` (Fases 1-2)** - Reducción de 2723 → 1235 líneas (54.6%), Issues #21 y #16 resueltos - **COMPLETADO (Fase 3 pausada)**
3. **Sistema de Progresión y Gestión** - XP, niveles, inventario, persistencia con base de datos
4. **Sistema de Inicio de Combate Dinámico** - Evaluación automática de hostilidad
5. **Mejora de Estructura de Fichas de Personajes** - Mejor organización y visualización de datos
6. **Mejoras del Sistema de Combate** - Sistema completo de Saving Throws (Issue #22)

### Prioridad Media

1. **Sistema de Testing - Integración y E2E** - Extender sistema de testing con tests de integración y E2E
   - **Estado:** Sin comenzar
   - **Objetivo:** Implementar tests de integración (Vitest) y tests E2E (Playwright) para cobertura completa
   - **Componentes:**
     - Tests de integración para flujos críticos (combate, interpretación de acciones, resolución de targets)
     - Tests E2E para flujos de usuario completos (inicio de partida, combate, interacción con DM)
   - **Beneficios:** Cobertura completa del sistema, detección temprana de bugs, confianza en refactorizaciones
   - **Estimación:** 28-40 horas
   - **Dependencias:** Sistema de Unit Tests (✅ Completado), Mejora de Testabilidad (✅ Completado)
   - **Referencia:** [Plan Detallado](sin-comenzar/sistema-testing-integracion-e2e.md)
2. **Compendio de D&D Local** - Base de datos local para consultas rápidas y modo offline
3. **IA Conversacional Avanzada** - Streaming y turnos por pasos para reacciones orgánicas
4. **Calidad y Profundidad de la IA** - RAG y memoria a largo plazo
5. **Sistema de Estados y Condiciones en Combate** - Estados temporales, condiciones, recursos gastados
6. **Sistema de Foco de Objetivo en Combate** - Selección inteligente de objetivos basada en táctica
7. **Convertidor de PDF a JSON** - Aplicación auxiliar para convertir aventuras de PDF a JSON
8. **Música y Sonido Dinámicos** - Sistema de audio adaptativo según estado del juego

### Prioridad Baja

1. **Comandos de Voz** - Reconocimiento de voz para interacción más inmersiva
2. **Automatización del Versionado** - Changelog automático

---

## 🔗 Referencias

- [Roadmap](../roadmap.md) - Mejoras futuras y visiones a largo plazo
- [CHANGELOG.md](../../CHANGELOG.md) - Historial de cambios implementados
- [Arquitectura General](../arquitectura/vision-general.md) - Visión técnica del sistema
- [Issues Tracker](../tracking/issues/README.md) - Seguimiento de bugs y mejoras

---

## 📊 Resumen Ejecutivo

### Estado General del Proyecto

**Progreso Total:**
- ✅ **15 planes completados** (incluyendo 1 parcialmente completado)
- 🚧 **2 planes en curso** actualmente
- 📝 **12 planes sin comenzar** identificados y planificados

**Distribución por Prioridad:**
- **Prioridad Muy Alta:** 2 planes en curso (Issue #126, Issue #121)
- **Prioridad Alta:** 6 planes pendientes
- **Prioridad Media:** 8 planes pendientes (incluyendo 1 relacionado con testing)
- **Prioridad Baja:** 2 planes pendientes

### Logros Principales

**Sistema de Combate:**
- ✅ Sistema de turnos paso a paso completamente funcional
- ✅ Sistema de HP sincronizado y validado
- ✅ Sistema de tiradas de dados completo
- ✅ Detección de fin de combate implementada
- ✅ Manejo de inconsciencia y muerte masiva

**Calidad del Código:**
- ✅ Refactorización CombatSession - State Object Pattern completada (~80% reducción adicional)
- ✅ Refactorización mayor de `combat-manager.ts` (94% de reducción total: 2723 → ~165 líneas)
- ✅ Sistema de esquemas unificado y robusto
- ✅ Saneamiento general completado (10 issues corregidos)
- ✅ Sistema de logging centralizado
- ✅ Plan de Mejora de Testabilidad completado (DI en `combatManagerTool`, código desacoplado, documentación de patrones DI)

**Testing:**
- ✅ 106 tests implementados (68 unit + 38 integration)
- ✅ Sistema de testing documentado y funcional
- ✅ Cobertura de módulos críticos

### Próximos Pasos Recomendados

**Corto Plazo (Prioridad Alta):**
1. **Sistema de Progresión y Gestión** - Fundamental para campañas duraderas
2. **Sistema de Inicio de Combate Dinámico** - Mejora la credibilidad del mundo
3. **Mejora de Estructura de Fichas** - Mejora la experiencia del usuario

**Medio Plazo (Prioridad Media):**
1. **Sistema de Testing - Integración y E2E** - Cobertura completa del sistema (plan desbloqueado tras completar Mejora de Testabilidad)
2. **Compendio de D&D Local** - Mejora de rendimiento y disponibilidad offline

**Largo Plazo (Prioridad Media-Baja):**
1. **IA Conversacional Avanzada** - Streaming y reacciones orgánicas
2. **Calidad y Profundidad de la IA** - RAG y memoria a largo plazo
3. **Sistema de Estados y Condiciones** - Complejidad táctica en combate

### Métricas Clave

**Código:**
- Reducción de `combat-manager.ts`: 2723 → ~165 líneas (~94% total)
- Módulos especializados creados: 9 + CombatSession (nueva clase principal)
- Código duplicado eliminado: ~1900 líneas
- Arquitectura simplificada: Flujo de 3 pasos (Hidratar → Inicializar/Procesar → Serializar)

**Testing:**
- Tests unitarios: 68
- Tests de integración: 38
- Cobertura de módulos críticos: ✅ Completa

**Calidad:**
- Issues corregidos en saneamiento: 10
- Bugs detectados en testeo v0.5.0: 2
- Bugs corregidos en testeo v0.5.0: 3

### Dependencias Críticas

**Planes que requieren otros planes completados:**
- ⏳ **Sistema de Testing - Integración y E2E** (próximo) — prerequisito **Mejora de Testabilidad** ✅ ya completado
- ⏳ Varios planes de combate requieren el sistema base de combate (✅ completado)

### Notas Importantes

- El plan de **Refactorización de `combat-manager.ts`** está parcialmente completado (Fases 1-2). La Fase 3 está pausada y puede retomarse en el futuro si es necesaria.
- El plan de **Refactorización CombatSession - State Object Pattern** está completamente completado. Todas las 7 fases implementadas, documentación completa, y 52 tests pasando (100%).
- El plan de **Mejora de Testabilidad** se completó parcialmente (DI y refactorización listas, fases de UI/documentación pospuestas) y sirve como prerequisito cumplido para el plan de Testing Integración y E2E.
- Todos los planes completados están documentados con referencias a sus planes detallados para consulta completa.

