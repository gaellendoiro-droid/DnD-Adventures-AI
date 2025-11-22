# Guía de Estilo de Logging

Esta guía define cuándo y cómo usar cada nivel de logging en D&D Adventures AI para mantener consistencia y facilitar la depuración.

---

## 📊 Niveles de Logging

### DEBUG
**Cuándo usar:**
- Información detallada solo útil durante desarrollo
- Trazado de flujo de ejecución paso a paso
- Valores de variables internas para debugging
- Información que normalmente no necesitas en producción

**Ejemplos:**
```typescript
// ✅ Correcto
log.debug('Parsing adventure JSON', { fileSize: jsonString.length });
log.debug('Enemy stats fetched', { enemyName: 'Goblin', hp: 7, ac: 15 });
log.debug('Processing turn', { turnIndex: 2, activeCombatant: 'goblin-1' });

// ❌ Incorrecto - esto debería ser INFO
log.debug('Player action received'); // Evento normal de la aplicación
log.debug('Combat started'); // Evento importante
```

**Reglas:**
- NO uses DEBUG para eventos normales de la aplicación
- NO uses DEBUG para errores o advertencias
- NO incluyas palabras como "WARNING" o "ERROR" en mensajes DEBUG

---

### INFO
**Cuándo usar:**
- Eventos normales y esperados de la aplicación
- Acciones del usuario procesadas correctamente
- Cambios de estado importantes (inicio de combate, cambio de ubicación)
- Operaciones completadas exitosamente

**Ejemplos:**
```typescript
// ✅ Correcto
log.info('Player action received', { action: 'move', locationId: 'phandalin' });
log.info('Combat started', { enemiesCount: 3, partySize: 4 });
log.info('Location changed', { from: 'phandalin', to: 'phandalin-inn' });
log.info('Game saved successfully', { partySize: 4, messagesCount: 50 });

// ❌ Incorrecto - esto debería ser DEBUG
log.info('DEBUG: Parsing JSON'); // No uses "DEBUG" en mensajes INFO
log.info('WARNING: This might fail'); // No uses "WARNING" en mensajes INFO
```

**Reglas:**
- Usa INFO para eventos normales y esperados
- NO uses palabras como "DEBUG", "WARNING", o "ERROR" en mensajes INFO
- Incluye contexto relevante (acciones, IDs, contadores)

---

### WARN
**Cuándo usar:**
- Situaciones inesperadas que no rompen la funcionalidad
- Fallos recuperables (retry exitoso, fallback usado)
- Condiciones que requieren atención pero permiten continuar
- Datos faltantes o inválidos que se manejan con valores por defecto

**Ejemplos:**
```typescript
// ✅ Correcto
log.warn('API request failed, using cached data', { 
  api: 'dnd-api', 
  error: error.message 
});
log.warn('Invalid enemy stats, using defaults', { 
  enemyName: 'Goblin', 
  missingFields: ['hp', 'ac'] 
});
log.warn('Retry attempt succeeded after initial failure', { 
  attempts: 3, 
  flow: 'actionInterpreter' 
});

// ❌ Incorrecto - esto debería ser ERROR
log.warn('CRITICAL ERROR: Failed to load adventure'); // Errores críticos son ERROR
log.warn('Fatal error occurred'); // Errores fatales son ERROR
```

**Reglas:**
- Usa WARN para situaciones recuperables
- NO uses palabras como "ERROR", "CRITICAL", o "FATAL" en mensajes WARN
- Incluye información sobre cómo se recuperó o qué fallback se usó

---

### ERROR
**Cuándo usar:**
- Errores que requieren atención inmediata
- Fallos que afectan la funcionalidad o experiencia del usuario
- Excepciones no manejadas
- Errores críticos que impiden operaciones importantes

**Ejemplos:**
```typescript
// ✅ Correcto
log.error('Failed to load adventure data', { 
  module: 'GameCoordinator' 
}, error);
log.error('Critical error in enemyTacticianTool', { 
  tool: 'enemyTacticianTool',
  activeCombatant: 'goblin-1'
}, error);
log.error('All retry attempts failed', { 
  flow: 'actionInterpreter',
  attempts: 4
}, error);

// ❌ Incorrecto - esto debería ser WARN
log.error('API request failed, using fallback'); // Si hay fallback, es WARN
log.error('WARNING: This might fail'); // No uses "WARNING" en mensajes ERROR
```

**Reglas:**
- Usa ERROR solo para errores que realmente requieren atención
- Siempre incluye el objeto Error cuando esté disponible
- NO uses palabras como "WARNING" o "DEBUG" en mensajes ERROR
- Incluye contexto suficiente para diagnosticar el problema

---

## 🎯 Reglas Generales

### 1. Consistencia entre Nivel y Mensaje
El nivel de log debe coincidir con la severidad del mensaje:

```typescript
// ✅ Correcto
log.debug('Processing turn details', { turnIndex: 2 });
log.info('Turn completed successfully', { turnIndex: 2 });
log.warn('Turn processing took longer than expected', { duration: 5000 });
log.error('Failed to process turn', { turnIndex: 2 }, error);

// ❌ Incorrecto
log.debug('WARNING: This might fail'); // DEBUG no debe contener "WARNING"
log.info('DEBUG: Processing details'); // INFO no debe contener "DEBUG"
log.warn('ERROR: Critical failure'); // WARN no debe contener "ERROR"
```

### 2. No Duplicar el Nivel en el Mensaje
El nivel ya está indicado por la función llamada, no lo repitas en el mensaje:

```typescript
// ✅ Correcto
log.warn('API request failed, using cached data');
log.error('Failed to load adventure data', {}, error);

// ❌ Incorrecto
log.warn('WARNING: API request failed'); // "WARNING" es redundante
log.error('ERROR: Failed to load'); // "ERROR" es redundante
```

### 3. Contexto Estructurado
Siempre incluye contexto relevante en el segundo parámetro:

```typescript
// ✅ Correcto
log.info('Action processed', { 
  action: 'move', 
  locationId: 'phandalin',
  partySize: 4 
});

// ❌ Incorrecto
log.info('Action processed'); // Sin contexto
```

### 4. Mensajes Descriptivos
Los mensajes deben ser claros y descriptivos:

```typescript
// ✅ Correcto
log.info('Combat started with 3 enemies', { enemiesCount: 3 });
log.warn('Enemy stats missing, using defaults', { enemyName: 'Goblin' });

// ❌ Incorrecto
log.info('Combat'); // Demasiado vago
log.warn('Stats'); // No describe qué pasó
```

---

## 🔍 Validación Automática

El logger incluye validación automática que detecta inconsistencias:

- **Mensajes DEBUG que contienen "WARNING" o "ERROR"** → Se registra como inconsistencia
- **Mensajes INFO que contienen "DEBUG", "WARNING" o "ERROR"** → Se registra como inconsistencia
- **Mensajes WARN que contienen "ERROR", "CRITICAL" o "FATAL"** → Se registra como inconsistencia
- **Mensajes ERROR que contienen "WARNING" o "DEBUG"** → Se registra como inconsistencia

En desarrollo, estas inconsistencias se registran como warnings en la consola.

---

## 📋 Checklist de Revisión

Antes de hacer commit, verifica:

- [ ] El nivel de log coincide con la severidad del mensaje
- [ ] El mensaje no contiene palabras que contradicen el nivel (ej: "WARNING" en DEBUG)
- [ ] Se incluye contexto relevante en el segundo parámetro
- [ ] Los errores incluyen el objeto Error cuando está disponible
- [ ] Los mensajes son descriptivos y claros

---

## 🔗 Referencias

- [Sistema de Logging](./sistema-logging.md) - Documentación completa del sistema
- [Logger del Servidor](../../src/lib/logger.ts) - Implementación del logger
- [Roadmap - Estandarización de Logging](../roadmap.md#0-estandarización-de-niveles-de-logging) - Contexto del problema

