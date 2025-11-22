# Visión General de la Arquitectura

Este documento proporciona una visión de alto nivel de la arquitectura del proyecto D&D Adventures AI.

## 📋 Tabla de Contenidos

1.  [Modelo Cliente-Servidor](#modelo-cliente-servidor-desacoplado)
2.  [Flujo de Comunicación](#flujo-de-comunicación)
3.  [Principios Arquitectónicos](#principios-arquitectónicos)
4.  [Componentes Principales](#componentes-principales)
5.  [Flujo de un Turno Típico](#flujo-de-un-turno-típico)
6.  [Diagramas Detallados](#diagramas-detallados-del-sistema)
    *   [Carga de Aventuras](#carga-de-aventuras-desde-json)
    *   [Flujo Narrativo](#flujo-narrativo-exploración-e-interacción)
    *   [Sistema de Combate](#sistema-de-combate-completo)
    *   [Secuencia Detallada](#flujo-detallado-de-una-acción-del-jugador)
7.  [Gestión de Datos](#gestión-de-datos)

---

## Modelo Cliente-Servidor Desacoplado

> **💡 Concepto Clave:** El proyecto sigue un modelo **Stateless** en el backend. Todo el estado necesario para procesar una acción se envía desde el cliente en cada petición.

El proyecto sigue un modelo cliente-servidor claramente separado:

```mermaid
graph LR
    subgraph Frontend["🖥️ Frontend (Next.js)"]
        A[React UI]
        B[Estado Local]
        C[Componentes]
    end
    
    subgraph Backend["⚙️ Backend (Genkit IA)"]
        D[Flujos IA]
        E[Herramientas]
        F[Lógica Juego]
    end
    
    Frontend <-->|Server Actions| Backend
    
    style Frontend fill:#1565c0,stroke:#90caf9,stroke-width:2px,color:#fff
    style Backend fill:#6a1b9a,stroke:#ce93d8,stroke-width:2px,color:#fff
```

### Frontend (Cliente)

- **Framework:** Next.js 15.5.6 con App Router
- **Lenguaje:** TypeScript
- **UI:** React 18.3.1 + shadcn/ui + Tailwind CSS
- **Estado:** React Hooks (`useState`, `useCallback`)
- **Responsabilidad:** Renderización de UI y gestión de estado local

### Backend (Servidor)

- **Framework:** Genkit 1.20.0
- **IA:** Google Gemini 2.5 Flash
- **Comunicación:** Next.js Server Actions
- **Responsabilidad:** Lógica del juego, toma de decisiones y generación de narrativa
- **Arquitectura de Combate:** `CombatSession` (patrón State Object) encapsula todo el estado del combate

## Flujo de Comunicación

```
Usuario → Frontend → Server Action → Backend IA → Respuesta → Frontend → Usuario
```

1. **Usuario envía acción** a través de la interfaz
2. **Frontend** recopila el estado completo y lo envía al backend
3. **Server Action** (`processPlayerAction`) actúa como puente seguro
4. **Backend IA** procesa la acción y genera respuesta
5. **Frontend** actualiza el estado local con la respuesta
6. **Usuario** ve el resultado en la interfaz

## Principios Arquitectónicos

### 1. Separación de Responsabilidades

- **Frontend:** Solo renderización y gestión de estado local
- **Backend:** Solo lógica del juego y generación de contenido
- **Comunicación:** A través de Server Actions (tipo-seguro)

### 2. Estado Descentralizado

- **Frontend:** Estado local en React (`game-view.tsx`)
- **Backend:** Sin estado global (stateless)
- **Datos:** Se pasan explícitamente en cada llamada

### 3. Modularidad

- **Flujos de IA:** Expertos especializados (interpretar, narrar, combatir)
- **Herramientas:** Funciones reutilizables
- **Componentes:** Componentes "tontos" que solo renderizan

### 4. Validación Robusta

- **Esquemas Zod:** Validación de datos en tiempo de ejecución
- **TypeScript:** Validación de tipos en tiempo de compilación
- **Fuente única de verdad:** Esquemas centralizados

## Componentes Principales

### Frontend

- **`app/game-view.tsx`:** Orquestador principal del estado
- **`components/game/`:** Componentes del juego (ChatPanel, CharacterSheet, etc.)
- **`components/layout/`:** Componentes de layout (LeftPanel, AppHeader)
- **`app/actions.ts`:** Server Actions para comunicación con backend

### Backend

- **`ai/flows/game-coordinator.ts`:** Orquestador lógico del juego (simplificado, delega a managers)
- **`ai/flows/managers/`:** Managers especializados:
  - **`companion-reaction-manager.ts`:** Gestiona reacciones de compañeros (antes y después del DM)
  - **`narrative-turn-manager.ts`:** Orquesta el flujo narrativo completo
- **`ai/flows/action-interpreter.ts`:** Interpreta acciones del jugador
- **`ai/flows/narrative-manager.ts`:** Genera narrativa (narrativeExpert)
- **`ai/tools/`:** Herramientas especializadas (combate, dados, etc.)
- **`lib/combat/combat-session.ts`:** Clase principal que encapsula el estado del combate (patrón State Object)
- **`lib/combat/`:** Módulos especializados de combate (rules-engine, turn-manager, turn-processor, action-executor, combat-session, etc.)
- **`lib/game/entity-status-utils.ts`:** Utilidades centralizadas para verificación de estados de entidades
- **`lib/utils/transcript-formatter.ts`:** Utilidad para formatear historial de conversación

## Flujo de un Turno Típico

```mermaid
graph LR
    A["👤 Usuario"] --> B["🖥️ Frontend"]
    B --> C["⚡ Server Action"]
    C --> D["🧠 GameCoordinator"]
    
    D --> E["🔍 ActionInterpreter"]
    E --> F{¿Tipo?}
    
    F -->|⚔️ Combate| G["🛡️ CombatManager"]
    G --> G1["⚔️ CombatSession"]
    G1 --> G2["🔄 Procesar Turno"]
    
    F -->|📜 Narrativa| H["📖 NarrativeTurnManager"]
    H --> I["👥 CompanionReaction (Pre)"]
    I --> J["🗣️ DM Narration"]
    J --> K["👥 CompanionReaction (Post)"]
    
    K --> L["📦 Ensamblar Respuesta"]
    G2 --> L
    
    L --> M["⚡ Server Action Return"]
    M --> N["🖥️ Frontend Update"]
    N --> O["👤 Usuario Ve Resultado"]
    
    %% Estilos Dark Mode
    style A fill:#1565c0,stroke:#90caf9,stroke-width:2px,color:#fff
    style B fill:#1565c0,stroke:#90caf9,stroke-width:2px,color:#fff
    style N fill:#1565c0,stroke:#90caf9,stroke-width:2px,color:#fff
    style O fill:#1565c0,stroke:#90caf9,stroke-width:2px,color:#fff
    
    style D fill:#6a1b9a,stroke:#ce93d8,stroke-width:2px,color:#fff
    style E fill:#6a1b9a,stroke:#ce93d8,stroke-width:2px,color:#fff
    
    style G fill:#c62828,stroke:#ef9a9a,stroke-width:2px,color:#fff
    style G1 fill:#c62828,stroke:#ef9a9a,stroke-width:2px,color:#fff
    style G2 fill:#c62828,stroke:#ef9a9a,stroke-width:2px,color:#fff
    
    style H fill:#2e7d32,stroke:#a5d6a7,stroke-width:2px,color:#fff
    style I fill:#2e7d32,stroke:#a5d6a7,stroke-width:2px,color:#fff
    style J fill:#2e7d32,stroke:#a5d6a7,stroke-width:2px,color:#fff
    style K fill:#2e7d32,stroke:#a5d6a7,stroke-width:2px,color:#fff
```

## Diagramas Detallados del Sistema

### Carga de Aventuras desde JSON

El sistema permite cargar aventuras desde archivos JSON. El proceso incluye validación, parsing con IA y caché en el servidor:

```mermaid
graph TD
    A["👤 Usuario: Selecciona Archivo"] --> B["🖥️ Frontend: FileReader"]
    B --> C["📄 Lee Contenido"]
    C --> D["⚡ parseAdventureFromJson"]
    
    D --> E{¿JSON Válido?}
    E -->|No| F["❌ Error: JSON Inválido"]
    E -->|Sí| G["🧠 parseAdventureFromJsonFlow"]
    
    G --> H["🤖 IA: Extrae Título/Resumen"]
    H --> I{¿OK?}
    I -->|No| J["🔄 Retry (Backoff)"]
    J --> H
    I -->|Sí| K["✅ Retorna Datos"]
    
    K --> L["🔍 Frontend: Valida Schema"]
    L --> M{¿Válido?}
    M -->|No| N["❌ Error: Estructura"]
    M -->|Sí| O["💾 setAdventureDataCache"]
    
    O --> P["📦 Server Cache"]
    P --> Q["🖥️ Frontend Update"]
    Q --> R["🎮 Aventura Lista"]
    
    S["🧠 GameCoordinator"] --> T["📥 getAdventureData"]
    T --> U{¿Cache?}
    U -->|Sí| V["📦 Retorna Cache"]
    U -->|No| W["📂 Lee Archivo Sistema"]
    W --> X["📄 JSON File"]
    X --> Y["🔄 Parsea JSON"]
    Y --> Z["💾 Guarda Cache"]
    Z --> V
    V --> AA["📍 Busca Location"]
    AA --> AB["✅ Retorna Contexto"]
    
    %% Estilos Dark Mode
    style A fill:#1565c0,stroke:#90caf9,color:#fff
    style B fill:#1565c0,stroke:#90caf9,color:#fff
    style L fill:#1565c0,stroke:#90caf9,color:#fff
    style Q fill:#1565c0,stroke:#90caf9,color:#fff
    
    style D fill:#6a1b9a,stroke:#ce93d8,color:#fff
    style G fill:#6a1b9a,stroke:#ce93d8,color:#fff
    style S fill:#6a1b9a,stroke:#ce93d8,color:#fff
    style O fill:#6a1b9a,stroke:#ce93d8,color:#fff
```

**Componentes Clave de Carga de Aventuras:**
- **parseAdventureFromJson**: Flujo de IA que extrae título y resumen del JSON
- **setAdventureDataCache**: Guarda la aventura en caché del servidor
- **getAdventureData**: Obtiene datos de aventura (usa caché o lee archivo)
- **AdventureDataSchema**: Valida la estructura de datos de la aventura

### Flujo Narrativo (Exploración e Interacción)

Cuando el jugador no está en combate, el `gameCoordinator` orquesta la narrativa y las reacciones de los compañeros:

```mermaid
graph TD
    A["👤 Usuario: Acción Narrativa"] --> B["🧠 GameCoordinator"]
    B --> C["🔍 ActionInterpreter"]
    C --> D{¿Combate?}
    
    D -->|Sí| F["🛡️ Sistema de Combate"]
    D -->|No| E["📖 NarrativeTurnManager"]
    
    E --> G["👥 CompanionReactionManager"]
    G --> H{¿Vivos?}
    H -->|No| J["⏭️ Salta"]
    H -->|Sí| I["💭 Reacción Intención"]
    
    I --> K["🗣️ NarrativeManager"]
    J --> K
    
    K --> L["🔀 NarrativeRouter"]
    L --> M{¿Tipo?}
    
    M -->|🔍 Exploración| N["🗺️ ExplorationExpert"]
    M -->|💬 Interacción| O["🗣️ InteractionExpert"]
    M -->|🔄 Híbrido| P["⚡ Ambos Paralelo"]
    
    N --> Q["📝 Descripción"]
    O --> R["💬 Diálogo"]
    
    P --> S["🔄 Synthesizer"]
    S --> T["📝 Resultado Combinado"]
    
    Q --> U["📜 DM Narration"]
    R --> U
    T --> U
    
    U --> V["👥 CompanionReactionManager"]
    V --> W{¿Vivos?}
    W -->|No| Y["⏭️ Salta"]
    W -->|Sí| X["💭 Reacción Resultado"]
    
    X --> Z["📦 Ensambla Mensajes"]
    Y --> Z
    Z --> AA["🖥️ UI Update"]
    
    %% Estilos Dark Mode
    style A fill:#1565c0,stroke:#90caf9,color:#fff
    style AA fill:#1565c0,stroke:#90caf9,color:#fff
    
    style B fill:#6a1b9a,stroke:#ce93d8,color:#fff
    style E fill:#2e7d32,stroke:#a5d6a7,color:#fff
    style K fill:#2e7d32,stroke:#a5d6a7,color:#fff
    
    style G fill:#f9a825,stroke:#fff59d,color:#fff
    style V fill:#f9a825,stroke:#fff59d,color:#fff
    
    style F fill:#c62828,stroke:#ef9a9a,color:#fff
```

**Componentes Clave del Flujo Narrativo:**
- **gameCoordinator**: Orquestador principal que delega el flujo narrativo al NarrativeTurnManager.
- **NarrativeTurnManager**: Encapsula todo el flujo narrativo (movimiento, reacciones, narración).
- **CompanionReactionManager**: Gestiona las reacciones de compañeros (antes y después del DM).
- **EntityStatusUtils**: Utilidades centralizadas para verificar estados (vivo/muerto/consciente).
- **NarrativeManager (narrativeExpert)**: Orquestador que decide qué expertos usar (Exploración/Interacción).
- **explorationExpert**: Genera descripciones ambientales y gestiona movimiento.
- **interactionExpert**: Gestiona diálogos con NPCs y tiradas sociales.
- **companionExpertTool**: Genera reacciones de compañeros. Se llama dos veces: antes (reacción a la intención) y después (reacción a lo sucedido).

### Sistema de Combate Completo

El sistema de combate utiliza `CombatSession` (patrón State Object) para encapsular todo el estado del combate. El flujo completo desde la detección hasta el procesamiento de turnos:

```mermaid
graph TD
    A["👤 Usuario: Acción de Combate"] --> B["🧠 GameCoordinator"]
    B --> C["🔍 ActionInterpreter"]
    C --> D{¿Ataque?}
    
    D -->|Sí| E["⚔️ CombatInitiationExpert"]
    E --> F{¿Iniciar?}
    F -->|No| H["📜 Flujo Narrativo"]
    
    F -->|Sí| G["🛡️ CombatManager"]
    G --> I{¿En Combate?}
    
    subgraph Initialization ["🏁 Fase de Inicialización"]
        direction TB
        J["⚙️ CombatSession.initialize"]
        L["🎲 CombatInitializer"]
        M["📊 Valida Enemigos y Iniciativa"]
        N["📋 Orden de Turnos"]
        
        J --> L --> M --> N
    end
    
    I -->|No| J
    I -->|Sí| K["🔄 ProcessCurrentTurn"]
    
    N --> O["⚔️ Bucle de Turnos"]
    K --> O
    
    subgraph TurnExecution ["⚔️ Ejecución de Turno"]
        direction TB
        O --> P{¿Turno Jugador?}
        P -->|Sí| Q["⏳ Espera Acción"]
        P -->|No| R["🤖 TurnProcessor (IA)"]
        
        R --> S{¿Tipo IA?}
        S -->|Compañero| T["👥 CompanionTactician"]
        S -->|Enemigo| U["👹 EnemyTactician"]
        
        T --> V["🧠 Planificación"]
        U --> V
        
        V --> W["⚡ CombatActionExecutor"]
        W --> X["🎲 Tiradas y Daño"]
        X --> Y["🗣️ CombatNarrationExpert"]
    end
    
    Y --> Z["📝 Narración Completa"]
    Z --> AA{¿Fin Combate?}
    AA -->|No| AB["⏭️ AdvanceTurn"]
    AB --> O
    AA -->|Sí| AC["🏁 Fin Combate"]
    
    Q --> AD["👤 Respuesta Usuario"]
    AD --> AE["🔍 ActionInterpreter"]
    AE --> AF["👤 TurnProcessor (Jugador)"]
    AF --> W
    
    AC --> AG["📦 Estado Actualizado"]
    H --> AG
    AG --> AH["🖥️ UI Update"]
    
    %% Estilos Dark Mode
    style Initialization fill:#37474f,stroke:#ff9800,stroke-width:2px,stroke-dasharray: 5 5,color:#fff
    style TurnExecution fill:#263238,stroke:#f44336,stroke-width:2px,stroke-dasharray: 5 5,color:#fff
    
    style A fill:#1565c0,stroke:#90caf9,color:#fff
    style AH fill:#1565c0,stroke:#90caf9,color:#fff
    
    style B fill:#6a1b9a,stroke:#ce93d8,color:#fff
    style G fill:#c62828,stroke:#ef9a9a,color:#fff
    style O fill:#c62828,stroke:#ef9a9a,color:#fff
```

**Componentes Clave del Sistema de Combate:**
- **CombatSession**: Encapsula todo el estado del combate (turnIndex, party, enemies, initiativeOrder)
- **CombatInitializer**: Inicializa el combate (valida enemigos, calcula iniciativa, ordena turnos)
- **TurnProcessor**: Procesa turnos de forma unificada (jugador e IA) - planifica, ejecuta y genera narración
- **CombatActionExecutor**: Ejecuta acciones de combate (procesa tiradas, aplica daño con RulesEngine)
- **Tacticians**: Deciden acciones para IA (companionTacticianTool, enemyTacticianTool) - solo lógica táctica, sin narración
- **combatNarrationExpertTool**: Genera una única narración completa que incluye preparación, ejecución y resultado (ya no hay narraciones de intención y resolución separadas)

### Flujo Detallado de una Acción del Jugador

Secuencia completa desde que el usuario envía una acción hasta que recibe la respuesta:

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant F as 🖥️ Frontend
    participant SA as ⚡ Server Action
    participant GC as 🧠 GameCoordinator
    participant AI as 🔍 ActionInterpreter
    participant CM as 🛡️ CombatManager
    participant NTM as 📖 NarrativeTurnManager
    participant CRM as 👥 CompanionManager
    participant NE as 🗣️ NarrativeManager
    
    U->>F: Escribe acción
    F->>F: Recopila estado completo
    F->>SA: processPlayerAction(estado)
    
    SA->>GC: gameCoordinatorFlow(estado)
    GC->>GC: Carga datos de aventura
    
    GC->>AI: actionInterpreter(acción)
    AI-->>GC: {actionType, targetId...}
    
    alt ⚔️ Es acción de combate
        rect rgb(55, 71, 79)
            Note over GC, CM: Flujo de Combate
            GC->>CM: combatManagerTool(estado)
            CM->>CM: CombatSession.processTurn()
            CM-->>GC: Estado de combate actualizado
        end
    else 📜 Es acción narrativa
        rect rgb(27, 94, 32)
            Note over GC, NE: Flujo Narrativo
            GC->>NTM: executeNarrativeTurn(estado)
            
            NTM->>CRM: processCompanionReactions (Pre)
            CRM-->>NTM: Reacciones a intención
            
            NTM->>NE: narrativeExpert(acción)
            NE-->>NTM: dmNarration (Exploración/Interacción)
            
            NTM->>CRM: processCompanionReactions (Post)
            CRM-->>NTM: Reacciones a resultado
            
            NTM-->>GC: Estado narrativo completo
        end
    end
    
    GC->>GC: Ensambla respuesta final
    GC-->>SA: GameCoordinatorOutput
    SA-->>F: Estado + Mensajes
    F->>U: Muestra resultado en UI
```

## Gestión de Datos

### Estado del Juego

El estado completo del juego se mantiene en el frontend y se envía al backend en cada acción:

```typescript
{
  playerAction: string,        // Acción del jugador
  party: Character[],          // Personajes del grupo
  locationId: string,          // Ubicación actual
  inCombat: boolean,           // Estado de combate
  turnIndex: number,           // Turno actual (combate)
  initiativeOrder: Combatant[], // Orden de iniciativa
  conversationHistory: Message[] // Historial reciente
}
```

### Validación

- **Frontend:** Valida antes de enviar (`GameStateSchema`)
- **Backend:** Valida al recibir (esquemas de entrada)
- **Salida:** Valida antes de devolver (esquemas de salida)

## Ventajas de esta Arquitectura

1. **Escalabilidad:** Fácil añadir nuevas funcionalidades
2. **Mantenibilidad:** Código organizado y modular
3. **Depuración:** Logs claros y trazabilidad
4. **Extensibilidad:** Fácil añadir nuevos flujos o herramientas
5. **Robustez:** Validación en múltiples capas

## Documentación Relacionada

- [Arquitectura del Frontend](./arquitectura-frontend.md) - Detalles del cliente
- [Arquitectura del Backend IA](./arquitectura-backend.md) - Detalles del servidor
- [Flujo de Datos](./flujo-datos.md) - Diagramas detallados
- [Referencia API](./referencia-api.md) - Contratos de datos
- [CombatSession - Guía de Uso](./combat-session-guia.md) - Guía completa de uso de CombatSession
- [CombatSession - Diseño](./combat-session-design.md) - Diseño detallado y decisiones arquitectónicas

