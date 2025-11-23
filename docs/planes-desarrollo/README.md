# Planes de Desarrollo

> ⚠️ **IMPORTANTE:** Cada vez que se modifique este archivo, **debe actualizarse también el [plan-maestro.md](./plan-maestro.md)** si hay cambios en la estructura, flujo de trabajo o referencias.

---

Esta carpeta contiene todos los planes de desarrollo del proyecto D&D Adventures AI, organizados por estado de implementación.

## 📁 Estructura

```
planes-desarrollo/
├── plan-maestro.md          # Plan general que coordina todos los planes
├── en-curso/                # Planes activos en desarrollo
├── completados/              # Planes finalizados exitosamente
└── sin-comenzar/            # Planes identificados pero no iniciados
```

## 🎯 Comenzar Aquí

**Lee primero el [Plan Maestro](./plan-maestro.md)** para obtener una visión general de todos los planes y su estado actual.

## 📋 Categorías

Para ver el estado detallado de todos los planes, consulta el [Plan Maestro](./plan-maestro.md).

- **🚧 Planes en Curso** (`en-curso/`) - Planes activos en desarrollo
- **✅ Planes Completados** (`completados/`) - Planes finalizados exitosamente
- **📝 Planes Sin Comenzar** (`sin-comenzar/`) - Planes identificados pero aún no iniciados

## 📝 Cómo Crear un Nuevo Plan

1. **Identifica la mejora:** Basándote en el [Roadmap](../roadmap.md) o necesidades del proyecto
2. **Crea el archivo:** En `sin-comenzar/` con un nombre descriptivo (ej: `sistema-progresion.md`)
3. **Estructura el plan:**
   - Objetivo claro
   - Pasos detallados con checkboxes `- [ ]`
   - Criterios de verificación
   - Referencias a archivos afectados
4. **Actualiza el Plan Maestro:** Añade el nuevo plan a `plan-maestro.md`
5. **Mueve cuando comiences:** Al iniciar el trabajo, mueve el archivo a `en-curso/`

## 🔄 Flujo de Trabajo

```
sin-comenzar/ → en-curso/ → completados/
```

1. **Plan identificado** → Creado en `sin-comenzar/`
2. **Trabajo iniciado** → Movido a `en-curso/`
3. **Plan completado** → Movido a `completados/` y actualizado en `plan-maestro.md`

## 📚 Referencias

- [Plan Maestro](./plan-maestro.md) - Visión general y coordinación
- [Roadmap](../roadmap.md) - Ideas y mejoras futuras
- [CHANGELOG.md](../../CHANGELOG.md) - Historial de cambios implementados

