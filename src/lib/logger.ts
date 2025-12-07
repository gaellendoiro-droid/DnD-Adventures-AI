/**
 * Sistema de logging estructurado para el backend
 * 
 * Proporciona logs consistentes y legibles en la terminal del servidor,
 * facilitando la depuración y el seguimiento del flujo de la aplicación.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  module?: string;
  action?: string;
  [key: string]: any;
}

class Logger {
  private minLevel: LogLevel;
  private colors: boolean;
  private validationEnabled: boolean;

  constructor() {
    // En desarrollo, mostrar todos los logs. En producción, solo INFO y superiores
    this.minLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    // Check if running in a Node.js environment with TTY support
    const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;
    this.colors = !!(isNode && process.stdout && process.stdout.isTTY && !process.env.NO_COLOR);
    // Validación habilitada en desarrollo para detectar inconsistencias
    this.validationEnabled = process.env.NODE_ENV !== 'production';
  }

  /**
   * Valida que el nivel de log coincida con el contenido del mensaje.
   * Detecta inconsistencias como "WARNING" en mensajes DEBUG o "ERROR" en mensajes INFO.
   */
  private validateLogLevel(level: LogLevel, message: string): void {
    if (!this.validationEnabled) return;

    const messageUpper = message.toUpperCase();
    const inconsistencies: string[] = [];

    // Validaciones por nivel
    switch (level) {
      case LogLevel.DEBUG:
        if (/\b(WARNING|WARN|ERROR|CRITICAL|FATAL)\b/.test(messageUpper)) {
          inconsistencies.push(`DEBUG message contains severity keywords: ${message.match(/\b(WARNING|WARN|ERROR|CRITICAL|FATAL)\b/i)?.[0]}`);
        }
        break;

      case LogLevel.INFO:
        if (/\b(DEBUG|WARNING|WARN|ERROR|CRITICAL|FATAL)\b/.test(messageUpper)) {
          inconsistencies.push(`INFO message contains severity keywords: ${message.match(/\b(DEBUG|WARNING|WARN|ERROR|CRITICAL|FATAL)\b/i)?.[0]}`);
        }
        break;

      case LogLevel.WARN:
        if (/\b(ERROR|CRITICAL|FATAL)\b/.test(messageUpper)) {
          inconsistencies.push(`WARN message contains error keywords: ${message.match(/\b(ERROR|CRITICAL|FATAL)\b/i)?.[0]}`);
        }
        break;

      case LogLevel.ERROR:
        if (/\b(DEBUG|WARNING|WARN)\b/.test(messageUpper)) {
          inconsistencies.push(`ERROR message contains lower severity keywords: ${message.match(/\b(DEBUG|WARNING|WARN)\b/i)?.[0]}`);
        }
        break;
    }

    // Si hay inconsistencias, registrar un warning
    if (inconsistencies.length > 0) {
      const levelName = LogLevel[level];
      console.warn(
        `\x1b[33m[LOG VALIDATION] Inconsistency detected in ${levelName} log:\x1b[0m`,
        message,
        `\n  Issues: ${inconsistencies.join(', ')}`
      );
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 23);
  }

  /**
   * Formatea un valor individual para mostrarlo en el log
   */
  private formatValue(value: any): string {
    // Manejar null y undefined
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    // Manejar booleanos
    if (typeof value === 'boolean') return value.toString();
    
    // Manejar strings - truncar si son muy largos
    if (typeof value === 'string') {
      const maxLength = 100;
      if (value.length > maxLength) {
        return `${value.substring(0, maxLength)}...`;
      }
      return value;
    }
    
    // Manejar números
    if (typeof value === 'number') return value.toString();
    
    // Manejar objetos y arrays
    if (typeof value === 'object') {
      try {
        // Formato compacto pero legible
        const json = JSON.stringify(value);
        const maxLength = 200;
        if (json.length > maxLength) {
          return `${json.substring(0, maxLength)}...`;
        }
        return json;
      } catch {
        return '[object]';
      }
    }
    
    return String(value);
  }

  /**
   * Formatea los campos de contexto con colores sutiles y orden alfabético
   */
  private formatOtherFields(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) return '';

    // Obtener campos excluyendo module y action, y ordenarlos alfabéticamente
    const otherFields = Object.entries(context)
      .filter(([key]) => key !== 'module' && key !== 'action')
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => {
        const formattedValue = this.formatValue(value);
        const fieldStr = `${key}=${formattedValue}`;
        
        // Añadir color sutil si los colores están habilitados
        if (this.colors) {
          const dimColor = '\x1b[2m'; // Color tenue
          const reset = '\x1b[0m';
          return `${dimColor}${fieldStr}${reset}`;
        }
        
        return fieldStr;
      });

    return otherFields.length > 0 ? ` - ${otherFields.join(' ')}` : '';
  }

  private colorize(level: LogLevel): string {
    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO ',
      [LogLevel.WARN]: 'WARN ',
      [LogLevel.ERROR]: 'ERROR',
    };

    if (!this.colors) {
      return levelNames[level];
    }

    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';

    return `${colors[level]}${levelNames[level]}${reset}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level < this.minLevel) return;

    // Validar consistencia del nivel de log
    this.validateLogLevel(level, message);

    const timestamp = this.formatTimestamp();
    const moduleStr = context?.module ? `[${context.module}]` : '';
    const otherFieldsStr = this.formatOtherFields(context);
    const levelStr = this.colorize(level);
    const fullMessage = `${timestamp} ${levelStr}${moduleStr ? ` ${moduleStr}` : ''} ${message}${otherFieldsStr}`;

    if (error) {
      const errorDetails = error.stack || error.message;
      console.error(fullMessage);
      console.error(errorDetails);
    } else {
      const logMethod = level === LogLevel.ERROR ? console.error :
        level === LogLevel.WARN ? console.warn :
          console.log;
      logMethod(fullMessage);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log específico para el flujo de coordinación del juego
   */
  gameCoordinator(message: string, data?: { action?: string; inCombat?: boolean; turnIndex?: number;[key: string]: any }): void {
    this.info(message, {
      module: 'GameCoordinator',
      ...data,
    });
  }

  /**
   * Log específico para acciones del servidor
   */
  serverAction(message: string, data?: { action?: string;[key: string]: any }): void {
    this.info(message, {
      module: 'ServerAction',
      ...data,
    });
  }

  /**
   * Log específico para herramientas de IA
   */
  aiTool(toolName: string, message: string, data?: { [key: string]: any }): void {
    this.debug(message, {
      module: 'AITool',
      tool: toolName,
      ...data,
    });
  }

  /**
   * Log específico para flujos de IA
   */
  aiFlow(flowName: string, message: string, data?: { [key: string]: any }): void {
    this.debug(message, {
      module: 'AIFlow',
      flow: flowName,
      ...data,
    });
  }
}

// Exportar una instancia singleton
export const logger = new Logger();

// Exportar funciones de conveniencia
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, context?: LogContext, error?: Error) => logger.error(message, context, error),
  gameCoordinator: (message: string, data?: { action?: string; inCombat?: boolean; turnIndex?: number;[key: string]: any }) =>
    logger.gameCoordinator(message, data),
  serverAction: (message: string, data?: { action?: string;[key: string]: any }) =>
    logger.serverAction(message, data),
  aiTool: (toolName: string, message: string, data?: { [key: string]: any }) =>
    logger.aiTool(toolName, message, data),
  aiFlow: (flowName: string, message: string, data?: { [key: string]: any }) =>
    logger.aiFlow(flowName, message, data),
};

