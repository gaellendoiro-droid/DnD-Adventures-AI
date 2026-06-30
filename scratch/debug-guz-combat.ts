import fs from 'fs';
import path from 'path';
import { test, vi } from 'vitest';
import { EnemyValidator } from '../src/lib/combat/initialization/enemy-validator';
import type { Character } from '../src/lib/types';

// Mock getAdventureData to return the local JSON file
vi.mock('../src/app/game-state-actions', () => {
    return {
        getAdventureData: async () => {
            const jsonPath = path.resolve('public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json');
            const content = fs.readFileSync(jsonPath, 'utf-8');
            return JSON.parse(content);
        }
    };
});

test('debug guz combat', async () => {
    console.log("=== Debugging Guz Combat Initialization ===");

    // Load adventure data
    const jsonPath = path.resolve('public/adventures/la-caza-de-la-oveja-salvaje/la-caza-de-la-oveja-salvaje.json');
    const adventureData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    // 1. Prepare inputs
    const combatantIds = [
        "galador", "merryl", "elara", // party
        "guz", "lobo-polimorfo", "lobo-polimorfo", "lobo-polimorfo", "oso-pardo-polimorfo" // enemies
    ];

    const party: Character[] = [
        { id: "galador", name: "Galador", hp: { current: 36, max: 36 }, ac: 16 } as any,
        { id: "merryl", name: "Merryl", hp: { current: 26, max: 26 }, ac: 14 } as any,
        { id: "elara", name: "Elara", hp: { current: 31, max: 31 }, ac: 15 } as any,
    ];

    const existingEnemies: any[] = [];
    const localLogs: string[] = [];
    const localLog = (msg: string) => {
        console.log(`[LOG] ${msg}`);
        localLogs.push(msg);
    };

    // 2. Execute EnemyValidator.validateCombatants
    try {
        console.log("\nExecuting EnemyValidator.validateCombatants...");
        const result = await EnemyValidator.validateCombatants(
            combatantIds,
            party,
            existingEnemies,
            localLog
        );

        console.log("\n--- RESULT ---");
        console.log(`Valid Combatants: ${result.validCombatants.length}`);
        result.validCombatants.forEach(c => {
            console.log(`- ID: ${c.id}, Name: ${c.name}, Type: ${c.entityType}`);
        });

        console.log(`\nHostile Entities: ${result.hostileEntities.length}`);
        result.hostileEntities.forEach(e => {
            console.log(`- ID: ${e.id}, Name: ${e.name}, Type: ${e.entityType}`);
        });

    } catch (error: any) {
        console.error("❌ Error running EnemyValidator:", error);
    }
});

