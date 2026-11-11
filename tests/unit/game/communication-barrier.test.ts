import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    applyHiddenIdentityTerms,
    collectHiddenIdentityTerms,
    isBehindCommunicationBarrier,
    maskEntityBehindBarrier,
} from '../../../src/lib/game/communication-barrier';
import { EntitySchema } from '../../../src/lib/schemas';

describe('communication-barrier (genérico, sin datos fijos de aventura)', () => {
    it('conserva el nombre y la descripción propios de una bestia de otra aventura (no la convierte en "Oveja")', () => {
        const wolf = {
            id: 'lobo-1',
            name: 'Lobo Invernal',
            type: 'enemy',
            baseType: 'Beast',
            description: 'Un lobo enorme de pelaje blanco.',
            roleplay: { personality: 'Fiero', voiceAndMannerisms: 'Gruñe', goals: 'Cazar', secretsKnown: ['secreto'] },
        };
        expect(isBehindCommunicationBarrier(wolf)).toBe(true);
        const masked = maskEntityBehindBarrier(wolf);
        expect(masked.name).toBe('Lobo Invernal');
        expect(masked.description).toBe('Un lobo enorme de pelaje blanco.');
        expect(JSON.stringify(masked)).not.toMatch(/oveja/i);
        expect(masked.roleplay.secretsKnown).toBeUndefined();
        expect(masked.roleplay.goals).not.toBe('Cazar');
    });

    it('no enmascara a un NPC humanoide normal', () => {
        expect(isBehindCommunicationBarrier({ id: 'toblen', name: 'Toblen Piedrahonda', baseType: 'Commoner' })).toBe(false);
    });

    it('oculta los términos declarados en los datos, empezando por los más largos', () => {
        const terms = collectHiddenIdentityTerms([
            { roleplay: { hiddenIdentityTerms: [
                { term: 'Finethir', replacement: 'la oveja' },
                { term: 'Finethir Shinebright', replacement: 'una criatura transformada' },
            ] } },
        ]);
        expect(applyHiddenIdentityTerms('Es Finethir Shinebright. Finethir sufre.', terms))
            .toBe('Es una criatura transformada. la oveja sufre.');
        expect(applyHiddenIdentityTerms('Texto sin spoilers', [])).toBe('Texto sin spoilers');
    });

    it('la aventura de la oveja declara sus términos y sigue siendo válida según el esquema', () => {
        const files = [
            'public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json',
        ];
        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
            const terms = collectHiddenIdentityTerms(data.entities);
            // El conversor da el nombre completo o cada parte por separado: ambos lo ocultan.
            const joined = terms.map(t => t.term).join(' | ');
            expect(joined).toMatch(/Finethir/);
            expect(joined).toMatch(/Shinebright/);
            expect(joined).toMatch(/Noke/);
            const sheep = data.entities.find((e: any) => e.roleplay?.hiddenIdentityTerms);
            const parsed = EntitySchema.safeParse(sheep);
            expect(parsed.success, file).toBe(true);
            // El campo nuevo no se pierde al validar
            expect((parsed as any).data.roleplay.hiddenIdentityTerms.length).toBeGreaterThan(0);
        }
    });
});
