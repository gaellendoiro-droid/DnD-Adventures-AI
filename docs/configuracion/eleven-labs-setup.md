# Configuración de Eleven Labs TTS

Este documento explica cómo configurar Eleven Labs Text-to-Speech para la aplicación D&D Adventures AI.

## Variables de Entorno Requeridas

Añade las siguientes variables a tu archivo `.env` (el mismo archivo donde tienes `GOOGLE_GENAI_API_KEY`):

```env
# API Key de Eleven Labs (requerida)
ELEVENLABS_API_KEY=tu_api_key_aqui

# Voice ID de la voz a usar para el DM (requerida)
# Para "GrandPa Spuds Oxley", necesitas obtener el voice ID desde el dashboard de Eleven Labs
ELEVENLABS_VOICE_ID=voice_id_aqui

# Modelo de voz a usar (opcional, default: eleven_multilingual_v2)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

**Nota:** Si prefieres usar `.env.local` en lugar de `.env`, también funcionará. Next.js carga ambos archivos automáticamente.

## Cómo Obtener tu API Key

1. Ve a [Eleven Labs](https://elevenlabs.io/)
2. Crea una cuenta o inicia sesión
3. Ve a tu perfil/configuración
4. Encuentra la sección "API Key"
5. Copia tu API key y añádela a `.env`

## Cómo Obtener el Voice ID

### Opción 1: Desde el Dashboard de Eleven Labs

1. Inicia sesión en [Eleven Labs](https://elevenlabs.io/)
2. Ve a la sección "Voice Library" o "My Voices"
3. Busca la voz "GrandPa Spuds Oxley"
4. Haz clic en la voz para ver sus detalles
5. El Voice ID aparecerá en la URL o en los detalles de la voz
6. Copia el ID (generalmente es un string alfanumérico)

### Opción 2: Usando la API de Eleven Labs

Puedes listar todas tus voces usando la API:

```bash
curl -X GET "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: TU_API_KEY"
```

Esto devolverá un JSON con todas las voces disponibles, incluyendo sus IDs. Busca "GrandPa Spuds Oxley" en la lista.

### Opción 3: Desde la URL del Dashboard

Cuando estés viendo una voz en el dashboard de Eleven Labs, la URL suele tener el formato:
```
https://elevenlabs.io/voice-library/voice/[VOICE_ID]
```

El `[VOICE_ID]` es el ID que necesitas.

## Verificación de Configuración

Una vez configuradas las variables de entorno:

1. Reinicia el servidor de desarrollo (`npm run dev`)
2. Intenta generar audio de una narración del DM
3. Si hay errores, verifica:
   - Que las variables de entorno estén correctamente escritas
   - Que no haya espacios extra en los valores
   - Que la API key sea válida
   - Que el Voice ID corresponda a una voz que tengas acceso

## Modelos Disponibles

Eleven Labs ofrece varios modelos. Los más comunes son:

- `eleven_multilingual_v2` - Modelo multilingüe recomendado (default)
- `eleven_monolingual_v1` - Modelo monolingüe (más rápido, solo inglés)
- `eleven_turbo_v2` - Modelo turbo (más rápido, calidad ligeramente menor)

Para narraciones en español, se recomienda usar `eleven_multilingual_v2`.

## Configuración de Calidad de Voz

Los parámetros de calidad se configuran en el código (`src/ai/flows/generate-dm-narration-audio.ts`):

- **stability** (0.0 - 1.0): Balance entre consistencia y expresividad
  - Más bajo = más expresivo pero menos consistente
  - Más alto = más consistente pero menos expresivo
  - Default: 0.5

- **similarity_boost** (0.0 - 1.0): Mantener características de la voz original
  - Más alto = más similar a la voz original
  - Default: 0.75

- **style** (0.0 - 1.0): Estilo y expresividad
  - Más alto = más estilizado y expresivo
  - Default: 0.0 (neutral para narración)

- **use_speaker_boost**: Mejorar claridad y presencia
  - Default: true

## Troubleshooting

### Error: "ELEVENLABS_API_KEY no está configurada"
- Verifica que el archivo `.env.local` existe
- Verifica que la variable está escrita correctamente
- Reinicia el servidor después de añadir la variable

### Error: "Voice ID no encontrado"
- Verifica que el Voice ID es correcto
- Verifica que tienes acceso a esa voz en tu cuenta
- Algunas voces pueden requerir un plan específico

### Error: "Límite de caracteres excedido"
- Has alcanzado el límite de tu plan de Eleven Labs
- Verifica tu uso en el dashboard de Eleven Labs
- Considera actualizar tu plan si es necesario

### Audio no se reproduce
- Verifica que el navegador soporta MP3 (todos los navegadores modernos lo hacen)
- Verifica la consola del navegador para errores
- Verifica que el audio se está generando correctamente (revisa logs del servidor)

## Costos

Eleven Labs tiene diferentes planes:

- **Free**: 10,000 caracteres/mes
- **Starter ($5/mes)**: 30,000 caracteres/mes
- **Creator ($22/mes)**: 100,000 caracteres/mes (recomendado para desarrollo)
- **Pro ($99/mes)**: 500,000 caracteres/mes

Una narración promedio del DM tiene entre 200-500 caracteres. Una sesión de juego puede generar 20-50 narraciones, usando aproximadamente 4,000-25,000 caracteres.

## Referencias

- [Eleven Labs API Documentation](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Eleven Labs Voice Library](https://elevenlabs.io/voice-library)
- [Eleven Labs Pricing](https://elevenlabs.io/pricing)

