# Ambient Music System Implementation Plan

## Goal Description
Implement a dynamic and robust ambient music system that adapts to the game state (exploration vs. combat) and the current location/environment. The system will be modular and use a strategic file naming convention to select the appropriate tracks.

## User Review Required
> [!IMPORTANT]
> **File Naming Convention**:
> The system will rely on the following naming convention for audio files in `/public/sound/`:
> `[type]_[mode]_[location_type]_[intensity]_[name].mp3`
>
> - **Types**: `music` (melodic), `ambience` (background noise), `sfx` (sound effects)
> - **Modes**: `exploration`, `combat`, `any`
> - **Location Types**: `forest`, `dungeon`, `inn`, `city`, `mountain`, `cave`, `general`
> - **Intensity**: `low`, `medium`, `high` (optional, defaults to `low`)
>
> Examples:
> - `music_exploration_forest_low_morning.mp3`
> - `ambience_exploration_cave_low_drips.mp3`
> - `music_combat_dungeon_high_boss.mp3`

> [!NOTE]
> **Location Mapping**:
> The system will attempt to map the current location's ID or name to a "Location Type". If no match is found, it will fall back to `general` or a default track.

## Proposed Changes

### Components

#### [NEW] [music-manager.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/components/game/music-manager.tsx)
- A new component that handles multi-layered audio playback.
- **Props**:
    - `locationId`: string
    - `inCombat`: boolean
    - `adventureData`: any
    - `volume`: number (0-1)
    - `isMuted`: boolean
- **Features**:
    - **Multi-layer Playback**: Can play at least 3 layers simultaneously: `music`, `ambience`, and `sfx`.
    - **State Monitoring**: Monitors `locationId` and `inCombat` to switch tracks.
    - **Intelligent Selection**:
        - Selects a `music` track based on mode and location.
        - Selects an `ambience` track based on location (usually independent of combat, but can change).
    - **Crossfading**: Smooth transitions for both music and ambience layers independently.
    - **Volume Control**: Separate volume controls for music and ambience (configurable in UI later, fixed ratio for now).
    - **SFX Support**: Exposes a method or listens to events to play one-shot `sfx` files (e.g., "sfx_combat_sword_hit.mp3").

### Selection Logic & Fallback

The system will use a **priority-based fallback mechanism** to ensure audio always plays:

1.  **Determine Context**:
    - **Mode**: `combat` vs `exploration`.
    - **Location Type**: Derived from `locationId` (e.g., `phandalin-*` -> `city`, `*forest*` -> `forest`).
2.  **Search Hierarchy** (from most specific to least):
    1.  `music_[mode]_[location_type]_*.mp3` (e.g., `music_combat_dungeon_*.mp3`)
    2.  `music_[mode]_general_*.mp3` (e.g., `music_combat_general_*.mp3`)
    3.  `music_any_[location_type]_*.mp3` (e.g., `music_any_dungeon_*.mp3`)
    4.  `music_any_general_*.mp3` (Global fallback)
3.  **Ambience Logic**:
    - Similar hierarchy but typically ignores "mode" unless a specific `ambience_combat_...` exists.
    - Fallback: `ambience_any_general_*.mp3` (e.g., wind, silence).
4.  **No Match**:
    - If absolutely no files match, the system stays silent (or logs a warning) to avoid breaking the immersion with errors.

### Game View

#### [MODIFY] [game-view.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/components/game/game-view.tsx)
- Manage audio state (`volume`, `isMuted`).
- Pass these states to `MusicManager` and `ChatPanel`.

#### [MODIFY] [chat-panel.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/components/game/chat-panel.tsx)
- Accept `volume`, `isMuted`, `onVolumeChange`, `onToggleMute` props.
- Pass these props to `PlayerInput`.

#### [MODIFY] [player-input.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/components/game/player-input.tsx)
- Add audio controls (Play/Pause button, Volume slider/icon) below the input text area.
- Position them to the right, on the same line as the "Para hablar con el DM fuera de personaje..." hint.

### Page

#### [MODIFY] [page.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/app/page.tsx)
- Pass `adventureData` to `GameView`.

## Verification Plan

### Manual Verification
1.  **Setup**:
    - Place dummy mp3 files in `/public/sound/` following the convention (e.g., `exploration_general_low_test.mp3`, `combat_general_high_test.mp3`).
    - Start the game.
2.  **Exploration Test**:
    - Verify that the "exploration" track plays when the game starts.
    - Move to a different location (if possible) and see if the track changes (if the location type changes).
3.  **Combat Test**:
    - Trigger combat (e.g., using the "Debug" tools or natural gameplay).
    - Verify that the music crossfades to the "combat" track.
    - End combat and verify it returns to "exploration".
