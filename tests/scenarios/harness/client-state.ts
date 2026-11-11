/**
 * Cliente simulado: reproduce cómo `GameView` aplica los eventos `state_delta` del stream.
 *
 * Refleja `handleStateUpdate` y `syncDerivedStateFromWorldState` de
 * `src/components/game/game-view.tsx`. Si esa lógica cambia, hay que actualizar esto
 * (en la Fase 2 está previsto extraer un reductor compartido por ambos).
 */
import type { Character, GameMessage } from '@/lib/types';

export interface ClientState {
    messages: GameMessage[];
    diceRolls: any[];
    party: Character[];
    locationId: string;
    inCombat: boolean;
    turnIndex: number;
    phase?: string;
    initiativeOrder: any[];
    enemies: any[];
    enemiesByLocation: Record<string, any[]>;
    openDoors: Record<string, boolean>;
    worldState: any;
    selectedCharacterId?: string;
    lastProcessedTurnWasAI?: boolean;
}

let messageCounter = 0;

export function resetMessageCounter(): void {
    messageCounter = 0;
}

export function nextMessageId(): string {
    messageCounter += 1;
    return `msg-${messageCounter}`;
}

function withIds(messages: Partial<GameMessage>[]): GameMessage[] {
    return messages.map(m => ({
        ...m,
        id: m.id || nextMessageId(),
        timestamp: m.timestamp || '19:00',
        sender: m.sender || 'System',
        content: m.content ?? '',
    })) as GameMessage[];
}

function syncDerivedStateFromWorldState(state: ClientState): void {
    const ws = state.worldState;
    if (!ws || !ws.locations) return;
    const openDoors: Record<string, boolean> = {};
    const enemiesByLocation: Record<string, any[]> = {};
    for (const [locId, locState] of Object.entries<any>(ws.locations)) {
        if (locState.connections) {
            for (const [direction, connState] of Object.entries<any>(locState.connections)) {
                if (connState.isOpen) openDoors[`${locId}:${direction}`] = true;
            }
        }
        if (locState.enemies) enemiesByLocation[locId] = locState.enemies;
    }
    state.openDoors = openDoors;
    state.enemiesByLocation = enemiesByLocation;
}

/** Aplica un `state_delta` al estado del cliente. Devuelve los mensajes nuevos añadidos. */
export function applyStateDelta(state: ClientState, result: any): GameMessage[] {
    const added: GameMessage[] = [];
    if (!result || typeof result !== 'object') return added;

    if (result.messages) {
        const msgs = withIds(result.messages);
        state.messages.push(...msgs);
        added.push(...msgs);
    }
    if (result.diceRolls) state.diceRolls.push(...result.diceRolls);
    if (result.nextLocationId) state.locationId = result.nextLocationId;
    if (result.updatedParty) state.party = result.updatedParty;
    if (result.updatedEnemies) state.enemies = result.updatedEnemies;
    if (result.updatedEnemiesByLocation) {
        state.enemiesByLocation = { ...state.enemiesByLocation, ...result.updatedEnemiesByLocation };
    }
    if (result.updatedOpenDoors) state.openDoors = { ...state.openDoors, ...result.updatedOpenDoors };
    if (result.enemiesByLocation) {
        state.enemiesByLocation = { ...state.enemiesByLocation, ...result.enemiesByLocation };
    }
    if (result.enemies && !result.updatedEnemies) state.enemies = result.enemies;
    if (result.party) state.party = result.party;
    if (result.locationId) state.locationId = result.locationId;
    if (result.worldState) {
        state.worldState = result.worldState;
        syncDerivedStateFromWorldState(state);
    }

    if (typeof result.inCombat === 'boolean') {
        state.inCombat = result.inCombat;
        if (!result.inCombat) {
            state.initiativeOrder = [];
            state.turnIndex = 0;
        } else {
            if (result.initiativeOrder) state.initiativeOrder = result.initiativeOrder;
            if (result.turnIndex !== undefined) state.turnIndex = result.turnIndex;
        }
    } else {
        if (result.initiativeOrder) state.initiativeOrder = result.initiativeOrder;
        if (result.turnIndex !== undefined) state.turnIndex = result.turnIndex;
    }
    if (result.phase) state.phase = result.phase;
    if (result.lastProcessedTurnWasAI !== undefined) state.lastProcessedTurnWasAI = result.lastProcessedTurnWasAI;

    return added;
}
