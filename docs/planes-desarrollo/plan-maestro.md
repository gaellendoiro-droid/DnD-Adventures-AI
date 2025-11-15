# Plan Maestro de Desarrollo

Este documento es el plan general que coordina todos los planes de desarrollo específicos del proyecto D&D Adventures AI. Aquí encontrarás una visión de alto nivel de las mejoras planificadas, organizadas por estado y prioridad.

## 📋 Índice de Planes

---

## 🚧 Planes en Curso

**Estado:** Ninguno activo | **Última implementación:** Sistema de Turnos Paso a Paso (2025-11-14)

---

## ✅ Planes Completados

**Estado:** Finalizados | **Cantidad:** 5 planes

Planes que han sido implementados exitosamente:

### [Sistema de Turnos Paso a Paso en Combate](completados/sistema-turnos-paso-a-paso.md) ✅ **COMPLETADO**
- **Estado:** Implementado y funcional (pulido pendiente)
- **Objetivo:** Cambiar el sistema de turnos para que el jugador pueda ver los turnos uno a uno, en lugar de mostrar todos los turnos de golpe
- **Prioridad:** Muy Alta
- **Componentes implementados:**
  - ✅ Modificar bucles de turnos en backend (cambio `while` → `if`)
  - ✅ Añadir campo `hasMoreAITurns` al output del combatManagerTool
  - ✅ Botón "Pasar 1 Turno" para avance manual
  - ✅ Botón "Avanzar Todos" para avance automático con delay de 1.5s
  - ✅ Implementar acción especial "continuar turno" en game-coordinator
  - ✅ Corrección de bugs de sincronización de estado usando refs
- **Resultado:** El jugador ahora tiene control total sobre el avance de turnos, puede ver cada turno de IA individualmente y avanzar manualmente o automáticamente
- **Fecha de implementación:** 2025-11-14
- **Fecha de finalización:** 2025-11-14
- **Referencia:** [Plan Detallado](completados/sistema-turnos-paso-a-paso.md)

### [Refactorización del Módulo `combat-manager.ts` (Fases 1-2)](planes-en-curso/refactorizacion-combat-manager.md) ⏸️ **PARCIALMENTE COMPLETADO**
- **Estado:** Fases 1-2 completadas (54.6% de reducción), Fase 3 pausada (opcional)
- **Objetivo:** Refactorizar `combat-manager.ts` (2723 líneas) en módulos más pequeños y manejables
- **Resultados:**
  - ✅ Reducción: 2723 → 1235 líneas (54.6% de reducción)
  - ✅ Módulos creados: 5 módulos especializados (1310 líneas extraídas)
  - ✅ Issues resueltos: #21 (código duplicado), #16 (gestión de nombres)
  - ✅ Testing: 10/10 tests PASS — Sin regresiones
  - ✅ Código duplicado eliminado: ~798 líneas
- **Decisión:** Pausado después de Fase 2 para priorizar sistema de turnos paso a paso (Prioridad Muy Alta). La Fase 3 se puede retomar en el futuro si es necesaria.
- **Fecha de finalización parcial:** 2025-11-14
- **Referencia:** [Plan Detallado](planes-en-curso/refactorizacion-combat-manager.md)

---

### [Sistema de Turnos de Combate](completados/combate-turnos.md) ✅ **COMPLETADO**
- **Estado:** 100% funcional (5 de 5 pasos completamente funcionales)
- **Objetivo:** Implementar un sistema de turnos de combate proactivo y funcional
- **Prioridad:** Alta
- **Última actualización:** ✅ COMPLETADO - Sistema completamente funcional
- **Resultados:**
  - ✅ Sistema de HP implementado y funcionando (sincronización frontend-backend, validación, inicialización)
  - ✅ Detección de fin de combate funcionando correctamente
  - ✅ Sistema de tiradas de dados validado y funcionando
  - ✅ Soporte para saving throw spells con metadata explícita
  - ✅ Resaltado visual de críticos y pifias
  - ✅ Mensajes de muerte y curación en panel de Tiradas
- **Análisis:** [Análisis: Sistema de Gestión de HP y Fichas](completados/combate-turnos-analisis-hp.md)

---

### [Saneamiento General de la Aplicación](completados/saneamiento-general.md)
- **Estado:** 100% completado
- **Objetivo:** Revisión sistemática de la aplicación para identificar y corregir bugs, problemas y errores
- **Fecha de finalización:** Completado - 7 secciones revisadas, 12 issues identificados, 10 corregidos, sanitización HTML implementada
- **Resultados:** 10 issues corregidos, sistema de logging centralizado, sanitización HTML con DOMPurify
- **Documentación:** [Issues Tracker](../tracking/issues/README.md)

### [Refactorización de Esquemas](completados/refactor-esquemas.md)
- **Estado:** 100% completado
- **Objetivo:** Eliminar duplicaciones e inconsistencias en la arquitectura de esquemas
- **Fecha de finalización:** Implementado en v0.4.70 (Refactorización completada)

---

## 📝 Planes Sin Comenzar

**Estado:** Pendientes | **Cantidad:** 11 planes

Planes identificados pero aún no iniciados:

### Prioridad Alta

#### [Sistema de Progresión y Gestión](roadmap.md#1-sistema-de-progresión-y-gestión-prioridad-alta)
- **Estado:** Sin comenzar
- **Objetivo:** Implementar sistema de XP, subida de nivel, gestión de inventario y economía, y persistencia de datos con base de datos
- **Prioridad:** Alta
- **Componentes:**
  - Sistema de Experiencia (XP) y Subida de Nivel
  - Gestión de Inventario y Economía
  - Persistencia de Datos (Firestore o similar)
- **Impacto:** Fundamental para crear una campaña duradera y gratificante
- **Referencia:** [Roadmap - Sección 1](../roadmap.md#1-sistema-de-progresión-y-gestión-prioridad-alta)

#### [Sistema de Inicio de Combate Dinámico](roadmap.md#2-sistema-de-inicio-de-combate-dinámico-prioridad-alta)
- **Estado:** Sin comenzar
- **Objetivo:** Implementar evaluación automática de hostilidad que inicie combate cuando acciones del jugador provoquen hostilidad (robar, insultar, etc.)
- **Prioridad:** Alta
- **Componentes:**
  - Paso de "Evaluación de Hostilidad" en `gameCoordinator`
  - Cambio automático de disposición de PNJs a `hostil`
  - Inicio automático de combate cuando sea apropiado
- **Impacto:** Crítico para la credibilidad del mundo de juego, hace que el mundo se sienta vivo y reactivo
- **Referencia:** [Roadmap - Sección 2](../roadmap.md#2-sistema-de-inicio-de-combate-dinámico-prioridad-alta)


#### [Mejora de Estructura de Fichas de Personajes](../notas/Notas de Gael.txt#sección-3-sistema-de-personajes)
- **Estado:** Sin comenzar
- **Objetivo:** Revisar y mejorar la estructura de fichas de personajes con mejor organización, más datos accesibles y mejor visualización de estados temporales
- **Prioridad:** Alta
- **Componentes:**
  - Mejor organización de información
  - Más datos accesibles (habilidades, rasgos)
  - Mejor visualización de estados temporales
  - Pestañas o secciones colapsables
- **Referencia:** [Notas de Gael - #06](../../notas/Notas de Gael.txt#sección-3-sistema-de-personajes)

### Prioridad Media

#### [Compendio de D&D Local - Base de Datos Local](sin-comenzar/compendio-dnd-local.md)
- **Estado:** Sin comenzar
- **Objetivo:** Crear un sistema de base de datos local que almacene un compendio completo de conocimiento de D&D, buscando primero en la BD local y usando la API como fallback
- **Prioridad:** Media-Alta
- **Beneficios:** Mejora de rendimiento, disponibilidad offline, reducción de llamadas a API externa
- **Referencia:** [Plan Detallado](sin-comenzar/compendio-dnd-local.md)

#### [Convertidor de PDF a JSON - Aplicación Auxiliar](sin-comenzar/pdf-to-json-converter.md)
- **Estado:** Sin comenzar
- **Objetivo:** Crear una aplicación auxiliar independiente que analice PDFs de aventuras de D&D y los convierta automáticamente en JSON compatible con el juego
- **Prioridad:** Media
- **Beneficios:** Automatización de conversión de aventuras, ahorro de tiempo, facilita añadir nuevas aventuras al juego
- **Referencia:** [Plan Detallado](sin-comenzar/pdf-to-json-converter.md)

#### [IA Conversacional Avanzada - Streaming](roadmap.md#3-ia-conversacional-avanzada-prioridad-media)
- **Estado:** Sin comenzar
- **Objetivo:** Implementar arquitectura de streaming para que los compañeros de IA reaccionen de forma más orgánica, construyendo sobre las reacciones de los demás en tiempo real
- **Prioridad:** Media
- **Componentes:**
  - Arquitectura de Streaming (WebSockets o Server-Sent Events)
  - Flujo de Turno por Pasos
  - Comunicación persistente cliente-servidor
- **Impacto:** Dinámica de grupo más orgánica y creíble, mejor inmersión
- **Referencia:** [Roadmap - Sección 3](../roadmap.md#3-ia-conversacional-avanzada-prioridad-media)

#### [Calidad y Profundidad de la IA - RAG](roadmap.md#4-calidad-y-profundidad-de-la-ia-prioridad-media)
- **Estado:** Sin comenzar
- **Objetivo:** Implementar RAG (Retrieval-Augmented Generation) para que la IA comprenda el contexto del mundo mediante base de datos vectorial
- **Prioridad:** Media
- **Componentes:**
  - Sistema RAG con base de datos vectorial
  - Búsqueda en lenguaje natural del lore
  - Memoria a Largo Plazo para eventos clave entre sesiones
- **Impacto:** Transformacional - DM verdadero conocedor del universo, capaz de improvisar detalles coherentes
- **Referencia:** [Roadmap - Sección 4](../roadmap.md#4-calidad-y-profundidad-de-la-ia-prioridad-media)

#### [Sistema de Death Saving Throws y Revivencia (D&D 5e)](sin-comenzar/sistema-death-saving-throws.md)
- **Estado:** Sin comenzar
- **Objetivo:** Implementar sistema completo de Death Saving Throws según reglas oficiales de D&D 5e, permitiendo estabilización, tracking de éxitos/fallos, y muerte permanente por 3 fallos
- **Prioridad:** Media
- **Componentes:**
  - Tiradas de salvación de muerte automáticas cada turno
  - Sistema de estabilización (acción de compañeros con tirada de Medicina DC 10)
  - Tracking de éxitos y fallos (0-3 cada uno)
  - UI para mostrar estado de death saves
- **Estimación:** 15-20 horas
- **Nota:** Extiende el sistema de inconsciencia y muerte masiva ya implementado
- **Referencia:** [Plan Detallado](sin-comenzar/sistema-death-saving-throws.md)

#### [Sistema de Estados y Condiciones en Combate](../notas/Notas de Gael.txt#sección-2-sistema-de-combate)
- **Estado:** Sin comenzar
- **Objetivo:** Implementar sistema para actualizar estadísticas temporales, estados de condición (aturdido, envenenado, etc.) y recursos gastados (slots de hechizo, usos de habilidades)
- **Prioridad:** Media
- **Componentes:**
  - Actualización de estadísticas temporales (bonificadores, penalizaciones)
  - Estados de condición (aturdido, envenenado, paralizado, etc.)
  - Recursos gastados (slots de hechizo, usos de habilidades)
- **Referencia:** [Notas de Gael - #04](../../notas/Notas de Gael.txt#sección-2-sistema-de-combate)

#### [Sistema de Foco de Objetivo en Combate](../notas/Notas de Gael.txt#sección-2-sistema-de-combate)
- **Estado:** Sin comenzar
- **Objetivo:** Implementar sistema de selección de objetivo que considere distancia, amenaza táctica, estado del objetivo y capacidades del atacante
- **Prioridad:** Media
- **Componentes:**
  - Consideración de distancia (cuerpo a cuerpo vs a distancia)
  - Evaluación de amenaza táctica
  - Análisis de estado del objetivo (herido, vulnerable, etc.)
  - Consideración de capacidades del atacante (alcance de armas/hechizos)
- **Referencia:** [Notas de Gael - #26](../../notas/Notas de Gael.txt#sección-2-sistema-de-combate)

#### [Música y Sonido Dinámicos](roadmap.md#7-música-y-sonido-dinámicos-prioridad-media-baja)
- **Estado:** Sin comenzar
- **Objetivo:** Integrar reproductor de audio que cambie la pista musical dinámicamente según el estado del juego (exploración, combate, localización específica)
- **Prioridad:** Media-Baja
- **Componentes:**
  - Reproductor de audio integrado
  - Sistema de eventos de cambio de estado
  - Selección automática de pistas según contexto
- **Impacto:** Muy alto en relación al esfuerzo - aumenta atmósfera y carga emocional
- **Referencia:** [Roadmap - Sección 7](../roadmap.md#7-música-y-sonido-dinámicos-prioridad-media-baja)

### Prioridad Baja

#### [Comandos de Voz](roadmap.md#8-comandos-de-voz-prioridad-baja)
- **Estado:** Sin comenzar
- **Objetivo:** Integrar API de Reconocimiento de Voz del navegador para añadir botón de "dictar" en la interfaz
- **Prioridad:** Baja
- **Impacto:** Aumenta accesibilidad y ofrece forma más rápida e inmersiva de interactuar
- **Referencia:** [Roadmap - Sección 8](../roadmap.md#8-comandos-de-voz-prioridad-baja)

#### [Automatización del Versionado y Changelog](roadmap.md#9-automatización-del-versionado-y-changelog-prioridad-baja)
- **Estado:** Sin comenzar
- **Objetivo:** Automatizar la actualización del `CHANGELOG.md` al cambiar la versión en `package.json`
- **Prioridad:** Baja
- **Impacto:** Mejora de calidad de vida para el desarrollador, sin impacto directo en la experiencia del jugador
- **Referencia:** [Roadmap - Sección 9](../roadmap.md#9-automatización-del-versionado-y-changelog-prioridad-baja)

---


## 🎯 Prioridades Estratégicas

### Prioridad Muy Alta

1. **✅ Sistema de Turnos Paso a Paso en Combate** - Control manual del jugador para pasar turnos uno a uno - **COMPLETADO**

### Prioridad Alta

1. **✅ Refactorización del Módulo `combat-manager.ts` (Fases 1-2)** - Reducción de 2723 → 1235 líneas (54.6%), Issues #21 y #16 resueltos - **COMPLETADO (Fase 3 pausada)**
3. **Sistema de Progresión y Gestión** - XP, niveles, inventario, persistencia con base de datos
4. **Sistema de Inicio de Combate Dinámico** - Evaluación automática de hostilidad
5. **Mejora de Estructura de Fichas de Personajes** - Mejor organización y visualización de datos
6. **Mejoras del Sistema de Combate** - Sistema completo de Saving Throws (Issue #22)

### Prioridad Media

1. **Compendio de D&D Local** - Base de datos local para consultas rápidas y modo offline
2. **IA Conversacional Avanzada** - Streaming y turnos por pasos para reacciones orgánicas
3. **Calidad y Profundidad de la IA** - RAG y memoria a largo plazo
4. **Sistema de Estados y Condiciones en Combate** - Estados temporales, condiciones, recursos gastados
5. **Sistema de Foco de Objetivo en Combate** - Selección inteligente de objetivos basada en táctica
6. **Convertidor de PDF a JSON** - Aplicación auxiliar para convertir aventuras de PDF a JSON
7. **Música y Sonido Dinámicos** - Sistema de audio adaptativo según estado del juego

### Prioridad Baja

1. **Comandos de Voz** - Reconocimiento de voz para interacción más inmersiva
2. **Automatización del Versionado** - Changelog automático

---

## 📊 Estado General del Proyecto

- **Planes Completados:** 5
- **Planes en Curso:** 0 (Refactorización parcialmente completada, Fase 3 pausada)
- **Planes Sin Comenzar:** 11
  - **Prioridad Alta:** 4 planes
  - **Prioridad Media:** 8 planes
  - **Prioridad Baja:** 2 planes

### ✅ Logros Recientes

- **Sistema de Turnos Paso a Paso:** ✅ Completado - Control total del jugador sobre el avance de turnos, botones "Pasar 1 Turno" y "Avanzar Todos", experiencia más inmersiva similar a D&D de mesa
- **Sistema de Combate por Turnos:** Completado al 100% - Sistema completamente funcional con detección de fin de combate, sistema de HP sincronizado, y validación completa de tiradas de dados
- **Sistema de HP:** Implementado y funcionando - Sincronización frontend-backend, validación con `validateAndClampHP`, inicialización correcta de enemigos
- **Sistema de Tiradas:** Validado y funcionando - Soporte para saving throw spells, resaltado visual de críticos/pifias, mensajes de muerte y curación

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

