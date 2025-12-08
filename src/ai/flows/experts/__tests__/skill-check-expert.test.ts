
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { skillCheckExpertFlow } from '../skill-check-expert';
import * as retryUtils from '../../retry-utils';

// Mockeamos la dependencia de ejecución de AI para no llamar a Google GenAI real
vi.mock('../../retry-utils', () => ({
    executePromptWithRetry: vi.fn(),
}));

describe('SkillCheckExpert Flow', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should successfully process input and return structured AI output', async () => {
        // 1. Mockear la respuesta del LLM
        const mockAiOutput = {
            selectedSkill: 'athletics',
            difficultyClass: 15,
            suggestedMode: 'normal',
            reasoning: 'Climbing a rough wall is standard athletics.',
            narrations: {
                attempt: 'Intentas agarrarte a la pared rugosa...',
                success: 'Consigues subir sin problemas.',
                failure: 'Resbalas y caes.',
                criticalSuccess: 'Subes como una araña.',
                criticalFailure: 'Te rompes una uña.'
            }
        };

        // Simulamos que executePromptWithRetry devuelve esto
        vi.mocked(retryUtils.executePromptWithRetry).mockResolvedValue({
            output: mockAiOutput,
            text: JSON.stringify(mockAiOutput), // Simular campo text si fuera necesario
            // otros campos de GenerateResponse...
        } as any);

        // 2. Datos de entrada
        const input = {
            playerAction: "Intento escalar el muro",
            characterName: "Galador",
            locationContext: "Un callejón oscuro con muros de ladrillo.",
            targetEntity: undefined
        };

        // 3. Ejecutar el flujo
        const result = await skillCheckExpertFlow(input);

        // 4. Validaciones
        expect(result).toBeDefined();
        expect(result.selectedSkill).toBe('athletics');
        expect(result.difficultyClass).toBe(15);
        expect(result.narrations.attempt).toContain('Intentas agarrarte');

        // Verificar que se llamó al wrapper de retry con los parámetros esperados
        expect(retryUtils.executePromptWithRetry).toHaveBeenCalledTimes(1);
        expect(retryUtils.executePromptWithRetry).toHaveBeenCalledWith(
            expect.anything(), // El prompt object (dificil de comparar por referencia)
            input,
            expect.objectContaining({ flowName: 'skillCheckExpert' })
        );
    });

    it('should propagate errors if AI execution fails', async () => {
        // 1. Mockear error
        vi.mocked(retryUtils.executePromptWithRetry).mockRejectedValue(new Error("AI Service Unavailable"));

        // 2. Input
        const input = {
            playerAction: "Fail test",
            characterName: "Tester",
            locationContext: "Void"
        };

        // 3. Assert throw
        await expect(skillCheckExpertFlow(input)).rejects.toThrow("skillCheckExpertFlow failed: AI Service Unavailable");
    });

});
