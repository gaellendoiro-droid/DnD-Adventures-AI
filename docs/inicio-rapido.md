# Guía de Inicio Rápido

Esta guía te ayudará a poner en marcha el proyecto D&D Adventures AI desde cero.

## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** versión 20 o superior
- **npm** (incluido con Node.js) o tu gestor de paquetes preferido
- **API Key de Google Gemini** (para el sistema de IA)

### Verificar Instalación

```bash
node --version  # Debe mostrar v20.x.x o superior
npm --version   # Debe mostrar 9.x.x o superior
```

## Instalación

### 1. Clonar el Repositorio

Si aún no has clonado el repositorio:

```bash
git clone https://github.com/gaellendoiro-droid/DnD-Adventures-AI.git
cd DnD-Adventures-AI
```

### 2. Instalar Dependencias

```bash
npm install
```

**Nota:** Si encuentras un error con `eslint-plugin-genkit`, este paquete no existe en npm y puede ser eliminado del `package.json`. El proyecto funcionará correctamente sin él.

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con tu API key de Google Gemini:

```env
GOOGLE_GENAI_API_KEY=tu_api_key_aqui
```

**Obtener una API Key:**
- Visita [Google AI Studio](https://aistudio.google.com/apikey)
- Crea una nueva API key
- Copia la key y pégala en el archivo `.env`

**Importante:**
- El archivo `.env` está en `.gitignore` y no se subirá al repositorio
- No compartas tu API key públicamente
- No uses espacios alrededor del `=` en el archivo `.env`

### 4. Requisitos y Dependencias

#### ¿Cómo funcionan las dependencias en Node.js?

En Node.js, el archivo `package.json` es el equivalente a `requirements.txt` en Python. Todas las dependencias del proyecto están listadas allí y se instalan automáticamente cuando ejecutas `npm install`.

**Dependencias del Proyecto:**
Todas las dependencias necesarias están en `package.json` y se instalan automáticamente con `npm install`. Esto incluye:

- **Framework y Core:**
  - `next` (^15.5.6) - Framework de React
  - `react` (^18.3.1) - Biblioteca de UI
  - `typescript` (^5.5.4) - Lenguaje de programación

- **IA y Backend:**
  - `genkit` (^1.20.0) - Framework de IA
  - `@genkit-ai/google-genai` (^1.20.0) - Integración con Google Gemini
  - `@genkit-ai/next` (^1.20.0) - Integración de Genkit con Next.js

- **UI y Estilos:**
  - `tailwindcss` (^3.4.9) - Framework CSS
  - `tailwindcss-animate` (^1.0.7) - Animaciones para Tailwind
  - `tailwind-merge` (^3.4.0) - Utilidad para combinar clases de Tailwind
  - Múltiples componentes de `@radix-ui/*` - Componentes UI accesibles

- **Utilidades:**
  - `wav` (^1.0.2) - Procesamiento de audio WAV
  - `dotenv` (^16.5.0) - Carga de variables de entorno
  - Y muchas más...

**Herramientas Opcionales (Solo para Desarrollo):**

Estas herramientas no son dependencias del proyecto, pero pueden ser útiles para desarrollo:

- **genkit-cli** (opcional): Herramienta global para usar el Developer UI de Genkit
  ```bash
  npm install -g genkit-cli
  ```
  
  **Nota:** Esta herramienta solo es necesaria si quieres usar el Developer UI de Genkit para depurar flujos de IA de forma aislada. La aplicación funciona perfectamente sin ella.

**Archivos de Dependencias:**
- `package.json` - Define todas las dependencias del proyecto (equivalente a `requirements.txt`)
- `package-lock.json` - Bloquea las versiones exactas de todas las dependencias (generado automáticamente)

## Ejecución

### Para Usar la Aplicación

Solo necesitas ejecutar:

```bash
npm run dev
```

Esto iniciará el servidor de desarrollo en `http://localhost:8080`. **La aplicación funcionará completamente** porque Genkit se integra directamente con Next.js a través de Server Actions. No necesitas un servidor separado de Genkit para usar la aplicación.

### Para Desarrollo y Depuración (Opcional)

El **Developer UI de Genkit** es útil para desarrollar y depurar flujos de IA de forma aislada. 

**Instalación (solo la primera vez):**

Si quieres usar el Developer UI, primero instala la herramienta globalmente:

```bash
npm install -g genkit-cli
```

**Iniciar el Developer UI:**

Tienes dos opciones:

1. **Usar el comando directamente:**
   ```bash
   genkit start -- tsx src/ai/dev.ts
   ```

2. **Usar el script del proyecto** (requiere `genkit-cli` instalado):
   ```bash
   npm run genkit:ui
   ```

**Nota:** El script `npm run genkit:dev` solo carga los módulos sin iniciar el Developer UI. Para el Developer UI, usa `npm run genkit:ui` o el comando directo.

**Nota importante:** 
- El Developer UI es **opcional** - la aplicación funciona completamente sin él
- El Developer UI se ejecuta en `http://localhost:4000` (si `genkit-cli` está instalado)
- Las funciones de IA funcionan correctamente a través de Next.js Server Actions
- El Developer UI es principalmente útil para probar flujos individuales durante el desarrollo
- Si no tienes `genkit-cli` instalado, el comando `npm run genkit:dev` solo cargará los módulos sin iniciar el servidor UI

## Verificación

Una vez que el servidor esté corriendo:

1. Abre tu navegador en `http://localhost:8080`
2. Deberías ver la interfaz principal del juego
3. Crea una nueva partida o carga una existente
4. Prueba enviar una acción al DM (ej: "Exploro la plaza del pueblo")

Si todo funciona correctamente:
- ✅ El frontend carga sin errores
- ✅ Puedes interactuar con el DM
- ✅ Recibes respuestas del DM
- ✅ Los compañeros de IA reaccionan a tus acciones

**Nota:** No necesitas el Developer UI de Genkit para que la aplicación funcione. Solo es útil para desarrollo y depuración.

## Solución de Problemas Comunes

### Error: "Cannot find module"

**Solución:** Asegúrate de haber ejecutado `npm install` y que la carpeta `node_modules` existe.

### Error: "GOOGLE_GENAI_API_KEY is not defined"

**Solución:** 
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Verifica que la variable se llama exactamente `GOOGLE_GENAI_API_KEY`
- Reinicia ambos servidores después de crear/modificar el `.env`

### Error: "Port 8080 already in use"

**Solución:** 
- Cierra cualquier aplicación que esté usando el puerto 8080
- O cambia el puerto en `package.json`: `"dev": "next dev --turbopack -p 8081"`

### El DM no responde o hay errores en la consola

**Solución:**
- Verifica que el servidor de Next.js está corriendo (`npm run dev`)
- **No necesitas el Developer UI de Genkit** para que la aplicación funcione
- Revisa la consola del navegador para errores
- Revisa la terminal de Next.js para mensajes de error
- Verifica que tu API key es válida y tiene créditos disponibles
- Verifica que el archivo `.env` tiene la variable `GOOGLE_GENAI_API_KEY` configurada

### La instalación tarda mucho tiempo

**Solución:** Esto es normal. El proyecto tiene muchas dependencias. Espera a que termine completamente antes de ejecutar los comandos de desarrollo.

## Estructura del Proyecto

```
DnD-Adventures-AI/
├── src/
│   ├── ai/              # Sistema de IA (Backend)
│   ├── app/             # Next.js App Router
│   ├── components/      # Componentes React
│   └── lib/             # Utilidades y tipos
├── docs/                # Documentación
├── JSON_adventures/     # Aventuras en formato JSON
├── .env                 # Variables de entorno (crear manualmente)
└── package.json         # Dependencias del proyecto
```

## Próximos Pasos

Una vez que el proyecto esté funcionando:

1. **Explora la documentación:**
   - [Arquitectura General](./arquitectura/vision-general.md)
   - [Arquitectura del Frontend](./arquitectura/arquitectura-frontend.md)
   - [Arquitectura del Backend IA](./arquitectura/arquitectura-backend.md)

2. **Prueba las funcionalidades:**
   - Crea una nueva partida
   - Interactúa con el DM
   - Inicia un combate
   - Prueba el sistema de dados

3. **Desarrolla nuevas características:**
   - Consulta el [Roadmap](./roadmap.md) para ver mejoras futuras
   - Revisa el [Plan Maestro de Desarrollo](./planes-desarrollo/plan-maestro.md) para ver planes en curso y completados

## Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Genkit](https://firebase.google.com/docs/genkit)
- [Documentación de Google Gemini](https://ai.google.dev/docs)
- [Documentación de D&D 5e](https://www.dnd5eapi.co/)

## Obtener Ayuda

Si encuentras problemas que no están cubiertos en esta guía:

1. Revisa los logs en ambas terminales
2. Revisa la consola del navegador
3. Consulta la documentación técnica en `docs/`
4. Revisa el [CHANGELOG.md](../CHANGELOG.md) para cambios recientes

