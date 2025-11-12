# Plan Maestro de Desarrollo

Este documento es el plan general que coordina todos los planes de desarrollo específicos del proyecto D&D Adventures AI. Aquí encontrarás una visión de alto nivel de las mejoras planificadas, organizadas por estado y prioridad.

## 📋 Índice de Planes

---

## 🚧 Planes en Curso

**Estado:** Activos | **Cantidad:** 1 plan

Planes que están siendo trabajados activamente:

### [Sistema de Turnos de Combate](planes-en-curso/combate-turnos.md)
- **Estado:** 75% completado (3 de 4 pasos)
- **Objetivo:** Implementar un sistema de turnos de combate proactivo y funcional
- **Prioridad:** Alta
- **Última actualización:** En progreso - Paso 4 pendiente

---

## ✅ Planes Completados

**Estado:** Finalizados | **Cantidad:** 2 planes

Planes que han sido implementados exitosamente:

### [Saneamiento General de la Aplicación](completados/saneamiento-general.md) ⚠️ **NUEVO**
- **Estado:** 100% completado
- **Objetivo:** Revisión sistemática de la aplicación para identificar y corregir bugs, problemas y errores
- **Fecha de finalización:** Completado - 7 secciones revisadas, 12 issues identificados, 10 corregidos, sanitización HTML implementada
- **Resultados:** 10 issues corregidos, sistema de logging centralizado, sanitización HTML con DOMPurify
- **Documentación:** [Issues Encontrados](completados/issues-encontrados.md)

### [Refactorización de Esquemas](completados/refactor-esquemas.md)
- **Estado:** 100% completado
- **Objetivo:** Eliminar duplicaciones e inconsistencias en la arquitectura de esquemas
- **Fecha de finalización:** Implementado en v0.4.70

---

## 📝 Planes Sin Comenzar

**Estado:** Pendientes | **Cantidad:** 0 planes

Planes identificados pero aún no iniciados:

- *Por definir - Consulta el [Roadmap](../roadmap.md) para ideas futuras*

---


## 🎯 Prioridades Estratégicas

### Prioridad Alta

1. **Finalizar Sistema de Turnos de Combate** - Completar la detección de fin de combate
2. **Sistema de Inicio de Combate Dinámico** - Evaluación automática de hostilidad
3. **Sistema de Progresión y Gestión** - XP, niveles, inventario, persistencia

### Prioridad Media

1. **IA Conversacional Avanzada** - Streaming y turnos por pasos
2. **Calidad y Profundidad de la IA** - RAG y memoria a largo plazo
3. **Música y Sonido Dinámicos** - Sistema de audio adaptativo

### Prioridad Baja

1. **Comandos de Voz** - Reconocimiento de voz
2. **Automatización del Versionado** - Changelog automático

---

## 📊 Estado General del Proyecto

- **Planes Completados:** 2
- **Planes en Curso:** 1
- **Planes Sin Comenzar:** 0

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

