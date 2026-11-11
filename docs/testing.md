# Manual de Testing - D&D Adventures AI

Este documento unifica la guía rápida y la documentación de testing automático (Vitest) con las pautas de testeo manual y QA.

---

## 🚀 Testing Automatizado (Vitest)

Utilizamos **Vitest** como framework de pruebas unitarias y de integración por su rapidez, soporte nativo de TypeScript y compatibilidad de sintaxis con Jest.

### Comandos Comunes
```bash
# Modo interactivo (Watch) - Recomendado para desarrollo
npm test

# Interfaz gráfica en el navegador (Vitest UI)
npm run test:ui

# Ejecutar todos los tests una sola vez
npm run test:run

# Generar reporte de cobertura de código
npm run test:coverage

# Igual que en la CI (recomendado en Windows: evita timeouts de los workers)
npx vitest run --maxWorkers=4
```

> **Integración continua:** cada push a `main` (y cada PR, si se abre alguno) ejecuta `tsc --noEmit`, `vitest run --maxWorkers=4` y los escenarios narrativos en modo replay (`.github/workflows/ci.yml`). Las mismas tres comprobaciones se ejecutan en local antes de hacer merge; si la CI de `main` sale en rojo, se arregla antes de seguir con otra tarea.

### Estructura del Directorio `tests/`
- `tests/setup.ts`: Configura mocks de la API de Gemini/Genkit y silencia logs redundantes en consola.
- `tests/unit/`: Pruebas de componentes aislados (backend, dados, utilidades, target-resolver).
- `tests/integration/`: Escenarios multi-módulo (flujo unificado de combate, transiciones de turnos y sincronización).
- `tests/scenarios/`: Escenarios narrativos que juegan partidas reales turno a turno (ver abajo).

---

## 🎭 Escenarios Narrativos (Banco de Pruebas de la Fase 1)

Los escenarios ejecutan el **flujo real del juego** (`gameStreamCoordinator`, el mismo que usa `/api/game/stream`) con una lista de acciones del jugador, y comprueban tanto el **estado** (inventario, flags, localización, tiradas) como el **texto** que ve el jugador.

### Comandos
```bash
# Reproducir las grabaciones (sin IA real, sin claves, determinista). Es lo que ejecuta la CI.
npm run test:scenarios

# Volver a grabar uno o varios escenarios con la IA real configurada en .env (gasta cuota)
npm run test:scenarios:record -- oveja-01

# Jugar contra la IA real sin grabar nada (para medir latencia y explorar)
npm run test:scenarios:live
```
Variables útiles: `SCENARIO_TRANSCRIPT=1` imprime la transcripción completa de cada turno; `SCENARIO_VERBOSE=1` muestra los logs internos del juego.

### Cómo funciona
- **Cassettes (`tests/scenarios/cassettes/*.json`):** grabación de cada llamada de red del escenario (petición y respuesta). En modo replay, cada petición se busca por el hash de su contenido. **Nunca se guardan claves de API.**
- **Determinismo:** los dados usan una semilla fija por escenario y la fecha queda congelada, así que una grabación siempre produce el mismo resultado.
- **Cliente simulado (`harness/client-state.ts`):** aplica los `state_delta` del stream igual que `GameView`.
- **Informe:** por cada turno muestra las llamadas a la IA, la latencia (en record/live), los dados y los avisos.

### Qué se comprueba
- **Invariantes en todos los turnos:** sin errores en el stream; algún mensaje en cada turno; sin restos técnicos (`undefined`, `[object Object]`); sin términos de `roleplay.hiddenIdentityTerms` mientras `speak_with_animals` no esté activo.
- **Avisos (no rompen el escenario):** problemas conocidos aún abiertos, como mencionar la CD en la narración (TASK-007).
- **Expectativas de cada paso**, definidas en el propio escenario (`*.scenario.ts`).

### Cuándo volver a grabar
Si cambias un prompt, el contexto que se envía a la IA o la lógica que va antes de una llamada, la reproducción fallará con *"Petición no grabada"*. Es el aviso de que tu cambio afecta a la narración: vuelve a grabar, **revisa la transcripción** (`SCENARIO_TRANSCRIPT=1`) y commitea el cassette junto con el cambio.

### Añadir un escenario
Crea `tests/scenarios/<id>.scenario.ts` siguiendo los existentes (aventura, semilla y pasos con `action` y `expect`), grábalo con `npm run test:scenarios:record -- <id>` y commitea el escenario y su cassette.

---

## 🔌 Inyección de Dependencias (DI) en Tests

Para probar la lógica sin realizar llamadas reales a APIs externas (Gemini, ElevenLabs), implementamos inyección de dependencias a nivel de función:

```typescript
// En producción, usa las herramientas por defecto. En tests, inyectamos mocks.
export async function executeCombatManager(
  input: CombatManagerInput,
  dependencies?: Partial<CombatManagerDependencies>
) {
  const deps = {
    diceRollerTool,
    combatNarrationExpertTool,
    ...dependencies
  };
  // Lógica usando deps...
}
```

### Ejemplo de Mock en Test:
```typescript
it('resuelve el combate usando dados mockeados', async () => {
  const mockDice = vi.fn().mockResolvedValue({ totalResult: 20, outcome: 'crit' });
  
  const result = await executeCombatManager(input, {
    diceRollerTool: mockDice as any,
  });
  
  expect(mockDice).toHaveBeenCalled();
});
```

---

## 🎯 Pautas de Testeo Manual y QA

Cuando realices modificaciones visuales o de lógica conversacional, sigue este checklist mínimo para validar la experiencia antes de subir cambios:

### 1. Inicialización y Selección de Aventura
- [ ] Inicia una "Nueva Partida" desde el menú.
- [ ] Confirma que la interfaz de carga muestra la barra de progreso correctamente.
- [ ] El turno 0 (introducción de la aventura) debe mostrar solo el mensaje del DM, con los compañeros en silencio para no romper la atmósfera inicial.

### 2. Ciclo de Combate
- [ ] Provoca un combate (ej. atacando a un PNJ hostil o entrando en zona de emboscada).
- [ ] Confirma que el tracker de iniciativa renderiza el orden correcto de turnos.
- [ ] Realiza una acción y verifica que el combate se pausa en `ACTION_RESOLVED`, requiriendo hacer clic en "Continuar" para avanzar.
- [ ] Verifica que al caer el último enemigo el combate se cierra automáticamente y se muestra la pastilla visual de "Victoria".

### 3. Audio Dinámico
- [ ] Viaja entre salas y confirma que la música de ambiente hace un fundido (crossfade) de 4 segundos.
- [ ] Entra en combate y confirma la transición inmediata a la pista de tensión.
- [ ] Al salir de una zona con audio a una que no tiene configurada ninguna pista, la música debe desvanecerse (fade-out) hasta quedar en silencio, en lugar de persistir la pista anterior.
