# Issues Tracker

Este directorio contiene el seguimiento de todos los problemas, bugs y mejoras identificados durante el desarrollo del proyecto.

**Fecha de inicio:** Durante el saneamiento general de la aplicación (2025-11-10)  
**Última actualización:** 2025-11-22 (Issue #119 añadido - Testeo profundo del sistema de combate)

---

## 📊 Resumen Estadístico

- **Total de issues:** 58
- **Issues corregidos:** 34 (59%)
- **Issues pendientes:** 24 (41%)

### Por Prioridad

**Issues Corregidos:**
- 🔴 PMA (Prioridad Muy Alta): 10 issues (Issues #67, #79, #81)
- 🟡 PA (Prioridad Alta): 6 issues (Issues #34, #35, #36, #37, #51, #68)
- 🟢 PM (Prioridad Media): 10 issues
- ⚪ PB (Prioridad Baja): 1 issue

**Issues Pendientes:**
- 🔴 PMA (Prioridad Muy Alta): 0 issues ✅
- 🟡 PA (Prioridad Alta): 3 issues (Issues #93, #94, #115)
- 🟢 PM (Prioridad Media): 17 issues (incluye Issues #63, #65, #76, #77, #80, #116, #119)
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

- **[pendientes.md](./pendientes.md)** - Issues activos que requieren atención (25 issues)
- **[corregidos.md](./corregidos.md)** - Issues resueltos y verificados (34 issues) - Histórico

---

## 🔗 Enlaces Rápidos

### Issues Pendientes por Prioridad

**🔴 Prioridad Muy Alta (PMA) - CRÍTICOS:**
- _No hay issues críticos pendientes en este momento._ ✅

**🟡 Prioridad Alta (PA):**
- [Issue #53: Companions no usan hechizos disponibles en su ficha](./pendientes.md#issue-53-companions-no-usan-hechizos-disponibles-en-su-ficha-advertencia) *[Detectado en testing]*
- [Issue #66: Orden incorrecto de mensajes en muerte masiva](./pendientes.md#issue-66-orden-incorrecto-de-mensajes-en-muerte-masiva-advertencia) *[Detectado en testing - Test 1.1]*
- [Issue #75: DM inventa armas en narración de ataques sin consultar inventario](./pendientes.md#issue-75-dm-inventa-armas-en-narración-de-ataques-sin-consultar-inventario-advertencia) *[Detectado en testing]*

**🟢 Prioridad Media (PM):**
- [Issue #119: Testeo profundo del sistema de combate después de refactorización](./pendientes.md#issue-119-testeo-profundo-del-sistema-de-combate-después-de-refactorización-verde-testing) *[Testing necesario - Post-refactorización]*
- [Issue #116: DM narra palabras textuales de compañeros cuando tienen su propia voz](./pendientes.md#issue-116-dm-narra-palabras-textuales-de-compañeros-cuando-tienen-su-propia-voz-mejora) *[Detectado en gameplay manual - Coordinación narrativa]*
- [Issue #38: Auto-redirección de ataque a enemigo diferente cuando target está muerto](./pendientes.md#issue-38-auto-redirección-de-ataque-a-enemigo-diferente-cuando-target-está-muerto-mejora--decisión-de-diseño) *[Detectado en testing - Decisión de diseño pendiente]*
- [Issue #65: Ataque a compañero fuera de combate no inicia combate](./pendientes.md#issue-65-ataque-a-compañero-fuera-de-combate-no-inicia-combate-mejora) *[Detectado en testing - Mejora futura]*
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
- [Issue #76: Input debe deshabilitarse cuando el DM está “pensando”](./pendientes.md#issue-76-input-debe-deshabilitarse-cuando-el-dm-está-pensando-mejora)
- [Issue #77: Mensajes lentos al avanzar turno cuando el siguiente personaje está muerto o inconsciente](./pendientes.md#issue-77-mensajes-lentos-al-avanzar-turno-cuando-el-siguiente-personaje-está-muerto-o-inconsciente-mejora)
- [Issue #79: Falta narración del DM en turnos del jugador](./pendientes.md#issue-79-falta-narración-del-dm-en-turnos-del-jugador-mejora)
- [Issue #80: Permitir múltiples acciones del jugador en un turno](./pendientes.md#issue-80-permitir-múltiples-acciones-del-jugador-en-un-turno-movimientoacción-adicional-mejora)

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

