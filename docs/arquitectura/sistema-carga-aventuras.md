# Sistema de Carga de Aventuras

## Visión General

El sistema de carga de aventuras es el componente responsable de ingerir, validar, procesar e inicializar los módulos de aventura en formato JSON para que puedan ser jugados. Este sistema ha sido rediseñado para priorizar la velocidad, la robustez y la experiencia de usuario, eliminando dependencias innecesarias de IA para tareas deterministas.

## Arquitectura Modular

El sistema se divide en cinco módulos principales, ubicados en `src/lib/adventure-loader/`:

1.  **Adventure Parser (`adventure-parser.ts`)**:
    *   **Responsabilidad**: Extraer metadatos (título, resumen) y datos crudos del JSON.
    *   **Estrategia**: "Fast Path" primero. Intenta leer directamente las propiedades del JSON. Solo recurre a la IA (`parseAdventureFromJsonFlow`) como fallback si la estructura es ambigua o incompleta.
    *   **Sanitización Inteligente**:
        *   Detecta referencias rotas (conexiones a IDs inexistentes).
        *   **Auto-corrección**: Convierte salidas/conexiones rotas en elementos `interactables` ("Camino Bloqueado") preservando la descripción original. Esto evita crashes sin perder información narrativa.
    *   **Beneficio**: Carga casi instantánea para archivos bien formados y tolerancia a fallos para archivos con errores menores.

2.  **Validator (`validator.ts`)**:
    *   **Responsabilidad**: Garantizar que la aventura es jugable antes de iniciarla.
    *   **Validaciones**:
        *   **Estructural**: Esquema Zod (`AdventureDataSchema`).
        *   **Integridad Referencial**: Verifica que todos los IDs de ubicaciones y entidades sean únicos y que todas las conexiones (`exits`) apunten a IDs existentes.
    *   **Salida**: Lista detallada de errores y advertencias estructuradas.

3.  **Adventure Cache (`adventure-cache.ts`)**:
    *   **Responsabilidad**: Persistir aventuras procesadas para evitar re-análisis.
    *   **Almacenamiento**: Híbrido.
        *   **Memoria (L1)**: `Map` en memoria para acceso inmediato (TTL 1 hora).
        *   **Disco (L2)**: Archivos JSON en `node_modules/.cache/dnd-adventures` (TTL 24 horas).
    *   **Clave**: Hash SHA-256 del contenido del archivo JSON.

4.  **Game Initializer (`game-initializer.ts`)**:
    *   **Responsabilidad**: Orquestar la transición de "Datos de Aventura" a "Estado de Juego Activo".
    *   **Flujo**:
        1.  Actualiza el caché de estado del servidor (`setAdventureDataCache`).
        2.  Verifica la sincronización con el servidor (`getAdventureData`).
        3.  Construye el `initialGameState` (Party, Ubicación Inicial, Historial vacío).
        4.  Ejecuta la primera acción ("El jugador comienza...") a través del `GameCoordinator`.
        5.  **Filtro de Silencio**: Intercepta y elimina mensajes de compañeros generados en el turno 0 para asegurar que solo el DM narre la introducción.

5.  **Error Handler (`error-handler.ts`)**:
    *   **Responsabilidad**: Clasificar y formatear errores para el usuario.
    *   **Tipos**: `VALIDATION_ERROR`, `JSON_PARSE_ERROR`, `SERVER_ERROR`, `AI_ERROR`.
    *   **Salida**: Mensajes amigables para la UI (título y descripción).

## Flujo de Datos

1.  **Usuario** selecciona archivo en `page.tsx`.
2.  **Frontend** muestra `AdventureLoadProgress`.
3.  **Parser** procesa el archivo (Fast Path o IA) -> `ParsedAdventure`.
4.  **Validator** verifica `ParsedAdventure.adventureData`. Si falla, muestra errores.
5.  **Cache** guarda el resultado exitoso.
6.  **Health Check** verifica disponibilidad del servidor (`/api/health`).
7.  **Initializer** prepara el juego y obtiene la narración inicial.
8.  **Frontend** recibe el estado inicial y cambia a `GameView`.

## Decisiones de Diseño Clave

*   **Validación Estricta, Ejecución Flexible**: Somos estrictos al cargar para evitar errores en tiempo de ejecución, pero el sistema de juego puede manejar situaciones imprevistas.
*   **Feedback Visual Granular**: El usuario siempre sabe qué está pasando (Parseando, Validando, Conectando, etc.) gracias al componente de progreso.
*   **Persistencia**: El caché en disco permite recargar la página o reiniciar el servidor de desarrollo sin perder el contexto de las aventuras cargadas recientemente.
*   **Silencio Inicial**: Forzamos programáticamente que los compañeros no hablen en la introducción para dar protagonismo al jugador y establecer el tono correcto.
