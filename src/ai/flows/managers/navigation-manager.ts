import { GameState } from '@/ai/flows/schemas';
import { Location, Connection, Character } from '@/lib/types';
import { AdventureDataSchema } from '@/lib/schemas';
import { z } from 'zod';

type AdventureData = z.infer<typeof AdventureDataSchema>;

export interface MovementResult {
    success: boolean;
    newLocationId?: string;
    narration?: string;
    timePassed?: {
        days: number;
        hours: number;
        minutes: number;
    };
    error?: string;
}

interface ValidationResult {
    allowed: boolean;
    reason?: string;
}

interface TimeDelta {
    days: number;
    hours: number;
    minutes: number;
}

export class NavigationManager {

    /**
     * Resolves a movement request from the current location to a target location.
     * Supports direct connections, hub movement, and multi-hop pathfinding.
     */
    static async resolveMovement(
        gameState: GameState,
        targetId: string,
        adventureData: AdventureData
    ): Promise<MovementResult> {
        const currentLocationId = gameState.locationId;
        const currentLocation = adventureData.locations.find(l => l.id === currentLocationId);
        const targetLocation = adventureData.locations.find(l => l.id === targetId);

        if (!currentLocation || !targetLocation) {
            return { success: false, error: "Ubicación no encontrada." };
        }

        // 1. Check for Implicit Hub Movement (Same Region)
        if (currentLocation.regionId && targetLocation.regionId && currentLocation.regionId === targetLocation.regionId) {
            return {
                success: true,
                newLocationId: targetId,
                narration: `Te diriges hacia ${targetLocation.name || targetLocation.title}.`,
                timePassed: { days: 0, hours: 0, minutes: 5 } // Arbitrary short time for hub movement
            };
        }

        // 2. Find Path (Direct or Multi-hop)
        const path = this.findPath(currentLocationId, targetId, adventureData, gameState);

        if (!path || path.length === 0) {
            return { success: false, error: "No hay un camino conocido hacia allí." };
        }

        console.log(`[NavigationManager] Path found: ${JSON.stringify(path.map(p => ({ to: p.toId, blocked: p.connection.isBlocked })))}`);

        // 3. Validate and Calculate Total Path
        let totalDays = 0;
        let totalHours = 0;
        let totalMinutes = 0;
        let pathNarrationParts: string[] = [];
        let finalLocationId = currentLocationId;

        for (const step of path) {
            // Validate step
            const validation = this.validateMovement(step.connection, gameState, currentLocationId, step.connection.direction);
            console.log(`[NavigationManager] Validating step to ${step.toId}: ${JSON.stringify(validation)}`);
            if (!validation.allowed) {
                // Stop at the last valid location
                return {
                    success: false, // Overall failure to reach target
                    newLocationId: finalLocationId !== currentLocationId ? finalLocationId : undefined,
                    error: `No puedes continuar: ${validation.reason}`,
                    // Return partial time passed? For simplicity, we might just say "you get stuck here"
                    // But if we moved some steps, we should probably update time.
                    // For now, let's treat it as a hard stop.
                };
            }

            // Accumulate time
            const stepTime = this.calculateTravelTime(step.connection);
            totalDays += stepTime.days;
            totalHours += stepTime.hours;
            totalMinutes += stepTime.minutes;

            // Accumulate narration
            if (step.connection.description) {
                pathNarrationParts.push(step.connection.description);
            } else {
                const stepTarget = adventureData.locations.find(l => l.id === step.toId);
                pathNarrationParts.push(`Te diriges hacia ${stepTarget?.name || stepTarget?.title || step.toId}.`);
            }

            finalLocationId = step.toId;
        }

        // Normalize total time
        while (totalMinutes >= 60) {
            totalMinutes -= 60;
            totalHours += 1;
        }
        while (totalHours >= 24) {
            totalHours -= 24;
            totalDays += 1;
        }

        // Construct final narration
        // If it's a multi-step path, summarize.
        let finalNarration = "";
        if (path.length === 1) {
            finalNarration = pathNarrationParts[0];
        } else {
            // Summary for long paths
            finalNarration = `Emprendes el viaje hacia ${targetLocation.name || targetLocation.title}. ${pathNarrationParts.join(" ")}`;
        }

        return {
            success: true,
            newLocationId: targetId,
            narration: finalNarration,
            timePassed: { days: totalDays, hours: totalHours, minutes: totalMinutes }
        };
    }

    /**
     * Finds a path between start and end locations using BFS.
     * Returns an array of steps (connection + targetId).
     */
    private static findPath(
        startId: string,
        endId: string,
        adventureData: AdventureData,
        gameState: GameState // Passed for potential future use (e.g. key checks during pathfinding)
    ): { toId: string, connection: Connection }[] | null {
        const queue: { currentId: string, path: { toId: string, connection: Connection }[] }[] = [];
        const visited = new Set<string>();

        queue.push({ currentId: startId, path: [] });
        visited.add(startId);

        while (queue.length > 0) {
            const { currentId, path } = queue.shift()!;

            if (currentId === endId) {
                return path;
            }

            const currentLocation = adventureData.locations.find(l => l.id === currentId);
            if (!currentLocation) continue;

            // Get all neighbors
            const neighbors = this.getNeighbors(currentLocation);

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.targetId)) {
                    visited.add(neighbor.targetId);
                    queue.push({
                        currentId: neighbor.targetId,
                        path: [...path, { toId: neighbor.targetId, connection: neighbor.connection }]
                    });
                }
            }
        }

        return null; // No path found
    }

    /**
     * Helper to get all connected neighbors for a location.
     * Normalizes 'connections' and 'exits'.
     */
    private static getNeighbors(location: Location): { targetId: string, connection: Connection }[] {
        const neighbors: { targetId: string, connection: Connection }[] = [];
        const addedTargets = new Set<string>();

        // 1. Explicit Connections
        if (location.connections) {
            for (const conn of location.connections) {
                neighbors.push({ targetId: conn.targetId, connection: conn });
                addedTargets.add(conn.targetId);
            }
        }

        // 2. Legacy Exits
        if (location.exits) {
            for (const exit of location.exits) {
                let targetId: string;
                let description: string | undefined;

                if (typeof exit === 'string') {
                    targetId = exit;
                } else {
                    targetId = exit.toLocationId;
                    description = exit.description;
                }

                // Only add if not already added by explicit connections
                if (!addedTargets.has(targetId)) {
                    neighbors.push({
                        targetId: targetId,
                        connection: {
                            targetId: targetId,
                            type: 'direct',
                            description: description,
                            isLocked: false,
                            isBlocked: false
                        } as Connection
                    });
                    addedTargets.add(targetId);
                }
            }
        }

        return neighbors;
    }

    /**
     * Finds a connection object between current location and target.
     * Handles both new 'connections' array and legacy 'exits' array.
     */
    private static findConnection(currentLocation: Location, targetId: string): Connection | null {
        // Check new 'connections'
        if (currentLocation.connections) {
            const conn = currentLocation.connections.find(c => c.targetId === targetId);
            if (conn) return conn;
        }

        // Check legacy 'exits'
        if (currentLocation.exits) {
            for (const exit of currentLocation.exits) {
                if (typeof exit === 'string') {
                    if (exit === targetId) {
                        return {
                            targetId: exit,
                            type: 'direct',
                            isLocked: false,
                            isBlocked: false
                        } as Connection;
                    }
                } else if (exit.toLocationId === targetId) {
                    return {
                        targetId: exit.toLocationId,
                        type: 'direct', // Default to direct for legacy
                        description: exit.description,
                        isLocked: false,
                        isBlocked: false
                    } as Connection;
                }
            }
        }

        return null;
    }

    /**
     * Validates if the movement is allowed based on connection state (locked, blocked, closed).
     */
    private static validateMovement(connection: Connection, gameState: GameState, currentLocationId: string, direction?: string): ValidationResult {
        if (connection.isBlocked) {
            return { allowed: false, reason: connection.blockedReason || "El camino está bloqueado." };
        }

        if (connection.isLocked) {
            // Check if party has the key
            const hasKey = gameState.party.some(char =>
                char.inventory.some(item => item.id === connection.requiredKeyId)
            );

            if (!hasKey) {
                return { allowed: false, reason: "La puerta está cerrada con llave." };
            }
        }

        // Check if door is closed
        // Priority: 1) Check gameState.openDoors (runtime state), 2) Check connection.isOpen (JSON default), 3) Check visibility
        const doorKey = direction ? `${currentLocationId}:${direction}` : null;
        const isOpenInState = doorKey ? gameState.openDoors?.[doorKey] : undefined;
        
        // If door state is tracked in gameState.openDoors, use that (takes precedence over connection.isOpen)
        if (isOpenInState !== undefined) {
            if (isOpenInState === false) {
                return { allowed: false, reason: "La puerta está cerrada. Necesitas abrirla primero." };
            }
            // isOpenInState === true, door was opened, allow movement
            return { allowed: true };
        }
        
        // No runtime state, check connection.isOpen from JSON
        if (connection.isOpen === false) {
            return { allowed: false, reason: "La puerta está cerrada. Necesitas abrirla primero." };
        }
        
        // If isOpen is undefined but visibility is 'restricted', treat as closed door
        if (connection.isOpen === undefined && connection.visibility === 'restricted') {
            return { allowed: false, reason: "La puerta está cerrada. Necesitas abrirla primero." };
        }

        return { allowed: true };
    }

    /**
     * Parses the travelTime string or defaults based on type.
     */
    private static calculateTravelTime(connection: Connection): TimeDelta {
        if (connection.travelTime) {
            // Simple parsing logic (can be enhanced)
            // Expected formats: "X minutos", "X horas", "X días"
            const parts = connection.travelTime.toLowerCase().split(' ');
            const value = parseInt(parts[0]);
            const unit = parts[1];

            if (!isNaN(value)) {
                if (unit.startsWith('min')) return { days: 0, hours: 0, minutes: value };
                if (unit.startsWith('hor')) return { days: 0, hours: value, minutes: 0 };
                if (unit.startsWith('día') || unit.startsWith('dia')) return { days: value, hours: 0, minutes: 0 };
            }
        }

        // Defaults if no specific time
        switch (connection.type) {
            case 'urban': return { days: 0, hours: 0, minutes: 15 };
            case 'overland': return { days: 0, hours: 4, minutes: 0 }; // Default 4 hours for overland
            case 'direct':
            default: return { days: 0, hours: 0, minutes: 1 };
        }
    }

    /**
     * Updates the world time in the GameState.
     */
    static updateWorldTime(gameState: GameState, delta: TimeDelta): GameState {
        if (!gameState.worldTime) {
            gameState.worldTime = { day: 1, hour: 8, minute: 0 };
        }

        let { day, hour, minute } = gameState.worldTime;

        minute += delta.minutes;
        while (minute >= 60) {
            minute -= 60;
            hour += 1;
        }

        hour += delta.hours;
        while (hour >= 24) {
            hour -= 24;
            day += 1;
        }

        day += delta.days;

        return {
            ...gameState,
            worldTime: { day, hour, minute }
        };
    }
}
