# Issues Tracker

Este directorio contiene el seguimiento de todos los problemas, bugs y mejoras identificados durante el desarrollo del proyecto.

**Fecha de inicio:** Durante el saneamiento general de la aplicación (2025-11-10)  
**Última actualización:** 2025-11-15

---

## 📊 Resumen Estadístico

- **Total de issues:** 39
- **Issues corregidos:** 20 (51%)
- **Issues pendientes:** 19 (49%)

### Por Prioridad

**Issues Corregidos:**
- 🔴 PMA (Prioridad Muy Alta): 8 issues
- 🟡 PA (Prioridad Alta): 2 issues
- 🟢 PM (Prioridad Media): 9 issues
- ⚪ PB (Prioridad Baja): 1 issue

**Issues Pendientes:**
- 🔴 PMA (Prioridad Muy Alta): 0 issues
- 🟡 PA (Prioridad Alta): 4 issues (Issue #50, #51, #35, #36, #37)
- 🟢 PM (Prioridad Media): 9 issues
- ⚪ PB (Prioridad Baja): 3 issues
- ⚫ PMB (Prioridad Muy Baja): 1 issue

---

## 📋 Leyenda de Prioridades

- **🔴 PMA (Prioridad Muy Alta):** Críticos - Deben corregirse inmediatamente
- **🟡 PA (Prioridad Alta):** Advertencias - Deben corregirse pronto
- **🟢 PM (Prioridad Media):** Mejoras - Recomendadas pero no críticas
- **⚪ PB (Prioridad Baja):** Mejoras menores - Opcionales
- **⚫ PMB (Prioridad Muy Baja):** Mejoras muy menores - Baja prioridad

---

## 📁 Estructura de Archivos

- **[pendientes.md](./pendientes.md)** - Issues activos que requieren atención (20 issues)
- **[corregidos.md](./corregidos.md)** - Issues resueltos y verificados (18 issues) - Histórico

---

## 🔗 Enlaces Rápidos

### Issues Pendientes por Prioridad

**🟡 Prioridad Alta (PA):**
- [Issue #50: Daño de crítico no se duplica correctamente](./pendientes.md#issue-50-daño-de-crítico-no-se-duplica-correctamente-advertencia) *[Detectado en testing]*
- [Issue #51: Mensaje "ha matado" incorrecto cuando personaje ya estaba inconsciente](./pendientes.md#issue-51-mensaje-ha-matado-incorrecto-cuando-personaje-ya-estaba-inconsciente-advertencia) *[Detectado en testing]*
- [Issue #35: Orden incorrecto de mensajes cuando personaje cae a 0 HP](./pendientes.md#issue-35-orden-incorrecto-de-mensajes-cuando-personaje-cae-a-0-hp-advertencia) *[Detectado en testing]*
- [Issue #36: Mensaje "ha matado" cuando personaje está inconsciente](./pendientes.md#issue-36-mensaje-ha-matado-cuando-personaje-está-inconsciente-no-muerto-advertencia) *[Detectado en testing]*
- [Issue #37: Mensaje "está muerto" cuando personaje está inconsciente](./pendientes.md#issue-37-mensaje-está-muerto-cuando-personaje-está-inconsciente-advertencia) *[Detectado en testing]*

**🟢 Prioridad Media (PM):**
- [Issue #38: Auto-redirección de ataque a enemigo diferente cuando target está muerto](./pendientes.md#issue-38-auto-redirección-de-ataque-a-enemigo-diferente-cuando-target-está-muerto-mejora--decisión-de-diseño) *[Detectado en testing - Decisión de diseño pendiente]*
- [Issue #6: Manejo de errores en `handleLoadAdventure`](./pendientes.md#issue-6-manejo-de-errores-en-handleloadadventure)
- [Issue #7: Advertencia de Content Security Policy](./pendientes.md#issue-7-advertencia-de-content-security-policy-sobre-eval)
- [Issue #8: Fallos al cargar aventura desde JSON](./pendientes.md#issue-8-fallos-al-cargar-aventura-desde-json)
- [Issue #15: Mejora de búsqueda en D&D API](./pendientes.md#issue-15-mejora-de-búsqueda-en-dd-api-para-monstruos-no-mapeados)
- [Issue #16: Gestión de nombres de múltiples monstruos](./pendientes.md#issue-16-gestión-de-nombres-de-múltiples-monstruos-debería-estar-en-un-módulo-separado)
- [Issue #21: Código duplicado en `combat-manager.ts`](./pendientes.md#issue-21-código-duplicado-en-combat-managerts-para-procesamiento-de-rolls-deuda-técnica)
- [Issue #22: Sistema completo de Saving Throws](./pendientes.md#issue-22-sistema-completo-de-saving-throws-tiradas-de-salvación-del-objetivo-feature-incompleta)
- [Issue #28: Visualización de barra de vida en panel Grupo](./pendientes.md#issue-28-visualización-de-barra-de-vida-en-panel-grupo-advertencia)
- [Issue #29: Stats de enemigos incorrectos en combate](./pendientes.md#issue-29-stats-de-enemigos-incorrectos-en-combate-advertencia)
- [Issue #30: Errores de conexión a APIs con logs verbosos](./pendientes.md#issue-30-errores-de-conexión-a-apis-con-logs-verbosos-advertencia)

**⚪ Prioridad Baja (PB):**
- [Issue #25: Logs del navegador colapsados por defecto](./pendientes.md#issue-25-logs-del-navegador-colapsados-por-defecto-advertencia)
- [Issue #31: Gestión de ataques múltiples en combate](./pendientes.md#issue-31-gestión-de-ataques-múltiples-en-combate-mejora)
- [Issue #32: Paneles de combate se limpian de forma inconsistente](./pendientes.md#issue-32-paneles-de-combate-se-limpian-de-forma-inconsistente-mejora)

**⚫ Prioridad Muy Baja (PMB):**
- [Issue #33: Logs muestran turnIndex cuando inCombat es false](./pendientes.md#issue-33-logs-muestran-turnindex-cuando-incombat-es-false-mejora)

---

## 📝 Notas

- Los números de issue se mantienen como referencia histórica del orden en que fueron añadidos
- Las fechas de creación y corrección se basan en el contexto del desarrollo y las versiones del CHANGELOG
- Para más detalles sobre cada issue, consultar el historial de commits y el [CHANGELOG.md](../../CHANGELOG.md)

---

## 🔄 Actualización

Este tracker se actualiza cuando:
- Se identifica un nuevo issue
- Un issue pendiente se resuelve (se mueve de `pendientes.md` a `corregidos.md`)
- Se actualiza el estado o información de un issue existente

