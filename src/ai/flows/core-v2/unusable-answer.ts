/**
 * ¿El modelo ha contestado, pero con algo que no sirve (no cumple el esquema, respuesta vacía o
 * cortada)? Cualquier otro error (cuota, red, clave, configuración) debe llegar al jugador tal cual:
 * disfrazarlo de "no te he entendido" ocultaría el problema real.
 */
export function isUnusableAnswer(error: any): boolean {
    return error?.status === 'INVALID_ARGUMENT'
        || ['ValidationError', 'GenerationResponseError', 'GenerationBlockedError'].includes(error?.name)
        || /schema validation failed|no valid candidates/i.test(String(error?.message ?? ''));
}
