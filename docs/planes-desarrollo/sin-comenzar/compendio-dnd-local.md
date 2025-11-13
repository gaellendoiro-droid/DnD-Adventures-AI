# Compendio de D&D Local - Base de Datos Local

## 📋 Objetivo

Crear un sistema de base de datos local que almacene un compendio completo de conocimiento de D&D (fichas de monstruos, reglas, razas, clases, hechizos, equipamiento, etc.). El sistema buscará primero en esta base de datos local y, si no encuentra la información, la obtendrá de múltiples fuentes (APIs open source, archivos estáticos, etc.) y la añadirá automáticamente a la base de datos para futuras consultas. El sistema será extensible, permitiendo añadir fácilmente nuevas fuentes de datos.

## 🎯 Beneficios

- **Rendimiento:** Consultas locales mucho más rápidas que llamadas a API externas
- **Disponibilidad:** Funciona incluso si las APIs externas están caídas o hay problemas de conectividad
- **Eficiencia:** Reduce significativamente las llamadas a APIs externas
- **Personalización:** Permite añadir datos personalizados o modificaciones de reglas
- **Offline:** El sistema puede funcionar sin conexión a internet una vez poblada la base de datos
- **Flexibilidad:** Soporte para múltiples fuentes de datos (APIs, archivos estáticos, bases de datos externas)
- **Extensibilidad:** Arquitectura modular que permite añadir nuevas fuentes fácilmente
- **Robustez:** Si una fuente falla, el sistema puede intentar con otras fuentes alternativas

## 🏗️ Arquitectura Propuesta

### Componentes Principales

1. **Base de Datos Local**
   - **Tecnología sugerida:** SQLite (ligera, sin servidor, fácil de distribuir) o JSON estructurado con indexación
   - **Estructura:** Tablas/colecciones para cada tipo de entidad (monstruos, hechizos, razas, clases, equipamiento, reglas)

2. **Sistema de Búsqueda Inteligente**
   - Búsqueda por nombre exacto
   - Búsqueda fuzzy (tolerante a errores de escritura)
   - Búsqueda por alias/nombres alternativos
   - Búsqueda semántica (opcional, para futuro)

3. **Sistema de Múltiples Fuentes de Datos (Data Providers)**
   - **Arquitectura de Proveedores:** Sistema modular de "proveedores" o "adaptadores" para diferentes fuentes
   - **Fuentes Soportadas:**
     - APIs REST (D&D 5e API, Open5e, etc.)
     - Archivos estáticos (JSON, CSV, YAML)
     - Bases de datos externas (opcional)
     - Datos personalizados del usuario
   - **Priorización de Fuentes:** Sistema de orden de prioridad para consultar múltiples fuentes
   - **Fallback Inteligente:** Si una fuente falla, intenta con la siguiente en la lista de prioridades
   - **Validación y Normalización:** Cada proveedor normaliza sus datos a un formato común antes de guardar

4. **Sistema de Sincronización con Fuentes Externas**
   - Detección automática de datos faltantes
   - Obtención de datos de múltiples fuentes según prioridad
   - Validación y normalización de datos antes de guardar
   - Actualización automática de datos existentes (opcional)
   - Sincronización periódica con fuentes configuradas

5. **Sistema de Caché y Optimización**
   - Cacheo de búsquedas frecuentes en memoria
   - Priorización de datos más usados
   - Métricas de uso para optimización
   - Cacheo de resultados de cada fuente para evitar consultas redundantes

## 📝 Pasos de Implementación

### Paso 1: Diseño de Esquema de Base de Datos
- [ ] Definir estructura de tablas/colecciones para cada tipo de entidad
- [ ] Diseñar relaciones entre entidades (ej: hechizos por clase, equipamiento por tipo)
- [ ] Definir campos de indexación para búsquedas rápidas
- [ ] Crear esquemas de validación (Zod) para cada tipo de dato
- [ ] Documentar el esquema completo

### Paso 2: Implementación de Base de Datos
- [ ] Elegir tecnología (SQLite recomendado)
- [ ] Crear scripts de inicialización de base de datos
- [ ] Implementar funciones de acceso a datos (CRUD)
- [ ] Crear índices para optimizar búsquedas
- [ ] Implementar sistema de migraciones (si aplica)

### Paso 3: Sistema de Búsqueda
- [ ] Implementar búsqueda por nombre exacto
- [ ] Implementar búsqueda fuzzy (usar librería como `fuse.js` o similar)
- [ ] Implementar sistema de alias/nombres alternativos
- [ ] Crear función de normalización de nombres (similar a `normalizeMonsterName` actual)
- [ ] Implementar búsqueda por categorías/tags

### Paso 4: Sistema de Múltiples Fuentes de Datos (Data Providers)
- [ ] Diseñar interfaz común para proveedores de datos (`IDataProvider`)
- [ ] Crear proveedor base abstracto con funcionalidad común
- [ ] Implementar proveedor para D&D 5e API (migrar lógica existente)
- [ ] Implementar proveedor para archivos estáticos (JSON/CSV/YAML)
- [ ] Crear sistema de registro y priorización de proveedores
- [ ] Implementar sistema de fallback entre proveedores (si uno falla, intenta el siguiente)
- [ ] Crear sistema de configuración de proveedores (habilitar/deshabilitar, orden de prioridad)
- [ ] Implementar logging de qué proveedor se usó para cada consulta
- [ ] Documentar cómo añadir nuevos proveedores

### Paso 5: Integración con Base de Datos Local
- [ ] Crear función de búsqueda en base de datos local
- [ ] Modificar `dndApiLookupTool` para buscar primero en BD local
- [ ] Implementar fallback a proveedores de datos si no se encuentra en BD local
- [ ] Crear función de guardado automático de datos obtenidos de cualquier fuente
- [ ] Implementar validación y normalización de datos antes de guardar
- [ ] Añadir campo `source` y `source_provider` a cada registro para trazabilidad

### Paso 6: Sistema de Sincronización y Actualización
- [ ] Implementar detección de datos faltantes
- [ ] Crear sistema de sincronización periódica (opcional, en background)
- [ ] Implementar sistema de versionado de datos (para detectar cambios en la API)
- [ ] Crear función de actualización manual de datos específicos
- [ ] Implementar logging de sincronizaciones

### Paso 7: Optimización y Caché
- [ ] Implementar caché en memoria para búsquedas frecuentes
- [ ] Crear sistema de métricas de uso (qué datos se consultan más)
- [ ] Implementar priorización de datos en caché según uso
- [ ] Optimizar consultas a la base de datos
- [ ] Implementar cacheo de búsquedas fallidas (para evitar repetir búsquedas inútiles)

### Paso 8: Sistema de Fallback y Resiliencia
- [ ] Implementar detección de errores de API
- [ ] Crear sistema de fallback completo a BD local si API falla
- [ ] Implementar sistema de reintentos con backoff exponencial
- [ ] Crear logging de fallos y recuperación
- [ ] Documentar comportamiento en modo offline

### Paso 9: Soporte Multiidioma
- [ ] Extender esquema para soportar múltiples idiomas (español/inglés)
- [ ] Implementar búsqueda en ambos idiomas
- [ ] Crear sistema de traducción automática de nombres (usar mapeo existente)
- [ ] Añadir campo de idioma preferido en configuración

### Paso 10: Exportación e Importación
- [ ] Crear función de exportación de base de datos (para compartir entre instancias)
- [ ] Implementar función de importación de datos
- [ ] Crear formato de intercambio (JSON estructurado)
- [ ] Implementar validación de datos importados
- [ ] Documentar proceso de exportación/importación

### Paso 11: Población Inicial de Datos
- [ ] Crear script de población inicial con datos comunes (goblins, orcos, hechizos básicos, etc.)
- [ ] Implementar carga progresiva de datos según necesidad
- [ ] Crear sistema de "packs de datos" (monstruos básicos, hechizos nivel 1, etc.)
- [ ] Documentar proceso de población inicial

### Paso 12: Integración con Sistema Actual
- [ ] Reemplazar llamadas directas a API en `combat-manager.ts` (obtención de stats de monstruos)
- [ ] Actualizar `dndApiLookupTool` para usar BD local primero
- [ ] Modificar sistema de caché de promesas pendientes para incluir BD local
- [ ] Actualizar logs para indicar origen de datos (BD local vs API)
- [ ] Probar integración completa

### Paso 13: Testing y Validación
- [ ] Crear tests unitarios para funciones de BD
- [ ] Crear tests de integración para búsqueda y sincronización
- [ ] Probar sistema de fallback cuando API falla
- [ ] Validar rendimiento (tiempo de búsqueda local vs API)
- [ ] Probar con datos reales de aventuras

### Paso 14: Documentación
- [ ] Documentar estructura de base de datos
- [ ] Crear guía de uso para desarrolladores
- [ ] Documentar proceso de sincronización
- [ ] Actualizar documentación de arquitectura
- [ ] Crear diagramas de flujo del sistema

## 🔧 Consideraciones Técnicas

### Tecnología de Base de Datos

**Opción 1: SQLite (Recomendado)**
- ✅ Ligera, sin servidor
- ✅ Fácil de distribuir con la aplicación
- ✅ Excelente rendimiento para datos estructurados
- ✅ Soporte nativo en Node.js (`better-sqlite3` o `sql.js`)
- ⚠️ Requiere migraciones para cambios de esquema

**Opción 2: JSON + Indexación**
- ✅ Muy simple de implementar
- ✅ Fácil de leer y modificar manualmente
- ✅ No requiere dependencias adicionales
- ⚠️ Menos eficiente para búsquedas complejas
- ⚠️ Puede volverse lento con muchos datos

**Opción 3: Base de Datos Vectorial (Futuro)**
- ✅ Permitiría búsqueda semántica
- ✅ Útil para RAG (Retrieval-Augmented Generation)
- ⚠️ Más complejo de implementar
- ⚠️ Requiere más recursos

### Estructura de Datos Propuesta

```typescript
// Ejemplo de esquema para monstruos
interface Monster {
  id: string;                    // ID único (ej: "goblin")
  name: string;                  // Nombre en inglés
  name_es?: string;              // Nombre en español (opcional)
  aliases?: string[];            // Nombres alternativos
  type: string;                  // Tipo de criatura
  size: string;                  // Tamaño
  alignment: string;             // Alineamiento
  armor_class: number;           // CA
  hit_points: number;            // PV
  speed: object;                 // Velocidades
  stats: {                       // Estadísticas
    strength: number;
    dexterity: number;
    // ...
  };
  skills?: object;               // Habilidades
  damage_resistances?: string[]; // Resistencias
  languages?: string[];          // Idiomas
  challenge_rating: number;      // CR
  source: 'api' | 'manual' | 'file';  // Origen del dato
  source_provider?: string;      // Proveedor específico (ej: "dnd5eapi", "open5e", "static-file")
  last_updated: Date;           // Última actualización
  version: number;               // Versión del dato
}
```

### Arquitectura de Proveedores de Datos

El sistema utilizará una arquitectura modular de "proveedores" (providers) que permite añadir fácilmente nuevas fuentes de datos:

```typescript
// Interfaz común para todos los proveedores
interface IDataProvider {
  name: string;                    // Nombre del proveedor (ej: "dnd5eapi")
  priority: number;                // Prioridad (menor número = mayor prioridad)
  enabled: boolean;                 // Si está habilitado
  search(query: string, type: string): Promise<any | null>;
  getById(id: string, type: string): Promise<any | null>;
  normalize(data: any): any;        // Normaliza datos a formato común
  validate(data: any): boolean;     // Valida datos antes de guardar
}
```

**Ejemplos de Proveedores a Implementar:**

1. **D&D 5e API Provider** (Prioridad 1)
   - URL: `https://www.dnd5eapi.co/api`
   - Fuente oficial de D&D 5e
   - Ya implementado parcialmente en el código actual

2. **Open5e API Provider** (Prioridad 2)
   - URL: `https://api.open5e.com/`
   - API open source alternativa con datos de D&D 5e
   - Puede tener datos adicionales o diferentes formatos

3. **Static File Provider** (Prioridad 3)
   - Lee archivos JSON/CSV/YAML locales
   - Permite datos personalizados del usuario
   - Útil para homebrew y modificaciones

4. **Custom Data Provider** (Prioridad 4)
   - Permite añadir datos manualmente
   - Interfaz para que usuarios añadan sus propios monstruos/hechizos

**Sistema de Fallback:**
```
1. Buscar en BD local
2. Si no encuentra, intentar Provider 1 (D&D 5e API)
3. Si falla, intentar Provider 2 (Open5e)
4. Si falla, intentar Provider 3 (Static Files)
5. Si todo falla, retornar null o datos por defecto
```

### Integración con Sistema Actual

El sistema actual ya tiene:
- `dndApiLookupTool` en `src/ai/tools/dnd-api-lookup.ts`
- `getMonsterStatsFromDndApi` en `src/ai/tools/combat-manager.ts`
- Sistema de normalización de nombres español/inglés
- Caché de promesas pendientes

**Cambios necesarios:**
1. Crear nuevo módulo `src/lib/dnd-database.ts` con funciones de BD
2. Crear módulo `src/lib/dnd-providers/` con sistema de proveedores
3. Implementar proveedores individuales en `src/lib/dnd-providers/`
4. Modificar `dndApiLookupTool` para usar sistema de proveedores
5. Modificar `getMonsterStatsFromDndApi` para usar BD local y proveedores
6. Mantener sistema de caché de promesas pendientes pero incluyendo BD local

## 📊 Métricas de Éxito

- [ ] Reducción del 80%+ en llamadas a la API externa
- [ ] Tiempo de búsqueda local < 50ms (vs 200-500ms de API)
- [ ] Sistema funciona correctamente en modo offline
- [ ] Base de datos contiene al menos 100 monstruos comunes después de uso normal
- [ ] Búsqueda fuzzy encuentra resultados con 70%+ de similitud

## 🔗 Issues Relacionados

- Issue #15: Mejora de búsqueda en D&D API para monstruos no mapeados (se resolverá parcialmente con este sistema)

## 📚 APIs Open Source y Fuentes de Datos Disponibles

### APIs REST

1. **D&D 5e API** (Recomendado - Prioridad 1)
   - URL: `https://www.dnd5eapi.co/api`
   - Documentación: https://www.dnd5eapi.co/docs/
   - Características: API oficial de D&D 5e, bien mantenida, datos completos
   - Endpoints: `/monsters`, `/spells`, `/equipment`, `/races`, `/classes`, etc.

2. **Open5e API** (Alternativa - Prioridad 2)
   - URL: `https://api.open5e.com/`
   - Documentación: https://open5e.com/
   - Características: API open source alternativa, puede tener datos adicionales
   - Endpoints: `/monsters/`, `/spells/`, `/magic-items/`, etc.

3. **D&D Beyond (No oficial, requiere scraping)**
   - URL: `https://www.dndbeyond.com/`
   - Nota: No tiene API pública oficial, requeriría scraping (no recomendado)

### Archivos Estáticos

1. **Repositorios GitHub con datos de D&D**
   - Varios repositorios con JSON/CSV de monstruos, hechizos, etc.
   - Ejemplo: `5e-database`, `dnd-5e-database`, etc.

2. **Datos personalizados del usuario**
   - Archivos JSON/CSV/YAML en carpeta local
   - Permite homebrew y modificaciones personalizadas

### Consideraciones para Nuevos Proveedores

Al añadir un nuevo proveedor, considerar:
- **Formato de datos:** ¿Es compatible con el esquema común?
- **Completitud:** ¿Tiene todos los campos necesarios?
- **Actualización:** ¿Se actualiza regularmente?
- **Licencia:** ¿Permite uso en proyectos open source?
- **Rate Limits:** ¿Tiene límites de uso?
- **Confiabilidad:** ¿Está activo y mantenido?

## 📚 Referencias

- [D&D 5e API Documentation](https://www.dnd5eapi.co/docs/)
- [Open5e API](https://open5e.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [better-sqlite3 npm package](https://www.npmjs.com/package/better-sqlite3)
- [Fuse.js - Fuzzy Search](https://fusejs.io/) - Para búsqueda fuzzy

## 🎯 Prioridad

**Prioridad:** Media-Alta

**Razón:** 
- Mejora significativamente el rendimiento
- Reduce dependencia de API externa
- Facilita futuras mejoras (RAG, búsqueda semántica)
- Mejora la experiencia del usuario (búsquedas más rápidas)

## 📅 Estado

**Estado:** Sin comenzar

**Última actualización:** 2025-01-12

---

## 💡 Mejoras Futuras (Post-Implementación)

- **Búsqueda Semántica:** Usar embeddings para búsquedas por significado, no solo por nombre
- **Sistema de Plugins:** Permitir que usuarios añadan proveedores personalizados mediante plugins
- **Sincronización en la Nube:** Compartir base de datos entre múltiples instancias
- **API Local:** Exponer la base de datos como API local para otras herramientas
- **Análisis de Uso:** Dashboard para ver qué datos se consultan más y optimizar
- **Proveedores Comunitarios:** Sistema para que la comunidad comparta proveedores personalizados
- **Cacheo Inteligente por Proveedor:** Cachear resultados de cada proveedor por separado para optimizar
- **Validación Cruzada:** Comparar datos de múltiples proveedores para detectar inconsistencias

