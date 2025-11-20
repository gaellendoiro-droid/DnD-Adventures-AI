/**
 * Unit tests for combat rules-engine.ts (previously combat-validators.ts)
 * Tests HP validation, character state checking, and combat end detection
 */

import { describe, it, expect } from 'vitest';
import {
  getHpStatus,
  validateAndClampHP,
  isUnconsciousOrDead,
  checkEndOfCombat,
} from '@/lib/combat/rules-engine';

describe('getHpStatus', () => {
  it('should return "Healthy" for HP >= 90%', () => {
    expect(getHpStatus(90, 100)).toBe('Healthy');
    expect(getHpStatus(100, 100)).toBe('Healthy');
    expect(getHpStatus(95, 100)).toBe('Healthy');
  });

  it('should return "Injured" for HP >= 60% and < 90%', () => {
    expect(getHpStatus(60, 100)).toBe('Injured');
    expect(getHpStatus(75, 100)).toBe('Injured');
    expect(getHpStatus(89, 100)).toBe('Injured');
  });

  it('should return "Wounded" for HP >= 20% and < 60%', () => {
    expect(getHpStatus(20, 100)).toBe('Wounded');
    expect(getHpStatus(40, 100)).toBe('Wounded');
    expect(getHpStatus(59, 100)).toBe('Wounded');
  });

  it('should return "Badly Wounded" for HP > 0% and < 20%', () => {
    expect(getHpStatus(1, 100)).toBe('Badly Wounded');
    expect(getHpStatus(10, 100)).toBe('Badly Wounded');
    expect(getHpStatus(19, 100)).toBe('Badly Wounded');
  });

  it('should return "Defeated" for HP = 0', () => {
    expect(getHpStatus(0, 100)).toBe('Defeated');
  });
});

describe('validateAndClampHP', () => {
  it('should return character unchanged if no HP property', () => {
    const character = { id: 'test', name: 'Test' };
    const result = validateAndClampHP(character);
    expect(result).toEqual(character);
  });

  it('should clamp HP current to valid range [0, max]', () => {
    const character = {
      id: 'test',
      hp: { current: 150, max: 100 },
    };
    const result = validateAndClampHP(character);
    expect(result.hp.current).toBe(100);
    expect(result.hp.max).toBe(100);
  });

  it('should clamp negative HP to 0', () => {
    const character = {
      id: 'test',
      hp: { current: -10, max: 100 },
    };
    const result = validateAndClampHP(character);
    expect(result.hp.current).toBe(0);
    expect(result.hp.max).toBe(100);
  });

  it('should set max HP to 10 if invalid (<= 0)', () => {
    const character = {
      id: 'test',
      hp: { current: 5, max: 0 },
    };
    const result = validateAndClampHP(character);
    expect(result.hp.max).toBe(10);
    expect(result.hp.current).toBe(5);
  });

  it('should maintain HP at 0 if isDead is true', () => {
    const character = {
      id: 'test',
      hp: { current: 50, max: 100 },
      isDead: true,
    };
    const result = validateAndClampHP(character);
    expect(result.hp.current).toBe(0);
    expect(result.hp.max).toBe(100);
    expect(result.isDead).toBe(true);
  });

  it('should preserve isDead: false if not explicitly set', () => {
    const character = {
      id: 'test',
      hp: { current: 50, max: 100 },
    };
    const result = validateAndClampHP(character);
    expect(result.isDead).toBe(false);
  });

  it('should preserve existing isDead state', () => {
    const character = {
      id: 'test',
      hp: { current: 50, max: 100 },
      isDead: false,
    };
    const result = validateAndClampHP(character);
    expect(result.isDead).toBe(false);
  });
});

describe('isUnconsciousOrDead', () => {
  it('should return false if character has no HP property', () => {
    const character = { id: 'test' };
    expect(isUnconsciousOrDead(character)).toBe(false);
  });

  it('should return true for player with isDead: true', () => {
    const character = {
      id: 'player',
      controlledBy: 'Player',
      hp: { current: 50, max: 100 },
      isDead: true,
    };
    expect(isUnconsciousOrDead(character)).toBe(true);
  });

  it('should return true for player with HP <= 0', () => {
    const character = {
      id: 'player',
      controlledBy: 'Player',
      hp: { current: 0, max: 100 },
      isDead: false,
    };
    expect(isUnconsciousOrDead(character)).toBe(true);
  });

  it('should return true for companion (AI) with isDead: true', () => {
    const character = {
      id: 'companion',
      controlledBy: 'AI',
      hp: { current: 50, max: 100 },
      isDead: true,
    };
    expect(isUnconsciousOrDead(character)).toBe(true);
  });

  it('should return true for companion (AI) with HP <= 0', () => {
    const character = {
      id: 'companion',
      controlledBy: 'AI',
      hp: { current: 0, max: 100 },
      isDead: false,
    };
    expect(isUnconsciousOrDead(character)).toBe(true);
  });

  it('should return false for player with HP > 0 and isDead: false', () => {
    const character = {
      id: 'player',
      controlledBy: 'Player',
      hp: { current: 50, max: 100 },
      isDead: false,
    };
    expect(isUnconsciousOrDead(character)).toBe(false);
  });

  it('should return true for enemy with HP <= 0', () => {
    const enemy = {
      uniqueId: 'enemy1',
      hp: { current: 0, max: 50 },
    };
    expect(isUnconsciousOrDead(enemy)).toBe(true);
  });

  it('should return false for enemy with HP > 0', () => {
    const enemy = {
      uniqueId: 'enemy1',
      hp: { current: 25, max: 50 },
    };
    expect(isUnconsciousOrDead(enemy)).toBe(false);
  });
});

describe('checkEndOfCombat', () => {
  it('should return combatEnded: true when all enemies are defeated', () => {
    const party = [
      { id: 'player', hp: { current: 50, max: 100 }, controlledBy: 'Player' },
    ];
    const enemies = [
      { uniqueId: 'enemy1', hp: { current: 0, max: 50 } },
      { uniqueId: 'enemy2', hp: { current: 0, max: 50 } },
    ];
    const result = checkEndOfCombat(party, enemies);
    expect(result.combatEnded).toBe(true);
    expect(result.reason).toBe('Todos los enemigos derrotados');
  });

  it('should return combatEnded: false when some enemies are alive', () => {
    const party = [
      { id: 'player', hp: { current: 50, max: 100 }, controlledBy: 'Player' },
    ];
    const enemies = [
      { uniqueId: 'enemy1', hp: { current: 0, max: 50 } },
      { uniqueId: 'enemy2', hp: { current: 25, max: 50 } },
    ];
    const result = checkEndOfCombat(party, enemies);
    expect(result.combatEnded).toBe(false);
    expect(result.reason).toBe(null);
  });

  it('should return combatEnded: true with "Todos los aliados muertos" when all party members are dead', () => {
    const party = [
      {
        id: 'player',
        hp: { current: 0, max: 100 },
        controlledBy: 'Player',
        isDead: true,
      },
      {
        id: 'companion',
        hp: { current: 0, max: 80 },
        controlledBy: 'AI',
        isDead: true,
      },
    ];
    const enemies = [{ uniqueId: 'enemy1', hp: { current: 50, max: 50 } }];
    const result = checkEndOfCombat(party, enemies);
    expect(result.combatEnded).toBe(true);
    expect(result.reason).toBe('Todos los aliados muertos');
  });

  it('should return combatEnded: true with "Todos los aliados inconscientes" when all party members are unconscious but not dead', () => {
    const party = [
      {
        id: 'player',
        hp: { current: 0, max: 100 },
        controlledBy: 'Player',
        isDead: false,
      },
      {
        id: 'companion',
        hp: { current: 0, max: 80 },
        controlledBy: 'AI',
        isDead: false,
      },
    ];
    const enemies = [{ uniqueId: 'enemy1', hp: { current: 50, max: 50 } }];
    const result = checkEndOfCombat(party, enemies);
    expect(result.combatEnded).toBe(true);
    expect(result.reason).toBe('Todos los aliados inconscientes');
  });

  it('should return combatEnded: true with "Todos los aliados inconscientes" when mix of unconscious and dead (if any is not dead)', () => {
    const party = [
      {
        id: 'player',
        hp: { current: 0, max: 100 },
        controlledBy: 'Player',
        isDead: true,
      },
      {
        id: 'companion',
        hp: { current: 0, max: 80 },
        controlledBy: 'AI',
        isDead: false, // Not dead, just unconscious
      },
    ];
    const enemies = [{ uniqueId: 'enemy1', hp: { current: 50, max: 50 } }];
    const result = checkEndOfCombat(party, enemies);
    expect(result.combatEnded).toBe(true);
    expect(result.reason).toBe('Todos los aliados inconscientes');
  });

  it('should return combatEnded: false when some party members are alive', () => {
    const party = [
      {
        id: 'player',
        hp: { current: 50, max: 100 },
        controlledBy: 'Player',
        isDead: false,
      },
      {
        id: 'companion',
        hp: { current: 0, max: 80 },
        controlledBy: 'AI',
        isDead: false,
      },
    ];
    const enemies = [{ uniqueId: 'enemy1', hp: { current: 50, max: 50 } }];
    const result = checkEndOfCombat(party, enemies);
    expect(result.combatEnded).toBe(false);
    expect(result.reason).toBe(null);
  });
});

