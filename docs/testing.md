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
```

### Estructura del Directorio `tests/`
- `tests/setup.ts`: Configura mocks de la API de Gemini/Genkit y silencia logs redundantes en consola.
- `tests/unit/`: Pruebas de componentes aislados (backend, dados, utilidades, target-resolver).
- `tests/integration/`: Escenarios multi-módulo (flujo unificado de combate, transiciones de turnos y sincronización).

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
