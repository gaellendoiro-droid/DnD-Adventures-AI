# Sistema de Logging Estructurado

**Última actualización:** 2025-01-22  
**Estado:** ✅ Actualizado

---

Este documento describe el sistema de logging estructurado implementado en D&D Adventures AI, que proporciona visibilidad completa de la aplicación tanto en el servidor como en el cliente, con centralización de logs en la terminal del servidor.

> 💡 **Para información sobre cuándo usar cada nivel de logging (DEBUG, INFO, WARN, ERROR), consulta la [Guía de Estilo de Logging](./guia-estilo-logging.md)**

---

## 📋 Visión General

El sistema de logging está diseñado para:
- **Centralización:** Todos los logs importantes aparecen en la terminal del servidor
- **Estructuración:** Formato consistente con timestamps, niveles y contexto
- **Trazabilidad:** Facilita la depuración y el seguimiento del flujo de la aplicación
- **Separación de responsabilidades:** Logs del servidor y del cliente, pero centralizados

---

## 🏗️ Arquitectura

### Componentes del Sistema

1. **Logger del Servidor** (`src/lib/logger.ts`)
   - Logs estructurados en la terminal del servidor
   - Niveles: DEBUG, INFO, WARN, ERROR
   - Colores para mejor legibilidad
   - Funciones especializadas para módulos comunes

2. **Logger del Cliente** (`src/lib/logger-client.ts`)
   - Logs en la consola del navegador
   - Envío automático al servidor para centralización
   - Niveles: DEBUG, INFO, WARN, ERROR
   - Funciones especializadas para componentes UI

3. **Endpoint de API** (`src/app/api/log/route.ts`)
   - Recibe logs del cliente
   - Los registra en el servidor usando el logger estructurado
   - Manejo seguro de errores para evitar bucles infinitos

---

## 📊 Flujo de Logging

### Logs del Servidor

Los logs del servidor se generan directamente en el código del backend y aparecen inmediatamente en la terminal:

```typescript
import { log } from '@/lib/logger';

// Log simple
log.info('Processing player action', { action: 'move', locationId: 'phandalin' });

// Log especializado
log.serverAction('Action processed', { action: 'move', messagesCount: 3 });
log.gameCoordinator('Turn completed', { turnIndex: 2, inCombat: true });
log.aiTool('combatManagerTool', 'Processing combat turn', { activeCombatant: 'goblin-1' });
```

### Logs del Cliente

Los logs del cliente se generan en componentes React y:
1. Aparecen en la consola del navegador
2. Se envían automáticamente al servidor (excepto DEBUG)

```typescript
import { logClient } from '@/lib/logger-client';

// Log simple
logClient.info('Saving game', { component: 'GameView', action: 'saveGame' });

// Log especializado
logClient.uiEvent('ChatPanel', 'Message sent', { messageLength: 50 });
logClient.uiError('GameView', 'Error processing action', error, { action: 'attack' });
```

**Nota:** Los logs DEBUG del cliente NO se envían al servidor para evitar spam. Solo aparecen en la consola del navegador.

---

## 📝 Niveles de Log

### DEBUG
- **Uso:** Información detallada para depuración
- **Servidor:** Solo en desarrollo
- **Cliente:** Solo en consola del navegador (no se envía al servidor)

### INFO
- **Uso:** Eventos normales de la aplicación
- **Servidor:** Siempre visible
- **Cliente:** Visible en navegador Y enviado al servidor

### WARN
- **Uso:** Situaciones que requieren atención pero no son errores
- **Servidor:** Siempre visible
- **Cliente:** Visible en navegador Y enviado al servidor

### ERROR
- **Uso:** Errores que requieren atención inmediata
- **Servidor:** Siempre visible con stack trace
- **Cliente:** Visible en navegador Y enviado al servidor con detalles del error

---

## 🔧 Funciones Especializadas

### Logger del Servidor

```typescript
// Logs generales
log.debug(message, context?)
log.info(message, context?)
log.warn(message, context?)
log.error(message, context?, error?)

// Logs especializados
log.gameCoordinator(message, { action?, inCombat?, turnIndex? })
log.serverAction(message, { action?, [key: string]: any })
log.aiTool(toolName, message, { [key: string]: any })
log.aiFlow(flowName, message, { [key: string]: any })
```

### Logger del Cliente

```typescript
// Logs generales
logClient.debug(message, context?)
logClient.info(message, context?)
logClient.warn(message, context?)
logClient.error(message, context?, error?)

// Logs especializados
logClient.uiEvent(component, message, { [key: string]: any })
logClient.uiError(component, message, error?, { [key: string]: any })
```

---

## 📋 Formato de Logs

### Formato en Terminal del Servidor

```
[timestamp] [LEVEL] [message] [module] <action> [context fields]
```

**Ejemplo:**
```
2024-01-15 14:23:45.123 INFO  Saving game [Client] [GameView] <saveGame> partySize=3 messagesCount=15 locationId=phandalin-plaza
```

### Formato en Consola del Navegador

```
[timestamp] [LEVEL] [message] [component] <action> [context fields]
```

**Ejemplo:**
```
2024-01-15T14:23:45.123Z INFO  Saving game component="GameView" action="saveGame" partySize=3 messagesCount=15
```

---

## 🔄 Centralización de Logs

### Cómo Funciona

1. **Cliente genera log:** `logClient.info('Saving game', { component: 'GameView' })`
2. **Aparece en navegador:** Log visible en la consola del navegador
3. **Se envía al servidor:** Automáticamente vía POST a `/api/log`
4. **Servidor lo registra:** Aparece en la terminal del servidor con formato estructurado

### Ventajas

- **Punto único de información:** Todos los logs importantes en la terminal del servidor
- **Facilita depuración:** No necesitas abrir la consola del navegador
- **Trazabilidad completa:** Historial completo de eventos del cliente y servidor

### Limitaciones

- **DEBUG no se centraliza:** Para evitar spam, los logs DEBUG del cliente solo aparecen en el navegador
- **Requiere conexión:** Si el servidor no está disponible, el envío falla silenciosamente
- **Asíncrono:** Los logs del cliente pueden llegar con un pequeño retraso

---

## 🎯 Mejores Prácticas

Para una guía completa y detallada sobre cuándo usar cada nivel de logging, consulta:

**[📖 Guía de Estilo de Logging](./guia-estilo-logging.md)**

### Cuándo Usar Cada Nivel (Resumen)

- **DEBUG:** Información detallada solo útil durante desarrollo
- **INFO:** Eventos normales que quieres rastrear (guardado, carga, acciones)
- **WARN:** Situaciones inesperadas que no rompen la funcionalidad
- **ERROR:** Errores que requieren atención y pueden afectar la experiencia del usuario

### Validación Automática

El logger incluye validación automática que detecta inconsistencias entre el nivel de log y el contenido del mensaje:

- **Mensajes DEBUG que contienen "WARNING" o "ERROR"** → Se registra como inconsistencia
- **Mensajes INFO que contienen "DEBUG", "WARNING" o "ERROR"** → Se registra como inconsistencia
- **Mensajes WARN que contienen "ERROR", "CRITICAL" o "FATAL"** → Se registra como inconsistencia
- **Mensajes ERROR que contienen "WARNING" o "DEBUG"** → Se registra como inconsistencia

En desarrollo, estas inconsistencias se registran como warnings en la consola para facilitar la corrección.

### Contexto en Logs

Siempre incluye contexto relevante:

```typescript
// ✅ Bueno
log.info('Processing action', { 
  action: 'move', 
  locationId: 'phandalin',
  partySize: 3 
});

// ❌ Evitar
log.info('Processing action'); // Sin contexto
```

### Logs Especializados

Usa las funciones especializadas cuando sea apropiado:

```typescript
// ✅ Mejor - más contexto automático
log.serverAction('Action processed', { action: 'move' });

// ❌ Funciona pero menos contexto
log.info('Action processed', { module: 'ServerAction', action: 'move' });
```

---

## 🔍 Ejemplos de Uso

### Ejemplo 1: Guardado de Partida

```typescript
// En game-view.tsx
logClient.info('Saving game', {
  component: 'GameView',
  action: 'saveGame',
  partySize: party.length,
  messagesCount: messages.length,
  locationId,
  inCombat,
});

// Aparece en:
// - Consola del navegador
// - Terminal del servidor: [timestamp] INFO  Saving game [Client] [GameView] <saveGame> ...
```

### Ejemplo 2: Error en Procesamiento

```typescript
// En game-view.tsx
logClient.uiError('GameView', 'Error processing action', error, {
  action: content,
  inCombat,
});

// Aparece en:
// - Consola del navegador (con stack trace)
// - Terminal del servidor: [timestamp] ERROR Error processing action [Client] [GameView] ...
```

### Ejemplo 3: Log del Servidor

```typescript
// En actions.ts
log.serverAction('Processing player action', {
  action: input.playerAction,
  inCombat: input.inCombat,
  turnIndex: input.turnIndex,
});

// Aparece en:
// - Terminal del servidor: [timestamp] INFO  Processing player action [ServerAction] <processPlayerAction> ...
```

---

## 🔗 Referencias

- [Guía de Estilo de Logging](./guia-estilo-logging.md) - Guía completa sobre cuándo usar cada nivel de log
- [Logger del Servidor](../../src/lib/logger.ts) - Implementación del logger del servidor
- [Logger del Cliente](../../src/lib/logger-client.ts) - Implementación del logger del cliente
- [Endpoint de API](../../src/app/api/log/route.ts) - Endpoint para centralización de logs
- [Arquitectura General](./vision-general.md) - Visión general del sistema

---

## 📝 Notas

- El sistema de logging fue implementado en v0.4.70+ como parte del plan de saneamiento
- Los logs DEBUG del cliente no se envían al servidor para evitar sobrecarga
- El envío de logs al servidor es asíncrono y no bloquea la ejecución
- Si el servidor no está disponible, el envío falla silenciosamente para evitar bucles infinitos

