# Ambient Music System Implementation Plan

## Goal Description
Implement a dynamic and robust ambient music system that adapts to the game state (exploration vs. combat) and the current location/environment. The system will be modular and use a strategic file naming convention to select the appropriate tracks.

**Status:** ✅ COMPLETED (2025-11-27)

## User Review Required
> [!IMPORTANT]
> **File Naming Convention**:
> The system will rely on the following naming convention for audio files in `/public/sound/`:
> `[type]_[mode]_[location_type]_[intensity]_[name].mp3`
>
> - **Types**: `music` (melodic), `ambience` (background noise), `sfx` (sound effects)
> - **Modes**: `exploration`, `combat`
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

## Implemented Changes

### Components

#### [NEW] [music-manager.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/components/game/music-manager.tsx)
- A new component that handles multi-layered audio playback.
- **Props**:
    - `locationId`: string
    - `inCombat`: boolean
    - `adventureData`: any
    - `volumeSettings`: VolumeSettings
    - `isMuted`: boolean
- **Features**:
    - **Multi-layer Playback**: Can play at least 3 layers simultaneously: `music`, `ambience`, and `sfx`.
    - **State Monitoring**: Monitors `locationId` and `inCombat` to switch tracks.
    - **Intelligent Selection**:
        - Selects a `music` track based on mode and location.
        - Selects an `ambience` track based on location (usually independent of combat, but can change).
    - **Crossfading**: Smooth transitions (4 seconds) for both music and ambience layers independently.
    - **Volume Control**: Separate volume controls for master, music, ambience, sfx, and narrator.
    - **SFX Support**: Exposes a method or listens to events to play one-shot `sfx` files.

### Selection Logic & Fallback (Implemented)

The system uses a **5-level priority-based fallback mechanism** to ensure audio plays with the highest specificity possible. If no matching file is found, the system will remain silent:

1.  **Exact Location ID**: `/sound/{type}_{mode}_{ID-EXACTO}_low.mp3` (e.g., `music_exploration_phandalin-plaza-del-pueblo_low.mp3`)
2.  **Granular Type**: `/sound/{type}_{mode}_{GRANULAR-TYPE}_low.mp3` (e.g., `music_exploration_bazar_low.mp3` - inferred from ID like "bazar-escudo-de-leon" -> "bazar")
3.  **Parent Region**: `/sound/{type}_{mode}_{REGION}_low.mp3` (e.g., `music_exploration_phandalin_low.mp3` - inferred from ID like "phandalin-plaza-del-pueblo" -> "phandalin", or from adventure metadata).
4.  **General Location Type**: `/sound/{type}_{mode}_{LOCATION-TYPE}_low.mp3` (e.g., `music_exploration_city_low.mp3` - inferred from ID or metadata).
5.  **General Mode**: `/sound/{type}_{mode}_general_low.mp3` (e.g., `music_exploration_general_low.mp3`).

### Game View

#### [MODIFY] [game-view.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/components/game/game-view.tsx)
- Manage audio state (`volumeSettings`, `isMuted`).
- Pass these states to `MusicManager`, `ChatPanel`, and `PlayerInput`.
- Implemented `handleVolumeChange` to update individual volume channels.

#### [MODIFY] [chat-panel.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/components/game/chat-panel.tsx)
- Accept `volumeSettings`, `isMuted`, `onVolumeChange`, `onToggleMute` props.
- Pass these props to `PlayerInput`.
- Calculate effective volume for Narrator (TTS) based on Master * Narrator volume.

#### [MODIFY] [player-input.tsx](file:///t:/ProyectosPersonales/Programacion/DnD-Adventures-AI/src/components/game/player-input.tsx)
- Add audio controls (Play/Pause button, Volume slider/icon) below the input text area.
- Implemented a popover with individual sliders for Master, Music, Ambience, SFX, and Narrator.

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

