# Planes de Desarrollo

Esta carpeta contiene todos los planes de desarrollo del proyecto D&D Adventures AI, organizados por estado de implementación.

## 📁 Estructura

```
planes-desarrollo/
├── plan-maestro.md          # Plan general que coordina todos los planes
├── planes-en-curso/         # Planes activos en desarrollo
├── completados/             # Planes finalizados exitosamente
└── sin-comenzar/            # Planes identificados pero no iniciados
```

## 🎯 Comenzar Aquí

**Lee primero el [Plan Maestro](./plan-maestro.md)** para obtener una visión general de todos los planes y su estado actual.

## 📋 Categorías

### 🚧 Planes en Curso (`planes-en-curso/`)

Planes que están siendo trabajados activamente. Cuando un plan se completa, se mueve a `completados/`.

### ✅ Planes Completados (`completados/`)

Planes que han sido implementados exitosamente. Estos sirven como referencia histórica y documentación de mejoras realizadas.

### 📝 Planes Sin Comenzar (`sin-comenzar/`)

Planes identificados pero aún no iniciados. Consulta el [Roadmap](../roadmap.md) para ideas de futuros planes.

## 📝 Cómo Crear un Nuevo Plan

1. **Identifica la mejora:** Basándote en el [Roadmap](../roadmap.md) o necesidades del proyecto
2. **Crea el archivo:** En `sin-comenzar/` con un nombre descriptivo (ej: `sistema-progresion.md`)
3. **Estructura el plan:**
   - Objetivo claro
   - Pasos detallados con checkboxes `- [ ]`
   - Criterios de verificación
   - Referencias a archivos afectados
4. **Actualiza el Plan Maestro:** Añade el nuevo plan a `plan-maestro.md`
5. **Mueve cuando comiences:** Al iniciar el trabajo, mueve el archivo a `planes-en-curso/`

## 🔄 Flujo de Trabajo

```
sin-comenzar/ → planes-en-curso/ → completados/
```

1. **Plan identificado** → Creado en `sin-comenzar/`
2. **Trabajo iniciado** → Movido a `planes-en-curso/`
3. **Plan completado** → Movido a `completados/` y actualizado en `plan-maestro.md`

## 📚 Referencias

- [Plan Maestro](./plan-maestro.md) - Visión general y coordinación
- [Roadmap](../roadmap.md) - Ideas y mejoras futuras
- [CHANGELOG.md](../../CHANGELOG.md) - Historial de cambios implementados

