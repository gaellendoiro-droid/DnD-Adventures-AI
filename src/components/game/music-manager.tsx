"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { logClient } from '@/lib/logger-client';

import type { VolumeSettings } from '@/lib/types';

interface MusicManagerProps {
    locationId: string;
    inCombat: boolean;
    adventureData: any;
    volumeSettings: VolumeSettings;
    isMuted: boolean;
}

type AudioType = 'music' | 'ambience' | 'sfx';
type AudioMode = 'exploration' | 'combat';
type LocationType = 'forest' | 'dungeon' | 'inn' | 'city' | 'mountain' | 'cave' | 'general';

const FADE_DURATION = 4000; // 4 seconds fade

export function MusicManager({ locationId, inCombat, adventureData, volumeSettings, isMuted }: MusicManagerProps) {
    // Refs for volume settings to avoid re-creating playTrack on volume change
    const volumeSettingsRef = useRef(volumeSettings);
    const isMutedRef = useRef(isMuted);

    // Update refs when props change
    useEffect(() => {
        volumeSettingsRef.current = volumeSettings;
        isMutedRef.current = isMuted;
    }, [volumeSettings, isMuted]);

    // Refs for current tracks to avoid race conditions and unnecessary re-renders
    const currentMusicTrackRef = useRef<string | null>(null);
    const currentAmbienceTrackRef = useRef<string | null>(null);

    // Audio refs for crossfading (Music)
    const musicAudioA = useRef<HTMLAudioElement | null>(null);
    const musicAudioB = useRef<HTMLAudioElement | null>(null);
    const activeMusicRef = useRef<'A' | 'B'>('A');

    // Audio refs for crossfading (Ambience)
    const ambienceAudioA = useRef<HTMLAudioElement | null>(null);
    const ambienceAudioB = useRef<HTMLAudioElement | null>(null);
    const activeAmbienceRef = useRef<'A' | 'B'>('A');

    // SFX Audio
    const sfxAudio = useRef<HTMLAudioElement | null>(null);

    // Initialize audio elements
    useEffect(() => {
        if (typeof window !== 'undefined') {
            musicAudioA.current = new Audio();
            musicAudioB.current = new Audio();
            ambienceAudioA.current = new Audio();
            ambienceAudioB.current = new Audio();
            sfxAudio.current = new Audio();

            [musicAudioA, musicAudioB, ambienceAudioA, ambienceAudioB].forEach(audioRef => {
                if (audioRef.current) {
                    audioRef.current.loop = true;
                    audioRef.current.volume = 0;
                }
            });

            if (sfxAudio.current) {
                sfxAudio.current.loop = false;
                sfxAudio.current.volume = volumeSettings.master * volumeSettings.sfx;
            }
        }

        return () => {
            [musicAudioA, musicAudioB, ambienceAudioA, ambienceAudioB, sfxAudio].forEach(audioRef => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.src = '';
                }
            });
        };
    }, []);

    // Handle Volume & Mute changes (Direct update for responsiveness)
    useEffect(() => {
        const effectiveMaster = isMuted ? 0 : volumeSettings.master;
        const musicVolume = effectiveMaster * volumeSettings.music;
        const ambienceVolume = effectiveMaster * volumeSettings.ambience;
        const sfxVolume = effectiveMaster * volumeSettings.sfx;

        const updateVolume = (audioRef: React.MutableRefObject<HTMLAudioElement | null>, targetVol: number) => {
            if (audioRef.current && !audioRef.current.paused) {
                // Update volume directly. The fade logic in playTrack might override this if a fade is in progress,
                // but this ensures immediate feedback for user actions.
                audioRef.current.volume = targetVol;
            }
        };

        const activeMusic = activeMusicRef.current === 'A' ? musicAudioA : musicAudioB;
        updateVolume(activeMusic, musicVolume);

        const activeAmbience = activeAmbienceRef.current === 'A' ? ambienceAudioA : ambienceAudioB;
        updateVolume(activeAmbience, ambienceVolume);

        if (sfxAudio.current) sfxAudio.current.volume = sfxVolume;

    }, [volumeSettings, isMuted]);

    // Helper to determine location type
    const getLocationType = useCallback((locId: string, advData: any): LocationType => {
        if (!locId) return 'general';

        const lowerId = locId.toLowerCase();

        if (lowerId.includes('phandalin') || lowerId.includes('pueblo') || lowerId.includes('villa')) return 'city';
        if (lowerId.includes('posada') || lowerId.includes('taverna')) return 'inn';
        if (lowerId.includes('bosque') || lowerId.includes('forest') || lowerId.includes('arbol')) return 'forest';
        if (lowerId.includes('mazmorra') || lowerId.includes('dungeon') || lowerId.includes('tumba') || lowerId.includes('templo') || lowerId.includes('ruina')) return 'dungeon';
        if (lowerId.includes('montaña') || lowerId.includes('pico') || lowerId.includes('colina')) return 'mountain';
        if (lowerId.includes('cueva') || lowerId.includes('caverna') || lowerId.includes('mina')) return 'cave';

        if (advData && advData.locations) {
            const loc = advData.locations.find((l: any) => l.id === locId);
            if (loc) {
                const text = (loc.title + ' ' + loc.description).toLowerCase();
                if (text.includes('bosque')) return 'forest';
                if (text.includes('ciudad') || text.includes('pueblo')) return 'city';
                if (text.includes('cueva') || text.includes('mina')) return 'cave';
            }
        }

        return 'general';
    }, []);

    const playTrack = useCallback(async (
        type: 'music' | 'ambience',
        mode: AudioMode,
        locationType: LocationType,
        specificLocationId: string,
        audioRefs: { A: React.MutableRefObject<HTMLAudioElement | null>, B: React.MutableRefObject<HTMLAudioElement | null> },
        activeRef: React.MutableRefObject<'A' | 'B'>,
        currentTrackRef: React.MutableRefObject<string | null>
    ) => {
        // Use refs for volume to avoid dependency on volumeSettings
        const currentSettings = volumeSettingsRef.current;
        const currentMuted = isMutedRef.current;

        const effectiveMaster = currentMuted ? 0 : currentSettings.master;
        const maxVolume = type === 'music'
            ? effectiveMaster * currentSettings.music
            : effectiveMaster * currentSettings.ambience;

        // Helper to infer region from ID or metadata
        const inferRegion = (id: string, advData: any): string | null => {
            const lowerId = id.toLowerCase();

            // 1. Known locations mapping (Hardcoded for robustness)
            const phandalinLocations = [
                'bazar', 'posada', 'suministros', 'casa-de-cambio', 'santuario', 'casa-de-harbin',
                'colina-del-resentimiento', 'molino', 'tres-jabalies', 'marca-roja', 'phandalin'
            ];
            if (phandalinLocations.some(loc => lowerId.includes(loc))) return 'phandalin';

            // 2. Check ID prefix
            if (lowerId.startsWith('phandalin')) return 'phandalin';
            if (lowerId.startsWith('neverwinter')) return 'neverwinter';
            if (lowerId.startsWith('icespire') || lowerId.includes('agujahelada')) return 'icespire';

            // 3. Check metadata (Title and Description)
            if (advData && advData.locations) {
                const loc = advData.locations.find((l: any) => l.id === id);
                if (loc) {
                    const text = (loc.name + ' ' + (loc.description || '')).toLowerCase(); // Changed loc.title to loc.name based on JSON structure
                    if (text.includes('phandalin')) return 'phandalin';
                    if (text.includes('neverwinter')) return 'neverwinter';
                }
            }
            return null;
        };

        // Helper to infer granular type (e.g. "bazar", "posada", "plaza")
        const inferGranularType = (id: string): string | null => {
            const parts = id.toLowerCase().split('-');
            // Filter out common region prefixes to find the "what"
            const regions = ['phandalin', 'neverwinter', 'icespire', 'agujahelada'];

            let typeCandidate = parts[0];
            if (regions.includes(typeCandidate) && parts.length > 1) {
                typeCandidate = parts[1];
            }

            // Return valid granular types (simple heuristic: at least 3 chars)
            return typeCandidate.length >= 3 ? typeCandidate : null;
        };

        const region = inferRegion(specificLocationId, adventureData);
        const granularType = inferGranularType(specificLocationId);

        const candidates = [
            // 1. Exact Location (e.g. "bazar-escudo-de-leon")
            ...(specificLocationId ? [`/sound/${type}_${mode}_${specificLocationId}_low.mp3`] : []),

            // 2. Granular Type (e.g. "bazar")
            ...(granularType ? [`/sound/${type}_${mode}_${granularType}_low.mp3`] : []),

            // 3. Parent Region (e.g. "phandalin")
            ...(region ? [`/sound/${type}_${mode}_${region}_low.mp3`] : []),

            // 4. Location Type (e.g. "city")
            `/sound/${type}_${mode}_${locationType}_low.mp3`,

            // 5. General Mode (e.g. "exploration_general")
            `/sound/${type}_${mode}_general_low.mp3`,
        ];

        let playableSrc: string | null = null;
        for (const src of candidates) {
            try {
                const res = await fetch(src, { method: 'HEAD' });
                if (res.ok) {
                    playableSrc = src;
                    break;
                }
            } catch (e) {
                // ignore
            }
        }

        if (!playableSrc) {
            return;
        }

        // Check against ref to ensure we have the latest state and avoid race conditions
        if (playableSrc === currentTrackRef.current) return;

        logClient.info(`Switching ${type} to: ${playableSrc}`, { component: 'MusicManager' });
        currentTrackRef.current = playableSrc;

        const nextRef = activeRef.current === 'A' ? audioRefs.B : audioRefs.A;
        const prevRef = activeRef.current === 'A' ? audioRefs.A : audioRefs.B;

        if (nextRef.current) {
            nextRef.current.src = playableSrc;
            nextRef.current.volume = 0;
            nextRef.current.play().catch(e => console.error("Audio play error", e));

            const fadeIn = setInterval(() => {
                if (!nextRef.current) { clearInterval(fadeIn); return; }
                // Re-check volume refs during fade for responsiveness
                const freshSettings = volumeSettingsRef.current;
                const freshMuted = isMutedRef.current;
                const freshMaster = freshMuted ? 0 : freshSettings.master;
                const freshMax = type === 'music' ? freshMaster * freshSettings.music : freshMaster * freshSettings.ambience;

                if (nextRef.current.volume < freshMax) {
                    nextRef.current.volume = Math.min(freshMax, nextRef.current.volume + 0.05);
                } else {
                    clearInterval(fadeIn);
                }
            }, FADE_DURATION / 20);

            if (prevRef.current && !prevRef.current.paused) {
                const fadeOut = setInterval(() => {
                    if (!prevRef.current) { clearInterval(fadeOut); return; }
                    if (prevRef.current.volume > 0.05) {
                        prevRef.current.volume = Math.max(0, prevRef.current.volume - 0.05);
                    } else {
                        prevRef.current.pause();
                        prevRef.current.volume = 0;
                        clearInterval(fadeOut);
                    }
                }, FADE_DURATION / 20);
            }

            activeRef.current = activeRef.current === 'A' ? 'B' : 'A';
        }

    }, []); // No dependencies!

    // Effect to trigger track changes
    useEffect(() => {
        const mode = inCombat ? 'combat' : 'exploration';
        const locType = getLocationType(locationId, adventureData);

        playTrack(
            'music',
            mode,
            locType,
            locationId,
            { A: musicAudioA, B: musicAudioB },
            activeMusicRef,
            currentMusicTrackRef
        );

        playTrack(
            'ambience',
            mode,
            locType,
            locationId,
            { A: ambienceAudioA, B: ambienceAudioB },
            activeAmbienceRef,
            currentAmbienceTrackRef
        );

    }, [locationId, inCombat, adventureData, playTrack, getLocationType]);

    return null;
}
