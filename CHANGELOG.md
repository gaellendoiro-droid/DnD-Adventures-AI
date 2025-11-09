# Changelog

Todas las novedades y cambios importantes de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

### Changed
- Se ha mejorado la interfaz de usuario para permitir escribir en el campo de texto mientras el DM está pensando, aunque el botón de enviar permanezca desactivado.

### Fixed

### Removed

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
