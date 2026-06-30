# Guía de Inicio Rápido y Visión del Proyecto

Esta guía te ayudará a poner en marcha el proyecto D&D Adventures AI desde cero y te presentará la visión y características clave implementadas.

---

## 🎯 Visión General

D&D Adventures AI es una aplicación web que permite jugar partidas de Dungeons & Dragons 5e con un Dungeon Master potenciado por IA (Google Gemini 2.5 Flash). El proyecto combina la flexibilidad narrativa de la IA con las mecánicas estructuradas y reglas matemáticas oficiales de D&D 5e.

### Características Principales:
- **Narrador de IA Reactivo:** Gemini actúa como DM interpretando acciones en lenguaje natural.
- **Compañeros Agénticos:** Personajes de la party controlados por IA que comentan y actúan por iniciativa propia en base a su personalidad.
- **Fichas de Personaje Completas:** Atributos, competencias, equipamiento, conjuros y HP dinámicos.
- **Combate Táctico por Turnos:** Orden de iniciativa, tiradas de ataque contra AC del objetivo, cálculos de daño y guardado de tiradas de salvación.
- **Niebla de Guerra y Exploración:** Descripciones condicionales según el nivel de luz, el tipo de sala y el historial de visitas del grupo.

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
   Crea un archivo `.env` en la raíz del proyecto y añade tu API key:
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

- `src/app/`: Rutas, páginas y Server Actions de Next.js.
- `src/ai/`: Lógica centralizada de IA (expertos, prompts, coordinadores de streaming).
- `src/components/`: Componentes de interfaz de usuario de React (fichas, tracker, chat).
- `src/lib/`: Motores de reglas, resolución de tiradas de dados (`Better-Sqlite3` para compendio local).
- `JSON_adventures/`: Archivos JSON que describen los mapas y datos estáticos de las aventuras.
- `docs/`: Documentación del sistema.

---

## 🎵 Configuración de Eleven Labs TTS (Voz del DM)

Para habilitar la voz en off del Dungeon Master, puedes configurar el servicio de Eleven Labs añadiendo las siguientes variables a tu archivo `.env`:

```env
# API Key de Eleven Labs
ELEVENLABS_API_KEY=tu_api_key_aqui

# Voice ID de la voz a usar para el DM (ej: Grandpa Spuds Oxley)
ELEVENLABS_VOICE_ID=voice_id_aqui

# Modelo de voz a usar (opcional, default: eleven_multilingual_v2)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

### Cómo obtener los credenciales:
1. Regístrate en [Eleven Labs](https://elevenlabs.io/).
2. Copia tu **API Key** desde tu panel de perfil.
3. Busca una voz en la **Voice Library** (ej. "GrandPa Spuds Oxley") y cópiate su **Voice ID** de la URL (`.../voice-library/voice/[VOICE_ID]`).
4. Reinicia el servidor local de desarrollo (`npm run dev`) para aplicar los cambios de entorno.

