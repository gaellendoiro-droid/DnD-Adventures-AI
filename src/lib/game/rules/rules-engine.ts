import { RuleModule, RulesEngineInput, RulesEngineResult } from './rule-module';
import { ScrollRuleModule } from './scroll-rules';
import { RestRuleModule } from './rest-rules';
import { KeyRuleModule } from './key-rules';
import { InventoryRuleModule } from './inventory-rules';

export class GameRulesEngine {
    private static modules: RuleModule[] = [
        new ScrollRuleModule(),
        new RestRuleModule(),
        new KeyRuleModule(),
        new InventoryRuleModule()
    ];

    /**
     * Evalúa la acción frente a los módulos de reglas registrados.
     * Si un módulo puede manejar la acción, devuelve su resultado.
     * Si ninguno la maneja, devuelve intercepted = false (habilitando fallback a la IA).
     */
    static evaluate(input: RulesEngineInput): RulesEngineResult {
        for (const module of this.modules) {
            try {
                if (module.canHandle(input)) {
                    const result = module.evaluate(input);
                    if (result.intercepted) {
                        return result;
                    }
                }
            } catch (error) {
                console.error(`Error al evaluar el módulo de reglas '${module.name}':`, error);
            }
        }

        // Fallback: No se intercepta por ninguna regla dura programada
        return {
            interpretation: input.interpretation,
            intercepted: false,
            updatedWorldState: input.worldState
        };
    }
}
export type { RuleModule, RulesEngineInput, RulesEngineResult };
