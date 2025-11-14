# Sistema de Death Saving Throws y Revivencia (D&D 5e)

**Estado:** Sin comenzar  
**Prioridad:** Media  
**Categoría:** Sistema de Combate / Mecánicas de D&D 5e  
**Estimación:** 15-20 horas

---

## Objetivo

Implementar el sistema completo de Death Saving Throws (tiradas de salvación de muerte) según las reglas oficiales de D&D 5e, permitiendo que los personajes inconscientes puedan estabilizarse, ser estabilizados por otros, o morir permanentemente.

---

## Contexto

El sistema actual trata a los personajes con `hp.current = 0` como "muertos" pero en D&D 5e, un personaje con 0 HP está **inconsciente** y puede:
1. Hacer **tiradas de salvación de muerte** (death saving throws) cada turno
2. Ser **estabilizado** por otros personajes (sin curar HP)
3. **Recuperar consciencia** si recibe curación (incluso 1 HP)
4. **Morir permanentemente** si falla 3 death saving throws o recibe daño masivo

**Nota:** Ya se ha implementado la distinción básica entre inconsciente y muerto (campo `isDead` y regla de muerte masiva). Este plan extiende ese sistema con Death Saving Throws completos.

---

## Estado Actual

- ✅ Personajes con `hp.current = 0` no pueden actuar (correcto)
- ✅ Personajes con `hp.current = 0` no reaccionan (correcto)
- ✅ Personajes con `hp.current = 0` no participan en combate (correcto)
- ✅ Si un personaje con `hp.current = 0` recibe curación, automáticamente vuelve a estar vivo (correcto)
- ✅ Distinción básica entre inconsciente (`isDead = false`) y muerto (`isDead = true`) implementada
- ✅ Regla de muerte masiva implementada
- ❌ **No hay tiradas de salvación de muerte** (death saving throws)
- ❌ **No hay sistema de estabilización** (un compañero puede estabilizar sin curar)
- ❌ **No hay tracking de death saves** (successes/failures)

---

## Reglas Oficiales de D&D 5e

### 1. 0 HP = Inconsciente
- El personaje cae inconsciente
- No puede actuar, moverse, o hablar
- Está **tendido** (prone)

### 2. Death Saving Throws
- Al inicio de cada turno (si está inconsciente), el personaje hace una tirada de salvación de muerte
- **1d20 sin modificadores** (solo el dado)
- **Éxito (10 o más):** Cuenta como 1 éxito
- **Fallo (9 o menos):** Cuenta como 1 fallo
- **Crítico (20):** Recupera 1 HP inmediatamente (revive)
- **Pifia (1):** Cuenta como 2 fallos
- **3 éxitos:** El personaje se estabiliza (sigue inconsciente pero no hace más death saves)
- **3 fallos:** El personaje muere permanentemente

### 3. Estabilización
- Otro personaje puede usar una acción para estabilizar (tirada de Medicina DC 10)
- Si tiene un kit médico, la tirada tiene ventaja
- Un personaje estabilizado sigue inconsciente pero no hace más death saves
- Un personaje estabilizado recupera 1 HP después de 1d4 horas

### 4. Curación
- Cualquier curación (incluso 1 HP) hace que el personaje recupere consciencia inmediatamente
- El personaje puede actuar normalmente en su siguiente turno

### 5. Muerte Permanente
- 3 fallos en death saving throws
- Daño masivo: Si el daño recibido reduce HP a un valor negativo igual o mayor a -HP máximo, muerte instantánea (ya implementado)

---

## Implementación Requerida

### Fase 1: Extender interfaces y schemas

**Archivo:** `src/lib/types.ts` o `src/lib/schemas.ts`

```typescript
interface Character {
  // ... existing fields
  deathSaves?: {
    successes: number;  // 0-3
    failures: number;    // 0-3
    isStabilized: boolean;  // Si está estabilizado (no hace más saves)
  };
  // isDead ya existe (implementado en sistema de inconsciencia)
}
```

### Fase 2: Death Saving Throws en combate

**Archivo:** `src/ai/tools/combat-manager.ts`

Al inicio del turno de un personaje inconsciente:

```typescript
if (combatant.hp.current <= 0 && !combatant.deathSaves?.isStabilized && !combatant.isDead) {
  const deathSave = await diceRollerTool({
    roller: combatant.characterName,
    rollNotation: '1d20',
    description: 'Tirada de salvación de muerte',
  });
  
  if (deathSave.totalResult === 20) {
    // Crítico: revive con 1 HP
    combatant.hp.current = 1;
    combatant.deathSaves = { successes: 0, failures: 0, isStabilized: false };
    messages.push({ sender: 'DM', content: `${combatant.characterName} recupera consciencia milagrosamente!` });
  } else if (deathSave.totalResult === 1) {
    // Pifia: 2 fallos
    combatant.deathSaves.failures += 2;
  } else if (deathSave.totalResult >= 10) {
    // Éxito
    combatant.deathSaves.successes += 1;
  } else {
    // Fallo
    combatant.deathSaves.failures += 1;
  }
  
  // Verificar si muere o se estabiliza
  if (combatant.deathSaves.failures >= 3) {
    combatant.isDead = true;
    messages.push({ sender: 'DM', content: `${combatant.characterName} ha muerto.` });
  } else if (combatant.deathSaves.successes >= 3) {
    combatant.deathSaves.isStabilized = true;
    messages.push({ sender: 'DM', content: `${combatant.characterName} se estabiliza pero sigue inconsciente.` });
  }
}
```

### Fase 3: Acción de estabilización

**Archivos:** `src/ai/flows/action-interpreter.ts`, `src/ai/tools/combat-manager.ts`

- `actionInterpreter` debe reconocer: "estabilizo a Merryl", "uso kit médico en Elara"
- `combat-manager.ts` debe procesar estabilización (tirada de Medicina DC 10)
- Si tiene kit médico, aplicar ventaja a la tirada

### Fase 4: UI para mostrar death saves

**Archivos:** `src/components/game/dice-roll-result.tsx`, `src/components/game/character-sheet.tsx`

- Mostrar estado de death saves (éxitos/fallos) en UI
- Mostrar tiradas de salvación de muerte en panel de Tiradas
- Indicar visualmente si un personaje está estabilizado

### Fase 5: Inicialización y reset de death saves

**Archivo:** `src/ai/tools/combat-manager.ts`

- Inicializar `deathSaves` cuando un personaje cae inconsciente
- Resetear `deathSaves` cuando un personaje recupera consciencia
- Resetear `deathSaves` cuando un personaje muere permanentemente

---

## Archivos a Modificar

- `src/lib/types.ts` o `src/lib/schemas.ts` (interfaces `Character`)
- `src/ai/tools/combat-manager.ts` (lógica de death saving throws, estabilización)
- `src/ai/flows/action-interpreter.ts` (reconocer acciones de estabilización)
- `src/components/game/dice-roll-result.tsx` (mostrar death saving throws)
- `src/components/game/character-sheet.tsx` (mostrar estado de death saves en UI)

---

## Complejidad Estimada

- Extensión de interfaces: ~1 hora
- Death saving throws en combate: ~4-5 horas
- Acción de estabilización: ~3-4 horas
- UI para death saves: ~2-3 horas
- Testing exhaustivo: ~4-5 horas
- **Total:** 15-20 horas

---

## Prioridad

🟡 **MEDIA**
- El sistema actual funciona (no es bloqueante)
- Importante para fidelidad a D&D 5e
- Añade tensión dramática y opciones tácticas
- **Recomendación:** Implementar después de Issue #22 (Saving Throws completos) y Issue #21 (Refactoring de combat-manager)

---

## Relación con Otros Planes/Issues

- **Issue #27:** Verificación de muerte (base para este sistema) - ✅ RESUELTO
- **Issue #22:** Sistema de saving throws (mecánica similar) - 📝 PENDIENTE
- **Issue #21:** Refactoring de combat-manager (debe hacerse antes) - 📝 PENDIENTE
- **Sistema de Inconsciencia y Muerte Masiva:** Ya implementado, este plan lo extiende

---

## Consideraciones Adicionales

- Death saving throws solo se hacen en combate (o cada 6 segundos fuera de combate)
- Un personaje estabilizado puede recibir curación para despertarlo
- La muerte masiva (daño >= HP máximo negativo) es muerte instantánea (ya implementado)
- Los compañeros AI deberían poder estabilizar a otros si tienen kit médico
- La UI debe mostrar el estado de death saves (éxitos/fallos) de forma clara

---

## Beneficios de Implementar

1. **Fidelidad D&D 5e:** Sistema completo según reglas oficiales
2. **Tensión dramática:** Los jugadores verán los death saves en tiempo real
3. **Opciones tácticas:** Estabilizar vs curar es una decisión estratégica
4. **Narrativa:** Mejora la narrativa de combate y revivencia
5. **Realismo:** Refleja la mecánica del juego de mesa

---

## Referencias

- Issue #27: Verificación de muerte de personajes (resuelto)
- Sistema de Inconsciencia y Muerte Masiva (implementado)
- [D&D 5e SRD - Dropping to 0 Hit Points](https://www.dndbeyond.com/sources/basic-rules/combat#Droppingto0HitPoints)

