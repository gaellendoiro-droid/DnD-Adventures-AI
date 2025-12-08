# Arquitectura de Conocimiento Unificado: El Cerebro Híbrido (v2.1 - Análisis de Complejidad)

## 🧠 Análisis de Riesgo y Complejidad
Tras revisar la pregunta sobre la complejidad, he realizado un análisis honesto de los pros y contras arquitectónicos.

### ¿Aumenta la complejidad?
**Sí, a corto plazo (implementación).** Integrar RAG + SQLite añade dos "piezas móviles" nuevas al sistema.
**No, a largo plazo (mantenimiento y jugabilidad).** Reduce drásticamente la complejidad de *gestión de datos* y *lógica de parches*.

| Aspecto | Complejidad Actual (Sin Sistema) | Complejidad Nueva (Con Sistema Híbrido) | Veredicto |
| :--- | :--- | :--- | :--- |
| **Validación de Reglas** | Altísima. El DM "halucina" o hay que hardcodear reglas en TS. | La IA lee el manual. Menos código, más precisión. | **Simplificación** ✅ |
| **Datos de Monstruos** | Lenta. Llamadas a API externa por HTTP cada vez. | Rápida. Consulta local SQL. | **Optimización** ✅ |
| **Nuevos Contenidos** | Dolorosa. Escribir JSONs gigantes a mano. | Automática. La IA extrae del PDF. | **Simplificación Masiva** ✅ |
| **Infraestructura** | Simple (solo código). | Media (Código + DB Local + Gestión PDF). | **Aumento de Complejidad Técnica** ⚠️ |

### Conclusión del Arquitecto
La complejidad técnica aumenta *ligeramente* (tienes que mantener una DB y un upload de PDF), pero la complejidad *operativa* (jugar, añadir homebrew, validar reglas) cae en picado.

**Es una inversión:** Pagas un poco de complejidad ahora para evitar el caos después, cuando intentes implementar el Sistema de Progresión (Roadmap #2) y te des cuenta de que no tienes datos para subir de nivel.

---

## 📋 Plan de Implementación Exhautivo (Simplificado para Fase 1)

Para mitigar el riesgo de complejidad y validar la IA, haremos un despliegue incremental con una prueba de concepto inicial.

### Fase 0: Validación de Capacidades (Proof of Concept) 🛑 *Critical Check*
*Objetivo: Verificar si Gemini realmente puede entender tu PDF complejo (tablas, columnas) antes de construir nada.*

- [ ] **Script de Prueba (`scripts/poc-pdf-parsing.ts`):**
    - **Modelo:** Usaremos `gemini-3-pro-preview` (Lanzado Nov 2025, optimizado para razonamiento complejo y multimodal).
    - Subir el PDF a File Search.
    - Lanzar 3 "retos" de extracción difíciles:
        1.  **Reto Tabular:** "Extrae la tabla de Armas como JSON, incluyendo daño, peso y propiedades". (Prueba si entiende columnas/filas).
        2.  **Reto Multicolumna:** "Resume los rasgos de clase del Paladín a nivel 3". (Prueba si mezcla texto de columnas adyacentes).
        3.  **Reto Disperso:** "Explica las reglas de cobertura y visibilidad". (Prueba si junta info de varias secciones).
- [ ] **Criterio de Éxito:** Si la IA falla en extraer la tabla correctamente o mezcla columnas, **abortamos la Fase 3** (el puente automático) y nos quedamos solo con la Fase 1 (Base de datos manual/SRD).

### Fase 1: Cimientos de Datos (SQLite + Providers) - *El suelo firme*
*Objetivo: Migrar la dependencia de API externa a local. Sin IA compleja aún.*

- [ ] **Infraestructura DB:**
    - Inicializar `src/lib/db/index.ts` con `better-sqlite3`.
    - Definir esquemas Zod para `Monster`, `Spell`, `Item`.
    - Crear tablas híbridas: `id (PK)`, `name (Index)`, `type (Index)`, `data (JSON)`.
- [ ] **Provider SRD (Open5e):**
    - Implementar script de "Semillado" (`seed-db.ts`) que baje todo el SRD gratuito de Open5e y pueble la DB inicial.
    - Esto nos da el 80% de los datos base gratis y rápido.
- [ ] **Adaptador de Combate:**
    - Refactorizar `CombatActionResolver` para usar `DataService.getMonster()` en lugar de llamadas HTTP directas.

### Fase 2: Ingesta de Conocimiento (Google File Search) - *Los ojos*
*Objetivo: Darle "ojos" a la IA sobre el manual oficial. Solo lectura.*

- [ ] **Gestión de Corpus:**
    - Script para subir el PDF del Manual del Jugador a Google AI Studio.
    - Estrategia de nombrado de archivos para referencia (ej: `PHB_Core_Rules.pdf`).
- [ ] **Tool `consultRulebook`:**
    - Tool específica para el `NarrativeManager`: "Consulta el manual si tienes dudas de reglas".
    - **Optimización de Prompt:** Instruir para que cite página/capítulo si es posible.

### Fase 3: El Puente de Estructuración (AI-Hydration) 🚀 - *La magia*
*Objetivo: Convertir texto de PDF en mecánica jugable automáticamente. Solo cuando Fases 1 y 2 sean estables.*

- [ ] **Tool `structureFromLore`:**
    - Input: Nombre de entidad (ej: "Juramento de Venganza", "Espada Sombría").
    - Proceso: Búsqueda RAG -> Extracción a JSON -> Validación Zod -> Insert en SQLite.
- [ ] **Flujo de Fallback Inteligente:**
    - `DataService.get()`:
        1.  ¿Existe en SQLite? -> Retornar ✅
        2.  ¿Existe en API SRD? -> Bajar, Guardar, Retornar ✅
        3.  ¿Existe en PDF (RAG)? -> Estructurar, Guardar, Retornar ✅
        4.  Generar sintético (último recurso) -> Retornar ⚠️

---

## ⚠️ Requisitos Críticos Simplificados
1.  **PDF del Manual:** Ubicar en `knowledge/source_books/` (Carpeta nueva).
2.  **API Key:** Usar la existente de Gemini (Genkit lo gestiona).

## 🛡️ Ventajas de esta Arquitectura v2
- **Evolutiva:** La base de datos "aprende" y crece cuanto más juegas.
- **Resiliente:** Si internet cae, tienes todo lo que ya has usado cacheado localmente.
- **Data-Driven:** Prepara el terreno perfecto para el Sistema de Progresión (XP/Niveles).

---
**Estado:** Pendiente de Aprobación
**Siguiente Paso:** Validar si el usuario tiene el PDF listo para subir y comenzar Fase 1 (SQLite Base).
