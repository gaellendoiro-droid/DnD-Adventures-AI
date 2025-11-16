# Plan: Sistema de Testing - Integración y E2E

**Versión:** 1.0.0  
**Fecha de creación:** 2025-11-15  
**Estado:** 📝 Sin comenzar  
**Prioridad:** Media  
**Dependencias:** Sistema de Unit Tests (✅ Completado)

---

## 📋 Objetivo

Extender el sistema de testing actual (unit tests) con:
1. **Tests de Integración**: Verificar la interacción entre múltiples módulos
2. **Tests E2E (End-to-End)**: Verificar flujos completos en navegador real

Esto complementará los 68 unit tests ya implementados y proporcionará cobertura completa del sistema.

---

## 🎯 Contexto

### Estado Actual

**✅ Completado:**
- Sistema de unit tests con Vitest (68 tests)
- Tests para módulos críticos (combat-validators, retry-utils, monster-name-manager, etc.)
- Configuración de Vitest funcional
- Documentación completa de testing

**⏳ Prerequisito Pendiente:**
- **Mejora de Testabilidad y Refactorización** - Este plan debe completarse ANTES de implementar tests de integración y E2E
  - Los intentos recientes de crear tests de integración para combate completo fallaron debido a alto acoplamiento
  - Es necesario implementar Inyección de Dependencias (DI) primero
  - Referencia: [Plan de Mejora de Testabilidad](mejora-testabilidad-refactorizacion.md)

**📝 Pendiente:**
- Tests de integración (múltiples módulos trabajando juntos)
- Tests E2E (flujos completos en navegador)

### Beneficios Esperados

1. **Cobertura Completa**: Unit tests + Integration tests + E2E tests = cobertura completa
2. **Detección Temprana**: Encontrar bugs en interacciones entre módulos antes de producción
3. **Confianza en Refactorizaciones**: Validar que cambios no rompen flujos completos
4. **Documentación Viva**: Tests E2E documentan flujos de usuario esperados
5. **CI/CD Ready**: Tests automatizados para pipelines de integración continua

---

## 🔧 Componentes a Implementar

### 1. Tests de Integración

**Objetivo:** Verificar que múltiples módulos trabajan correctamente juntos.

**Herramienta:** Vitest (ya configurado)

**Casos de Prueba Propuestos:**

#### 1.1 Flujo de Combate Completo
- **Módulos involucrados:** `combat-manager.ts`, `dice-roll-processor.ts`, `combat-validators.ts`, `target-resolver.ts`
- **Test:** Iniciar combate, procesar turnos de IA, procesar turno de jugador, detectar fin de combate
- **Verificaciones:**
  - Orden de iniciativa correcto
  - Procesamiento de tiradas correcto
  - Actualización de HP correcta
  - Detección de fin de combate correcta

#### 1.2 Flujo de Interpretación de Acciones
- **Módulos involucrados:** `action-interpreter.ts`, `game-coordinator.ts`, `narrative-expert.ts`
- **Test:** Interpretar acción del jugador, generar narrativa, procesar reacciones
- **Verificaciones:**
  - Interpretación correcta de acciones
  - Generación de narrativa apropiada
  - Reacciones de compañeros correctas

#### 1.3 Flujo de Resolución de Targets
- **Módulos involucrados:** `target-resolver.ts`, `monster-name-manager.ts`, `combat-manager.ts`
- **Test:** Resolver target desde nombre visual, generar nombres diferenciados, mapear a uniqueId
- **Verificaciones:**
  - Resolución correcta de targets
  - Manejo de ambigüedad
  - Matching insensible a acentos

#### 1.4 Flujo de Retry con Exponential Backoff
- **Módulos involucrados:** `retry-utils.ts`, `companion-tactician.ts`, `enemy-tactician.ts`
- **Test:** Simular timeout de API, verificar retry, verificar backoff exponencial
- **Verificaciones:**
  - Retry en errores retryables
  - No retry en errores no retryables
  - Delays exponenciales correctos

**Estructura Propuesta:**
```
tests/
└── integration/
    ├── combat-flow.test.ts
    ├── action-interpretation.test.ts
    ├── target-resolution.test.ts
    └── retry-flow.test.ts
```

### 2. Tests E2E (End-to-End)

**Objetivo:** Verificar flujos completos de usuario en navegador real.

**Herramienta:** Playwright (recomendado) o Cypress

**Casos de Prueba Propuestos:**

#### 2.1 Flujo de Inicio de Partida
- **Test:** Crear nueva partida, verificar carga inicial, verificar mensaje del DM
- **Verificaciones:**
  - UI carga correctamente
  - Mensaje inicial del DM aparece
  - Personajes se muestran correctamente

#### 2.2 Flujo de Combate Completo
- **Test:** Iniciar combate, procesar turnos, verificar UI, finalizar combate
- **Verificaciones:**
  - Iniciativa se muestra correctamente
  - Turnos se procesan correctamente
  - HP se actualiza en UI
  - Botones "Pasar 1 Turno" y "Avanzar Todos" funcionan
  - Fin de combate se detecta y muestra correctamente

#### 2.3 Flujo de Interacción con DM
- **Test:** Enviar acción, recibir respuesta, verificar narrativa
- **Verificaciones:**
  - Input del usuario se envía correctamente
  - Respuesta del DM aparece
  - Narrativa es apropiada
  - Reacciones de compañeros aparecen

#### 2.4 Flujo de Sistema de Turnos Paso a Paso
- **Test:** Verificar sincronización de turnos, botones de avance, marcador visual
- **Verificaciones:**
  - Marcador visual se actualiza correctamente
  - Botones aparecen/desaparecen en momentos correctos
  - Sincronización frontend-backend funciona
  - Avance automático funciona con delay

#### 2.5 Flujo de Estados de Personajes
- **Test:** Verificar inconsciencia, muerte, curación, actualización de HP
- **Verificaciones:**
  - Estados se muestran correctamente en UI
  - Mensajes de inconsciencia/muerte aparecen
  - Curación actualiza HP correctamente
  - Validación de HP funciona

**Estructura Propuesta:**
```
tests/
└── e2e/
    ├── game-init.spec.ts
    ├── combat-flow.spec.ts
    ├── dm-interaction.spec.ts
    ├── turn-system.spec.ts
    └── character-states.spec.ts
```

---

## ⚠️ Prerequisito Importante

**⚠️ ANTES de comenzar este plan, es necesario completar:**
- [Plan de Mejora de Testabilidad y Refactorización](mejora-testabilidad-refactorizacion.md)

**Razón:** Los intentos recientes de crear tests de integración para el sistema de combate demostraron que el código actual tiene demasiado acoplamiento. Sin implementar Inyección de Dependencias (DI) y separar lógica pura de efectos secundarios, los tests de integración seguirán fallando.

**Orden Recomendado:**
1. ✅ Completar **Mejora de Testabilidad y Refactorización**
2. ⏳ Luego implementar este plan (Sistema de Testing - Integración y E2E)

---

## 📋 Pasos de Implementación

### Fase 0: Verificar Prerequisito

**Objetivo:** Asegurar que el plan de Mejora de Testabilidad está completo.

- [ ] Verificar que DI está implementado en funciones críticas
- [ ] Verificar que lógica pura está separada de efectos secundarios
- [ ] Verificar que `data-testid` está añadido a elementos críticos de UI
- [ ] Ejecutar tests de integración de ejemplo para validar que funcionan

**Estimación:** 1-2 horas

### Fase 1: Configuración de Tests de Integración

**Objetivo:** Configurar entorno para tests de integración con Vitest.

- [ ] Verificar que Vitest puede ejecutar tests de integración (ya configurado)
- [ ] Crear directorio `tests/integration/`
- [ ] Configurar mocks necesarios para tests de integración
- [ ] Crear helpers/utilities para tests de integración

**Estimación:** 2-3 horas

### Fase 2: Implementar Tests de Integración

**Objetivo:** Escribir tests de integración para flujos críticos.

- [ ] Test de flujo de combate completo
- [ ] Test de flujo de interpretación de acciones
- [ ] Test de flujo de resolución de targets
- [ ] Test de flujo de retry con exponential backoff

**Estimación:** 8-12 horas

### Fase 3: Configuración de Playwright

**Objetivo:** Instalar y configurar Playwright para tests E2E.

- [ ] Instalar Playwright: `npm install -D @playwright/test`
- [ ] Configurar `playwright.config.ts`
- [ ] Configurar navegadores (Chromium, Firefox, WebKit)
- [ ] Crear directorio `tests/e2e/`
- [ ] Configurar base URL y timeouts
- [ ] Añadir scripts a `package.json`: `npm run test:e2e`

**Estimación:** 2-3 horas

### Fase 4: Implementar Tests E2E

**Objetivo:** Escribir tests E2E para flujos de usuario críticos.

- [ ] Test de inicio de partida
- [ ] Test de flujo de combate completo
- [ ] Test de interacción con DM
- [ ] Test de sistema de turnos paso a paso
- [ ] Test de estados de personajes

**Estimación:** 12-16 horas

### Fase 5: Integración en CI/CD (Opcional)

**Objetivo:** Configurar tests para ejecutarse en pipelines de CI/CD.

- [ ] Configurar GitHub Actions (o similar)
- [ ] Ejecutar unit tests en CI
- [ ] Ejecutar integration tests en CI
- [ ] Ejecutar E2E tests en CI (con navegadores headless)
- [ ] Configurar reportes de cobertura

**Estimación:** 4-6 horas

---

## 🔧 Consideraciones Técnicas

### Tests de Integración

**Ventajas:**
- Rápidos (ejecutan en Node.js, sin navegador)
- Fáciles de depurar
- No requieren configuración adicional (usa Vitest existente)

**Desafíos:**
- Requieren mocks cuidadosos de dependencias externas (API calls)
- Necesitan datos de prueba realistas
- Pueden ser frágiles si hay cambios en interfaces

**Soluciones:**
- Usar mocks para llamadas a API (Gemini API)
- Crear fixtures con datos de prueba
- Mantener tests actualizados con cambios en código

### Tests E2E

**Ventajas:**
- Verifican flujos completos de usuario
- Detectan problemas de integración frontend-backend
- Validan UI y UX

**Desafíos:**
- Más lentos (requieren navegador)
- Más frágiles (dependen de UI)
- Requieren servidor en ejecución

**Soluciones:**
- Ejecutar en modo headless para velocidad
- Usar selectores robustos (data-testid)
- Configurar timeouts apropiados
- Ejecutar solo en CI/CD o antes de releases

### Herramientas Recomendadas

**Para Integration Tests:**
- ✅ Vitest (ya configurado)
- Helpers personalizados para crear datos de prueba

**Para E2E Tests:**
- Playwright (recomendado) - Moderno, rápido, multi-navegador
- Alternativa: Cypress - Popular, buena documentación

---

## 📊 Métricas de Éxito

### Cobertura de Tests

**Objetivo:** Aumentar cobertura de código del ~40% actual (unit tests) a ~70-80% con tests de integración y E2E.

**Métricas:**
- Unit tests: 68 tests (✅ Completado)
- Integration tests: 4-6 tests (objetivo)
- E2E tests: 5-7 tests (objetivo)
- Cobertura total: 70-80% (objetivo)

### Calidad

**Objetivo:** Detectar bugs antes de producción.

**Métricas:**
- Bugs detectados por tests antes de producción
- Tiempo de ejecución de suite completa < 5 minutos
- Tests estables (no flaky)

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Tests E2E Frágiles

**Problema:** Tests E2E pueden fallar por cambios menores en UI.

**Mitigación:**
- Usar selectores robustos (data-testid en lugar de clases CSS)
- Mantener tests actualizados con cambios en UI
- Ejecutar solo en CI/CD para evitar falsos positivos locales

### Riesgo 2: Tests Lentos

**Problema:** Suite completa puede tardar mucho tiempo.

**Mitigación:**
- Ejecutar unit tests en cada cambio (rápidos)
- Ejecutar integration tests en pre-commit
- Ejecutar E2E tests solo en CI/CD o antes de releases

### Riesgo 3: Configuración Compleja

**Problema:** Configurar Playwright puede ser complejo.

**Mitigación:**
- Seguir documentación oficial de Playwright
- Empezar con configuración mínima
- Añadir complejidad gradualmente

---

## 📝 Notas

- **Prioridad:** Media - Los unit tests ya proporcionan buena cobertura. Integration y E2E tests son complementarios.
- **Dependencias:** 
  - Sistema de Unit Tests (✅ Completado)
  - **Mejora de Testabilidad y Refactorización (⏳ Prerequisito CRÍTICO)**
- **Estimación Total:** 29-42 horas (incluye verificación de prerequisito)
- **Recomendación:** Implementar en fases, empezando con integration tests (más rápidos y fáciles)

---

## 🔗 Referencias

- [Documentación de Testing](../testing/README.md) - Sistema de testing actual
- [Documentación de Vitest](https://vitest.dev/) - Framework de testing
- [Documentación de Playwright](https://playwright.dev/) - Framework E2E
- [Plan de Mejora de Testabilidad y Refactorización](mejora-testabilidad-refactorizacion.md) - **Prerequisito CRÍTICO**
- [Plan de Sistema de Turnos Paso a Paso](../completados/sistema-turnos-paso-a-paso.md) - Tests de integración ya verificados manualmente

---

**Última actualización:** 2025-11-15  
**Estado:** 📝 Sin comenzar  
**Prioridad:** Media

