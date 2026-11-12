import { RuleModule, RulesEngineInput, RulesEngineResult } from './rule-module';
import { ScrollRuleModule } from './scroll-rules';
import { RestRuleModule } from './rest-rules';
import { KeyRuleModule } from './key-rules';
import { InventoryRuleModule } from './inventory-rules';
import { ItemRuleModuleV2 } from '../core-v2/legacy-bridge';
import { isCoreV2Enabled } from '../core-v2/state';

export class GameRulesEngine {
    private static modules: RuleModule[] = [
        // Núcleo v2 (CORE_V2=1): objetos con mecánica de items[] según los datos del PDF.
        new ItemRuleModuleV2(),
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
        // Con CORE_V2=1, la regla fija de pergaminos solo se usa en aventuras sin items[] en los datos.
        const skipLegacyScrolls = isCoreV2Enabled() && Array.isArray(input.adventureData?.items) && input.adventureData.items.length > 0;
        for (const module of this.modules) {
            if (skipLegacyScrolls && module.name === 'ScrollRules') continue;
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
