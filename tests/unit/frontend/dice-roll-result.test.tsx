
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DiceRollResult } from '@/components/game/dice-roll-result';
import type { DiceRoll } from '@/lib/types';

describe('DiceRollResult Component', () => {
    it('should render a damage roll with 0 damage correctly', () => {
        const zeroDamageRoll: DiceRoll = {
            id: 'roll-1',
            roller: 'Test Player',
            rollNotation: '1d4-5',
            individualRolls: [1],
            modifier: -5,
            totalResult: -4, // Negative total
            outcome: 'neutral',
            timestamp: new Date(),
            description: 'Tirada de daño',
            // Combat info
            targetName: 'Goblin',
            damageDealt: 0, // Clamped to 0
            targetKilled: false,
        };

        render(<DiceRollResult roll={zeroDamageRoll} rollNumber={1} />);

        // Check if the total result (-4) is displayed
        expect(screen.getByText('-4')).toBeInTheDocument();

        // Check if the damage message is displayed with 0 points
        // "Test Player ha hecho 0 puntos de daño a Goblin"
        const damageMessage = screen.getByText((content, element) => {
            return element?.textContent === 'Test Player ha hecho 0 puntos de daño a Goblin';
        });
        expect(damageMessage).toBeInTheDocument();
    });

    it('should render a critical hit correctly', () => {
        const criticalRoll: DiceRoll = {
            id: 'roll-crit',
            roller: 'Test Player',
            rollNotation: '1d20+5',
            individualRolls: [20],
            modifier: 5,
            totalResult: 25,
            outcome: 'crit',
            timestamp: new Date(),
            description: 'Tirada de ataque',
            // Combat info
            targetName: 'Goblin',
            targetAC: 15,
            attackHit: true,
        };

        render(<DiceRollResult roll={criticalRoll} rollNumber={2} />);

        // Check for critical label
        expect(screen.getByText('⭐ ¡CRÍTICO!')).toBeInTheDocument();

        // Check total result
        expect(screen.getByText('25')).toBeInTheDocument();
    });
});
