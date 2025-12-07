# Test Manual - Fase 2: Combat Initiation Service

**Fecha:** 2025-12-04  
**Aventura de Prueba:** `JSON_adventures/test/ambush_test.json`

## Checklist de Pruebas

### ✅ 1. Test de Emboscada (Ambush)

**Ubicación:** Sala Segura → Norte (Sala de la Emboscada)

**Pasos:**
1. Cargar la aventura `test-ambush`
2. Desde la Sala Segura, ir al norte (Sala de la Emboscada)
3. **Verificar:**
   - [ ] El combate se inicia automáticamente
   - [ ] El mensaje de emboscada aparece: "¡De repente, varios goblins saltan de las sombras gritando!"
   - [ ] `surpriseSide` es `'enemy'` (los enemigos sorprenden al jugador)
   - [ ] El jugador y sus compañeros están marcados como sorprendidos
   - [ ] Los primeros turnos del jugador/compañeros se saltan (no pueden actuar)
   - [ ] Los goblins actúan primero

**Resultado Esperado:**
- Combate inicia con sorpresa del lado enemigo
- El jugador no puede actuar en el primer turno

---

### ✅ 2. Test de Mimic

**Ubicación:** Sala Segura → Este (Sala del Tesoro)

**Pasos:**
1. Desde la Sala Segura, ir al este (Sala del Tesoro)
2. Interactuar con el cofre (abrir o tocar)
3. **Verificar:**
   - [ ] El combate se inicia automáticamente
   - [ ] El mensaje del mimic aparece: "¡Cuando tocas la tapa del cofre, la madera se vuelve pegajosa y una boca llena de dientes afilados se abre para morderte! ¡Es un mímico!"
   - [ ] `surpriseSide` es `'enemy'` (el mimic sorprende al jugador)
   - [ ] El mimic está revelado (ya no está `hidden`)
   - [ ] El jugador y sus compañeros están marcados como sorprendidos
   - [ ] El mimic actúa primero

**Resultado Esperado:**
- Combate inicia con sorpresa del lado enemigo
- El mimic se revela correctamente
- El jugador no puede actuar en el primer turno

---

### ✅ 3. Test de Ataque Sorpresa del Jugador

**Ubicación:** Sala Segura → Sur (Sala del Guardián) - Después de abrir la puerta

**Pasos:**
1. Desde la Sala Segura, abrir la puerta del sur
2. Entrar a la Sala del Guardián (debería haber un goblin visible)
3. **Sin entrar en combate automático**, atacar al goblin directamente (ej: "Ataco al goblin")
4. **Verificar:**
   - [ ] El combate se inicia
   - [ ] `surpriseSide` es `'player'` (el jugador sorprende al enemigo)
   - [ ] El goblin está marcado como sorprendido
   - [ ] El goblin no puede actuar en su primer turno
   - [ ] El jugador actúa primero

**Resultado Esperado:**
- Combate inicia con sorpresa del lado del jugador
- El enemigo no puede actuar en el primer turno

---

### ✅ 4. Test de Proximidad (Sin Sorpresa)

**Ubicación:** Sala Segura → Sur (Sala del Guardián) - Después de abrir la puerta

**Pasos:**
1. Desde la Sala Segura, abrir la puerta del sur
2. Entrar a la Sala del Guardián
3. **Verificar:**
   - [ ] Si hay un goblin visible, el combate puede iniciarse automáticamente por proximidad
   - [ ] `surpriseSide` es `undefined` (no hay sorpresa)
   - [ ] El combate inicia normalmente sin sorpresa
   - [ ] La iniciativa se determina normalmente

**Resultado Esperado:**
- Combate inicia sin sorpresa cuando hay enemigos visibles

---

## Notas de Verificación

### Logs a Revisar

En la consola del navegador o del servidor, buscar:
- `CombatInitiationService: Preparing combat initiation. Type: ...`
- `Dynamic Combat Triggered! Reason: ...`
- `Player Surprise Attack detected`
- `surpriseSide: 'player' | 'enemy' | undefined`

### Verificaciones Técnicas

1. **Enemigos Preparados:**
   - Los enemigos deben estar normalizados (hp: {current, max})
   - Los mimics deben estar revelados (disposition: 'hostile')
   - Los enemigos muertos deben estar filtrados

2. **Combatant IDs:**
   - Deben incluir todos los miembros del grupo
   - Deben incluir todos los enemigos relevantes
   - No deben incluir enemigos muertos

3. **Estado de Puertas:**
   - Las puertas abiertas deben reflejarse correctamente en el estado

---

## Resultados

- [ ] Test 1 (Emboscada): ✅ / ❌
- [ ] Test 2 (Mimic): ✅ / ❌
- [ ] Test 3 (Ataque Sorpresa): ✅ / ❌
- [ ] Test 4 (Proximidad): ✅ / ❌

**Observaciones:**
_(Anotar aquí cualquier comportamiento inesperado o problemas encontrados)_

