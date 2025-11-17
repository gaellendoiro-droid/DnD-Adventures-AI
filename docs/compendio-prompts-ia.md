# Compendio de Prompts de IA

Este documento contiene todos los prompts que utiliza la aplicación para sus diferentes módulos de IA. Este compendio sirve como referencia centralizada para entender cómo funciona cada módulo de IA y facilitar futuras mejoras y mantenimiento.

**Última actualización:** 2025-11-16

---

## 📋 Índice

- [Módulos de IA](#módulos-de-ia)
  - [Narrative Expert](#narrative-expert)
  - [Combat Manager](#combat-manager)
  - [Companion Expert](#companion-expert)
  - [Companion Tactician](#companion-tactician)
  - [Enemy Tactician](#enemy-tactician)
  - [Combat Initiation Expert](#combat-initiation-expert)
  - [Action Interpreter](#action-interpreter)
- [Notas de Mantenimiento](#notas-de-mantenimiento)

---

## Módulos de IA

### Narrative Expert

**Ubicación:** `src/ai/tools/narrative-expert.ts`

**Propósito:** Genera narrativas contextuales y descripciones del mundo del juego basándose en el estado actual de la partida.

**Estado:** Documentación pendiente - Los prompts específicos deben ser extraídos del código fuente.

**Referencia:** [Notas de Gael - #48](../notas/Notas%20de%20Gael.md)

---

### Combat Manager

**Ubicación:** `src/ai/tools/combat-manager.ts`

**Propósito:** Gestiona el flujo de combate, procesa turnos, y coordina las acciones de todos los combatientes.

**Estado:** Documentación pendiente - Los prompts específicos deben ser extraídos del código fuente.

**Nota:** Este módulo ha sido refactorizado recientemente y puede tener múltiples prompts para diferentes situaciones de combate.

---

### Companion Expert

**Ubicación:** `src/ai/tools/companion-expert.ts`

**Propósito:** Genera reacciones y comentarios de los compañeros del jugador basándose en el contexto de la situación.

**Estado:** Documentación pendiente - Los prompts específicos deben ser extraídos del código fuente.

**Referencia:** [Notas de Gael - #48](../notas/Notas%20de%20Gael.md)

---

### Companion Tactician

**Ubicación:** `src/ai/tools/companion-tactician.ts`

**Propósito:** Decide las acciones tácticas de los compañeros durante el combate.

**Estado:** Documentación pendiente - Los prompts específicos deben ser extraídos del código fuente.

**Nota:** Este módulo incluye lógica para seleccionar objetivos, elegir hechizos, y determinar acciones tácticas.

---

### Enemy Tactician

**Ubicación:** `src/ai/tools/enemy-tactician.ts`

**Propósito:** Decide las acciones tácticas de los enemigos durante el combate.

**Estado:** Documentación pendiente - Los prompts específicos deben ser extraídos del código fuente.

**Nota:** Este módulo incluye lógica para seleccionar objetivos, elegir ataques, y determinar acciones tácticas de los enemigos.

---

### Combat Initiation Expert

**Ubicación:** `src/ai/tools/combat-initiation-expert.ts`

**Propósito:** Determina qué combatientes participan en un combate cuando se inicia.

**Estado:** Documentación pendiente - Los prompts específicos deben ser extraídos del código fuente.

---

### Action Interpreter

**Ubicación:** `src/ai/flows/action-interpreter.ts`

**Propósito:** Interpreta las acciones del jugador y determina qué herramienta debe procesarlas.

**Estado:** Documentación pendiente - Los prompts específicos deben ser extraídos del código fuente.

---

## Notas de Mantenimiento

### Tarea Pendiente

**Issue:** [Notas de Gael - #48](../notas/Notas%20de%20Gael.md)

**Descripción:** Documentar un compendio de todos los prompts que está usando la aplicación para sus diferentes módulos de IA.

**Estado:** 📝 **EN PROGRESO** - Este documento ha sido creado como estructura base. Los prompts específicos deben ser extraídos del código fuente y documentados aquí.

**Próximos Pasos:**
1. Revisar cada módulo de IA en el código fuente
2. Extraer los prompts completos con sus variables y contexto
3. Documentar cada prompt con:
   - Propósito específico
   - Variables utilizadas
   - Ejemplos de uso
   - Notas sobre comportamiento esperado
4. Organizar por módulo y funcionalidad
5. Añadir ejemplos de prompts generados en diferentes situaciones

**Beneficios:**
- Facilita el mantenimiento y mejoras de los prompts
- Permite entender mejor cómo funciona cada módulo de IA
- Ayuda a identificar inconsistencias o áreas de mejora
- Sirve como documentación para nuevos desarrolladores

---

**Nota:** Este documento es un trabajo en progreso. Los prompts específicos se añadirán a medida que se extraigan del código fuente.

