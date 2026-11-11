# Plan de Acción: Refactorización de la Arquitectura de Esquemas

Este documento detalla los pasos para refactorizar y robustecer la arquitectura de esquemas de datos y tipos, con el objetivo de eliminar duplicaciones, inconsistencias y bugs silenciosos de validación.

---

### ⚛️ **Paso 1: Unificar Tipos y Esquemas (Fuente Única de la Verdad)**

**Objetivo:** Eliminar la duplicación manual de tipos entre `src/lib/types.ts` y `src/lib/schemas.ts`, convirtiendo los esquemas de Zod en la única fuente de la verdad.

- [x] **En `src/lib/types.ts`:**
    - [x] Importar los esquemas de Zod necesarios desde `src/lib/schemas.ts` (ej: `CharacterSchema`, `PartySchema`).
    - [x] Reemplazar las interfaces manuales de TypeScript por tipos inferidos de Zod.
        - **Ejemplo:** `export interface Character { ... }` se convertirá en `export type Character = z.infer<typeof CharacterSchema>;`.
    - [x] Realizar esta conversión para todas las estructuras de datos duplicadas.

**Verificación:**
- [x] La aplicación debe compilar sin errores de TypeScript. El Intellisense y el chequeo de tipos deben seguir funcionando en todo el frontend.

---

### 📁 **Paso 2: Estandarizar las Rutas de Importación de Esquemas**

**Objetivo:** Eliminar el riesgo de fallos de validación silenciosos asegurando que todos los módulos de la IA importen los esquemas de la misma manera.

- [x] **En `src/ai/tools/combat-manager.ts`:**
    - [x] Reemplazar todas las importaciones de esquemas relativas (ej: `../flows/schemas`) por la ruta absoluta con alias (`@/ai/flows/schemas`).

- [x] **En `src/ai/flows/action-interpreter.ts`:**
    - [x] Reemplazar la importación relativa (`./schemas`) por la ruta absoluta con alias (`@/ai/flows/schemas`).

- [x] **Revisión Exhaustiva:**
    - [x] Inspeccionar todos los demás archivos dentro de `src/ai/` (`game-coordinator.ts`, `companion-expert.ts`, etc.) y estandarizar cualquier importación de esquemas que aún sea relativa.

**Verificación:**
- [x] La aplicación debe compilar y ejecutarse sin errores. Esta es la prueba principal, ya que el bug que buscamos es un fallo de ejecución, no de compilación.

---

### 🧱 **Paso 3: Centralizar el `GameState`**

**Objetivo:** Crear un esquema único para el estado del juego, eliminando la necesidad de ensamblarlo "al vuelo" en el frontend y permitiendo una validación más robusta.

- [x] **En `src/ai/flows/schemas.ts`:**
    - [x] Crear y exportar un nuevo esquema `GameStateSchema`.
    - [x] Este esquema debe contener todos los campos que definen el estado de una partida (`party`, `locationId`, `inCombat`, `turnIndex`, `initiativeOrder`, `enemies`, etc.).

- [x] **En `src/components/game/game-view.tsx`:**
    - [x] Importar el `GameStateSchema`.
    - [x] En `handleSendMessage`, antes de llamar a `processPlayerAction`, usar `GameStateSchema.parse(actionInput)` para validar el objeto que se va a enviar.

**Verificación:**
- [x] La aplicación debe funcionar como antes. La principal diferencia es que si ahora olvidamos pasar un campo desde el `game-view`, la validación de Zod fallará en el **frontend** con un error claro en la consola, en lugar de causar un fallo silencioso en el backend.
- [x] Iniciar un combate para confirmar que el objeto `actionInput`, que ahora incluye `initiativeOrder` y `turnIndex`, pasa la validación sin problemas.
