# NOTAS DE DESARROLLO - D&D ADVENTURES AI

**Última actualización:** [23/01/2025] - Entradas #1-5 registradas en issues tracker y roadmap

## 📝 PROPÓSITO DE ESTE DOCUMENTO

Este documento sirve como **punto de entrada rápida e informal** para el desarrollador. Es un área de **brainstorming general** donde se pueden anotar rápidamente:

- **Issues detectados** (bugs, problemas)
- **Nuevas funcionalidades** propuestas
- **Revisiones** de funcionalidades existentes
- **Ideas rápidas** de desarrollo
- **Notas informales** de desarrollo

### 🔄 Flujo de Información

Este documento es **intencionalmente informal** y sirve como "borrador" antes de formalizar en el sistema oficial de documentación:

1. **Detección/Idea** → Se anota aquí rápidamente (informal)
2. **Formalización** → Se mueve al sistema oficial correspondiente:
   - **Issues** → `docs/tracking/issues/pendientes.md` (documentación formal)
   - **Nuevas funcionalidades** → `docs/roadmap.md` o `docs/planes-desarrollo/`
   - **Revisiones** → `docs/roadmap.md` o issues tracker

### ✅ Proceso Recomendado

- **Anotar rápidamente** ideas, issues o funcionalidades aquí
- **Revisar periódicamente** este documento
- **Formalizar** items relevantes moviéndolos al sistema oficial correspondiente
- **Mantener este documento** como área de trabajo temporal

**Nota:** La información en este documento es informal. Para documentación oficial y formal, consulta el sistema de documentación correspondiente (issues tracker, roadmap, planes de desarrollo).

---

## LEYENDA DE CLASIFICACIÓN

### TIPOS DE IDEA:
- `[ISSUE]` = Bug o problema que necesita corrección
- `[NUEVA FUNCIONALIDAD]` = Feature nueva a implementar
- `[REVISION]` = Revisar/mejorar funcionalidad existente
- `[DOCUMENTACION]` = Tarea de documentación
- `[TESTING]` = Tarea relacionada con pruebas

### PRIORIDADES:
- `[PMA]` = Prioridad Muy Alta
- `[PA]` = Prioridad Alta
- `[PM]` = Prioridad Media
- `[PB]` = Prioridad Baja
- `[PMB]` = Prioridad Muy Baja

### CATEGORÍAS:
- `[INTERFAZ DE USUARIO]` = UI/UX, componentes visuales
- `[SISTEMA DE COMBATE]` = Mecánicas de combate, turnos, acciones
- `[SISTEMA DE PERSONAJES]` = Fichas, compañeros, estados de personajes
- `[SISTEMA DE AVENTURAS Y DATOS]` = Aventuras JSON, datos, APIs
- `[CALIDAD Y PULIDO]` = Testing, corrección ortográfica, logs

### ESTADO DE DOCUMENTACIÓN:
- `[EN ROADMAP]` = Ya documentado en docs/roadmap.md
- `[EN PLAN]` = Ya documentado en docs/planes-desarrollo/
- `[SIN DOCUMENTAR]` = Aún no está en documentación oficial

---

## ISSUES (Bugs/Problemas)

### PRIORIDAD MUY ALTA

_(No hay issues críticos pendientes en este momento)_

### PRIORIDAD ALTA

_(No hay issues de prioridad alta pendientes en este momento)_

### PRIORIDAD MEDIA

---

## NUEVAS FUNCIONALIDADES

### PRIORIDAD ALTA

_(No hay nuevas funcionalidades de prioridad alta pendientes en este momento)_

### PRIORIDAD MEDIA

_(No hay nuevas funcionalidades de prioridad media pendientes en este momento)_

### PRIORIDAD BAJA

_(No hay nuevas funcionalidades de prioridad baja pendientes en este momento)_

### PRIORIDAD MUY BAJA

_(No hay nuevas funcionalidades de prioridad muy baja pendientes en este momento)_

---

## REVISIONES (Mejoras/Análisis)

### PRIORIDAD MUY ALTA

_(No hay revisiones de prioridad muy alta pendientes en este momento)_

### PRIORIDAD ALTA

_(No hay revisiones de prioridad alta pendientes en este momento)_

### PRIORIDAD MEDIA

_(No hay revisiones de prioridad media pendientes en este momento)_

### PRIORIDAD BAJA

_(No hay revisiones de prioridad baja pendientes en este momento)_

---

## TESTING

*(Ninguna en esta sección)*

---

## DOCUMENTACION

*(Ninguna en esta sección)*

---

## NOTAS FINALES

→ Para ver el estado actual del desarrollo, consultar:
- `CHANGELOG.md` (cambios implementados)
- `docs/roadmap.md` (mejoras planificadas a largo plazo)
- `docs/planes-desarrollo/` (planes activos y completados)
- `docs/tracking/issues/README.md`

→ Items marcados con `[EN PLAN]` están ya documentados exhaustivamente en su ubicación correspondiente.

→ Este documento es para notas rápidas y brainstorming. Para planificación formal, usar los documentos del proyecto.

→ Clasificación de ideas:
1. Tipo de idea (ISSUE, NUEVA FUNCIONALIDAD, REVISION, DOCUMENTACION, TESTING)
2. Prioridad (PMA, PA, PM, PB, PMB)
3. Categoría dentro de la aplicación
4. Estado de documentación oficial (`[EN ROADMAP]`, `[EN PLAN]`, `[SIN DOCUMENTAR]`)

---

## NUEVAS IDEAS Y FALLOS ENCONTRADOS

Esta sección es para apuntar ideas rápidas, fallos detectados y notas informales antes de clasificarlas formalmente en las secciones correspondientes (ISSUES, NUEVAS FUNCIONALIDADES, REVISIONES, etc.).

Al clasificar un item de esta sección, debe moverse a su sección correspondiente y eliminarse de aquí, manteniendo esta sección como un área de trabajo temporal.

1. ISSUE: por algún motivo el DM se refiere a Merryl en femenino cuando en su ficha dice que es varón. (PA)

2. ISSUE: Gestionar los errores de quota exceeded de Eleven Labs y Gemini. (PMA)

3. REVISION: revisar y ajustar los archivos de audio (musica y ambiente) según el nuevo sistema. (PA)

4. FUTURA MEJORA: En las narraciones podemos hacer que los nombres de los PNJs o lugares sean clicables y se muestre una ilustración del personaje o lugar si la hay disponible. (PA)

5. REVISION: revisar el cálculo de las tiradas de dados de daño en críticos. Parece que no se aplicand los dobles dados. Al menos con Merryl. (PMA)

6. REVISION: revisar el sistema de log para que sean algo más claros. Después de la etiqueta INFO o DEBUG o la que sea debería venir el nombre del módulo responsable de log. (PA)

7. REVISION: revisión completa del sistema de combate despues de haber añadido nuevas funcionalidades como: sistema de movimiento (exploración y dungeon, aún falta el tático), sistema de sorpresa al iniciar combates, enemigos ocultos, apertura de puertas, etc. El sistema ahora parece demasiado caótico. (PMA) **[EN PLAN: docs/planes-desarrollo/en-curso/refactorizacion-modularidad-sistema-combate.md]**
    - ✅ **Fase 1 Completada (2025-12-04):** EnemyStateManager y SurpriseManager implementados
    - ✅ **Fase 2 Completada (2025-12-04):** CombatInitiationService implementado
    - ✅ **Fase 2.5 Completada (2025-12-05):** Máquina de Estados Finita (FSM) completa implementada
      - ✅ Estados explícitos y transiciones controladas
      - ✅ Frontend simplificado para depender solo de `combatPhase` (eliminados flags redundantes)
      - ✅ Resueltos problemas de sincronización, bucles infinitos y pérdida de fase
      - ✅ Sistema robusto que funciona incluso si la fase se pierde durante serialización
      - ✅ ~100 líneas de código complejo eliminadas del frontend
    - 🔄 **Fase 3 Pendiente:** División de narrative-turn-manager.ts

8. ISSUE: en un combate he recibido este mensaje de uno de mis compañeros "Merryl @ 19:26 Joder, qué ambientazo... se podría cortar la tensión con un cuchillo. ¿Alguien ha traído pan?". Hay que evitar que se usen este tipo de palabra tanto en los compañeros como con el DM. (PB)

9. REVISION: Las respuestas de DM se siguen sintiendo muy lentas. Estudiar la posibilidad de mantener la comunicación con la API abierta para no tener que abrirla en cada llamada. Sopesar la posibilidad de que el DM escriba en streaming sus mensajes. (PA)









