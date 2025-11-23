# Documentación de Arquitectura

Bienvenido a la documentación de arquitectura de D&D Adventures AI. Esta carpeta contiene documentación técnica detallada sobre la estructura, diseño y flujos del sistema.

## 📋 Índice de Documentos

### Visión General
- **[Visión General](./vision-general.md)** - Visión de alto nivel de la arquitectura del proyecto
  - Modelo cliente-servidor
  - Principios arquitectónicos
  - Componentes principales
  - Diagramas de flujo generales

### Arquitectura Detallada
- **[Arquitectura Backend](./arquitectura-backend.md)** - Sistema de IA y backend
  - Principios de diseño
  - Expertos de IA (ActionInterpreter, NarrativeManager)
  - Managers especializados (NarrativeTurnManager, CompanionReactionManager)
  - Subsistema de combate
  - Herramientas de apoyo

- **[Arquitectura Frontend](./arquitectura-frontend.md)** - Cliente Next.js/React
  - Componentes principales
  - Gestión de estado
  - Flujo de datos
  - Sistema de guardado y carga

### Flujos y Datos
- **[Flujo de Datos](./flujo-datos.md)** - Diagramas detallados de flujos
  - Flujo general de una acción
  - Flujo de exploración
  - Flujo de combate
  - Flujo de guardado y carga
  - Flujo de tiradas de dados

### Referencias Técnicas
- **[Referencia de API](./referencia-api.md)** - Esquemas y contratos
  - Esquemas de datos principales
  - Server Actions
  - Flujos de IA
  - Herramientas de IA

### Patrones y Guías
- **[Patrones de Dependency Injection](./patrones-dependency-injection.md)** - Patrón DI implementado
  - Estructura del patrón
  - Ejemplos de uso
  - Casos de uso en el proyecto

- **[CombatSession - Guía de Uso](./combat-session-guia.md)** - Guía práctica de uso
  - API completa
  - Ejemplos de código
  - Casos de uso comunes

- **[CombatSession - Diseño](./combat-session-design.md)** - Diseño y decisiones arquitectónicas
  - Objetivo y motivación
  - Arquitectura del patrón State Object
  - Comparación antes/después

### Sistemas Especializados
- **[Sistema de Logging](./sistema-logging.md)** - Arquitectura del sistema de logs
  - Componentes del sistema
  - Flujo de logging
  - Centralización de logs

- **[Guía de Estilo de Logging](./guia-estilo-logging.md)** - Cuándo usar cada nivel
  - DEBUG, INFO, WARN, ERROR
  - Ejemplos y reglas
  - Mejores prácticas

## 🚀 Por Dónde Empezar

### Para Nuevos Desarrolladores
1. **Empieza con [Visión General](./vision-general.md)** para entender el modelo cliente-servidor y los principios arquitectónicos
2. **Lee [Arquitectura Backend](./arquitectura-backend.md)** para entender cómo funciona el sistema de IA
3. **Revisa [Flujo de Datos](./flujo-datos.md)** para ver cómo fluyen los datos en el sistema

### Para Desarrolladores Existentes
- **Consulta [Referencia de API](./referencia-api.md)** para esquemas y contratos
- **Usa [CombatSession - Guía de Uso](./combat-session-guia.md)** como referencia rápida
- **Revisa [Guía de Estilo de Logging](./guia-estilo-logging.md)** antes de añadir logs

### Para Arquitectos y Diseñadores
- **Revisa [CombatSession - Diseño](./combat-session-design.md)** para entender decisiones arquitectónicas
- **Consulta [Patrones de Dependency Injection](./patrones-dependency-injection.md)** para entender el patrón DI implementado
- **Lee [Sistema de Logging](./sistema-logging.md)** para entender la arquitectura de logging

## 🔗 Referencias Cruzadas

### Documentos Relacionados
- **[Visión General](../vision-diseno.md)** - Visión del proyecto y características implementadas
- **[Roadmap](../roadmap.md)** - Mejoras futuras planificadas
- **[Plan Maestro](../planes-desarrollo/plan-maestro.md)** - Planes de desarrollo y estado actual
- **[Issues Tracker](../tracking/issues/README.md)** - Problemas y mejoras identificadas

### Documentación Externa
- **[Next.js Documentation](https://nextjs.org/docs)** - Framework del frontend
- **[Genkit Documentation](https://firebase.google.com/docs/genkit)** - Framework de IA del backend
- **[D&D 5e API](https://www.dnd5eapi.co/)** - API de referencia para reglas de D&D

## 📝 Mantenimiento

### Actualización de Documentación
- **Última actualización:** 2025-01-23
- **Estado:** ✅ Actualizado con NarrativeManager y arquitectura actual
- **Próxima revisión:** Cuando cambien componentes arquitectónicos principales

### Proceso de Actualización
1. Al cambiar componentes arquitectónicos principales, actualizar:
   - `arquitectura-backend.md` o `arquitectura-frontend.md` según corresponda
   - `flujo-datos.md` si cambian los flujos
   - `referencia-api.md` si cambian esquemas o contratos
2. Actualizar este README si se añaden nuevos documentos
3. Revisar [INFORME-REVISION.md](./INFORME-REVISION.md) para ver estado de documentos

## ⚠️ Notas Importantes

- **NarrativeManager:** Reemplaza al antiguo `narrativeExpert`. Ver [Arquitectura Backend](./arquitectura-backend.md#narrativemanager-reemplaza-al-antiguo-narrativeexpert)
- **CombatSession:** Implementa patrón State Object. Ver [CombatSession - Diseño](./combat-session-design.md)
- **Narración de Combate:** `combatNarrationExpertTool` genera una única narración completa (no separada). Ver [Arquitectura Backend](./arquitectura-backend.md#combatnarrationexperttool)

## 📊 Estado de Documentos

| Documento | Estado | Última Actualización |
|-----------|--------|---------------------|
| `vision-general.md` | ✅ Actualizado | 2025-01-23 |
| `arquitectura-backend.md` | ✅ Actualizado | 2025-01-23 |
| `arquitectura-frontend.md` | ✅ Actualizado | 2025-01-23 |
| `flujo-datos.md` | ✅ Actualizado | 2025-01-23 |
| `referencia-api.md` | ✅ Actualizado | 2025-01-23 |
| `sistema-logging.md` | ✅ Actualizado | 2025-01-22 |
| `guia-estilo-logging.md` | ✅ Actualizado | 2025-01-22 |
| `patrones-dependency-injection.md` | ✅ Actualizado | 2025-01-20 |
| `combat-session-guia.md` | ✅ Actualizado | 2025-01-20 |
| `combat-session-design.md` | ✅ Actualizado | 2025-01-20 |

Para más detalles sobre el estado de la documentación, consulta [INFORME-REVISION.md](./INFORME-REVISION.md).

