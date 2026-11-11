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
const items = (): any[] => data.items ?? [];
const itemsWithSpell = (spellId: string) => items().filter((i: any) => i.spell?.id === spellId);
const scenes = (): any[] => data.scenes ?? [];
const SHEEP = 'oveja-finethir-shinebright';
const START = 'ciudad-o-pueblo';
/**
 * "Al llegar" a la casa: la localización a la que lleva el camino desde la ciudad (a dos pasos del
 * inicio). Así la prueba sigue al PDF y no depende de cómo el conversor parta la casa en salas.
 */
const houseGround = () => {
    const neighbours = (id: string) => (location(id)?.connections ?? []).map((c: any) => c.targetId);
    const path = neighbours(START);
    return path.flatMap(neighbours).find((id: string) => id !== START && !path.includes(id));
};

/** Condiciones de una escena y de las escenas de las que depende (scene_started), como texto. */
const triggerChain = (scene: any, seen = new Set<string>()): string => {
    if (!scene || seen.has(scene.id)) return '';
    seen.add(scene.id);
    const own = JSON.stringify(scene.startsWhen ?? {});
    const parents = [...own.matchAll(/"event":"scene_started","target":"([^"]+)"/g)]
        .map(m => triggerChain(scenes().find(s => s.id === m[1]), seen));
    return [own, ...parents].join(' ');
};

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
        matches(PDF.opening.sheepArrives, () => {
            // "Normal en apariencia": hasta superar la barrera, el narrador no puede revelar quién es
            // ni a quién persigue (TASK-086, términos generados por el conversor).
            const terms = (entity(SHEEP).roleplay?.hiddenIdentityTerms ?? []).map((t: any) => t.term).join(' | ');
            expect(terms).toMatch(/Finethir|Shinebright/);
            expect(terms).toMatch(/Noke/);
            expect(terms, 'el narrador escribe en español').toMatch(/Vara|Varita/);
        });
        matches(PDF.opening.sealNamesScroll, () => {
            // El sello dice qué es el pergamino: no puede ser un término oculto.
            const terms = (entity(SHEEP).roleplay?.hiddenIdentityTerms ?? []).map((t: any) => t.term).join(' | ');
            expect(terms).not.toMatch(/hablar con (los )?animales|speak with animals/i);
        });
        matches(PDF.opening.readAloudActivates, () => {
            // Excepción de la aventura en datos: el pergamino de la oveja se activa leyéndolo, sin tirada.
            const scroll = itemsWithSpell('speak_with_animals').find((i: any) => i.startsWith?.entityId === SHEEP);
            expect(scroll).toBeDefined();
            expect(scroll.activation?.method).toBe('read_aloud');
            expect(scroll.activation?.check).toBeNull();
        });
        matches(PDF.opening.sealNamesScroll, () => {
            const scroll = itemsWithSpell('speak_with_animals').find((i: any) => i.startsWith?.entityId === SHEEP);
            expect(['label', 'obvious']).toContain(scroll?.identification?.method);
        });
    });

    describe('Guz y sus bestias', () => {
        matches(PDF.guz.arrives, () => {
            expect(count(START, 'guz-semiorco')).toBe(1);
            expect(count(START, 'lobo-polimorfo')).toBe(3);
            expect(count(START, 'oso-pardo-polimorfo')).toBe(1);
            expect(entity('lobo-polimorfo').baseType).toBe('Wolf');
            expect(entity('oso-pardo-polimorfo').baseType).toBe('Brown Bear');
        });
        matches(PDF.opening.howlingInterrupts, () => {
            // Una escena activa la presencia de Guz cuando el grupo habla con la oveja.
            const presenceFlag = location(START).entitiesPresent
                .find((e: any) => typeof e === 'object' && e.entityId === 'guz-semiorco')?.presenceFlag;
            const scene = scenes().find(s => (s.onStart?.setFlags ?? []).includes(presenceFlag));
            expect(scene, `ninguna escena activa ${presenceFlag}`).toBeDefined();
            // "Poco después de que empiece a contar su historia": el disparador, directo o a través de
            // escenas encadenadas (scene_started), es hablar con la oveja o usar su pergamino.
            const sheepScroll = itemsWithSpell('speak_with_animals').find((i: any) => i.startsWith?.entityId === SHEEP)?.id;
            expect(triggerChain(scene)).toMatch(new RegExp(`${SHEEP}${sheepScroll ? `|${sheepScroll}` : ''}`));
        });
        matches(PDF.guz.stats, () => {
            expect(entity('guz-semiorco').stats.ac).toBe(14);
            expect(entity('guz-semiorco').stats.hp).toBe(67);
        });
        matches(PDF.guz.stats, () => {
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
        matches(PDF.house.path, () => {
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
            for (const id of [houseGround(), 'plataforma-central', 'plataforma-superior']) {
                expect(reachable.has(id), id).toBe(true);
            }
        });
        matches(PDF.house.apes, () => {
            expect(count(houseGround(), 'simio-polimorfo')).toBe(3);
        });
        matches(PDF.house.bearOuthouse, () => {
            expect(presentIds(houseGround())).toContain('oso-pardo-polimorfo');
        });
        matches(PDF.house.lockedDoor, () => {
            // Las indicaciones del DM de la escena de la casa recogen las dos CD de la puerta.
            const text = scenes().map(s => s.guidance).join('\n');
            expect(text).toMatch(/CD\s*14/);
            expect(text).toMatch(/CD\s*12/);
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
        matches(PDF.noke.stats, () => {
            expect(scores('ahmed-noke-mago-humano')).toMatchObject({ fuerza: 9, destreza: 14, constitución: 12, inteligencia: 16, sabiduría: 12, carisma: 10 });
            expect(JSON.stringify(entity('ahmed-noke-mago-humano'))).toMatch(/rayo de escarcha|ray of frost/i);
        });
        matches(PDF.noke.dragonStats, () => {
            expect(entity('cria-de-dragon-de-cama').stats.ac).toBe(16);
            expect(entity('cria-de-dragon-de-cama').stats.hp).toBe(75);
        });
    });

    describe('Desenlace', () => {
        matches(PDF.ending.secondScroll, () => {
            // Un segundo pergamino, escondido en la plataforma central.
            const second = itemsWithSpell('speak_with_animals').find((i: any) => i.startsWith?.locationId === 'plataforma-central');
            expect(second).toBeDefined();
            expect(second.startsWith.hidden).toBe(true);
        });
        matches(PDF.wand.useCheck, () => {
            const wand = itemsWithSpell('true_polymorph').find((i: any) => i.type === 'wand');
            expect(wand).toBeDefined();
            expect(wand.startsWith?.entityId).toBe('ahmed-noke-mago-humano');
            expect(wand.rulesText).toMatch(/17/);
        });
    });
});
