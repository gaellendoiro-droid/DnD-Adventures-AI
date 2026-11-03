# Guía de Inicio Rápido y Visión del Proyecto

Esta guía te ayudará a poner en marcha el proyecto **D&D Adventures AI** desde cero y te presentará la visión y características clave implementadas.

---

## 🎯 Visión General

**D&D Adventures AI** es una aplicación web que permite jugar aventuras oficiales de Dungeons & Dragons 5ª Edición con un Dungeon Master potenciado por IA (**Google Gemini 2.5 Flash**). El proyecto combina la flexibilidad narrativa de la IA con un motor neuro-simbólico determinista en TypeScript que aplica las reglas matemáticas oficiales de D&D 5e y mantiene un estado del mundo persistente (`WorldState`).

### Características Principales:
- **Arquitectura Neuro-Simbólica de 3 Capas:** Separación estricta entre interpretación de intenciones (Capa 1), resolución determinista de reglas y estado (Capa 2) y dirección narrativa (Capa 3).
- **Compañeros Agénticos:** Personajes del grupo controlados por IA que comentan y actúan en base a su personalidad, excluyendo automáticamente al personaje activo seleccionado por el jugador.
- **Fichas de Personaje e Inventario Físico:** Atributos, competencias, equipamiento, conjuros, uso de pergaminos, llaves, contenedores y objetos tirados al suelo (`droppedItems`).
- **Combate Táctico por Turnos (FSM):** Máquina de estados (`CombatSession`) con iniciativa, sorpresa, tácticos de IA y resolución matemática de ataques.
- **Compendio Híbrido (`??`) y RAG Automático:** Búsqueda instantánea priorizando las entidades de la aventura activa, la base de datos SQLite local (`knowledge/dnd-local.db`) y los manuales oficiales en PDF mediante Google AI File API (`RulebookManager`).
- **Visor de Mapas Tácticos y Niebla de Guerra:** Extracción automática de mapas desde PDF y descripciones condicionales según luz, historial de visitas y banderas globales (`globalFlags`).

---

## 🚀 Prerrequisitos e Instalación

### Prerrequisitos:
- **Node.js** v20 o superior.
- **API Key de Google Gemini** (consíguela en [Google AI Studio](https://aistudio.google.com/apikey)).

### Instalación Paso a Paso:

1. **Clonar e instalar dependencias:**
   ```bash
   git clone https://github.com/gaellendoiro-droid/DnD-Adventures-AI.git
   cd DnD-Adventures-AI
   npm install
   ```

2. **Configurar las variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto y añade tu clave de API:
   ```env
   GOOGLE_GENAI_API_KEY=tu_api_key_aqui
   ```

3. **Ejecutar la aplicación en modo desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:8080](http://localhost:8080) en tu navegador.

---

## 📂 Estructura General del Proyecto

- `src/app/`: Rutas, páginas, endpoints de streaming SSE (`/api/game/stream`) y Server Actions de Next.js.
- `src/ai/`: Lógica centralizada de IA (intérprete de acciones, director narrativo, expertos, tácticos de combate, TTS y herramientas RAG).
- `src/components/`: Componentes de interfaz de usuario en React (`GameView`, fichas, visor de mapas, rastreador de iniciativa, chat).
- `src/lib/`: Motor determinista de reglas (`src/lib/game/rules/`), sistemas de eventos (`src/lib/game/systems/`), gestor de estado (`WorldStateManager`), motor de combate (`src/lib/combat/`) y base de datos local SQLite (`DataService`).
- `public/adventures/`: Archivos JSON de aventuras listas para jugar junto con sus mapas tácticos extraídos (`maps/`).
- `aventuras/`: Archivos fuente (PDFs y JSONs de trabajo) y documentación del conversor de aventuras (`aventuras/dev/`).
- `knowledge/`: Base de datos SQLite local (`dnd-local.db`), caché de File API (`file-api-cache.json`) y manuales PDF en `knowledge/source_books/`.
- `scripts/`: Herramientas CLI, destacando el conversor `scripts/pdf-to-json.ts`.
- `docs/`: Documentación técnica consolidada del sistema.

---

## 🎙️ Configuración de Voz del DM (TTS)

El sistema soporta dos proveedores de síntesis de voz configurables mediante la variable `TTS_PROVIDER` en tu archivo `.env` y cuenta con caché local en disco para evitar regenerar audios repetidos.

### Opción 1: Gemini 3.1 Flash TTS (Proveedor por defecto)
Utiliza la misma `GOOGLE_GENAI_API_KEY` sin necesidad de cuentas externas adicionales:

```env
# Proveedor TTS ('gemini' por defecto, o 'elevenlabs')
TTS_PROVIDER=gemini

# Voz predefinida de Gemini (opcional, por defecto: Charon)
GEMINI_TTS_VOICE=Charon
```

### Opción 2: ElevenLabs TTS (Alternativa)
Si prefieres utilizar las voces de ElevenLabs, configura `TTS_PROVIDER=elevenlabs` y añade tus credenciales:

```env
TTS_PROVIDER=elevenlabs

# API Key de ElevenLabs
ELEVENLABS_API_KEY=tu_api_key_aqui

# Voice ID de la voz a usar para el DM (ej: Grandpa Spuds Oxley)
ELEVENLABS_VOICE_ID=voice_id_aqui

# Modelo de voz a usar (opcional, por defecto: eleven_multilingual_v2)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```
