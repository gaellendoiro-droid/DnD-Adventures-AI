/**
 * Motor de reglas v2 (docs/nucleo-v2.md, paso C). Determinista, sin IA y genérico: lo propio de
 * cada aventura sale de los datos del conversor (`scenes[]`, `items[]`).
 */
export * from './state';
export * from './facts';
export * from './scene-engine';
export * from './item-rules';
export * from './spell-rules';
export { ItemRuleModuleV2, applyCoreV2EndOfTurn, deriveTurnEvents, presentEntityIds, describeFacts } from './legacy-bridge';
