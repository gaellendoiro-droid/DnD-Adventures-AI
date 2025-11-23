# Issues Tracker

Este directorio contiene el seguimiento de todos los problemas, bugs y mejoras identificados durante el desarrollo del proyecto.

**Fecha de inicio:** Durante el saneamiento general de la aplicación (2025-11-10)  
**Última actualización:** 2025-01-23 (Issue #125 resuelto y movido a corregidos)

---

## 📊 Resumen Estadístico

- **Total de issues:** 77
- **Issues corregidos:** 54 (70%)
- **Issues pendientes:** 23 (30%)

### Por Prioridad

**Issues Corregidos:**
- 🔴 PMA (Prioridad Muy Alta): 7 issues (Issues #81, #116, #117, #120, #121, #123, #124)
- 🟡 PA (Prioridad Alta): 10 issues (Issues #34, #51, #53, #68, #75, #79, #94, #118, #122, #125)
- 🟢 PM (Prioridad Media): 31 issues (incluye Issue #29)
- ⚪ PB (Prioridad Baja): 6 issues

**Issues Pendientes:**
- 🔴 PMA (Prioridad Muy Alta): 1 issue (Issue #126)
- 🟡 PA (Prioridad Alta): 2 issues (Issues #93, #115)
- 🟢 PM (Prioridad Media): 15 issues (incluye Issues #6, #7, #8, #15, #16, #21, #22, #28, #30, #38, #65, #77, #80, #82, #92, #119)
- ⚪ PB (Prioridad Baja): 3 issues (Issues #25, #31, #32)
- ⚫ PMB (Prioridad Muy Baja): 1 issue (Issue #33)

---

## 📋 Leyenda de Prioridades

- **🔴 PMA (Prioridad Muy Alta):** Críticos - Deben corregirse inmediatamente
- **🟡 PA (Prioridad Alta):** Advertencias - Deben corregirse pronto
- **🟢 PM (Prioridad Media):** Mejoras - Recomendadas pero no críticas
- **⚪ PB (Prioridad Baja):** Mejoras menores - Opcionales
- **⚫ PMB (Prioridad Muy Baja):** Mejoras muy menores - Baja prioridad

---

## 📁 Estructura de Archivos

- **[pendientes.md](./pendientes.md)** - Issues activos que requieren atención (23 issues)
- **[corregidos.md](./corregidos.md)** - Issues resueltos y verificados (54 issues) - Histórico

---

## 🔗 Enlaces Rápidos

### Issues Pendientes por Prioridad

**🔴 Prioridad Muy Alta (PMA) - CRÍTICOS:**
- [Issue #126: Revisión completa del sistema de carga de aventuras JSON e inicio de partida](./pendientes.md#issue-126-revisión-completa-del-sistema-de-carga-de-aventuras-json-e-inicio-de-partida-crítico) *[PENDIENTE - Crítico para experiencia inicial]*

**🟡 Prioridad Alta (PA):**
- [Issue #93: Manejo de errores cuando se agotan los reintentos (especialmente errores 503 de sobrecarga)](./pendientes.md#issue-93-manejo-de-errores-cuando-se-agotan-los-reintentos-especialmente-errores-503-de-sobrecarga-advertencia) *[PENDIENTE - Mejora de experiencia de usuario]*
- [Issue #115: Validación de inventario al usar armas u objetos](./pendientes.md#issue-115-validación-de-inventario-al-usar-armas-u-objetos-advertencia) *[POSPUESTO - Plan creado pero pospuesto]*

**🟢 Prioridad Media (PM):**
- [Issue #119: Testeo profundo del sistema de combate después de refactorización](./pendientes.md#issue-119-testeo-profundo-del-sistema-de-combate-después-de-refactorización-verde-testing) *[PENDIENTE - Testing necesario]*
- [Issue #92: Identificación incorrecta de enemigo en combate](./pendientes.md#issue-92-identificación-incorrecta-de-enemigo-en-combate-mejora) *[PENDIENTE - Mejora de precisión]*
- [Issue #77: Mensajes lentos al avanzar turno cuando el siguiente personaje está muerto o inconsciente](./pendientes.md#issue-77-mensajes-lentos-al-avanzar-turno-cuando-el-siguiente-personaje-está-muerto-o-inconsciente-mejora) *[PENDIENTE - Mejora de UX]*
- [Issue #80: Permitir múltiples acciones del jugador en un turno](./pendientes.md#issue-80-permitir-múltiples-acciones-del-jugador-en-un-turno-movimientoacción-adicional-mejora) *[PENDIENTE - Mejora futura]*
- [Issue #38: Auto-redirección de ataque a enemigo diferente cuando target está muerto](./pendientes.md#issue-38-auto-redirección-de-ataque-a-enemigo-diferente-cuando-target-está-muerto-mejora--decisión-de-diseño) *[PENDIENTE - Decisión de diseño]*
- [Issue #65: Ataque a compañero fuera de combate no inicia combate](./pendientes.md#issue-65-ataque-a-compañero-fuera-de-combate-no-inicia-combate-mejora) *[PENDIENTE - Mejora futura]*
- [Issue #6: Manejo de errores en `handleLoadAdventure`](./pendientes.md#issue-6-manejo-de-errores-en-handleloadadventure) *[PENDIENTE - Mejora opcional]*
- [Issue #7: Advertencia de Content Security Policy](./pendientes.md#issue-7-advertencia-de-content-security-policy-sobre-eval) *[DOCUMENTADO - No crítico]*
- [Issue #8: Fallos al cargar aventura desde JSON](./pendientes.md#issue-8-fallos-al-cargar-aventura-desde-json) *[DOCUMENTADO - Funcionalidad pendiente]*
- [Issue #15: Mejora de búsqueda en D&D API](./pendientes.md#issue-15-mejora-de-búsqueda-en-dd-api-para-monstruos-no-mapeados) *[PENDIENTE]*
- [Issue #16: Gestión de nombres de múltiples monstruos](./pendientes.md#issue-16-gestión-de-nombres-de-múltiples-monstruos-debería-estar-en-un-módulo-separado) *[PENDIENTE - Mejora de arquitectura]*
- [Issue #21: Código duplicado en `combat-manager.ts`](./pendientes.md#issue-21-código-duplicado-en-combat-managerts-para-procesamiento-de-rolls-deuda-técnica) *[PENDIENTE - Deuda técnica]*
- [Issue #22: Sistema completo de Saving Throws](./pendientes.md#issue-22-sistema-completo-de-saving-throws-tiradas-de-salvación-del-objetivo-feature-incompleta) *[PENDIENTE - Feature incompleta]*
- [Issue #28: Visualización de barra de vida en panel Grupo](./pendientes.md#issue-28-visualización-de-barra-de-vida-en-panel-grupo-advertencia) *[PENDIENTE - Bug visual]*
- [Issue #30: Errores de conexión a APIs con logs verbosos](./pendientes.md#issue-30-errores-de-conexión-a-apis-con-logs-verbosos-advertencia) *[PENDIENTE - Mejora de logging]*
- [Issue #82: Unificar sistema de procesamiento de tiradas de dados](./pendientes.md#issue-82-unificar-sistema-de-procesamiento-de-tiradas-de-dados-jugador-companions-enemigos-deuda-técnica) *[PENDIENTE - Deuda técnica]*

**⚪ Prioridad Baja (PB):**
- [Issue #25: Logs del navegador colapsados por defecto](./pendientes.md#issue-25-logs-del-navegador-colapsados-por-defecto-advertencia) *[PENDIENTE - Mejora de UX]*
- [Issue #31: Gestión de ataques múltiples en combate](./pendientes.md#issue-31-gestión-de-ataques-múltiples-en-combate-mejora) *[PENDIENTE - Funcionalidad incompleta]*
- [Issue #32: Paneles de combate se limpian de forma inconsistente](./pendientes.md#issue-32-paneles-de-combate-se-limpian-de-forma-inconsistente-mejora) *[PENDIENTE - Inconsistencia de UX]*

**⚫ Prioridad Muy Baja (PMB):**
- [Issue #33: Logs muestran turnIndex cuando inCombat es false](./pendientes.md#issue-33-logs-muestran-turnindex-cuando-incombat-es-false-mejora) *[PENDIENTE - Mejora menor de logging]*

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

