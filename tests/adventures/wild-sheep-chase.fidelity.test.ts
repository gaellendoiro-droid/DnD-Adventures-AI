/**
 * Fidelidad de datos: el JSON de "La caza de la oveja salvaje" frente al PDF original.
 *
 * Sin IA y sin jugar: comprueba que el conversor ha recogido los hechos del PDF que el juego
 * necesita. Cada comprobación cita su pasaje (ver wild-sheep-chase.pdf-spec.ts).
 *
 * - `matches(...)`: el JSON ya cumple el PDF.
 * - `knownGap(...)`: el JSON NO lo cumple todavía. Se ejecuta con `it.fails`: la CI sigue en verde
 *   mientras el hueco exista y FALLA en cuanto el conversor lo arregle, para que se pase a
 *   `matches` (así ningún arreglo queda sin registrar).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDF, cite, type PdfFact } from './wild-sheep-chase.pdf-spec';
import { resolveStartingLocationId } from '@/lib/adventure-loader/starting-location';

const data = JSON.parse(fs.readFileSync(
    path.resolve('public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json'), 'utf8'));

const entity = (id: string) => data.entities.find((e: any) => e.id === id);
const location = (id: string) => data.locations.find((l: any) => l.id === id);
const presentIds = (locId: string) => (location(locId)?.entitiesPresent ?? [])
    .map((e: any) => (typeof e === 'string' ? e : e.entityId));
const count = (locId: string, entityId: string) => presentIds(locId).filter((id: string) => id === entityId).length;
const scores = (id: string) => entity(id)?.stats?.abilityScores ?? {};
const allItems = () => [
    ...(data.items ?? []),
    ...data.locations.flatMap((l: any) => (l.interactables ?? []).flatMap((i: any) => i.items ?? i.contents ?? [])),
];
const START = 'ciudad-o-pueblo';
const TOWER = 'torre-de-noke';

const matches = (f: PdfFact, check: () => void) => it(cite(f), check);
const knownGap = (task: string, f: PdfFact, check: () => void) => it.fails(`[${task}] ${cite(f)}`, check);

describe('La caza de la oveja salvaje: fidelidad del JSON al PDF', () => {
    describe('Apertura en la ciudad', () => {
        matches(PDF.opening.downtime, () => {
            expect(resolveStartingLocationId(data)).toBe(START);
        });
        matches(PDF.opening.sheepArrives, () => {
            expect(presentIds(START)).toContain('oveja-finethir-shinebright');
        });
        knownGap('TASK-080', PDF.opening.readAloudActivates, () => {
            // La excepción de la aventura debe estar en datos: un objeto pergamino que se activa al
            // leerlo, sin tirada (hoy solo existe como texto en roleplay.possessions).
            const scroll = allItems().find((i: any) => /pergamino|scroll/i.test(`${i.id} ${i.name}`));
            expect(scroll).toBeDefined();
            expect(scroll.requiresCheck).toBe(false);
        });
    });

    describe('Guz y sus bestias', () => {
        matches(PDF.guz.arrives, () => {
            expect(count(START, 'guz-semiorco')).toBe(1);
            expect(count(START, 'lobo-polimorfo')).toBe(3);
            expect(count(START, 'oso-pardo-polimorfo')).toBe(1);
        });
        knownGap('TASK-084', PDF.opening.howlingInterrupts, () => {
            // Un disparador en datos debe activar la presencia de Guz (hoy guz_aparece no lo activa nada).
            expect(JSON.stringify(data)).toMatch(/"trigger"[^}]*guz_aparece|"setFlags"[^}]*guz_aparece/);
        });
        matches(PDF.guz.stats, () => {
            expect(entity('guz-semiorco').stats.ac).toBe(14);
            expect(entity('guz-semiorco').stats.hp).toBe(67);
        });
        knownGap('TASK-091', PDF.guz.stats, () => {
            expect(scores('guz-semiorco')).toMatchObject({ fuerza: 16, destreza: 12, constitución: 17, inteligencia: 8, sabiduría: 11, carisma: 8 });
            expect(entity('guz-semiorco').stats.actions.length).toBeGreaterThan(0);
        });
        matches(PDF.guz.sheepStats, () => {
            const sheep = entity('oveja-finethir-shinebright');
            expect(sheep.baseType).toBe('Pony');
            expect(sheep.stats.abilityScores).toMatchObject({ inteligencia: 18, sabiduría: 14 });
        });
    });

    describe('La casa en el bosque', () => {
        knownGap('TASK-085', PDF.house.path, () => {
            // Desde la ciudad se debe poder llegar a la torre y recorrer sus plataformas.
            const reachable = new Set<string>([START]);
            let grew = true;
            while (grew) {
                grew = false;
                for (const id of [...reachable]) {
                    for (const c of location(id)?.connections ?? []) {
                        if (!reachable.has(c.targetId)) { reachable.add(c.targetId); grew = true; }
                    }
                }
            }
            for (const id of [TOWER, 'plataforma-central', 'plataforma-superior', 'retrete']) {
                expect(reachable.has(id), id).toBe(true);
            }
        });
        matches(PDF.house.apes, () => {
            expect(count(TOWER, 'simio-polimorfo')).toBe(3);
        });
        matches(PDF.house.bearOuthouse, () => {
            expect(presentIds('retrete')).toContain('oso-pardo-polimorfo');
        });
        knownGap('TASK-085', PDF.house.lockedDoor, () => {
            const door = JSON.stringify(location('plataforma-central')) + JSON.stringify(location(TOWER));
            expect(door).toMatch(/"dc"\s*:\s*14/);
            expect(door).toMatch(/"dc"\s*:\s*12/);
        });
    });

    describe('Noke', () => {
        matches(PDF.noke.whereabouts, () => {
            expect(presentIds('plataforma-central')).toContain('ahmed-noke-mago-humano');
        });
        matches(PDF.noke.stats, () => {
            expect(entity('ahmed-noke-mago-humano').stats.ac).toBe(12);
            expect(entity('ahmed-noke-mago-humano').stats.hp).toBe(55);
        });
        knownGap('TASK-091', PDF.noke.stats, () => {
            expect(scores('ahmed-noke-mago-humano')).toMatchObject({ fuerza: 9, destreza: 14, constitución: 12, inteligencia: 16, sabiduría: 12, carisma: 10 });
            expect(JSON.stringify(entity('ahmed-noke-mago-humano'))).toMatch(/rayo de escarcha|ray of frost/i);
        });
        knownGap('TASK-091', PDF.noke.dragonStats, () => {
            expect(entity('cria-de-dragon-de-cama').stats.ac).toBe(16);
            expect(entity('cria-de-dragon-de-cama').stats.hp).toBe(75);
        });
    });

    describe('Desenlace', () => {
        knownGap('TASK-080', PDF.ending.secondScroll, () => {
            // Hoy solo es un texto en una interacción: debe ser un objeto recogible.
            const interactables = location('plataforma-central').interactables ?? [];
            expect(interactables.every((i: any) => typeof i.id === 'string' && i.id.length > 0)).toBe(true);
            expect(allItems().some((i: any) => /pergamino|scroll/i.test(`${i.id} ${i.name}`))).toBe(true);
        });
        knownGap('TASK-080', PDF.wand.useCheck, () => {
            expect(allItems().some((i: any) => /vara|wand/i.test(`${i.id} ${i.name}`))).toBe(true);
        });
    });
});
