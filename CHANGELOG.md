# Changelog

**DIRECTIVA DE ALTA PRIORIDAD PARA EL ASISTENTE DE IA:** Al modificar este archivo, DEBES leer primero su contenido completo y asegurarte de que tu operación de escritura sea puramente aditiva a la sección `[Unreleased]`. NUNCA debes borrar, truncar o resumir el historial de versiones existente. La violación de esta directiva se considerará un fallo crítico de funcionamiento.

---

Todas las novedades y cambios importantes de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Nota de procedimiento:** Todos los cambios nuevos deben registrarse en la sección `[Unreleased]`. Cuando se decide versionar, esta sección se renombra con el nuevo número de versión y la fecha. A continuación, se debe crear una nueva sección `[Unreleased]` vacía y actualizar el número de versión correspondiente en el archivo `package.json`.

---

## [Unreleased]

### Added
- **Plan de Desarrollo del Sistema de Combate:** Se ha creado un nuevo documento (`docs/combat-turn-system-dev-plan.md`) con una hoja de ruta detallada para la implementación del bucle de turnos de combate.
- **Esqueleto del Bucle de Turnos de Combate:** Se ha implementado la estructura lógica (`while` loop) en el `combatManagerTool` que procesa los turnos de los PNJ controlados por la IA hasta ceder el control al jugador.

### Changed
- **Sincronización de la UI de Combate:** El panel "Orden de Combate" ahora resalta visualmente al combatiente cuyo turno está activo, gracias a la integración del `turnIndex` en el flujo de datos del frontend.

### Fixed
- **Integración del Estado de Combate (`turnIndex`):** Se ha refactorizado el flujo de datos entre el frontend y el backend para incluir el `turnIndex` en el estado del juego, solucionando un error crítico que impedía la continuación del combate después del primer turno.
- **Corregido Bug de Flujo de Datos en Combate:** Solucionado un error en `game-view.tsx` que impedía que el `initiativeOrder` se enviara correctamente en los turnos de combate subsiguientes.
- **Corregido Error de Renderizado en `LeftPanel`:** Solucionados varios errores de renderizado en el panel izquierdo (`TypeError: Cannot read properties of undefined`) que ocurrían durante el combate, asegurando que los componentes `DiceLogPanel` y `InitiativeTracker` siempre reciban props válidas.

### Docs
- Actualizado el plan de desarrollo del sistema de combate (`docs/combat-turn-system-dev-plan.md`) para reflejar el progreso realizado.

---

## [0.4.66] - 2024-07-28

### Changed
- **Restaurado el Log de Estado Final:** Se ha vuelto a añadir la información de la ubicación final y el estado de combate al mensaje de log `Turn finished` en el `gameCoordinator` para mejorar la trazabilidad y la depuración.
- **Flujo de Conversación Lógico:** Se ha refactorizado el `gameCoordinator` para asegurar que el orden de generación y ensamblaje de los mensajes sea lógicamente coherente. Ahora, las reacciones de los compañeros se generan y se añaden al historial primero, y la narración del DM se genera después, siendo consciente de dichas reacciones. El array de mensajes final respeta este orden (`[Reacciones..., Narración]`), garantizando la coherencia del historial para los turnos futuros.

### Fixed
- **Corregido Error Crítico en Herramientas de IA:** Se ha solucionado un fallo fundamental que provocaba el silencio de los compañeros de IA y errores en el `actionInterpreter`. La causa raíz era una refactorización incompleta de la herramienta `characterLookupTool`, que seguía dependiendo de un estado global obsoleto. La solución ha implicado:
    1.  Refactorizar `characterLookupTool` para que acepte los datos de la `party` como un argumento explícito.
    2.  Modificar `companionExpertTool` y `actionInterpreter` para adoptar un patrón más robusto donde los datos necesarios son inyectados directamente en los prompts, eliminando las frágiles llamadas a herramientas anidadas.
- **Corregido Error de Esquema:** Se ha definido y exportado el `PartySchema` en `src/lib/schemas.ts` para solucionar un error de compilación que impedía a las herramientas validar correctamente el array de la `party`.

### Docs
- Actualizada la documentación de `docs/ia-architecture.md` para reflejar el paso de un estado global a un flujo de datos explícito en las herramientas de IA, detallando la nueva arquitectura más robusta y predecible.
- **Restauración del Historial:** Se ha recuperado y fusionado el historial completo de versiones (0.1.0 a 0.4.5) en el `CHANGELOG.md` para asegurar una documentación completa del proyecto.

---

## [0.4.65] - 2024-07-27

### Added
- **Panel de Tiradas:** Se ha añadido un nuevo panel en la interfaz de usuario que muestra un historial de todas las tiradas de dados realizadas, proporcionando transparencia sobre los resultados.
- **Panel de Orden de Combate:** Se ha implementado un panel que aparece al iniciar un combate y muestra la lista de todos los participantes ordenados por su iniciativa.

### Changed
- **Iconos en el Log de Partida:** Se han añadido iconos visuales al log principal para diferenciar rápidamente los distintos tipos de acciones (ataque, movimiento, diálogo, tiradas), mejorando la legibilidad.
- **Refactorización del Cálculo de Modificadores de Habilidad:** Se ha realizado una refactorización integral para optimizar y centralizar el cálculo de los modificadores de habilidad de los personajes.
    - **`schemas.ts`:** Se ha añadido el campo `abilityModifiers` al `CharacterSchema` para validar la nueva estructura de datos.
    - **`new-game-data.ts`:** Se han añadido los modificadores de habilidad pre-calculados a todos los personajes iniciales, convirtiéndolos en la fuente única de verdad.
    - **`combat-manager.ts`:** Se ha simplificado la lógica de la herramienta. Ahora lee directamente el modificador de destreza pre-calculado en lugar de calcularlo dinámicamente durante el inicio del combate.
- Mejorada la interfaz de usuario para que en los mensajes del chat se muestre el nombre del personaje controlado por el jugador en lugar del genérico "Jugador", aumentando así la inmersión.
- Se ha ajustado la configuración de la narración por voz (Texto a Voz), cambiando el modelo, la voz y las instrucciones del prompt para obtener un resultado más adecuado al rol de Dungeon Master.
- Se ha renombrado el archivo `src/lib/data.ts` a `src/lib/new-game-data.ts` para que su propósito sea más claro. Se han actualizado las importaciones correspondientes.
- Mejorado el texto de introducción para una nueva partida, añadiendo más detalles sobre la ubicación inicial para enriquecer la inmersión.

### Fixed
- Corregido un error tipográfico (`idđ` en lugar de `id`) en un objeto del inventario del personaje 'Merryl' en `src/lib/new-game-data.ts`. Este error, introducido durante la reciente refactorización, causaba un fallo de validación del esquema.
- Corregido un error en el `gameCoordinator` que provocaba que la IA improvisara respuestas cuando un jugador le pedía a un compañero que leyera información del entorno (como un cartel). Ahora, el DM narra la información y el compañero reacciona a ella.
- Corregido el comportamiento del `narrativeExpert` para que, al leer un texto (como una misión), muestre el contenido literal del mismo en lugar de una narración resumida, evitando fallos de la IA.
- Corregido un error de validación en los datos iniciales (`new-game-data.ts`) donde un conjuro tenía un campo `id_ts` en lugar de `id`.
- Eliminado el registro de los diálogos de los compañeros de la consola de depuración para mantenerla limpia y centrada en la lógica de la IA.

### Docs
- Se ha actualizado y enriquecido significativamente el archivo de hoja de ruta (`docs/future-improvements.md`) con un análisis detallado sobre la estrategia, el impacto y la implementación de las mejoras futuras propuestas.

### Removed
- Eliminado el archivo obsoleto `src/lib/data.ts`.

---

## [0.4.61] - 2024-07-26

### Changed
- Se ha mejorado la interfaz de usuario para permitir escribir en el campo de texto mientras el DM está pensando, aunque el botón de enviar permanezca desactivado.

### Fixed
- Corregido un error crítico por el que el `actionInterpreter` no reconocía las interacciones directas con los compañeros de IA, provocando que el DM narrara sus respuestas en lugar de que ellos mismos hablaran.
- Solucionado un error en el `gameCoordinator` que finalizaba el turno prematuramente tras una acción de movimiento, impidiendo que se registraran los logs de estado finales.

---

## [0.4.6] - 2024-05-24

### Added
- Archivo `CHANGELOG.md` creado para documentar el historial de cambios del proyecto.
- Archivo `docs/future-improvements.md` creado para separar las posibles mejoras de la documentación principal.
- Se ha reactivado la lógica de los compañeros de IA en el flujo `gameCoordinator`.
- Reconstruido el historial de versiones (0.1.0 a 0.4.5) para reflejar la evolución del proyecto.

### Changed
- El sistema de versionado y changelog, anteriormente archivado, se anota como una mejora futura para su automatización.

### Fixed
- Se revirtieron cambios no solicitados en `page.tsx`, `game-view.tsx` y `actions.ts` que se habían introducido durante la primera intentona de documentación, restaurando la base de código a un estado estable previo.

---

## [0.4.5] - 2024-05-23

### Added
- Documentación detallada de la arquitectura de la aplicación (tanto del frontend como de la IA) añadida al archivo `README.md`.
- Implementación de un sistema de juego de rol funcional basado en la aventura "El Dragón del Pico Agujahelada".
- Flujos de IA (`gameCoordinator`, `actionInterpreter`, `narrativeExpert`) para gestionar la lógica del juego.
- Herramientas de IA (`locationLookupTool`, `companionExpertTool`, etc.) para dar soporte a los flujos principales.

### Changed
- El flujo de la partida se centraliza en `game-view.tsx` y se comunica con el backend a través de la Server Action `processPlayerAction`.

### Fixed
- Se estabilizó el comportamiento de la IA, asegurando que los flujos de ejecución sean predecibles y no entren en bucles.

### Removed
- Se desactivó temporalmente la lógica de los compañeros de IA en `gameCoordinator` para simplificar la depuración de los flujos de narración y acción principales.

---

## [0.4.0] - 2024-05-22

### Added
- Implementado el flujo principal de juego, conectando la entrada del usuario con el backend de IA a través de Server Actions.
- Creada la vista `game-view.tsx` para gestionar el estado de la partida activa.

### Changed
- Refactorizado `page.tsx` para actuar como un router entre el menú principal y la vista del juego.

---

## [0.3.0] - 2024-05-21

### Added
- Integración de Genkit para la funcionalidad de IA generativa.
- Creados los flujos y herramientas de IA iniciales para interpretar acciones y narrar la historia.

### Changed
- Se añade el archivo de aventura `el-dragon-del-pico-agujahelada.json` como fuente de datos principal para la IA.

---

## [0.2.0] - 2024-05-20

### Added
- Implementados los componentes principales de la interfaz de usuario con `shadcn/ui`, incluyendo el `ChatPanel`, `CharacterSheet` y `GameLayout`.
- Configurado el `LeftPanel` para mostrar el log de depuración y las tiradas de dados.

---

## [0.1.0] - 2024-05-19

### Added
- Inicialización del proyecto con Next.js, TypeScript y Tailwind CSS.
- Configuración de la estructura de archivos y dependencias base (`package.json`).
- Creación del `README.md` inicial y la estructura de carpetas `src`.
