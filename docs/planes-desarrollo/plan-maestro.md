# Plan Maestro de Desarrollo

Este documento es el plan general que coordina todos los planes de desarrollo específicos del proyecto D&D Adventures AI. Aquí encontrarás una visión de alto nivel de las mejoras planificadas, organizadas por estado y prioridad.

## 📋 Índice de Planes

---

## 🚧 Planes en Curso

**Estado:** Activos | **Cantidad:** 1 plan

Planes que están siendo trabajados activamente:

### [Sistema de Turnos de Combate](planes-en-curso/combate-turnos.md)
- **Estado:** 60% funcional (3 de 5 pasos completamente funcionales, 1 no completado, 1 completado)
- **Objetivo:** Implementar un sistema de turnos de combate proactivo y funcional
- **Prioridad:** Alta
- **Última actualización:** Paso 4 NO COMPLETADO - Bloqueado por sistema de HP no funcional
- **Bloqueador crítico:** Sistema de gestión de HP requiere implementación completa antes de poder finalizar el combate
- **Análisis:** [Análisis: Sistema de Gestión de HP y Fichas](planes-en-curso/combate-turnos-analisis-hp.md)

---

## ✅ Planes Completados

**Estado:** Finalizados | **Cantidad:** 2 planes

Planes que han sido implementados exitosamente:

### [Saneamiento General de la Aplicación](completados/saneamiento-general.md) ⚠️ **NUEVO**
- **Estado:** 100% completado
- **Objetivo:** Revisión sistemática de la aplicación para identificar y corregir bugs, problemas y errores
- **Fecha de finalización:** Completado - 7 secciones revisadas, 12 issues identificados, 10 corregidos, sanitización HTML implementada
- **Resultados:** 10 issues corregidos, sistema de logging centralizado, sanitización HTML con DOMPurify
- **Documentación:** [Issues Encontrados](issues-encontrados.md)

### [Refactorización de Esquemas](completados/refactor-esquemas.md)
- **Estado:** 100% completado
- **Objetivo:** Eliminar duplicaciones e inconsistencias en la arquitectura de esquemas
- **Fecha de finalización:** Implementado en v0.4.70

---

## 📝 Planes Sin Comenzar

**Estado:** Pendientes | **Cantidad:** 2 planes

Planes identificados pero aún no iniciados:

### [Compendio de D&D Local - Base de Datos Local](sin-comenzar/compendio-dnd-local.md)
- **Estado:** Sin comenzar
- **Objetivo:** Crear un sistema de base de datos local que almacene un compendio completo de conocimiento de D&D, buscando primero en la BD local y usando la API como fallback
- **Prioridad:** Media-Alta
- **Beneficios:** Mejora de rendimiento, disponibilidad offline, reducción de llamadas a API externa

### [Convertidor de PDF a JSON - Aplicación Auxiliar](sin-comenzar/pdf-to-json-converter.md)
- **Estado:** Sin comenzar
- **Objetivo:** Crear una aplicación auxiliar independiente que analice PDFs de aventuras de D&D y los convierta automáticamente en JSON compatible con el juego
- **Prioridad:** Media
- **Beneficios:** Automatización de conversión de aventuras, ahorro de tiempo, facilita añadir nuevas aventuras al juego

---


## 🎯 Prioridades Estratégicas

### Prioridad Alta

1. **Sistema de Gestión de HP y Fichas** - ⚠️ **BLOQUEADOR CRÍTICO** - Implementar sistema completo de gestión de HP para personajes y enemigos (sincronización frontend-backend, inicialización, validación, estandarización)
2. **Finalizar Sistema de Turnos de Combate** - Completar Paso 4 (detección de fin de combate) después de resolver sistema de HP
3. **Sistema de Inicio de Combate Dinámico** - Evaluación automática de hostilidad
4. **Sistema de Progresión y Gestión** - XP, niveles, inventario, persistencia

### Prioridad Media

1. **Compendio de D&D Local** - Base de datos local para consultas rápidas y modo offline
2. **Convertidor de PDF a JSON** - Aplicación auxiliar para convertir aventuras de PDF a JSON
3. **IA Conversacional Avanzada** - Streaming y turnos por pasos
4. **Calidad y Profundidad de la IA** - RAG y memoria a largo plazo
5. **Música y Sonido Dinámicos** - Sistema de audio adaptativo

### Prioridad Baja

1. **Comandos de Voz** - Reconocimiento de voz
2. **Automatización del Versionado** - Changelog automático

---

## 📊 Estado General del Proyecto

- **Planes Completados:** 2
- **Planes en Curso:** 1
- **Planes Sin Comenzar:** 2

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

