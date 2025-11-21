# Plan Maestro de Desarrollo

Este documento es el plan general que coordina todos los planes de desarrollo específicos del proyecto D&D Adventures AI. Aquí encontrarás una visión de alto nivel de las mejoras planificadas, organizadas por estado y prioridad.

## 📋 Índice de Planes

---

## 🚧 Planes en Curso

**Estado:** Ninguno activo | **Última implementación:** Issue #94 - Refactorización de Prompts de Tacticians (2025-11-21) - COMPLETADO

---

## ✅ Planes Completados

**Estado:** Finalizados | **Cantidad:** 11 planes

Planes que han sido implementados exitosamente (ordenados por fecha de finalización, más recientes primero):

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
  - ✅ Código desacoplado: lógica pura en `rules-engine`, `turn-manager`, `action-processor`
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

---

## 💡 Planes Sin Comenzar (Priorizados)

### Prioridad Muy Alta

#### [Estandarización de Niveles de Logging](sin-comenzar/issue-119-estandarizacion-logging.md)
- **Estado:** Sin comenzar
- **Prioridad:** Muy Alta
- **Referencia:** 
  - Issue #119 (Inconsistencia en niveles de logging) 🔴 CRÍTICO
  - [Roadmap - Sección 0](../roadmap.md#0-estandarización-de-niveles-de-logging) - Visión general
  - [Issue Detallado](../tracking/issues/pendientes.md#issue-119-inconsistencia-en-niveles-de-logging--crítico)

---

#### [Simplificación de Arquitectura de Combate](sin-comenzar/issue-117-simplificacion-arquitectura-combate.md)
- **Estado:** Sin comenzar
- **Prioridad:** Muy Alta
- **Objetivo:** Simplificar la arquitectura del sistema de combate unificando el procesamiento de turnos (jugador e IA) en un flujo único y consolidado
- **Componentes:**
  - Crear `CombatActionExecutor` unificado (fusionar `action-processor.ts` y `dice-roll-processor.ts`)
  - Crear `TurnProcessor` unificado (manejar flujo completo: planificación → intención → ejecución → resolución)
  - Simplificar `CombatInitializer` (solo inicializar estado)
  - Eliminar `first-turn-handler.ts` (procesar primer turno como cualquier otro)
  - Refactorizar `CombatSession` para usar `TurnProcessor` en todos los casos
- **Beneficios:**
  - ✅ Consistencia total: Jugador e IA usan el mismo código
  - ✅ Menos saltos: Flujo lineal (3-4 niveles vs 8-9 actuales)
  - ✅ Código más mantenible: Menos archivos, menos duplicación
  - ✅ Depuración más fácil: Un solo lugar donde mirar
  - ✅ Menos bugs: Un solo lugar para arreglar problemas
- **Impacto:** Transformacional - Mejora significativa de la arquitectura, elimina duplicación, garantiza consistencia total
- **Estimación:** 30-41 horas
- **Relacionado con:**
  - Issue #117 (Simplificación de Arquitectura de Combate) 🔴 CRÍTICO
  - Issue #94 (Refactorización de Prompts de Tacticians) - ✅ COMPLETADO - Resuelve problemas de consistencia
  - Issue #82 (Unificar sistema de procesamiento de tiradas) - Resuelve completamente
  - Issue #21 (Código duplicado) - Elimina duplicación
- **Referencia:** [Plan Detallado](sin-comenzar/issue-117-simplificacion-arquitectura-combate.md)

---

### 1. Sistema de Compendio de D&D Local (Prioridad Alta)
- **Estado:** Sin comenzar
- **Prioridad:** Alta
- **Referencia:** Ver detalles completos en [Roadmap - Sección 4](../roadmap.md#4-compendio-de-dd-local---base-de-datos-local-prioridad-media) - Visión general

#### [Convertidor de PDF a JSON - Aplicación Auxiliar](sin-comenzar/pdf-to-json-converter.md)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencias:**
  - [Plan Detallado](sin-comenzar/pdf-to-json-converter.md) - Plan completo de implementación
  - [Roadmap - Sección 10](../roadmap.md#10-convertidor-de-pdf-a-json---aplicación-auxiliar-prioridad-media) - Visión general

#### [IA Conversacional Avanzada - Streaming](roadmap.md#5-ia-conversacional-avanzada-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencia:** Ver detalles completos en [Roadmap - Sección 5](../roadmap.md#5-ia-conversacional-avanzada-prioridad-media)

#### [Calidad y Profundidad de la IA - RAG](roadmap.md#6-calidad-y-profundidad-de-la-ia-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencia:** Ver detalles completos en [Roadmap - Sección 6](../roadmap.md#6-calidad-y-profundidad-de-la-ia-prioridad-media)

#### [Sistema de Death Saving Throws y Revivencia (D&D 5e)](sin-comenzar/sistema-death-saving-throws.md)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Estimación:** 15-20 horas
- **Referencia:** [Plan Detallado](sin-comenzar/sistema-death-saving-throws.md) - Plan completo de implementación

#### [Sistema de Estados y Condiciones en Combate](roadmap.md#9-mejoras-de-mecánicas-de-dd-5e-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencia:** Ver detalles completos en [Roadmap - Sección 9](../roadmap.md#9-mejoras-de-mecánicas-de-dd-5e-prioridad-media) (subsección "Estados y Condiciones")

#### [Sistema de Foco de Objetivo en Combate](roadmap.md#9-mejoras-de-mecánicas-de-dd-5e-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media
- **Referencia:** Ver detalles completos en [Roadmap - Sección 9](../roadmap.md#9-mejoras-de-mecánicas-de-dd-5e-prioridad-media) (subsección "Sistema de Foco de Objetivo")

#### [Música y Sonido Dinámicos](roadmap.md#11-música-y-sonido-dinámicos-prioridad-media)
- **Estado:** Sin comenzar
- **Prioridad:** Media-Baja
- **Referencia:** Ver detalles completos en [Roadmap - Sección 11](../roadmap.md#11-música-y-sonido-dinámicos-prioridad-media)

### Prioridad Baja

#### [Comandos de Voz](roadmap.md#16-comandos-de-voz-prioridad-baja)
- **Estado:** Sin comenzar
- **Prioridad:** Baja
- **Referencia:** Ver detalles completos en [Roadmap - Sección 16](../roadmap.md#16-comandos-de-voz-prioridad-baja)

#### [Automatización del Versionado y Changelog](roadmap.md#17-automatización-del-versionado-y-changelog-prioridad-baja)
- **Estado:** Sin comenzar
- **Prioridad:** Baja
- **Referencia:** Ver detalles completos en [Roadmap - Sección 17](../roadmap.md#17-automatización-del-versionado-y-changelog-prioridad-baja)

---


## 🎯 Prioridades Estratégicas

### Prioridad Muy Alta

1. **Simplificación de Arquitectura de Combate** - Unificar procesamiento de turnos (jugador e IA), eliminar duplicación, reducir complejidad de 8-9 a 3-4 niveles - **PENDIENTE**
2. **✅ Sistema de Turnos Paso a Paso en Combate** - Control manual del jugador para pasar turnos uno a uno - **COMPLETADO**

### Prioridad Alta

1. **✅ Refactorización CombatSession - State Object Pattern** - Reducción de ~926 → ~165 líneas (~80%), patrón State Object implementado, 52 tests pasando - **COMPLETADO**
2. **✅ Refactorización del Módulo `combat-manager.ts` (Fases 1-2)** - Reducción de 2723 → 1235 líneas (54.6%), Issues #21 y #16 resueltos - **COMPLETADO (Fase 3 pausada)**
3. **Sistema de Progresión y Gestión** - XP, niveles, inventario, persistencia con base de datos
4. **Sistema de Inicio de Combate Dinámico** - Evaluación automática de hostilidad
5. **Mejora de Estructura de Fichas de Personajes** - Mejor organización y visualización de datos
6. **Mejoras del Sistema de Combate** - Sistema completo de Saving Throws (Issue #22)

### Prioridad Media


2. **Sistema de Testing - Integración y E2E** - Extender sistema de testing con tests de integración y E2E
   - **Estado:** Sin comenzar
   - **Objetivo:** Implementar tests de integración (Vitest) y tests E2E (Playwright) para cobertura completa
   - **Componentes:**
     - Tests de integración para flujos críticos (combate, interpretación de acciones, resolución de targets)
     - Tests E2E para flujos de usuario completos (inicio de partida, combate, interacción con DM)
   - **Beneficios:** Cobertura completa del sistema, detección temprana de bugs, confianza en refactorizaciones
   - **Estimación:** 28-40 horas
   - **Dependencias:** Sistema de Unit Tests (✅ Completado), Mejora de Testabilidad (⏳ Prerequisito)
   - **Referencia:** [Plan Detallado](sin-comenzar/sistema-testing-integracion-e2e.md)
3. **Compendio de D&D Local** - Base de datos local para consultas rápidas y modo offline
4. **IA Conversacional Avanzada** - Streaming y turnos por pasos para reacciones orgánicas
5. **Calidad y Profundidad de la IA** - RAG y memoria a largo plazo
6. **Sistema de Estados y Condiciones en Combate** - Estados temporales, condiciones, recursos gastados
7. **Sistema de Foco de Objetivo en Combate** - Selección inteligente de objetivos basada en táctica
8. **Convertidor de PDF a JSON** - Aplicación auxiliar para convertir aventuras de PDF a JSON
9. **Música y Sonido Dinámicos** - Sistema de audio adaptativo según estado del juego

### Prioridad Baja

1. **Comandos de Voz** - Reconocimiento de voz para interacción más inmersiva
2. **Automatización del Versionado** - Changelog automático

---

## 📊 Estado General del Proyecto

- **Planes Completados:** 11 (incluyendo 1 parcialmente completado)
- **Planes en Curso:** 0
- **Planes Sin Comenzar:** 13
  - **Prioridad Muy Alta:** 2 planes
  - **Prioridad Alta:** 4 planes
  - **Prioridad Media:** 10 planes
  - **Prioridad Baja:** 2 planes

### ✅ Logros Recientes

- **Refactorización CombatSession - State Object Pattern:** ✅ Completado - Reducción de ~926 → ~165 líneas (~80%), patrón State Object implementado, 52 tests pasando (100%), documentación completa
- **Mejora de Testabilidad y Refactorización:** ✅ Objetivos principales logrados - DI completa en `combatManagerTool`, refactorización de lógica pura finalizada, documentación de patrones DI creada
- **Plan de Testeo v0.5.0:** ✅ Completado - 20/20 tests completados, verificación exhaustiva de todas las funcionalidades de v0.5.0, 3 bugs corregidos durante el testeo
- **Sistema de Turnos Paso a Paso:** ✅ 100% Completado - Control total del jugador sobre el avance de turnos, botones "Pasar 1 Turno" y "Avanzar Todos", 68 unit tests + 38 integration tests, indicadores visuales y animaciones implementadas
- **Sistema de Testing:** ✅ Implementado - Vitest configurado, 106 tests (68 unit + 38 integration), documentación completa
- **Refactorización de `combat-manager.ts`:** ✅ Fases 1-2 Completadas - Reducción de 2723 → 1235 líneas (54.6%), 5 módulos especializados creados
- **Sistema de Combate por Turnos:** ✅ Completado al 100% - Sistema completamente funcional con detección de fin de combate, sistema de HP sincronizado, y validación completa de tiradas de dados
- **Saneamiento General:** ✅ Completado - 10 issues corregidos, sistema de logging centralizado, sanitización HTML implementada

---

## 🔗 Referencias

- [Roadmap](../roadmap.md) - Mejoras futuras y visiones a largo plazo
- [CHANGELOG.md](../../CHANGELOG.md) - Historial de cambios implementados
- [Arquitectura General](../arquitectura/vision-general.md) - Visión técnica del sistema

---

## 📝 Notas para Desarrolladores

- Cada plan específico contiene pasos detallados con checkboxes para seguimiento
- Los planes se mueven entre carpetas según su estado
- Al completar un plan, actualiza este documento y muévelo a `completados/`
- Al iniciar un nuevo plan, créalo en `sin-comenzar/` y muévelo a `planes-en-curso/` cuando empieces a trabajar en él

---

## 📊 Resumen Ejecutivo

### Estado General del Proyecto

**Progreso Total:**
- ✅ **8 planes completados** (incluyendo 1 parcialmente completado)
- 🚧 **0 planes en curso** actualmente
- 📝 **13 planes sin comenzar** identificados y planificados

**Distribución por Prioridad:**
- **Prioridad Alta:** 4 planes pendientes
- **Prioridad Media:** 10 planes pendientes (incluyendo 2 relacionados con testing)
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

