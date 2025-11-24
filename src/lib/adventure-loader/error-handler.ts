import { ZodError } from 'zod';

export enum AdventureLoadErrorType {
    JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AI_ERROR = 'AI_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    FILE_READ_ERROR = 'FILE_READ_ERROR',
    SERVER_ERROR = 'SERVER_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    INVALID_JSON = 'INVALID_JSON', // Alias for backward compatibility if needed
    UNKNOWN = 'UNKNOWN' // Alias
}

export interface AdventureLoadErrorDetails {
    type: AdventureLoadErrorType;
    message: string;
    userMessage: string;
    details?: any;
    recoverable: boolean;
}

export class AdventureLoadError extends Error {
    public type: AdventureLoadErrorType;
    public userMessage: string;
    public details?: any;
    public recoverable: boolean;

    constructor(type: AdventureLoadErrorType, message: string, userMessage: string, details?: any, recoverable: boolean = false) {
        super(message);
        this.name = 'AdventureLoadError';
        this.type = type;
        this.userMessage = userMessage;
        this.details = details;
        this.recoverable = recoverable;
    }
}

export function classifyError(error: any): AdventureLoadError {
    // Si ya es un AdventureLoadError, devolverlo tal cual
    if (error instanceof AdventureLoadError) {
        return error;
    }

    // Error de JSON inválido
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return new AdventureLoadError(
            AdventureLoadErrorType.JSON_PARSE_ERROR,
            `JSON Syntax Error: ${error.message}`,
            'El archivo no es un JSON válido. Por favor, verifica la sintaxis del archivo.',
            { originalError: error.message },
            false
        );
    }

    // Error de validación Zod
    if (error instanceof ZodError) {
        return new AdventureLoadError(
            AdventureLoadErrorType.VALIDATION_ERROR,
            'Schema Validation Error',
            'El archivo tiene una estructura incorrecta.',
            { errors: error.errors },
            false
        );
    }

    // Errores de red / Fetch
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return new AdventureLoadError(
            AdventureLoadErrorType.NETWORK_ERROR,
            `Network Error: ${error.message}`,
            'Hubo un problema de conexión al intentar cargar la aventura.',
            { originalError: error.message },
            true
        );
    }

    // Errores de IA (Genkit)
    if (error && (error.status === 429 || error.message?.includes('quota') || error.message?.includes('resource exhausted'))) {
        return new AdventureLoadError(
            AdventureLoadErrorType.AI_ERROR,
            `AI Quota Exceeded: ${error.message}`,
            'El servicio de IA está saturado momentáneamente. Por favor, intenta de nuevo en unos segundos.',
            { originalError: error.message },
            true
        );
    }

    // Error genérico
    return new AdventureLoadError(
        AdventureLoadErrorType.UNKNOWN_ERROR,
        error.message || 'Unknown error occurred',
        'Ocurrió un error inesperado al cargar la aventura.',
        { originalError: error },
        false
    );
}

export function getUserFriendlyMessage(error: AdventureLoadError): { title: string, message: string } {
    let title = 'Error';
    switch (error.type) {
        case AdventureLoadErrorType.JSON_PARSE_ERROR:
            title = 'Archivo Inválido';
            break;
        case AdventureLoadErrorType.VALIDATION_ERROR:
            title = 'Formato Incorrecto';
            break;
        case AdventureLoadErrorType.AI_ERROR:
            title = 'Error de IA';
            break;
        case AdventureLoadErrorType.NETWORK_ERROR:
        case AdventureLoadErrorType.SERVER_ERROR:
            title = 'Error de Conexión';
            break;
        default:
            title = 'Error Inesperado';
    }
    return { title, message: error.userMessage };
}
