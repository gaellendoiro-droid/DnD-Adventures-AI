
import { describe, it, expect, vi } from 'vitest';
import { CombatActionExecutor, CombatActionInput } from '@/lib/combat/action-executor';
import { Character } from '@/lib/types';

describe('CombatActionExecutor - Attribute Used Propagation', () => {
    it('should pass attributeUsed to diceRollerTool', async () => {
        // Mock diceRollerTool
        const diceRollerMock = vi.fn().mockResolvedValue({
            totalResult: 15,
            outcome: 'success',
            individualRolls: [15],
            rollNotation: '1d20+1',
            attributeUsed: 'FUE' // The tool should return what it received if implemented correctly
        });

        // Mock updateRollNotationWithModifiers
        const updateNotationMock = vi.fn();

        // Mock character (with stats)
        const character: Character = {
            id: 'merryl-id',
            name: 'Merryl',
            abilityModifiers: { fuerza: -1, destreza: 3 } as any,
            proficiencyBonus: 2,
            hp: { current: 10, max: 10 },
            inventory: [],
            spells: [],
            skills: [],
            // ... other required fields mocked minimally
        } as any;

        // Mock combatant (wrapper)
        const combatant = {
            id: 'merryl-id',
            characterName: 'Merryl',
            total: 15,
            type: 'player',
            controlledBy: 'AI'
        } as any;

        const input: CombatActionInput = {
            combatant,
            action: {
                type: 'attack',
                targetId: 'target-id',
                diceRollRequests: [
                    {
                        rollNotation: '1d20+1',
                        description: 'Ataque con Bastón',
                        attributeUsed: 'FUE', // Explicitly requesting FUE
                        attackType: 'attack_roll'
                    }
                ]
            },
            party: [character],
            enemies: [{ id: 'target-id', uniqueId: 'target-id', name: 'Goblin', hp: { current: 10, max: 10 }, ac: 10 }] as any[],
            initiativeOrder: [],
            diceRollerTool: diceRollerMock,
            updateRollNotationWithModifiers: updateNotationMock
        };

        const result = await CombatActionExecutor.execute(input);

        // First verify the action executed successfully
        if (!result.success) {
            console.error('Action execution failed:', result.error);
            console.error('Result:', JSON.stringify(result, null, 2));
        }
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        // Verify diceRollerTool was called with attributeUsed
        expect(diceRollerMock).toHaveBeenCalledWith(expect.objectContaining({
            attributeUsed: 'FUE'
        }));

        // Verify updateRollNotationWithModifiers was called
        // Note: In the real implementation, diceRollerTool returns the attributeUsed passed to it.
        // Since we mocked the return value to include attributeUsed: 'FUE', 
        // updateRollNotationWithModifiers should receive it in the roll object.
        const rollPassedToUpdate = updateNotationMock.mock.calls[0][0];
        expect(rollPassedToUpdate.attributeUsed).toBe('FUE');
    });
});
