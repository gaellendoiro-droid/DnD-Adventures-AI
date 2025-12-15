import { z, ZodError } from 'zod';
import { AdventureDataSchema } from '@/lib/schemas';
import { AdventureLoadError, AdventureLoadErrorType } from './error-handler';
import { logClient } from '@/lib/logger-client';

export interface ValidationError {
    path: string;
    message: string;
    code: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
}

export function validateAdventureStructure(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!AdventureDataSchema) {
        logClient.error('CRITICAL: AdventureDataSchema is undefined', { component: 'Validator' });
        return { valid: false, errors: [{ path: 'schema', message: 'Internal Error: Schema undefined', code: 'SCHEMA_ERROR' }], warnings: [] };
    }

    // DEBUG: Log data structure to debug validation error
    logClient.info('Validating adventure structure', {
        component: 'Validator',
        hasData: !!data,
        isObject: typeof data === 'object',
        keys: data ? Object.keys(data) : 'N/A',
        locationsType: data?.locations ? (Array.isArray(data.locations) ? 'array' : typeof data.locations) : 'undefined',
        entitiesType: data?.entities ? (Array.isArray(data.entities) ? 'array' : typeof data.entities) : 'undefined'
    });

    // 1. Validar con Zod schema
    try {
        AdventureDataSchema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            // Safety check for errors array
            const zodErrors = (error as any).errors;
            if (Array.isArray(zodErrors)) {
                zodErrors.forEach((err: any) => {
                    if (!err || !err.path) return;
                    errors.push({
                        path: err.path.join('.'),
                        message: err.message,
                        code: err.code,
                    });
                });
            } else {
                errors.push({
                    path: 'schema',
                    message: `Initial Schema Verification Failed: ${error.message}`,
                    code: 'SCHEMA_UNKNOWN_ERROR',
                });
            }
        } else {
            errors.push({
                path: 'root',
                message: 'Error inesperado durante la validación del esquema.',
                code: 'UNKNOWN_VALIDATION_ERROR',
            });
        }
    }

    // Si la estructura básica falla, retornamos inmediatamente porque no podemos confiar en los datos para validaciones lógicas
    if (errors.length > 0) {
        return { valid: false, errors, warnings };
    }

    // 2. Validaciones Lógicas y de Integridad Referencial
    try {

        // Validar unicidad de IDs de ubicaciones
        const locationIds = new Set<string>();
        const duplicateLocationIds = new Set<string>();

        logClient.info('Checking location IDs uniqueness...', { component: 'Validator' });
        if (data.locations) {
            data.locations.forEach((loc: any) => {
                if (!loc) return;
                if (locationIds.has(loc.id)) {
                    duplicateLocationIds.add(loc.id);
                }
                locationIds.add(loc.id);
            });
        }

        if (duplicateLocationIds.size > 0) {
            errors.push({
                path: 'locations',
                message: `IDs de ubicación duplicados encontrados: ${Array.from(duplicateLocationIds).join(', ')}`,
                code: 'DUPLICATE_LOCATION_IDS',
            });
        }

        logClient.info('Validating connections...', { component: 'Validator' });
        // Validar conexiones (que apunten a IDs existentes)
        // Aceptamos 'connections' o 'exits' como alias
        data.locations.forEach((loc: any, index: number) => {
            if (!loc) return;
            const connections = loc.connections || loc.exits || [];

            if (Array.isArray(connections)) {
                connections.forEach((conn: any, connIndex: number) => {
                    const connId = typeof conn === 'string' ? conn : (conn?.targetId || conn?.toLocationId);

                    if (!connId) {
                        errors.push({
                            path: `locations.${index}.connections.${connIndex}`,
                            message: `La ubicación '${loc.name || loc.title}' (${loc.id}) tiene una conexión sin ID válido.`,
                            code: 'INVALID_CONNECTION_FORMAT',
                        });
                        return;
                    }

                    if (!locationIds.has(connId)) {
                        errors.push({
                            path: `locations.${index}.connections.${connIndex}`,
                            message: `La ubicación '${loc.name || loc.title}' (${loc.id}) tiene una conexión a un ID inexistente: '${connId}'`,
                            code: 'INVALID_CONNECTION_REFERENCE',
                        });
                    }
                });
            }
        });

        // Validar entities (si existen)
        if (data.entities && Array.isArray(data.entities)) {
            const entityIds = new Set<string>();
            const duplicateEntityIds = new Set<string>();

            data.entities.forEach((ent: any) => {
                if (!ent) return;
                if (entityIds.has(ent.id)) {
                    duplicateEntityIds.add(ent.id);
                }
                entityIds.add(ent.id);
            });
            logClient.info('Entities validation complete', { component: 'Validator' });

            if (duplicateEntityIds.size > 0) {
                errors.push({
                    path: 'entities',
                    message: `IDs de entidad duplicados encontrados: ${Array.from(duplicateEntityIds).join(', ')}`,
                    code: 'DUPLICATE_ENTITY_IDS',
                });
            }
        }

        // Validar startingLocationId si existe
        if (data.startingLocationId && !locationIds.has(data.startingLocationId)) {
            errors.push({
                path: 'startingLocationId',
                message: `El startingLocationId '${data.startingLocationId}' no corresponde a ninguna ubicación existente.`,
                code: 'INVALID_STARTING_LOCATION',
            });
        }

    } catch (e: any) {
        logClient.error('CRITICAL: Error inside validator logic', { component: 'Validator' }, e);
        errors.push({
            path: 'validator',
            message: `Error interno de validación: ${e.message}`,
            code: 'VALIDATOR_CRASH'
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

export function formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';

    // Agrupar por tipo o mostrar los primeros N errores
    const maxErrorsToShow = 5;
    const remainingErrors = errors.length - maxErrorsToShow;

    let message = errors.slice(0, maxErrorsToShow).map(err => {
        return `- ${err.path}: ${err.message}`;
    }).join('\n');

    if (remainingErrors > 0) {
        message += `\n... y ${remainingErrors} errores más.`;
    }

    return message;
}
