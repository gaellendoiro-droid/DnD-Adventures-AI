
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { EnemyTacticianOutputSchema, EnemyTacticianInputSchema } from '@/ai/tools/enemy-tactician';
import { CompanionTacticianOutputSchema, CompanionTacticianInputSchema } from '@/ai/tools/companion-tactician';
import { CombatNarrationExpertInputSchema, CombatNarrationExpertOutputSchema } from '@/ai/tools/combat/combat-narration-expert';

describe('Tactician Refactor Schemas', () => {
    describe('EnemyTacticianOutputSchema', () => {
        it('should have actionDescription and NOT narration', () => {
            const schemaShape = EnemyTacticianOutputSchema.shape;
            expect(schemaShape).toHaveProperty('actionDescription');
            expect(schemaShape).not.toHaveProperty('narration');
        });

        it('should validate a correct output', () => {
            const validOutput = {
                actionDescription: 'Ataque con Cimitarra',
                targetId: 'player-1',
                diceRolls: [
                    {
                        roller: 'Goblin',
                        rollNotation: '1d20+4',
                        description: 'Tirada de ataque con Cimitarra',
                        attackType: 'attack_roll',
                    },
                    {
                        roller: 'Goblin',
                        rollNotation: '1d6+2',
                        description: 'Tirada de daño con Cimitarra',
                        attackType: 'other', // or whatever is valid
                    }
                ]
            };

            const result = EnemyTacticianOutputSchema.safeParse(validOutput);
            expect(result.success).toBe(true);
        });
    });

    describe('CompanionTacticianOutputSchema', () => {
        it('should have actionDescription and NOT narration', () => {
            const schemaShape = CompanionTacticianOutputSchema.shape;
            expect(schemaShape).toHaveProperty('actionDescription');
            expect(schemaShape).not.toHaveProperty('narration');
        });
    });

    describe('CombatNarrationExpertInputSchema', () => {
        it('should accept "intention" as narrationType', () => {
            const validInput = {
                narrationType: 'intention',
                attackerName: 'Goblin',
                targetName: 'Galador',
                actionDescription: 'Ataque con Cimitarra',
            };

            const result = CombatNarrationExpertInputSchema.safeParse(validInput);
            expect(result.success).toBe(true);
        });

        it('should accept "resolution" as narrationType', () => {
            const validInput = {
                narrationType: 'resolution',
                attackerName: 'Goblin',
                targetName: 'Galador',
                attackResult: 'hit',
            };

            const result = CombatNarrationExpertInputSchema.safeParse(validInput);
            expect(result.success).toBe(true);
        });
    });
});
