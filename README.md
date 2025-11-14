# D&D Adventures AI (v0.4.70)

Este proyecto es una aplicación web interactiva que simula una partida de Dungeons & Dragons 5ª Edición. Utiliza un Dungeon Master (DM) impulsado por Inteligencia Artificial para crear una experiencia de juego de rol conversacional y dinámica, todo en español. Los jugadores pueden explorar un mundo, interactuar con personajes, tomar decisiones y participar en combates, todo ello narrado y gestionado por la IA.

## Tecnologías Principales (Stack)

-   **Framework:** Next.js (con App Router)
-   **Lenguaje:** TypeScript
-   **Estilos:** Tailwind CSS y shadcn/ui
-   **IA Generativa:** Google Gemini a través de Genkit
-   **Gestión de Estado (Cliente):** React Hooks (`useState`, `useCallback`)
-   **Fuente de la Aventura:** Archivos JSON locales.

## Cómo Empezar

Para una guía detallada de instalación y configuración, consulta:

> **[📖 Guía de Inicio Rápido](./docs/inicio-rapido.md)**

### Resumen Rápido

**Prerrequisitos:**
- Node.js (versión 20 o superior)
- npm (o tu gestor de paquetes preferido)
- API Key de Google Gemini

**Instalación:**
```bash
npm install
```

**Configuración:**
Crea un archivo `.env` en la raíz del proyecto:
```env
GOOGLE_GENAI_API_KEY=tu_api_key_aqui
```

**Ejecución:**

Para **usar la aplicación**, solo necesitas:

```bash
npm run dev
```

Esto iniciará el servidor de desarrollo en `http://localhost:3000`. La aplicación funcionará completamente, ya que Genkit se integra con Next.js a través de Server Actions.

**Para desarrollo y depuración (opcional):**

El Developer UI de Genkit es útil para depurar y probar flujos de IA de forma aislada. Primero instala `genkit-cli` globalmente:

```bash
npm install -g genkit-cli
```

Luego inicia el Developer UI:

```bash
npm run genkit:ui
```

**Nota:** El Developer UI es **opcional** - la aplicación funciona completamente sin él. Las funciones de IA funcionan correctamente a través de Next.js Server Actions. Para más detalles, consulta la [Guía de Inicio Rápido](./docs/inicio-rapido.md).

## Arquitectura General

El proyecto sigue un modelo cliente-servidor desacoplado:

-   **Frontend (Cliente):** Una aplicación de página única (SPA) construida con Next.js y React. Se encarga de toda la renderización de la interfaz de usuario y de la gestión del estado local del juego (personajes, mensajes, etc.).
-   **Backend (Servidor):** Un sistema de IA modular construido con Genkit. Contiene toda la lógica del juego, la toma de decisiones y la generación de narrativa.

La comunicación entre ambos se realiza a través de **Next.js Server Actions**, que actúan como un puente seguro entre el cliente y los flujos de IA del backend.

### Arquitectura del Frontend

El frontend está orquestado por el componente `app/game-view.tsx`, que actúa como la "fuente única de la verdad" para el estado de la partida en el cliente. Gestiona el ciclo de cada turno, enviando las acciones del usuario al backend y actualizando la interfaz con la respuesta.

Para un desglose detallado de los componentes, el flujo de datos y la gestión de estado, consulta el documento:

> **[📄 Documentación de Arquitectura del Frontend](./docs/arquitectura/arquitectura-frontend.md)**

### Arquitectura de la IA

El cerebro de la aplicación es un sistema modular de flujos y herramientas de Genkit, diseñado para la especialización de tareas. Un `gameCoordinator` central dirige cada turno, delegando la interpretación de acciones, la narración y la lógica de combate a expertos de IA especializados.

Para una descripción completa de los flujos, las herramientas y la lógica de toma de decisiones de la IA, consulta el documento:

> **[📄 Documentación de Arquitectura de la IA](./docs/arquitectura/arquitectura-backend.md)**

## Documentación

El proyecto incluye documentación completa:

- **[Inicio Rápido](./docs/inicio-rapido.md)** - Guía de instalación y configuración
- **[Visión General de Arquitectura](./docs/arquitectura/vision-general.md)** - Visión de alto nivel del sistema
- **[Arquitectura del Frontend](./docs/arquitectura/arquitectura-frontend.md)** - Detalles del cliente
- **[Arquitectura del Backend IA](./docs/arquitectura/arquitectura-backend.md)** - Detalles del servidor
- **[Flujo de Datos](./docs/arquitectura/flujo-datos.md)** - Diagramas detallados de flujos
- **[Sistema de Logging](./docs/arquitectura/sistema-logging.md)** - Sistema de logging estructurado y centralizado
- **[Referencia de API](./docs/arquitectura/referencia-api.md)** - Esquemas y contratos de datos
- **[Roadmap](./docs/roadmap.md)** - Mejoras futuras planificadas

## Solución de Problemas

### Error: "eslint-plugin-genkit not found"
Este paquete no existe en npm. Puede ser eliminado del `package.json` sin afectar la funcionalidad.

### Error: "GOOGLE_GENAI_API_KEY is not defined"
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Verifica que la variable se llama exactamente `GOOGLE_GENAI_API_KEY`
- Reinicia ambos servidores después de crear/modificar el `.env`

### El DM no responde
- Verifica que ambos servidores (Next.js y Genkit) están corriendo
- Revisa la consola del navegador y las terminales para errores
- Verifica que tu API key es válida

Para más información, consulta la [Guía de Inicio Rápido](./docs/inicio-rapido.md) que incluye una sección completa de solución de problemas.
