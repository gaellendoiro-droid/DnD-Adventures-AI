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

- [x] **Script de Prueba (`scripts/poc-pdf-parsing.ts`):**
    - **Validación Exitosa (Dic 2025):** `gemini-3-pro-preview` ha demostrado ser capaz de extraer tablas complejas y texto estructurado via inlineData y File API.
    - **Hallazgo Crítico - Limitaciones de Tamaño:**
        - **Procesamiento de Contexto:** Aunque la API de Archivos permite subir hasta 2GB, el modelo (Gemini 3 Pro / 1.5 Pro) tiene un límite práctico de procesamiento de contexto de **~50 MB** o **1,000 páginas** por archivo individual.
        - **Archivos Grandes:** Archivos como el manual completo en alta calidad (>66MB) fallan en la etapa de generación o subida por timeout/contexto.
        - **Solución:** Se requiere dividir los manuales grandes en capítulos (ej. `PHB_Part1_Reglas.pdf`, `PHB_Part2_Hechizos.pdf`) de <40MB para asegurar estabilidad.
- [x] **Criterio de Éxito:** La IA ha superado la prueba de extracción con archivos optimizados. Procedemos con la arquitectura asumiendo pre-procesamiento de PDFs.

### Fase 1: Cimientos de Datos (SQLite + Providers) - *El suelo firme*
*Objetivo: Migrar la dependencia de API externa a local. Sin IA compleja aún.*

- [x] **Infraestructura DB:**
    - Inicializar `src/lib/db/index.ts` con `better-sqlite3`.
    - Definir esquemas Zod para `Monster`, `Spell`, `Item`.
    - Crear tablas híbridas: `id (PK)`, `name (Index)`, `type (Index)`, `data (JSON)`.
- [x] **Provider SRD (Open5e):**
    - Implementar script de "Semillado" (`seed-db.ts`) que baje todo el SRD gratuito de Open5e y pueble la DB inicial.
    - Esto nos da el 80% de los datos base gratis y rápido.
- [x] **Adaptador de Combate:**
    - Refactorizar `CombatActionResolver` para usar `DataService.getMonster()` en lugar de llamadas HTTP directas.

### Fase 2: Ingesta de Manuales (RAG) - *Los ojos*
*Objetivo: Darle "ojos" a la IA sobre el manual oficial. Solo lectura.*

- [x] **Gestión de Corpus:**
    - Script para subir el PDF del Manual del Jugador a Google AI Studio (`scripts/ingest-manual.ts`).
    - Estrategia de ingestión y caché de URI en `.env.local` implementada con éxito.
- [x] **Tool `consultRulebook`:**
    - Tool específica para el `NarrativeManager`.
    - Integrada con URI persistente (`manualUri`) y SDK nativo de Google (para soportar `gemini-3-pro-preview`).
    - Prompt optimizado para navegación por capítulos (RAG básico).

### Fase 3: Hidratación Bajo Demanda (AI-Hydration) - *La magia*
*Objetivo: Convertir texto de PDF en mecánica jugable automáticamente cuando falta en local.*

- [x] **Tool `structureEntity`:**
    - Orquestador que consulta el manual (RAG) y luego estructura el texto a JSON (`MonsterDataSchema`) usando un modelo rápido (`gemini-2.0-flash`).
- [x] **Flujo de Fallback en `DataService`:**
    1.  Consulta SQLite Local (`SELECT`).
    2.  Si falla -> Llama a `structureEntity` (AI-Hydration).
    3.  Persiste el resultado en SQLite (`INSERT`).
    4.  Retorna datos al juego.
- [x] **Validación y Pruebas Unitarias:**
    - Script `test-hydration.ts` (ahora `poc-hydration.ts`) validó exitosamente el flujo completo con "Diablillo" (Español -> JSON).
    - Ajuste de prompts para robustez con esquemas flexibles y traducción de valores.

### Fase 4: Integración Completa y UI (Futuro)
*Objetivo: Hacer que todo esto sea transparente para el usuario final.*

- [ ] **Buscador Universal en UI:**
    - Panel para que el DM busque monstruos/hechizos (local o RAG).
- [ ] **Gestión de Manuales:**
    - UI para subir nuevos PDFs y procesarlos.

---

## ⚠️ Requisitos Críticos Simplificados
1.  **PDF del Manual:** Ubicar en `knowledge/source_books/` (Carpeta nueva).
2.  **API Key:** Usar la existente de Gemini (Genkit lo gestiona).

## 🛡️ Ventajas de esta Arquitectura v2
- **Evolutiva:** La base de datos "aprende" y crece cuanto más juegas.
- **Resiliente:** Si internet cae, tienes todo lo que ya has usado cacheado localmente.
- **Data-Driven:** Prepara el terreno perfecto para el Sistema de Progresión (XP/Niveles).

---
**Estado:** Fase 3 Completada (Hidratación validada). Próximo: Fase 4.
