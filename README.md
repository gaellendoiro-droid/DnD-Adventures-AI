# D&D Adventures AI (v0.6.2)

Aplicación web interactiva para jugar aventuras oficiales de **Dungeons & Dragons 5ª Edición** en español con un Dungeon Master (DM) impulsado por Inteligencia Artificial y un motor de reglas determinista.

El sistema combina la creatividad literaria de **Google Gemini** con una **Arquitectura Neuro-Simbólica de 3 Capas**, garantizando que las tiradas de dados, el inventario, las llaves, los descansos, los combates y la persistencia del mundo (`WorldState`) se resuelvan con precisión matemática sin alucinaciones de estado.

---

## 🛠️ Tecnologías Principales (Stack)

- **Framework:** Next.js 15 (App Router, Server Actions y Streaming SSE)
- **Lenguaje:** TypeScript (Tipado estricto con validación Zod)
- **Estilos e Interfaz:** Tailwind CSS, Radix UI / shadcn/ui, Lucide Icons
- **IA Generativa y Orquestación:** Google Genkit + Google Gemini (`gemini-3.5-flash` por defecto) o Groq opcional (`qwen3.8-27b` / `gpt-oss-120b` / `gpt-oss-20b`, con rotación automática ante límites de cuota). Se elige con `GEMINI_MODEL` / `GROQ_API_KEY`.
- **Base de Conocimiento Híbrida (RAG + SQLite):** `better-sqlite3` (`knowledge/dnd-local.db`) + Google AI File API (`RulebookManager`) para consulta de manuales oficiales en PDF
- **Conversor de Aventuras:** Pipeline automatizado de PDF a JSON (`scripts/pdf-to-json.ts`) con extracción de mapas tácticos mediante Gemini Vision
- **Audio y Voz (TTS):** Síntesis de voz dual con **Gemini 3.1 Flash TTS** (por defecto) y **ElevenLabs**, con caché local en disco y gestor de música ambiental (`MusicManager`)

---

## 🚀 Cómo Empezar

Para una guía paso a paso de instalación, configuración de variables de entorno y síntesis de voz, consulta:

> **[📖 Guía de Inicio Rápido](./docs/inicio-rapido.md)**

### Resumen Rápido

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno (`.env`):**
   ```env
   GOOGLE_GENAI_API_KEY=tu_api_key_aqui
   TTS_PROVIDER=gemini
   GEMINI_TTS_VOICE=Charon
   # Opcional: elegir modelo o activar Groq
   # GEMINI_MODEL=googleai/gemini-3.5-flash
   # GROQ_API_KEY=tu_api_key_groq
   ```
   Sin `GEMINI_MODEL`, se usa Groq si existe `GROQ_API_KEY` y, si no, `googleai/gemini-3.5-flash`.

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre `http://localhost:8080` en tu navegador.

---

## 🏛️ Arquitectura General (Neuro-Simbólica de 3 Capas)

El motor de juego separa de forma estricta la interpretación semántica, el cálculo de reglas y la narración literaria:

1. **Capa 1 — Árbitro Semántico (`actionInterpreter`):** Analiza la intención del jugador en lenguaje natural y la traduce a una acción estructurada (`attack`, `interact`, `skill_check`, `move`, `drop`, `give`, `ooc`, `narrate`), detectando intenciones de sigilo, uso de objetos y delegación a compañeros.
2. **Capa 2 — Motor Determinista en TypeScript (`GameRulesEngine` + `EventDispatcher`):** Procesa físicamente las acciones sobre el `WorldStateManager` y el grupo (`party`). Resuelve tiradas de dados, uso de pergaminos, apertura de puertas con llaves, descansos, navegación, botín de contenedores y presencia de entidades condicionales (`presenceFlag` / `absenceFlag`), emitiendo un registro inmutable de hechos (`eventsLog`).
3. **Capa 3 — Director Narrativo (`NarrativeManager` + Expertos):** Recibe los hechos consumados y las directivas obligatorias de la Capa 2 para componer la respuesta literaria del DM y las intervenciones reactivas de los compañeros de grupo en tiempo real mediante Server-Sent Events (SSE).

Para el combate táctico por turnos, el sistema delega en una **Máquina de Estados Finitos (`CombatSession`)** que controla el orden de iniciativa, las tácticas de enemigos/aliados y la validación matemática de ataques y conjuros.

---

## 📚 Documentación del Proyecto

Toda la documentación técnica está centralizada y actualizada en la carpeta [`docs/`](./docs/README.md):

- **[Índice de Documentación](./docs/README.md)** — Punto de entrada a toda la documentación del proyecto.
- **[Guía de Inicio Rápido](./docs/inicio-rapido.md)** — Instalación, estructura del proyecto y configuración de TTS (Gemini / ElevenLabs).
- **[Arquitectura del Sistema](./docs/arquitectura.md)** — Desglose completo del Frontend, Backend, Motor de 3 Capas, `WorldState`, Combate FSM y Streaming SSE.
- **[Compendio de Prompts de IA](./docs/compendio-prompts-ia.md)** — Catálogo detallado de todos los prompts del sistema, expertos, tácticos y herramientas RAG.
- **[Plan de WorldState Definitivo](./docs/plan-world-state-definitivo.md)** — Especificación del sistema de persistencia Base + Deltas y arquitectura orientada a eventos.
- **[Estrategia de Testing](./docs/testing.md)** — Guía de pruebas unitarias e integración con Vitest.
- **[Notas de Desarrollo](./docs/notas-desarrollo.md)** — Registro histórico de decisiones de arquitectura, investigaciones y resolución de bugs complejos.
- **[Roadmap y Control de Issues](./docs/roadmap.md)** — Planificación de mejoras futuras organizadas por prioridad.
- **[Guía de Construcción de Aventuras (PDF a JSON)](./aventuras/dev/README.md)** — Documentación del pipeline de conversión de módulos PDF oficiales a JSON.
