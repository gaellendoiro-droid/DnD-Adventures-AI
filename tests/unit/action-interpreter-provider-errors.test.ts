import { describe, it, expect, vi } from 'vitest';

/**
 * Regresión detectada al grabar oveja-06: con la cuota diaria de la IA agotada, el jugador veía
 * "No se ha podido interpretar con seguridad tu acción", como si su frase fuera el problema.
 * Los errores del proveedor deben propagarse para que el stream muestre el error real.
 */
let nextErrorMessage = '';

vi.mock('@/ai/genkit', () => ({
    ai: {
        definePrompt: () => ({}),
        defineFlow: (_cfg: any, fn: any) => fn,
    },
}));
vi.mock('@/ai/flows/retry-utils', () => ({
    executePromptWithRetry: async () => Promise.reject({ message: nextErrorMessage }),
}));
vi.mock('@/app/game-state-actions', () => ({ getAdventureData: async () => ({ locations: [], entities: [] }) }));

const input = {
    playerAction: 'Intento descifrar el pergamino',
    locationContext: JSON.stringify({ id: 'plaza', entitiesPresent: [] }),
    party: [],
    conversationHistory: '',
} as any;

describe('actionInterpreter ante errores del proveedor de IA', () => {
    it('propaga la cuota diaria agotada en vez de pedir que reformules', async () => {
        nextErrorMessage = 'Groq API Error [429]: Rate limit reached for model `openai/gpt-oss-20b` on tokens per day (TPD): Limit 200000';
        const { actionInterpreter } = await import('@/ai/flows/action-interpreter');
        const outcome = await actionInterpreter(input).then(r => ({ ok: r }), e => ({ err: e }));
        expect((outcome as any).err?.message).toMatch(/tokens per day/);
    });

    it('con un error desconocido sigue pidiendo aclaración', async () => {
        nextErrorMessage = 'respuesta rara del modelo';
        const { actionInterpreter } = await import('@/ai/flows/action-interpreter');
        const res = await actionInterpreter(input);
        expect(res.interpretation.actionType).toBe('clarify');
    });
});
